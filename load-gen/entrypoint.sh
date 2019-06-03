#!/bin/sh

# set -x

if [ -z "$HOST" ]
then
    echo "HOST env not set"
    exit 1
fi

if [ $RUN_TIME -eq 0  -o $NUM_CLIENTS -eq 1 ]
then
    unset RUN_TIME
fi

echo "Starting load with $NUM_CLIENTS clients"
if [ $NUM_CLIENTS -gt 1 -a -n "$RUN_TIME" ]
then
    echo "Looping every $RUN_TIME"
fi

while true
do
    for CLIENTS in $NUM_CLIENTS 1
    do
        if [ -n "$RUN_TIME" ]
        then
            TIME="-t $RUN_TIME"
        else
            unset TIME
        fi
        echo "Starting $CLIENTS clients for ${RUN_TIME:-ever}"
        if [ "$SILENT" -eq 1 ]
        then
            locust -f robot-shop.py --host "$HOST" --no-web -r 1 -c $CLIENTS $TIME > /dev/null 2>&1
        else
            locust -f robot-shop.py --host "$HOST" --no-web -r 1 -c $CLIENTS $TIME
        fi
    done
done

