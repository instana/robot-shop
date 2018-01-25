import os
import sys
import logging
import requests
from flask import Flask
from flask import request

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

    # TDOD - order history

    return 'OK'

if __name__ == "__main__":
    sh = logging.StreamHandler(sys.stdout)
    sh.setLevel(logging.INFO)
    app.logger.addHandler(sh)
    app.logger.setLevel(logging.INFO)
    port = int(os.getenv("PAYMENT_PORT", "8080"))
    app.run(host='0.0.0.0', port=port)
