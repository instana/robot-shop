#!/bin/sh

if [ -z "$HOST" ]
then
    echo "HOST env not set"
    exit 1
fi

TEST=$(echo "$HOST" | egrep '^http://[a-z]+')
if [ -z "$TEST" ]
then
    echo "Host must start with http://"
    exit 1
fi

locust -f robot-shop.py --host "$HOST" --no-web -c 1 -r 1

