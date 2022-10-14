import json
import logging
import os
import sys
import time
import threading
import requests

import mysql.connector

from flask import Flask
from flask import jsonify
from flask import request

from prometheus_flask_exporter import PrometheusMetrics

CATALOGUE_HOST = os.getenv('CATALOGUE_HOST', 'catalogue')
MYSQL_HOST = os.getenv('MYSQL_HOST', 'mysql')
MYSQL_PORT = os.getenv('MYSQL_PORT', '3306')
MYSQL_USER = os.getenv('MYSQL_USER', 'ratings')
MYSQL_PASS = os.getenv('MYSQL_PASS', 'iloveit')

mysql_cnx = None

def path(req):
    ''' Use the first URI segment'''
    return '/' + req.path[1:].split('/')[0]

app = Flask(__name__)
metrics = PrometheusMetrics(app, group_by=path)
app.logger.setLevel(logging.INFO)


@app.errorhandler(Exception)
def exception_handler(err):
    app.logger.exception(str(err))
    return str(err), 500

@app.route('/health', methods=['GET'])
def health():
    status = {'mysql connected': mysql_cnx != None}
    return jsonify(status)

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
        new_avg = ((rating['avg_rating'] * rating['rating_count']) + score) / (rating['rating_count'] + 1)
        cursor = mysql_cnx.cursor()
        query = 'UPDATE ratings SET avg_rating = %s, rating_count = %s WHERE sku = %s'
        values = (new_avg, rating['rating_count'] + 1, sku)
        cursor.execute(query, values)
        mysql_cnx.commit()
    except Exception as err:
        app.logger.error(err)
    finally:
        cursor.close()

'''create rating'''
def add_rating(sku, score):
    try:
        cursor = mysql_cnx.cursor()
        query = 'INSERT INTO ratings (sku, avg_rating, rating_count) VALUES (%s, %s, %s)'
        values = (sku, score, 1)
        cursor.execute(query, values)
        mysql_cnx.commit()
    except Exception as err:
        app.logger.error(err)
    finally:
        cursor.close()

'''Get current rating'''
def get_rating(sku):
    rating = None
    try:
        cursor = mysql_cnx.cursor()
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

def db_connect():
    global mysql_cnx

    app.logger.info('Connecting to MySQL {}:{}'.format(MYSQL_HOST, MYSQL_PORT))
    try:
        mysql_cnx = mysql.connector.connect(
            user=MYSQL_USER,
            password=MYSQL_PASS,
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            database='ratings'
        )
        app.logger.info('MySQL Connected OK')
    except mysql.connector.Error as err:
        app.logger.error(err)
        mysql_cnx = None

    return mysql_cnx == None

'''Loop waiting for MySQL'''
def db_connect_loop():
    while db_connect():
        time.sleep(5)

if __name__ == '__main__':
    # attempt MySQL connection in background
    loop = threading.Thread(target=db_connect_loop, daemon=True)
    loop.start()
    port = int(os.getenv('RATINGS_PORT', '8080'))
    app.logger.info('Listening on {}'.format(port))
    app.run(host='0.0.0.0', port=port)
