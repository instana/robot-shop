import instana
import os
import sys
import time
import logging
import uuid
import json
import requests
from flask import Flask
from flask import Response
from flask import request
from flask import jsonify
from rabbitmq import Publisher
# Prometheus
import prometheus_client
from prometheus_client import Counter, Histogram

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

CART = os.getenv('CART_HOST', 'cart')
USER = os.getenv('USER_HOST', 'user')
PAYMENT_GATEWAY = os.getenv('PAYMENT_GATEWAY', 'https://paypal.com/')


def getIntEnv(name, default, minimum=0):
    try:
        return max(minimum, int(os.getenv(name, default)))
    except (TypeError, ValueError):
        app.logger.warning('invalid integer value for %s; using %s', name, default)
        return default


REQUEST_TIMEOUT = getIntEnv('REQUEST_TIMEOUT_SECONDS', 5, minimum=1)

# Prometheus
PromMetrics = {}
PromMetrics['SOLD_COUNTER'] = Counter('sold_count', 'Running count of items sold')
PromMetrics['AUS'] = Histogram('units_sold', 'Avergae Unit Sale', buckets=(1, 2, 5, 10, 100))
PromMetrics['AVS'] = Histogram('cart_value', 'Avergae Value Sale', buckets=(100, 200, 500, 1000, 2000, 5000, 10000))


@app.errorhandler(Exception)
def exception_handler(err):
    app.logger.exception('unhandled payment error: %s', err)
    return jsonify({'error': 'internal server error'}), 500

@app.route('/health', methods=['GET'])
def health():
    return 'OK'

# Prometheus
@app.route('/metrics', methods=['GET'])
def metrics():
    return Response(prometheus_client.generate_latest(), mimetype='text/plain')


@app.route('/pay/<id>', methods=['POST'])
def pay(id):
    app.logger.info('payment for {}'.format(id))
    cart = request.get_json(silent=True)
    app.logger.info(cart)

    if not isValidCart(cart):
        app.logger.warning('cart not valid')
        return 'cart not valid', 400

    anonymous_user = True

    # check user exists
    try:
        req = requests.get('http://{user}:8080/check/{id}'.format(user=USER, id=id), timeout=REQUEST_TIMEOUT)
    except requests.exceptions.RequestException:
        app.logger.exception('user service request failed')
        return 'user service unavailable', 502
    if req.status_code == 200:
        anonymous_user = False
    elif req.status_code != 404:
        app.logger.error('user service returned %s', req.status_code)
        return 'user service error', 502

    # dummy call to payment gateway, hope they dont object
    try:
        req = requests.get(PAYMENT_GATEWAY, timeout=REQUEST_TIMEOUT)
        app.logger.info('{} returned {}'.format(PAYMENT_GATEWAY, req.status_code))
    except requests.exceptions.RequestException:
        app.logger.exception('payment gateway request failed')
        return 'payment gateway unavailable', 502
    if req.status_code != 200:
        return 'payment error', req.status_code

    # Prometheus
    # items purchased
    item_count = countItems(cart.get('items', []))
    PromMetrics['SOLD_COUNTER'].inc(item_count)
    PromMetrics['AUS'].observe(item_count)
    PromMetrics['AVS'].observe(cart.get('total', 0))

    # Generate order id
    orderid = str(uuid.uuid4())
    try:
        queueOrder({ 'orderid': orderid, 'user': id, 'cart': cart })
    except Exception:
        app.logger.exception('order queue request failed')
        return 'order queue unavailable', 502

    # add to order history
    if not anonymous_user:
        try:
            req = requests.post('http://{user}:8080/order/{id}'.format(user=USER, id=id),
                    data=json.dumps({'orderid': orderid, 'cart': cart}),
                    headers={'Content-Type': 'application/json'},
                    timeout=REQUEST_TIMEOUT)
            app.logger.info('order history returned {}'.format(req.status_code))
        except requests.exceptions.RequestException:
            app.logger.exception('order history request failed')
            return 'user service unavailable', 502
        if req.status_code not in (200, 201):
            app.logger.error('order history returned %s', req.status_code)
            return 'order history error', 502

    # delete cart
    try:
        req = requests.delete('http://{cart}:8080/cart/{id}'.format(cart=CART, id=id), timeout=REQUEST_TIMEOUT)
        app.logger.info('cart delete returned {}'.format(req.status_code))
    except requests.exceptions.RequestException:
        app.logger.exception('cart delete request failed')
        return 'cart service unavailable', 502
    if req.status_code != 200:
        return 'cart delete error', req.status_code

    return jsonify({ 'orderid': orderid })


def isValidCart(cart):
    if not isinstance(cart, dict):
        return False

    items = cart.get('items')
    total = cart.get('total')
    if not isinstance(items, list) or not isinstance(total, (int, float)) or total <= 0:
        return False

    has_shipping = False
    for item in items:
        if not isinstance(item, dict):
            return False
        if item.get('sku') == 'SHIP':
            has_shipping = True
        elif not isinstance(item.get('qty'), int) or item['qty'] <= 0:
            return False

    return has_shipping


def queueOrder(order):
    app.logger.info('queue order')

    # For screenshot demo requirements optionally add in a bit of delay
    delay = getIntEnv('PAYMENT_DELAY_MS', 0)
    time.sleep(delay / 1000)

    headers = {}
    publisher.publish(order, headers)


def countItems(items):
    count = 0
    for item in items:
        if item.get('sku') != 'SHIP':
            count += item.get('qty', 0)

    return count


# RabbitMQ
publisher = Publisher(app.logger)

if __name__ == "__main__":
    sh = logging.StreamHandler(sys.stdout)
    sh.setLevel(logging.INFO)
    fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    app.logger.info('Payment gateway {}'.format(PAYMENT_GATEWAY))
    port = int(os.getenv("SHOP_PAYMENT_PORT", "8080"))
    app.logger.info('Starting on port {}'.format(port))
    app.run(host='0.0.0.0', port=port)
