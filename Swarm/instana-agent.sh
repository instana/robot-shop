#!/bin/sh

# Config here
KEY="your unique key"
ENDPOINT="endpoint for your tennant"
# end of config

for MACHINE in $(docker-machine ls -q)
do
    echo "starting agent on $MACHINE"
    eval $(docker-machine env $MACHINE)
    docker run \
      -d \
      --rm \
      --name instana-agent \
      --volume /var/run/docker.sock:/var/run/docker.sock \
      --volume /dev:/dev \
      --volume /sys:/sys \
      --volume /var/log:/var/log \
      --privileged \
      --net=host \
      --pid=host \
      --ipc=host \
      --env="INSTANA_AGENT_KEY=$KEY" \
      --env="INSTANA_AGENT_ENDPOINT=$ENDPOINT" \
      --env="INSTANA_AGENT_ENDPOINT_PORT=443" \
      --env="INSTANA_AGENT_ZONE=Stans-Robot-Shop" \
      --env="INSTANA_AGENT_HTTP_LISTEN=*" \
      instana/agent
done

