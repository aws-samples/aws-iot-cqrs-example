// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import { IoTPolicyAndRules } from './iotpolicyandrules';
import { QueryCommandQueues } from './querycommandqueues';
import { TransactionsDb } from './transactionsdb';
import { QueryCommandContainers } from './querycommandcontainers';

export class AwsIotCqrsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const transactionsDb = new TransactionsDb(this, 'DynamoDb');
    const queues = new QueryCommandQueues(this, 'SQS');
    const iotThingRules = new IoTPolicyAndRules(this, 'IoT', {
      queryQueue: queues.queryQueue,
      commandQueue: queues.commandQueue,
    });
    const ecsService = new QueryCommandContainers(this, 'ECS', {
      cmdQueue: queues.commandQueue,
      queryQueue: queues.queryQueue,
      ddbTable: transactionsDb.ddbTable,
    })
  }
}
