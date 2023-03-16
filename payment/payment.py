import json
import logging
import os
import time
import uuid
from datetime import datetime

import requests
from flask import Flask
from flask import jsonify
from flask import request
from flask_apscheduler import APScheduler
from prometheus_client import Gauge
from prometheus_flask_exporter import PrometheusMetrics

from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

from rabbitmq import Publisher

def path(req):
    """ Use the first URI segment as the value for the 'path' label """
    return "/" + req.path[1:].split("/")[0] + "/<id>"

app = Flask(__name__)
metrics = PrometheusMetrics(app, group_by=path)
app.logger.setLevel(logging.INFO)

trace.set_tracer_provider(
    TracerProvider(
        resource=Resource.create({SERVICE_NAME: "payment"})
    )
)
tracer = trace.get_tracer(__name__)
otlpexporter = OTLPSpanExporter()

# Create a BatchSpanProcessor and add the exporter to it
span_processor = BatchSpanProcessor(otlpexporter)
# add to the tracer
trace.get_tracer_provider().add_span_processor(span_processor)
RequestsInstrumentor().instrument()
FlaskInstrumentor().instrument_app(app)

build_info = Gauge('payment_build_info', 'Build information',
                   ['branch', 'revision', 'version'])

CART = os.getenv('CART_HOST', 'cart')
USER = os.getenv('USER_HOST', 'user')
PAYMENT_GATEWAY = os.getenv('PAYMENT_GATEWAY')

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

GOOD_BUILD_INFO = ['HEAD', 'a3a55c9305750c400a7d3174ccdc9fe093e7699f', '1.0.0']
BAD_BUILD_INFO = ['HEAD', '728b09facd4dfaf88e6346f72b60a430dc4b9260', '1.0.1']
failure_hour = int(os.getenv('FAILURE_HOUR', '14'))
failure_start_min = int(os.getenv('FAILURE_FROM_MINUTE', '0'))
failure_end_min = int(os.getenv('FAILURE_TILL_MINUTE', '30'))
print(f'Failure duration is from {failure_hour:02d}:{failure_start_min:02d} - {failure_hour:02d}:{failure_end_min:02d} UTC')


@scheduler.task('interval', minutes=1)
def update_error_flag():
    global error_flag
    error_flag = datetime.now().hour == failure_hour and failure_start_min <= datetime.now().minute < failure_end_min

    if error_flag:
        if build_info.labels(*GOOD_BUILD_INFO):
            build_info.remove(*GOOD_BUILD_INFO)
        build_info.labels(*BAD_BUILD_INFO).set(1)
    else:
        if build_info.labels(*BAD_BUILD_INFO):
            build_info.remove(*BAD_BUILD_INFO)
        build_info.labels(*GOOD_BUILD_INFO).set(1)


error_flag = False

@app.errorhandler(Exception)
def exception_handler(err):
    app.logger.exception(str(err))
    return str(err), 500

@app.route('/health', methods=['GET'])
def health():
    return 'OK'


@app.route('/pay/<id>', methods=['POST'])
def pay(id):
    app.logger.info('payment for {}'.format(id))
    cart = request.get_json()
    app.logger.info(cart)

    anonymous_user = True

    # check user exists
    try:
        req = requests.get('http://{user}:8080/check/{id}'.format(user=USER, id=id))
    except requests.exceptions.RequestException as err:
        app.logger.error(err)
        return str(err), 500
    if req.status_code == 200:
        anonymous_user = False

    # check that the cart is valid
    # this will blow up if the cart is not valid
    has_shipping = False
    if cart.get('items') is None:
        raise TypeError('No items in cart')
    for item in cart.get('items'):
        if item.get('sku') == 'SHIP':
            has_shipping = True

    if cart.get('total', 0) == 0 or has_shipping == False:
        app.logger.warn('cart not valid')
        return 'cart not valid', 400

    # dummy call to payment gateway, hope they don't object
    if PAYMENT_GATEWAY:
        try:
            req = requests.get(PAYMENT_GATEWAY)
        except requests.exceptions.RequestException as err:
            app.logger.error(err)
            return str(err), 500
        if req.status_code != 200:
            app.logger.error('{} returned {} - {}'.format(PAYMENT_GATEWAY, req.status_code, req.text))
            return 'payment error', req.status_code
        else:
            app.logger.info('{} returned 200'.format(PAYMENT_GATEWAY))

    # Generate order id
    orderid = str(uuid.uuid4())
    queueOrder({ 'orderid': orderid, 'user': id, 'cart': cart })

    # add to order history
    if not anonymous_user:
        try:
            req = requests.post('http://{user}:8080/order/{id}'.format(user=USER, id=id),
                    data=json.dumps({'orderid': orderid, 'cart': cart}),
                    headers={'Content-Type': 'application/json'})
            app.logger.info('order history returned {}'.format(req.status_code))
        except requests.exceptions.RequestException as err:
            app.logger.error(err)
            return str(err), 500

    # delete cart
    try:
        req = requests.delete('http://{cart}:8080/cart/{id}?error={error}'.format(cart=CART, id=id, error=error_flag))
    except requests.exceptions.RequestException as err:
        app.logger.error(err)
        return str(err), 500
    if req.status_code != 200:
        app.logger.error('cart delete returned {} - {}'.format(req.status_code, req.text))
        return 'order history update error', req.status_code
    else:
        app.logger.info('cart delete returned 200')

    return jsonify({ 'orderid': orderid })


def queueOrder(order):
    app.logger.info('queue order')

    # For screenshot demo requirements optionally add in a bit of delay
    delay = int(os.getenv('PAYMENT_DELAY_MS', 0))
    time.sleep(delay / 1000)

    headers = {}
    publisher.publish(order, headers)


def countItems(items):
    count = 0
    for item in items:
        if item.get('sku') != 'SHIP':
            count += item.get('qty')

    return count


# RabbitMQ
publisher = Publisher(app.logger)

if __name__ == "__main__":
    app.logger.info('Payment gateway {}'.format(PAYMENT_GATEWAY))
    port = int(os.getenv("SHOP_PAYMENT_PORT", "8080"))
    app.logger.info('Starting on port {}'.format(port))
    app.run(host='0.0.0.0', port=port)
