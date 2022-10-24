#!/bin/sh

# set -x

YAML=$(mktemp)
trap "rm -f $YAML" 0 1 2 3

clear

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

# Kubernetes flag
KUBERNETES=0

USAGE="\

loadgen.sh

e - error flag
d - run in background
n - number of clients
t - time to run n clients
h - target host
k - deploy on Kubernetes
"

if [ ! -f ../.env ]
then
    echo "Please run this script from the load-gen directory"
    exit 1
fi

# get the tag info
for VAR in $(egrep '[A-Z]+=' ../.env)
do
    eval $VAR
done

echo "Repo $REPO"
echo "Tag $LOAD_TAG"
IMAGE="${REPO}/robot-shop-rs-load:${LOAD_TAG}"

while getopts 'edn:t:h:k' OPT
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
        k)
            # test for yq and k
            if ! which yq kubectl
            then
                echo "yq and/or kubectl not found on PATH"
                echo "Bye"
                exit 1
            fi
            cat load-gen-dep.yaml > $YAML
            KUBERNETES=1
            ;;
        *)
            echo "$USAGE"
            exit 1
            ;;
    esac
done

/bin/echo -n "Deploying to "
if [ $KUBERNETES -eq 0 ]
then
    echo "Docker"
else
    echo "Kubernetes"
    # overrides for K8s
    SILENT=1
    RUN_TIME=0
fi
echo "HOST=$HOST"
echo "NUM_CLIENTS=$NUM_CLIENTS"
echo "RUN_TIME=$RUN_TIME"
echo "SILENT=$SILENT"
echo "ERROR=$ERROR"
echo ""
read -p "Continue <y/n>? " ANS
if [ "$ANS" != "y" ]
then
    echo "Bye"
    exit
fi

if [ $KUBERNETES -eq 0 ]
then
    echo "Running load generation in Docker"
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
        $IMAGE
else
    echo "Deploying load generation to Kubernetes"
    yq -i '.spec.template.spec.containers[0].image = "'$IMAGE'"' $YAML

    yq -i '.spec.template.spec.containers[0] |= ({"env": [{"name": "HOST", "value": "'$HOST'"}]} + .)' $YAML
    yq -i '.spec.template.spec.containers[0].env += {"name": "NUM_CLIENTS", "value": "'$NUM_CLIENTS'"}' $YAML
    yq -i '.spec.template.spec.containers[0].env += {"name": "RUN_TIME", "value": "'$RUN_TIME'"}' $YAML
    yq -i '.spec.template.spec.containers[0].env += {"name": "SILENT", "value": "'$SILENT'"}' $YAML
    yq -i '.spec.template.spec.containers[0].env += {"name": "ERROR", "value": "'$ERROR'"}' $YAML

    cat $YAML
    kubectl apply -f $YAML
fi
