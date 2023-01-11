#!/bin/sh

PASSWORD=${MYSQL_ROOT_PASSWORD:-"superdba"}

log() {
    MSG="$1"
    TS=$(date -Iseconds)
    echo "${TS} ${MSG}"
}

log "Loader starting"

if [ -n "$1"]
then
    exec $@
fi

log "Connecting to MySQL"
while true
do
    # test connection
    echo "SELECT 1" | mysql --user=root --password=${PASSWORD} -h mysql --connect-timeout=2 mysql > /dev/null 2>&1
    RESULT="$?"
    if [ "$RESULT" -eq 0 ]
    then
        break
    fi
    log "still waiting"
    sleep 5
done

log "Processing files"
for FILE in [0-9][0-9]*
do
    log "$FILE"
    if echo "$FILE" | egrep -q '\.gz$'
    then
        # gzip file
        CAT="zcat"
    else
        CAT="cat"
    fi
    $CAT $FILE | mysql --user=root --password=${PASSWORD} -h mysql
done

# keep idling to prevent restarts
log "Finished loading"
while true
do
    log "sleeping"
    sleep 5
done
