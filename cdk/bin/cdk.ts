#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RobotShopFargateStack } from '../lib/robotShop-fargate';
import { RobotShopEcsStack } from '../lib/robotShop-ecs';
import { InstanaAgentStack, InstanaEnvPropsClassic, InstanaEnvPropsEum, InstanaEnvPropsServerless } from '../lib/instanaAgent';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

//const instanaEnvProps = undefined;
// Uncomment to configure Instana
const instanaEnvPropsServerless: InstanaEnvPropsServerless = {

    "INSTANA_AGENT_KEY": "<Your key>",
    "INSTANA_ENDPOINT_URL": "https://serverless-green-saas.instana.io"
}

const instanaEnvPropsClassic: InstanaEnvPropsClassic = {
    "INSTANA_AGENT_KEY": "<Your key>",
    "INSTANA_AGENT_ENDPOINT": "ingress-green-saas.instana.io",
    "INSTANA_AGENT_ENDPOINT_PORT": "443"
}

const instanaEnvPropsEum: InstanaEnvPropsEum = {
    "INSTANA_EUM_KEY": "<Your EUM key>",
    "INSTANA_EUM_REPORTING_URL": "https://eum-green-saas.instana.io"
}


const app = new cdk.App();
new RobotShopFargateStack(app, 'RobotShop-fargate', { env }, instanaEnvPropsServerless, instanaEnvPropsEum);
new RobotShopEcsStack(app, 'RobotShop-ecs', { env }, instanaEnvPropsClassic, instanaEnvPropsEum);
new InstanaAgentStack(app, 'InstanaAwsSensor', { env }, instanaEnvPropsClassic);

app.synth();