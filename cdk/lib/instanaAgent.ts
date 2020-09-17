import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";

export interface InstanaEnvPropsServerless {
  /**
   * Your agent key.
   */
  INSTANA_AGENT_KEY: string,
  /**
   * Your This is your serverless monitoring endpoint. Make sure to use the correct value for your region that starts with `https://serverless-`.
   */
  INSTANA_ENDPOINT_URL: string,
}

export interface InstanaEnvPropsClassic {
  /**
   * Your agent key.
   */
  INSTANA_AGENT_KEY: string,
  /**
   * Use these variable when configuring the Instana Host agent, the Instana AWS agent or Website & Mobile App Agents.
   */
  INSTANA_AGENT_ENDPOINT: string,
  /**
   * Use these variable when configuring the Instana Host agent, the Instana AWS agent or Website & Mobile App Agents.
   */
  INSTANA_AGENT_ENDPOINT_PORT: string,
}

export interface InstanaEnvPropsEum {
  /**
   * Your agent key for End-User Monitoring.
   */
  INSTANA_EUM_KEY: string,
  /**
   * Your This is your EUM monitoring endpoint. Make sure to use the correct value for your region that starts with `https://eum-`.
   */
  INSTANA_EUM_REPORTING_URL: string
}

export class InstanaEcsAgent {
  constructor(scope: cdk.Construct, cluster: ecs.Cluster, instanaEnvProps?: InstanaEnvPropsClassic) {
    if (instanaEnvProps === undefined) return;

    const instanaAgentTask = new ecs.Ec2TaskDefinition(scope, "InstanaAgentTask", {
      networkMode: ecs.NetworkMode.HOST,
      ipcMode: ecs.IpcMode.HOST,
      pidMode: ecs.PidMode.HOST,
      volumes: [
        {
          name: "dev",
          host: { sourcePath: "/dev" },
          dockerVolumeConfiguration: undefined
        },
        {
          name: "sys",
          host: { sourcePath: "/sys" },
          dockerVolumeConfiguration: undefined
        },
        {
          name: "var_run",
          host: { sourcePath: "/var/run" },
          dockerVolumeConfiguration: undefined
        },
        {
          name: "run",
          host: { sourcePath: "/run" },
          dockerVolumeConfiguration: undefined
        },
        {
          name: "log",
          host: { sourcePath: "/var/log" },
          dockerVolumeConfiguration: undefined
        }
      ]
    });

    instanaAgentTask.addContainer("InstanaAgentContainer", {
      image: ecs.ContainerImage.fromRegistry("instana/agent"),
      memoryReservationMiB: 512,
      privileged: true,
      environment: {
        "INSTANA_AGENT_ENDPOINT": instanaEnvProps.INSTANA_AGENT_ENDPOINT,
        "INSTANA_AGENT_ENDPOINT_PORT": instanaEnvProps.INSTANA_AGENT_ENDPOINT_PORT,
        "INSTANA_AGENT_KEY": instanaEnvProps.INSTANA_AGENT_KEY
      }
    }).addMountPoints({
      readOnly: false,
      containerPath: "/var/run",
      sourceVolume: "var_run"
    },
      {
        readOnly: false,
        containerPath: "/run",
        sourceVolume: "run"
      },
      {
        readOnly: false,
        containerPath: "/sys",
        sourceVolume: "sys"
      },
      {
        readOnly: false,
        containerPath: "/dev",
        sourceVolume: "dev"
      },
      {
        readOnly: false,
        containerPath: "/var/log",
        sourceVolume: "log"
      })

    new ecs.Ec2Service(scope, "InstanaAgent", {
      cluster: cluster,
      taskDefinition: instanaAgentTask,
      daemon: true
    });
  }
};

export class InstanaAgentStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps, instanaEnvProps?: InstanaEnvPropsClassic) {
    super(scope, id, props);

    const policies = iam.PolicyDocument.fromJson(require('../configuration.json'));

    const role = new iam.Role(this, 'Instana-Agent', {
      description: "Allows Instana agent to monitor AWS services.",
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      inlinePolicies: { policies }
    });

    new ec2.Instance(this, "InstanaAwsAgent", {
      vpc: ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      role: role
    }).addUserData(
      `#!/bin/bash
          
      curl -o setup_agent.sh https://setup.instana.io/agent 
      chmod 700 ./setup_agent.sh 
      sudo ./setup_agent.sh -a ${instanaEnvProps?.INSTANA_AGENT_KEY} -m aws -t dynamic -e ${instanaEnvProps?.INSTANA_AGENT_ENDPOINT}:${instanaEnvProps?.INSTANA_AGENT_ENDPOINT_PORT} -s -y`
    );
  }
};