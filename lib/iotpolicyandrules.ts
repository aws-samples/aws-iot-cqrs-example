// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as iot from '@aws-cdk/aws-iot';
import iam = require('@aws-cdk/aws-iam');
import * as sqs from '@aws-cdk/aws-sqs';

export interface IoTProps {
    queryQueue: sqs.IQueue;
    commandQueue: sqs.IQueue;
}

export class IoTPolicyAndRules extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: IoTProps) {
        super(scope, id);

        const readClientId = 'SampleReadClient'
        const writeClientId = 'SampleWriteClient'
        const requestTopic = 'cqrs/request'
        const responseTopic = 'cqrs/*/response'
        const commandTopic = 'cqrs/command'

        //Policy for the topic
        const unicornClientPolicy = new iot.CfnPolicy(this, 'SampleIoTClientPolicy', {
            policyName: 'sample-cqrs-iot-policy',
            policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: 'iot:Connect',
                    Resource: [
                        `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:client/${readClientId}`,
                        `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:client/${writeClientId}`
                    ]
                },
                {
                    Effect: 'Allow',
                    Action: 'iot:Subscribe',
                    Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topicfilter/${responseTopic}`
                },
                {
                    Effect: 'Allow',
                    Action: [
                        'iot:Publish',
                        'iot:Receive',  
                    ],
                    Resource: [
                        `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/${requestTopic}`,
                        `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/${commandTopic}`,
                        `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/${responseTopic}`
                    ]
                  },
            ]
            },
        });

        //Role to write to stream
        const sqsRole = new iam.Role(this, 'iot-sqs-role', {
            assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
          });
      
        sqsRole.addToPolicy(new iam.PolicyStatement({
        resources: [props.queryQueue.queueArn, props.commandQueue.queueArn],
        actions: ['sqs:SendMessage', 'sqs:ReceiveMessage'],
        }));

        //Rule for query topic
        const sqsRequestRule = new iot.CfnTopicRule(this, 'IotSqsQueryRule', {
            topicRulePayload: {
                actions: [
                    {
                        sqs: {
                            roleArn: sqsRole.roleArn,
                            queueUrl: props.queryQueue.queueUrl,
                        },
                    },
                ],
                ruleDisabled: false,
                sql: `SELECT * FROM '${requestTopic}'`,
                awsIotSqlVersion: '2016-03-23',
            },
        });

        //Rule for query topic
        const sqsCommandRule = new iot.CfnTopicRule(this, 'IotSqsCommandRule', {
            topicRulePayload: {
                actions: [
                    {
                        sqs: {
                            roleArn: sqsRole.roleArn,
                            queueUrl: props.commandQueue.queueUrl,
                        },
                    },
                ],
                ruleDisabled: false,
                sql: `SELECT * FROM '${commandTopic}'`,
                awsIotSqlVersion: '2016-03-23',
            },
        });
    }
}