import os
import random
from datetime import datetime

from locust import HttpUser, task, between
from random import choice
from random import randint

class UserBehavior(HttpUser):
    wait_time = between(2, 10)

    # source: https://tools.tracemyip.org/search--ip/list
    fake_ip_addresses = [
        # white house
        "156.33.241.5",
        # Hollywood
        "34.196.93.245",
        # Chicago
        "98.142.103.241",
        # Los Angeles
        "192.241.230.151",
        # Berlin
        "46.114.35.116",
        # Singapore
        "52.77.99.130",
        # Sydney
        "60.242.161.215"
    ]

    def on_start(self):
        """ on_start is called when a Locust start before any task is scheduled """
        print('Starting')

    @task
    def login(self):
        fake_ip = random.choice(self.fake_ip_addresses)

        credentials = {
                'name': 'user',
                'password': 'password'
                }
        res = self.client.post('/api/user/login', json=credentials, headers={'x-forwarded-for': fake_ip})
        print('login {}'.format(res.status_code))


    @task
    def load(self):
        fake_ip = random.choice(self.fake_ip_addresses)

        self.client.get('/', headers={'x-forwarded-for': fake_ip})
        user = self.client.get('/api/user/uniqueid', headers={'x-forwarded-for': fake_ip}).json()
        uniqueid = user['uuid']
        print('User {}'.format(uniqueid))

        self.client.get('/api/catalogue/categories', headers={'x-forwarded-for': fake_ip})
        # all products in catalogue
        products = self.client.get('/api/catalogue/products', headers={'x-forwarded-for': fake_ip}).json()
        for i in range(2):
            item = None
            while True:
                item = choice(products)
                if item['instock'] != 0:
                    break

            # vote for item
            if randint(1, 10) <= 3:
                self.client.put('/api/ratings/api/rate/{}/{}'.format(item['sku'], randint(1, 5)), headers={'x-forwarded-for': fake_ip}, name='/api/ratings/api/rate')

            self.client.get('/api/catalogue/product/{}'.format(item['sku']), headers={'x-forwarded-for': fake_ip}, name='/api/catalogue/product')
            self.client.get('/api/ratings/api/fetch/{}'.format(item['sku']), headers={'x-forwarded-for': fake_ip}, name='/api/ratings/api/fetch')
            self.client.get('/api/cart/add/{}/{}/1'.format(uniqueid, item['sku']), headers={'x-forwarded-for': fake_ip}, name='/api/cart/add')

        cart = self.client.get('/api/cart/cart/{}'.format(uniqueid), headers={'x-forwarded-for': fake_ip}, name='/api/cart/cart').json()
        item = choice(cart['items'])
        self.client.get('/api/cart/update/{}/{}/2'.format(uniqueid, item['sku']), headers={'x-forwarded-for': fake_ip}, name='/api/cart/update')

        # country codes
        codes = self.client.get('/api/shipping/codes', headers={'x-forwarded-for': fake_ip}).json()
        # Select a country with many cities to simulate excessive load in shipping service between 10:00 and 10:15 AM.
        if datetime.now().hour == 10 and datetime.now().minute < 15:
            code = next((code for code in codes if code['code'] == 'us'))
        else:
            code = next((code for code in codes if code['code'] == 'ch'))
        city = choice(self.client.get('/api/shipping/cities/{}'.format(code['code']), headers={'x-forwarded-for': fake_ip}, name='/api/shipping/cities').json())
        print('code {} city {}'.format(code, city))
        shipping = self.client.get('/api/shipping/calc/{}'.format(city['uuid']), headers={'x-forwarded-for': fake_ip}, name='/api/shipping/calc').json()
        shipping['location'] = '{} {}'.format(code['name'], city['name'])
        print('Shipping {}'.format(shipping))
        # POST
        cart = self.client.post('/api/shipping/confirm/{}'.format(uniqueid), json=shipping, headers={'x-forwarded-for': fake_ip}, name='/api/shipping/confirm').json()
        print('Final cart {}'.format(cart))

        order = self.client.post('/api/payment/pay/{}'.format(uniqueid), json=cart, headers={'x-forwarded-for': fake_ip}, name='/api/payment/pay').json()
        print('Order {}'.format(order))

    @task
    def error(self):
        fake_ip = random.choice(self.fake_ip_addresses)
        # Simulate payment errors between 2:00 and 2:30 PM
        if os.environ.get('ERROR') == '1' and datetime.now().hour == 14 and datetime.now().minute < 30:
            print('Error request')
            cart = {'total': 0, 'tax': 0}
            self.client.post('/api/payment/pay/partner-57', json=cart, headers={'x-forwarded-for': fake_ip})


