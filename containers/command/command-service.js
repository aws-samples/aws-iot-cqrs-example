// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

var AWS = require("aws-sdk");
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

AWS.config.update({
    region: process.env.AWS_REGION,
});

// Configure parameters
var params = {
    MaxNumberOfMessages: 10,
    QueueUrl: process.env.QUEUE_URL,
    WaitTimeSeconds: 0
};

console.log("Connecting to queue: ", process.env.QUEUE_URL);
//Read messages from queue
sqs.receiveMessage(params, function (err, data) {
    if (err)
        console.log("Receive Error", err);
    else if (data.Messages) {
        console.log("Processing messages...");
        data.Messages.forEach(message => {
            console.log(message.Body);
            var msgObj = JSON.parse(message.Body);
            var dbparams = {
                Item: {
                    "deviceid": {
                        S: msgObj.deviceid
                    },
                    "transactionid": {
                        S: msgObj.transactionid
                    },
                    "message": {
                        S: msgObj.message
                    }
                },
                TableName: process.env.DYNAMODB_TABLE
            };
            //Store message information in DynamoDB
            dynamodb.putItem(dbparams, function (dberr, dbdata) {
                if (dberr)
                    console.log(dberr, dberr.stack);
                else {
                    var deleteParams = {
                        QueueUrl: process.env.QUEUE_URL,
                        ReceiptHandle: message.ReceiptHandle
                    };
                    //Delete message after it has been stored
                    sqs.deleteMessage(deleteParams, function (err, data) {
                        if (err) {
                            console.log("Delete Error", err);
                        } else {
                            console.log("Message Deleted", data);
                        }
                    });
                }
            })
        });
    }
});
