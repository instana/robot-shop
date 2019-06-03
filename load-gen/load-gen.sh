#!/bin/sh

# set -x

# Changing the NUM_CLIENTS environment variable varies the load on the application
# The bigger the number the more requests, the bigger the load
NUM_CLIENTS=1

# Time to run with NUM_CLIENTS e.g. 1h
RUN_TIME=0

# HOST where Stan's Robot Shop web UI is running
HOST="http://localhost:8080"

# Error flag
ERROR=0

# Daemon flag
DAEMON="-it"
SILENT=0

USAGE="\

loadgen.sh

e - error flag
d - run in background
n - number of clients
t - time to run n clients
h - target host
"

if [ ! -f ../.env ]
then
    echo "Please run this script from the load-gen directory"
    exit 1
fi

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

while getopts 'edn:t:h:' OPT
do
    case $OPT in
        e)
            ERROR=1
            ;;
        d)
            DAEMON="-d"
            SILENT=1
            ;;
        n)
            NUM_CLIENTS=$OPTARG
            if echo "$NUM_CLIENTS" | egrep -q '^[0-9]+$'
            then
                CLIENTS=${NUM_CLIENTS:-1}
                echo "Running $CLIENTS clients"
            else
                echo "$NUM_CLIENTS is not a number falling back to 1"
                CLIENTS=1
            fi
            ;;
        t)
            RUN_TIME=$OPTARG
            if echo "$RUN_TIME" | egrep -q '^([0-9]+h)?([0-9]+m)?$'
            then
                echo "Run time set to $RUN_TIME"
            else
                echo "Time format 1h30m"
                echo "$USAGE"
                exit 1
            fi
            ;;
        h)
            HOST=$OPTARG
            if echo "$HOST" | egrep '^http://[a-z0-9]+'
            then
                echo "Host $HOST"
            else
                echo "Host must start http://"
                echo "$USAGE"
                exit 1
            fi
            ;;
        *)
            echo "$USAGE"
            exit 1
            ;;
    esac
done

docker run \
    $DAEMON \
    --name loadgen \
    --rm \
    --network=host \
    -e "HOST=$HOST" \
    -e "NUM_CLIENTS=$NUM_CLIENTS" \
    -e "RUN_TIME=$RUN_TIME" \
    -e "SILENT=$SILENT" \
    -e "ERROR=$ERROR" \
    ${REPO}/rs-load:${TAG}

