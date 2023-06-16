import os
import logging
import threading
import time
import sys
import mysql.connector

class DB():
    MYSQL_HOST = os.getenv('SHOP_MYSQL_HOST', 'mysql')
    MYSQL_PORT = os.getenv('SHOP_MYSQL_PORT', '3306')
    MYSQL_USER = os.getenv('SHOP_MYSQL_USER', 'ratings')
    MYSQL_PASS = os.getenv('SHOP_MYSQL_PASS', 'iloveit')

    mysql_pool_cnx = None

    def __init__(self):
        self.logger = logging.getLogger('DB')
        self.logger.setLevel(logging.INFO)
        h = logging.StreamHandler(sys.stdout)
        f = logging.Formatter(logging.BASIC_FORMAT)
        h.setLevel(logging.INFO)
        h.setFormatter(f)
        self.logger.addHandler(h)
        t = threading.Thread(target=self.db_connect, daemon=True)
        t.start()

    def db_connect(self):
        while True:
            if self.mysql_pool_cnx == None or self.mysql_pool_cnx.is_connected() == False:
                try:
                    self.logger.info('Connecting to MySQL {}:{}'.format(self.MYSQL_HOST, self.MYSQL_PORT))
                    self.mysql_pool_cnx = mysql.connector.connect(
                        host=self.MYSQL_HOST,
                        port=self.MYSQL_PORT,
                        user=self.MYSQL_USER,
                        password=self.MYSQL_PASS,
                        database='ratings',
                        pool_name='ratings',
                        pool_size=10,
                        pool_reset_session=True
                    )
                    self.logger.info('Connected OK')
                except Exception as err:
                    self.logger.error(err)
                    self.mysql_pool_cnx = None
            time.sleep(3)
    
    def get_pool(self):
        return self.mysql_pool_cnx
    
    def status(self):
        return self.mysql_pool_cnx != None and self.mysql_pool_cnx.is_connected()

