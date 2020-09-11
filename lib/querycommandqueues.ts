// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';


export class QueryCommandQueues extends cdk.Construct {
    public readonly queryQueue: sqs.IQueue;
    public readonly commandQueue: sqs.IQueue;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        this.queryQueue = new sqs.Queue(this, 'query-queue', {
            visibilityTimeout: cdk.Duration.seconds(15)
        });
        this.commandQueue = new sqs.Queue(this, 'command-queue', {
            visibilityTimeout: cdk.Duration.seconds(15)
        });
    }
}