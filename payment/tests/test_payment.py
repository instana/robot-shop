from unittest.mock import MagicMock, patch

import pytest
import requests

from payment import app, getIntEnv, isValidCart


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as test_client:
        yield test_client


def valid_cart():
    return {
        'items': [
            {'sku': 'ROBOT', 'qty': 1},
            {'sku': 'SHIP', 'qty': 1},
        ],
        'total': 100,
    }


@pytest.mark.parametrize('cart', [None, [], {}, {'items': [], 'total': 100},
                                  {'items': [{'sku': 'ROBOT'}], 'total': 100},
                                  {'items': [{'sku': 'ROBOT', 'qty': 0},
                                             {'sku': 'SHIP', 'qty': 1}], 'total': 100}])
def test_invalid_cart_is_rejected(cart):
    assert isValidCart(cart) is False


def test_valid_cart_is_accepted():
    assert isValidCart(valid_cart()) is True


@pytest.mark.parametrize('value, expected', [('12', 12), ('invalid', 5), (None, 5), ('-2', 0)])
def test_get_int_env_handles_invalid_values(monkeypatch, value, expected):
    if value is None:
        monkeypatch.delenv('TEST_SETTING', raising=False)
    else:
        monkeypatch.setenv('TEST_SETTING', value)

    assert getIntEnv('TEST_SETTING', 5) == expected


@patch('payment.requests.get')
def test_user_service_failure_returns_stable_error(client, get):
    get.side_effect = requests.exceptions.ConnectionError('private host details')

    response = client.post('/pay/user-1', json=valid_cart())

    assert response.status_code == 502
    assert response.data == b'user service unavailable'


@patch('payment.queueOrder')
@patch('payment.requests.delete')
@patch('payment.requests.get')
def test_unexpected_user_status_returns_upstream_error(client, get, delete, queue_order):
    get.return_value = MagicMock(status_code=500)

    response = client.post('/pay/user-1', json=valid_cart())

    assert response.status_code == 502
    assert response.data == b'user service error'
    delete.assert_not_called()
    queue_order.assert_not_called()