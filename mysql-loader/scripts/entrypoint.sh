#!/bin/sh

echo "Loader starting"

if [ -n "$1"]
then
    exec $@
fi

echo "Connecting to MySQL"
while true
do
    # test connection
    echo "SELECT 1" | mysql --user=root --password=superdba -h mysql mysql > /dev/null 2>&1
    RESULT="$?"
    if [ "$RESULT" -eq 0 ]
    then
        break
    fi
    echo "still waiting"
    sleep 5
done

echo "Processing files"
for FILE in [0-9][0-9]*
do
    echo "$FILE"
    if echo "$FILE" | egrep -q '\.gz$'
    then
        # gzip file
        CAT="zcat"
    else
        CAT="cat"
    fi
    $CAT $FILE | mysql --user=root --password=superdba -h mysql
done
