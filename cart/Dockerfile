FROM node:16

EXPOSE 8080

WORKDIR /opt/server

COPY package.json /opt/server/

RUN npm install

COPY server.js /opt/server/
COPY tracing.js /opt/server/


CMD ["node", "-r", "./tracing.js", "server.js"]

