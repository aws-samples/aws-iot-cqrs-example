// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';


export class TransactionsDb extends cdk.Construct {
    public readonly ddbTable: dynamodb.ITable;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        this.ddbTable = new dynamodb.Table(this, 'unicorn-clients-table', {
            partitionKey: { name: 'deviceid', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'transactionid', type: dynamodb.AttributeType.STRING }
          });
    }
}