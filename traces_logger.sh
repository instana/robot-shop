#!/bin/bash -x
# The script starts a dockerised instana-agent that is logging all the traces

AGENT_STATIC_IMAGE=containers.instana.io/instana/release/agent/static:latest
AGENT_DYNAMIC_IMAGE=instana/agent:latest
INSTANA_AGENT_LOGS_VOLUME_DEFAULT="${PWD}/agent/logs"

# get the agent image info
eval $(egrep '[A-Z]+=' .env | egrep -v "^#[ ]*")

if [ ! -v $AGENT_IMAGE ]; then 
  echo "Info: the AGENT_IMAGE variable is not set. The agent image will be set to a default choice. If you want a different behaviour, please set AGENT_IMAGE in your .env file and restart the process."; 
fi;

if [ ! -v $INSTANA_AGENT_LOGS_VOLUME ]; then 
  echo "Info: the INSTANA_AGENT_LOGS_VOLUME variable is not set. The agent image will be set to a default choice. If you want a different behaviour, please set INSTANA_AGENT_LOGS_VOLUME in your .env file and restart the process."; 
  INSTANA_AGENT_LOGS_VOLUME=${INSTANA_AGENT_LOGS_VOLUME_DEFAULT}
fi

rm -f "${INSTANA_AGENT_LOGS_VOLUME}/*.log"
mkdir -p ${INSTANA_AGENT_LOGS_VOLUME}

#CHECKING THE NETWORK REQUIREMENTS
docker network ls|egrep "robot-shop_robot-shop" > /dev/null 2>&1
Ret=$?

if [ $Ret != 0 ]; then
  echo "Warning: robot-shop dedicated network doesn't exist, the script will attempt to create it."
  docker network create "robot-shop_robot-shop" > /dev/null 2>&1
  Ret=$?
  if [ $Ret != 0 ]; then
    echo "Warning: it was not possible to create robot-shop dedicated network. Possibly docker-compose will fix this itch, good luck :-) "
  else
    echo "Info: it was possible to create robot-shop dedicated network. "
  fi
fi

echo "Starting the traces-logging agent in the backgroud"
docker-compose -f agent.yaml up -d
echo "Info: the docker agent container is running. You can check the current operations with \"tail -100f agent/logs/agent.log\""

echo "Check: waiting for the agent discovery-time"
# wait for for sensors discovery a maximum of 10 minutes
elapsedTime=5
while [ $elapsedTime -lt 300 ]; do
  if [[ $(grep -i -c "Discovery time" ${INSTANA_AGENT_LOGS_VOLUME}/agent.log) -gt 1 ]]; then
    break
  else
    echo "Check: Process discovery not completed after $elapsedTime s. Retrying ..."
    ((elapsedTime += 5))
    sleep 5
  fi
done
# wait one minute to catch possible errors in PID sensor activation
echo "Check: waiting to catch possible errors in PID sensor activation"
sleep 60

echo "Info: starting robot-shop apps"
docker-compose -f docker-compose.yaml up -d

cd load-gen
./load-gen.sh -v
