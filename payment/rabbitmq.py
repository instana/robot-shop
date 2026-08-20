import json
import pika
import os
import time

class Publisher:
    HOST = os.getenv('AMQP_HOST', 'rabbitmq')
    VIRTUAL_HOST = '/'
    EXCHANGE='robot-shop'
    TYPE='direct'
    ROUTING_KEY = 'orders'

    def __init__(self, logger):
        self._logger = logger
        self._params = pika.connection.ConnectionParameters(
            host=self.HOST,
            virtual_host=self.VIRTUAL_HOST,
            credentials=pika.credentials.PlainCredentials('guest', 'guest'))
        self._conn = None
        self._channel = None

    def _connect(self):
        if not self._conn or self._conn.is_closed or self._channel is None or self._channel.is_closed:
            attempts = max(1, int(os.getenv('AMQP_CONNECT_ATTEMPTS', '5')))
            delay = max(0, float(os.getenv('AMQP_CONNECT_RETRY_DELAY', '1')))

            for attempt in range(1, attempts + 1):
                try:
                    self._conn = pika.BlockingConnection(self._params)
                    self._channel = self._conn.channel()
                    self._channel.exchange_declare(exchange=self.EXCHANGE, exchange_type=self.TYPE, durable=True)
                    self._logger.info('connected to broker')
                    return
                except (pika.exceptions.AMQPError, OSError) as err:
                    if attempt == attempts:
                        raise
                    self._logger.warning('broker connection failed (attempt %s/%s): %s; retrying',
                                         attempt, attempts, err)
                    time.sleep(delay)

    def _publish(self, msg, headers):
        self._channel.basic_publish(exchange=self.EXCHANGE,
                                    routing_key=self.ROUTING_KEY,
                                    properties=pika.BasicProperties(headers=headers),
                                    body=json.dumps(msg).encode())
        self._logger.info('message sent')

    #Publish msg, reconnecting if necessary.
    def publish(self, msg, headers):
        if self._channel is None or self._channel.is_closed or self._conn is None or self._conn.is_closed:
            self._connect()
        try:
            self._publish(msg, headers)
        except (pika.exceptions.ConnectionClosed, pika.exceptions.StreamLostError):
            self._logger.info('reconnecting to queue')
            self._connect()
            self._publish(msg, headers)

    def close(self):
        if self._conn and self._conn.is_open:
            self._logger.info('closing queue connection')
            self._conn.close()

