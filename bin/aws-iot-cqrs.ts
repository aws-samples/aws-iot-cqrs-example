#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsIotCqrsStack } from '../lib/aws-iot-cqrs-stack';

const app = new cdk.App();
new AwsIotCqrsStack(app, 'AwsIotCqrsStack', {
    env: {
      region: process.env.CDK_AWS_REGION,
      account: process.env.CDK_AWS_ACCOUNT_ID
    }
  });
