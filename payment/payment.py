import os
import sys
import time
import logging
import uuid
import json
import requests
import traceback
import opentracing as ot
import opentracing.ext.tags as tags
from flask import Flask
from flask import request
from flask import jsonify
from rabbitmq import Publisher

app = Flask(__name__)

CART = os.getenv('CART_HOST', 'cart')
USER = os.getenv('USER_HOST', 'user')
PAYMENT_GATEWAY = os.getenv('PAYMENT_GATEWAY', 'https://paypal.com/')

@app.errorhandler(Exception)
def exception_handler(err):
    app.logger.error(str(err))
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

    # add some log info to the active trace
    span = ot.tracer.active_span
    span.log_kv({'id': id})
    span.log_kv({'cart': cart})

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
    for item in cart.get('items'):
        if item.get('sku') == 'SHIP':
            has_shipping = True

    if cart.get('total', 0) == 0 or has_shipping == False:
        app.logger.warn('cart not valid')
        return 'cart not valid', 400

    # dummy call to payment gateway, hope they dont object
    try:
        req = requests.get(PAYMENT_GATEWAY)
        app.logger.info('{} returned {}'.format(PAYMENT_GATEWAY, req.status_code))
    except requests.exceptions.RequestException as err:
        app.logger.error(err)
        return str(err), 500
    if req.status_code != 200:
        return 'payment error', req.status_code

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
        req = requests.delete('http://{cart}:8080/cart/{id}'.format(cart=CART, id=id));
        app.logger.info('cart delete returned {}'.format(req.status_code))
    except requests.exceptions.RequestException as err:
        app.logger.error(err)
        return str(err), 500
    if req.status_code != 200:
        return 'order history update error', req.status_code

    return jsonify({ 'orderid': orderid })


def queueOrder(order):
    app.logger.info('queue order')
    # RabbitMQ pika is not currently traced automatically
    # opentracing tracer is automatically set to Instana tracer
    # start a span

    parent_span = ot.tracer.active_span
    with ot.tracer.start_active_span('queueOrder', child_of=parent_span,
            tags={
                    'exchange': Publisher.EXCHANGE,
                    'key': Publisher.ROUTING_KEY
                }) as tscope:
        tscope.span.set_tag('span.kind', 'intermediate')
        tscope.span.log_kv({'orderid': order.get('orderid')})
        with ot.tracer.start_active_span('rabbitmq', child_of=tscope.span,
                tags={
                    'exchange': Publisher.EXCHANGE,
                    'sort': 'publish',
                    'address': Publisher.HOST,
                    'key': Publisher.ROUTING_KEY
                    }
                ) as scope:

            # For screenshot demo requirements optionally add in a bit of delay
            delay = int(os.getenv('PAYMENT_DELAY_MS', 0))
            time.sleep(delay / 1000)

            headers = {}
            ot.tracer.inject(scope.span.context, ot.Format.HTTP_HEADERS, headers)
            app.logger.info('msg headers {}'.format(headers))

            publisher.publish(order, headers)


# RabbitMQ
publisher = Publisher(app.logger)

if __name__ == "__main__":
    sh = logging.StreamHandler(sys.stdout)
    sh.setLevel(logging.INFO)
    fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    #sh.setFormatter(fmt)
    #app.logger.addHandler(sh)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Payment gateway {}'.format(PAYMENT_GATEWAY))
    port = int(os.getenv("SHOP_PAYMENT_PORT", "8080"))
    app.logger.info('Starting on port {}'.format(port))
    app.run(host='0.0.0.0', port=port)
