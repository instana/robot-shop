#!/bin/sh

if [ -z "$HOST" ]
then
    echo "HOST env not set"
    exit 1
fi

TEST=$(echo "$HOST" | egrep '^http://[a-z0-9]+')
if [ -z "$TEST" ]
then
    echo "Host must start with http://"
    exit 1
fi

if echo "$NUM_CLIENTS" | egrep -q '^[0-9]+$'
then
    CLIENTS=${NUM_CLIENTS:-1}
else
    echo "$NUM_CLIENTS is not a number falling back to 1"
    CLIENTS=1
fi

echo "Starting load with $CLIENTS clients"

if [ -n "$SILENT" ]
then
    locust -f robot-shop.py --host "$HOST" --no-web -c $CLIENTS -r 1 > /dev/null 2>&1
else
    locust -f robot-shop.py --host "$HOST" --no-web -c $CLIENTS -r 1
fi

