import logging
import os
import time
import threading
import requests
import pprint

import mysql.connector

from flask import Flask
from flask import jsonify
from flask import request

import db

CATALOGUE_HOST = os.getenv('SHOP_CATALOGUE_HOST', 'catalogue')

from prometheus_flask_exporter import PrometheusMetrics

def path(req):
    ''' Use the first URI segment'''
    return '/' + req.path[1:].split('/')[0]

db = db.DB()

app = Flask(__name__)
metrics = PrometheusMetrics(app, group_by=path)
app.logger.setLevel(logging.INFO)


@app.errorhandler(Exception)
def exception_handler(err):
    app.logger.exception(str(err))
    return str(err), 500


@app.route('/health', methods=['GET'])
def health():
    status = {'health': True}
    return jsonify(status)

'''Depends on MySQL connection to serve requests'''
@app.route('/ready', methods=['GET'])
def ready():
    # test connection
    if db.status():
        return 'ready'
    else:
        return 'not ready', 404

@app.route('/api/rate/<sku>/<score>', methods=['PUT'])
def add_rating(sku, score):
    # validate score
    val = 0
    try:
        val = int(score)
    except ValueError as err:
        return 'score is not a number', 400
    
    val = min(max(1, val), 5)

    # check sku exists
    product = get_product(sku)
    if product == None:
        return 'sku not found', 404
    else:
        rating = get_rating(sku)
        if rating['rating_count'] == 0:
            # no rating yet
            add_rating(sku, val)
        else:
            update_rating(sku, val)

    return 'OK'

@app.route('/api/fetch/<sku>', methods=['GET'])
def fetch_rating(sku):
    product = get_product(sku)
    if product == None:
        return 'sku not found', 404
    else:
        rating = get_rating(sku)
        app.logger.info('rating {}'.format(rating))
        return jsonify(rating)

'''upadate rating'''
def update_rating(sku, score):
    try:
        rating = get_rating(sku)
        app.logger.info('current rating {}'.format(rating))
        # iffy maths
        # TODO - implement moving average
        new_avg = ((rating['avg_rating'] * rating['rating_count']) + score) / (rating['rating_count'] + 1)
        connection = mysql.connector.connect(pool_name='ratings')
        cursor = connection.cursor()
        query = 'UPDATE ratings SET avg_rating = %s, rating_count = %s WHERE sku = %s'
        values = (new_avg, rating['rating_count'] + 1, sku)
        cursor.execute(query, values)
        connection.commit()
    except Exception as err:
        app.logger.error(err)
    finally:
        cursor.close()
        connection.close()

'''create rating'''
def add_rating(sku, score):
    try:
        connection = mysql.connector.connect(pool_name='ratings')
        cursor = connection.cursor()
        query = 'INSERT INTO ratings (sku, avg_rating, rating_count) VALUES (%s, %s, %s)'
        values = (sku, score, 1)
        cursor.execute(query, values)
        connection.commit()
    except Exception as err:
        app.logger.error(err)
    finally:
        cursor.close()
        connection.close()

'''Get current rating'''
def get_rating(sku):
    rating = None
    try:
        connection = mysql.connector.connect(pool_name='ratings')
        cursor = connection.cursor()
        query = 'SELECT avg_rating, rating_count FROM ratings WHERE sku = %s'
        cursor.execute(query, (sku,))
        row = cursor.fetchone()
        if row != None:
            rating = {
                'sku': sku,
                'avg_rating': float(round(row[0], 1)),
                'rating_count': row[1]
            }
        else:
            # empty rating
            rating = {
                'sku': sku,
                'avg_rating': 0,
                'rating_count': 0
            }
    except Exception as err:
        app.logger.error(err)
    finally:
        cursor.close()
        connection.close()
    
    return rating


'''Get product from catalogue service by sku'''
def get_product(sku):
    product = None
    try:
        req = requests.get('http://{}:8080/product/{}'.format(CATALOGUE_HOST, sku))
        if req.status_code == 200:
            product = req.json()
    except requests.exceptions.RequestException as err:
        app.logger.error(err)
        
    return product


if __name__ == '__main__':
    port = int(os.getenv('SHOP_RATINGS_PORT', '8080'))
    app.logger.info('Listening on {}'.format(port))
    app.run(host='0.0.0.0', port=port)
