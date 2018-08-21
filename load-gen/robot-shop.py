from locust import HttpLocust, TaskSet, task
from random import choice
from random import randint

class UserBehavior(TaskSet):
    def on_start(self):
        """ on_start is called when a Locust start before any task is scheduled """
        print('Starting')

    @task
    def login(self):
        credentials = {
                'name': 'user',
                'password': 'password'
                }
        res = self.client.post('/api/user/login', json=credentials)
        print('login {}'.format(res.status_code))


    @task
    def load(self):
        self.client.get('/')
        user = self.client.get('/api/user/uniqueid').json()
        uniqueid = user['uuid']
        print('User {}'.format(uniqueid))

        self.client.get('/api/catalogue/categories')
        # all products in catalogue
        products = self.client.get('/api/catalogue/products').json()
        for i in range(2):
            item = None
            while True:
                item = choice(products)
                if item['instock'] != 0:
                    break

            # vote for item
            if randint(1, 10) <= 3:
                self.client.put('/api/ratings/api/rate/{}/{}'.format(item['sku'], randint(1, 5)))

            self.client.get('/api/catalogue/product/{}'.format(item['sku']))
            self.client.get('/api/ratings/api/fetch/{}'.format(item['sku']))
            self.client.get('/api/cart/add/{}/{}/1'.format(uniqueid, item['sku']))

        cart = self.client.get('/api/cart/cart/{}'.format(uniqueid)).json()
        item = choice(cart['items'])
        self.client.get('/api/cart/update/{}/{}/2'.format(uniqueid, item['sku']))

        # country codes
        code = choice(self.client.get('/api/shipping/codes').json())
        city = choice(self.client.get('/api/shipping/cities/{}'.format(code['code'])).json())
        print('code {} city {}'.format(code, city))
        shipping = self.client.get('/api/shipping/calc/{}'.format(city['uuid'])).json()
        shipping['location'] = '{} {}'.format(code['name'], city['name'])
        print('Shipping {}'.format(shipping))
        # POST
        cart = self.client.post('/api/shipping/confirm/{}'.format(uniqueid), json=shipping).json()
        print('Final cart {}'.format(cart))

        order = self.client.post('/api/payment/pay/{}'.format(uniqueid), json=cart).json()
        print('Order {}'.format(order))


class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    min_wait = 1000
    max_wait = 5000
