import os
import random

from locust import HttpUser, task, between
from utilities.CSVWriter import CSVWriter
from random import choice
from random import randint
from sys import argv
from datetime import date

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

    phplog = None
    php_services_api_prefix = '/api/ratings/api'
    php_service_rate = '/rate'
    php_service_fetch = '/fetch'
    php_fieldnames = ['REQTYPE', 'SERVICE', 'INPUT', 'HEADER']
    my_csv_writer = None

    def on_start(self):
        """ on_start is called when a Locust start before any task is scheduled """
        print('Starting')
        print('LOAD_DEBUG: ', os.environ.get("LOAD_DEBUG"))

        if os.environ.get('LOAD_DEBUG') == '1':
            print("ARGS ARE:\n\"")
            print("\n".join(argv))
            print('End of ARGS printing\n')
            print('on start. php_fieldnames:{}', format(self.php_fieldnames))

        self.my_csv_writer = CSVWriter("logs/php_services_calls.csv", self.php_fieldnames)
        self.phplog = open("logs/phplog.txt", "a")

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
        self.phplog.write('new user, new load task\n')
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

            self.phplog.write('fake_ip: {}\n'.format(fake_ip))

            headers={'x-forwarded-for': fake_ip}
            # vote for item
            if randint(1, 10) <= 3:
                ratevalue = randint(1, 5)
                put_rate_api_str = '{}{}/{}/{}'.format(self.php_services_api_prefix, self.php_service_rate, item['sku'], ratevalue )
                if os.environ.get('LOAD_DEBUG') == '1':
                    self.phplog.write('ratevalue: {}\n'.format(ratevalue))
                    self.phplog.write('item: {}\n'.format(item['sku']))
                    self.phplog.write('put_rate_api_str: {}\n'.format(put_rate_api_str))
                    self.phplog.flush()
                self.my_csv_writer.writerow({'REQTYPE': 'PUT', 'SERVICE': '{}'.format(self.php_service_rate), 'INPUT': '{}/{}'.format(item['sku'], ratevalue ), 'HEADER': '{}'.format(headers)})
                self.client.put(put_rate_api_str, headers)

            self.client.get('/api/catalogue/product/{}'.format(item['sku']), headers={'x-forwarded-for': fake_ip})

            get_rate_api_str = '{}{}/{}'.format(self.php_services_api_prefix, self.php_service_fetch, item['sku'])
            if os.environ.get('LOAD_DEBUG') == '1':
                self.phplog.write('item: {}\n'.format(item['sku']))
                self.phplog.write('get_rate_api_str: {}\n'.format(get_rate_api_str))
                self.phplog.flush()
            self.my_csv_writer.writerow({'REQTYPE': 'GET', 'SERVICE': '{}'.format(self.php_service_fetch), 'INPUT': '{}'.format(item['sku']), 'HEADER': '{}'.format(headers) })
            self.client.get(get_rate_api_str, headers={'x-forwarded-for': fake_ip})

            self.client.get('/api/cart/add/{}/{}/1'.format(uniqueid, item['sku']), headers={'x-forwarded-for': fake_ip})

        cart = self.client.get('/api/cart/cart/{}'.format(uniqueid), headers={'x-forwarded-for': fake_ip}).json()
        item = choice(cart['items'])
        self.client.get('/api/cart/update/{}/{}/2'.format(uniqueid, item['sku']), headers={'x-forwarded-for': fake_ip})

        # country codes
        code = choice(self.client.get('/api/shipping/codes', headers={'x-forwarded-for': fake_ip}).json())
        city = choice(self.client.get('/api/shipping/cities/{}'.format(code['code']), headers={'x-forwarded-for': fake_ip}).json())
        print('code {} city {}'.format(code, city))
        shipping = self.client.get('/api/shipping/calc/{}'.format(city['uuid']), headers={'x-forwarded-for': fake_ip}).json()
        shipping['location'] = '{} {}'.format(code['name'], city['name'])
        print('Shipping {}'.format(shipping))
        # POST
        cart = self.client.post('/api/shipping/confirm/{}'.format(uniqueid), json=shipping, headers={'x-forwarded-for': fake_ip}).json()
        print('Final cart {}'.format(cart))

        order = self.client.post('/api/payment/pay/{}'.format(uniqueid), json=cart, headers={'x-forwarded-for': fake_ip}).json()
        print('Order {}'.format(order))

    @task
    def error(self):
        fake_ip = random.choice(self.fake_ip_addresses)
        if os.environ.get('ERROR') == '1':
            print('Error request')
            cart = {'total': 0, 'tax': 0}
            self.client.post('/api/payment/pay/partner-57', json=cart, headers={'x-forwarded-for': fake_ip})


