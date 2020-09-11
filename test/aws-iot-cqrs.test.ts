// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { expect as expectCDK, haveResourceLike, haveResource, countResources, arrayWith, objectLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as AwsIotCqrs from '../lib/aws-iot-cqrs-stack';

test('SQS Visibility Timeout', () => {
  const app = new cdk.App();
  const stack = new AwsIotCqrs.AwsIotCqrsStack(app, 'MyTestStack');
  expectCDK(stack).to(haveResource('AWS::SQS::Queue', {
    VisibilityTimeout: 15
  }));
});

test('SQS Queue Count', () => {
  const app = new cdk.App();
  const stack = new AwsIotCqrs.AwsIotCqrsStack(app, 'MyTestStack');
  expectCDK(stack).to(countResources('AWS::SQS::Queue', 2));
});

test('DynamoDb Table partionkey and sortkey', () => {
  const app = new cdk.App();
  const stack = new AwsIotCqrs.AwsIotCqrsStack(app, 'MyTestStack');
  expectCDK(stack).to(haveResource('AWS::DynamoDB::Table', {
    KeySchema: arrayWith({
      AttributeName: 'deviceid',
      KeyType: 'HASH'
    },
    {
      AttributeName: 'transactionid',
      KeyType: 'RANGE'
    })
  }));
});

test('Iot topic rule', () => {
  const app = new cdk.App();
  const stack = new AwsIotCqrs.AwsIotCqrsStack(app, 'MyTestStack');
  expectCDK(stack).to(haveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: objectLike({
      Sql: "SELECT * FROM 'cqrs/command'"
    })
  }));
});

test('Iot policy', () => {
  const app = new cdk.App();
  const stack = new AwsIotCqrs.AwsIotCqrsStack(app, 'MyTestStack');
  expectCDK(stack).to(haveResourceLike('AWS::IoT::Policy', {
    PolicyDocument: {
      Statement: arrayWith(objectLike({
        Action: [
          'iot:Publish',
          'iot:Receive'
        ],
        Effect: 'Allow',
      }))}
    }))
});
