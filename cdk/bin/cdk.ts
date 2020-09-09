#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RobotShopFargateStack } from '../lib/robotShop-fargate';
import { RobotShopEcsStack } from '../lib/robotShop-ecs';
import { InstanaAgentStack, InstanaEnvProps } from '../lib/instanaAgent';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

const instanaEnvProps = undefined;
// Uncomment to configure Instana
// See: https://www.instana.com/docs/setup_and_manage/endpoints_and_keys for correct URLs.
/*const instanaEnvProps: InstanaEnvProps = {
    "INSTANA_ENDPOINT_URL": "https://serverless-<COLOR>-saas.instana.io",
    "INSTANA_AGENT_KEY": "<Your key>",
    "INSTANA_AGENT_ENDPOINT": "ingress-<COLOR>-saas.instana.io",
    "INSTANA_AGENT_ENDPOINT_PORT": "443",
    "INSTANA_EUM_KEY": "<Your key>",
    "INSTANA_EUM_REPORTING_URL": "https://eum-<COLOR>-saas.instana.io"
}*/

const app = new cdk.App();
new RobotShopFargateStack(app, 'RobotShop-fargate', { env }, instanaEnvProps);
new RobotShopEcsStack(app, 'RobotShop-ecs', { env }, instanaEnvProps);
new InstanaAgentStack(app, 'InstanaAwsSensor', { env }, instanaEnvProps);

app.synth();