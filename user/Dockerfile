FROM node:10

COPY --from=containers.instana.io/instana/release/aws/fargate/nodejs /instana /instana
RUN /instana/setup.sh
ENV NODE_OPTIONS="--require /instana/node_modules/@instana/aws-fargate"

# ENV INSTANA_AUTO_PROFILE true

EXPOSE 8080

WORKDIR /opt/server

COPY package.json /opt/server/

RUN npm install

COPY server.js /opt/server/

CMD ["node", "server.js"]

