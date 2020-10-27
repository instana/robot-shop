#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RobotShopFargateStack } from '../lib/robotShop-fargate';
import { RobotShopEcsStack } from '../lib/robotShop-ecs';
import { InstanaEnvProps } from '../lib/instanaAgent';

const instanaEnvProps = undefined;
// Uncomment to configure Instana
/*
const instanaEnvProps: InstanaEnvProps = {
    "INSTANA_AGENT_ENDPOINT": "ingress-blue-saas.instana.io",
    "INSTANA_AGENT_ENDPOINT_PORT": "443",
    "INSTANA_AGENT_KEY": "<your key>",
    "INSTANA_EUM_KEY": "<your eum key>",
    "INSTANA_EUM_REPORTING_URL": "https://eum-eu-west-1.instana.io"    
}*/

const app = new cdk.App();
new RobotShopFargateStack(app, 'RobotShop-fargate',{}, instanaEnvProps);
new RobotShopEcsStack(app, 'RobotShop-ecs', {}, instanaEnvProps);
//new InstanaAgentStack(app, 'InstanaAwsAgent');
