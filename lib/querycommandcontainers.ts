// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as ecsPattern from '@aws-cdk/aws-ecs-patterns';
import * as ecs from '@aws-cdk/aws-ecs'
import * as sqs from '@aws-cdk/aws-sqs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import iam = require('@aws-cdk/aws-iam');
import * as customResource from '@aws-cdk/custom-resources';

export interface EcsProps {
    cmdQueue: sqs.IQueue;
    queryQueue: sqs.IQueue;
    ddbTable: dynamodb.ITable;
}

export class QueryCommandContainers extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: EcsProps) {
        super(scope, id);

        const responseTopic = 'cqrs/*/response';

        const getIoTEndpoint = new customResource.AwsCustomResource(this, 'IoTEndpoint', {
            onCreate: {
              service: 'Iot',
              action: 'describeEndpoint',
              physicalResourceId: customResource.PhysicalResourceId.fromResponse('endpointAddress'),
              parameters: {
                "endpointType": "iot:Data-ATS"
              }
            },
            policy: customResource.AwsCustomResourcePolicy.fromSdkCalls({resources: customResource.AwsCustomResourcePolicy.ANY_RESOURCE})
          });

        const commandProcessingFargateService = new ecsPattern.QueueProcessingFargateService(this, 'CommandService', {
            memoryLimitMiB: 512,
            image: ecs.ContainerImage.fromAsset('./containers/command'),
            enableLogging: true,
            desiredTaskCount: 2,
            environment: {
                QUEUE_URL: props.cmdQueue.queueUrl,
                AWS_REGION: cdk.Aws.REGION,
                DYNAMODB_TABLE: props.ddbTable.tableName,
            },
            queue: props.cmdQueue,
            maxScalingCapacity: 5
          });
        
        commandProcessingFargateService.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
            resources: [props.ddbTable.tableArn],
            actions: ['dynamodb:PutItem'],
            }));
        
        const queryProcessingFargateService = new ecsPattern.QueueProcessingFargateService(this, 'QueryService', {
            memoryLimitMiB: 512,
            image: ecs.ContainerImage.fromAsset('./containers/query'),
            enableLogging: true,
            desiredTaskCount: 2,
            environment: {
                QUEUE_URL: props.queryQueue.queueUrl,
                AWS_REGION: cdk.Aws.REGION,
                DYNAMODB_TABLE: props.ddbTable.tableName,
                IOT_ENDPOINT: getIoTEndpoint.getResponseField('endpointAddress') 
            },
            queue: props.queryQueue,
            maxScalingCapacity: 5
            });
        
            queryProcessingFargateService.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
                resources: [props.ddbTable.tableArn],
                actions: ['dynamodb:Query'],
                }));
            queryProcessingFargateService.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
                resources: [`arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/${responseTopic}`],
                actions: ['iot:Publish'],
                }));
    }
}
