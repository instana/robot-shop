import os
import sys
import time
import logging
import uuid
import requests
from flask import Flask
from flask import request
from flask import jsonify
from rabbitmq import Publisher

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return 'OK'

@app.route('/pay/<id>', methods=['POST'])
def pay(id):
    app.logger.info('payment for {}'.format(id))
    cart = request.get_json()
    app.logger.info(cart)

    # dummy call to Paypal, hope they dont object
    req = requests.get('https://paypal.com/')
    app.logger.info('paypal returned {}'.format(req.status_code))

    # Generate order id
    orderid = str(uuid.uuid4())
    queueOrder({ 'orderid': orderid, 'user': id, 'cart': cart })

    # TDOD - order history

    return jsonify({ 'orderid': orderid })


def queueOrder(order):
    app.logger.info('queue order')
    publisher.publish(order)

# RabbitMQ
publisher = Publisher(app.logger)

if __name__ == "__main__":
    sh = logging.StreamHandler(sys.stdout)
    sh.setLevel(logging.INFO)
    app.logger.addHandler(sh)
    app.logger.setLevel(logging.INFO)
    port = int(os.getenv("SHOP_PAYMENT_PORT", "8080"))
    app.run(host='0.0.0.0', port=port)
