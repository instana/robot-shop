#!/bin/sh

# set -x

# Changing the NUM_CLIENTS environment variable varies the load on the application
# The bigger the number the more requests, the bigger the load
NUM_CLIENTS=1

# HOST where Stan's Robot Shop web UI is running
HOST="http://localhost:8080"

# Error flag
ERROR=0

# Daemon flag
DAEMON="-it"
SILENT=0

USAGE="\nloadgen.sh\n\te - error flag\n\td - run in background\n\tn - number of clients\n\th - target host\n"

if [ ! -f ../.env ]
then
    echo "Please run this script from the load-gen directory"
    exit 1
fi

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

while getopts 'edn:h:' OPT
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
            ;;
        h)
            HOST=$OPTARG
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
    -e "SILENT=$SILENT" \
    -e "ERROR=$ERROR" \
    ${REPO}/rs-load:${TAG}

