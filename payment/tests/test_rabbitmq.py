from unittest.mock import MagicMock, call, patch

import pika
import pytest

from rabbitmq import Publisher


@pytest.fixture
def logger():
    return MagicMock()


@pytest.fixture
def publisher(logger):
    return Publisher(logger)


def make_conn(channel=None):
    conn = MagicMock()
    conn.channel.return_value = channel or MagicMock()
    return conn


class TestConnect:
    @patch('rabbitmq.pika.BlockingConnection')
    def test_connects_on_first_attempt(self, blocking_connection, publisher, logger):
        channel = MagicMock()
        blocking_connection.return_value = make_conn(channel)

        publisher._connect()

        blocking_connection.assert_called_once_with(publisher._params)
        channel.exchange_declare.assert_called_once_with(
            exchange=Publisher.EXCHANGE, exchange_type=Publisher.TYPE, durable=True)
        assert publisher._conn is blocking_connection.return_value
        assert publisher._channel is channel
        logger.info.assert_called_once_with('connected to broker')

    @patch('rabbitmq.pika.BlockingConnection')
    def test_skips_connect_when_already_open(self, blocking_connection, publisher):
        conn = make_conn()
        conn.is_closed = False
        channel = conn.channel.return_value
        channel.is_closed = False
        publisher._conn = conn
        publisher._channel = channel

        publisher._connect()

        blocking_connection.assert_not_called()

    @patch('time.sleep')
    @patch('rabbitmq.pika.BlockingConnection')
    def test_retries_then_succeeds(self, blocking_connection, sleep, publisher, logger, monkeypatch):
        monkeypatch.setenv('AMQP_CONNECT_ATTEMPTS', '3')
        monkeypatch.setenv('AMQP_CONNECT_RETRY_DELAY', '2')
        channel = MagicMock()
        blocking_connection.side_effect = [
            pika.exceptions.AMQPConnectionError('down'),
            OSError('network unreachable'),
            make_conn(channel),
        ]

        publisher._connect()

        assert blocking_connection.call_count == 3
        assert sleep.call_args_list == [call(2.0), call(2.0)]
        assert logger.warning.call_count == 2
        logger.info.assert_called_once_with('connected to broker')
        assert publisher._channel is channel

    @patch('time.sleep')
    @patch('rabbitmq.pika.BlockingConnection')
    def test_raises_after_exhausting_attempts(self, blocking_connection, sleep, publisher, logger, monkeypatch):
        monkeypatch.setenv('AMQP_CONNECT_ATTEMPTS', '3')
        monkeypatch.setenv('AMQP_CONNECT_RETRY_DELAY', '0')
        err = pika.exceptions.AMQPConnectionError('down')
        blocking_connection.side_effect = err

        with pytest.raises(pika.exceptions.AMQPConnectionError):
            publisher._connect()

        assert blocking_connection.call_count == 3
        assert sleep.call_count == 2
        assert logger.warning.call_count == 2
        logger.info.assert_not_called()

    @patch('rabbitmq.pika.BlockingConnection')
    def test_default_attempts_is_five(self, blocking_connection, publisher, monkeypatch):
        monkeypatch.delenv('AMQP_CONNECT_ATTEMPTS', raising=False)
        monkeypatch.delenv('AMQP_CONNECT_RETRY_DELAY', raising=False)
        blocking_connection.side_effect = pika.exceptions.AMQPConnectionError('down')

        with patch('time.sleep'):
            with pytest.raises(pika.exceptions.AMQPConnectionError):
                publisher._connect()

        assert blocking_connection.call_count == 5

    @patch('rabbitmq.pika.BlockingConnection')
    def test_attempts_env_var_below_one_is_clamped_to_one(self, blocking_connection, publisher, monkeypatch):
        monkeypatch.setenv('AMQP_CONNECT_ATTEMPTS', '0')
        blocking_connection.side_effect = pika.exceptions.AMQPConnectionError('down')

        with pytest.raises(pika.exceptions.AMQPConnectionError):
            publisher._connect()

        assert blocking_connection.call_count == 1


class TestPublish:
    def test_connects_when_no_channel_yet(self, publisher):
        publisher._connect = MagicMock(side_effect=lambda: setattr(publisher, '_channel', MagicMock()))
        publisher._publish = MagicMock()

        publisher.publish({'foo': 'bar'}, {'h': 1})

        publisher._connect.assert_called_once()
        publisher._publish.assert_called_once_with({'foo': 'bar'}, {'h': 1})

    def test_does_not_reconnect_when_channel_open(self, publisher):
        channel = MagicMock(is_closed=False)
        conn = MagicMock(is_closed=False)
        publisher._channel = channel
        publisher._conn = conn
        publisher._connect = MagicMock()
        publisher._publish = MagicMock()

        publisher.publish({'foo': 'bar'}, {})

        publisher._connect.assert_not_called()
        publisher._publish.assert_called_once_with({'foo': 'bar'}, {})

    def test_reconnects_and_retries_once_on_connection_closed(self, publisher):
        channel = MagicMock(is_closed=False)
        conn = MagicMock(is_closed=False)
        publisher._channel = channel
        publisher._conn = conn
        publisher._connect = MagicMock()
        publisher._publish = MagicMock(side_effect=[pika.exceptions.ConnectionClosed(200, 'bye'), None])

        publisher.publish({'foo': 'bar'}, {})

        publisher._connect.assert_called_once()
        assert publisher._publish.call_count == 2

    def test_reconnects_on_stream_lost_error(self, publisher):
        channel = MagicMock(is_closed=False)
        conn = MagicMock(is_closed=False)
        publisher._channel = channel
        publisher._conn = conn
        publisher._connect = MagicMock()
        publisher._publish = MagicMock(side_effect=[pika.exceptions.StreamLostError('lost'), None])

        publisher.publish({'foo': 'bar'}, {})

        publisher._connect.assert_called_once()
        assert publisher._publish.call_count == 2

    def test_publish_serializes_body_and_sets_routing(self, publisher, logger):
        channel = MagicMock(is_closed=False)
        conn = MagicMock(is_closed=False)
        publisher._channel = channel
        publisher._conn = conn

        publisher.publish({'id': 42}, {'trace': 'abc'})

        args, kwargs = channel.basic_publish.call_args
        assert kwargs['exchange'] == Publisher.EXCHANGE
        assert kwargs['routing_key'] == Publisher.ROUTING_KEY
        assert kwargs['body'] == b'{"id": 42}'
        assert kwargs['properties'].headers == {'trace': 'abc'}
        logger.info.assert_called_with('message sent')


class TestClose:
    def test_closes_open_connection(self, publisher, logger):
        conn = MagicMock(is_open=True)
        publisher._conn = conn

        publisher.close()

        conn.close.assert_called_once()
        logger.info.assert_called_once_with('closing queue connection')

    def test_noop_when_connection_closed(self, publisher):
        conn = MagicMock(is_open=False)
        publisher._conn = conn

        publisher.close()

        conn.close.assert_not_called()

    def test_noop_when_never_connected(self, publisher):
        publisher.close()
