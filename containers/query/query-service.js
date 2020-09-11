// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

var AWS = require("aws-sdk");
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var iotdata = new AWS.IotData({
    endpoint: process.env.IOT_ENDPOINT,
    apiVersion: '2015-05-28'
});

AWS.config.update({
    region: process.env.AWS_REGION,
});

//Set queue parameters
var params = {
    MaxNumberOfMessages: 10,
    QueueUrl: process.env.QUEUE_URL,
    WaitTimeSeconds: 0
};

console.log("Connecting to queue: ", process.env.QUEUE_URL);
//Read message from the queue
sqs.receiveMessage(params, function (err, data) {
    if (err)
        console.log("Receive Error", err);
    else if (data.Messages) {
        console.log("Processing query messages...");
        data.Messages.forEach(message => {
            console.log(message.Body);
            var msgObj = JSON.parse(message.Body);
            var dbparams = {
                ExpressionAttributeValues: {
                    ":device_id": {
                        S: msgObj.deviceid
                    }
                },
                KeyConditionExpression: "deviceid = :device_id",
                TableName: process.env.DYNAMODB_TABLE
            };
            //Get device records from DynamoDB
            dynamodb.query(dbparams, function (dberr, dbdata) {
                if (dberr)
                    console.log(dberr, dberr.stack);
                else {
                    console.log(dbdata);
                    //Set the MQTT topic parameters and payload and send the message
                    var iotparams = {
                        topic: msgObj.topic,
                        payload: JSON.stringify(dbdata),
                        qos: 0
                    };
                    iotdata.publish(iotparams, function(err, data) {
                        if(err){
                            console.log(err);
                        }
                        else{
                            console.log("MQTT message sent");
                            var deleteParams = {
                                QueueUrl: process.env.QUEUE_URL,
                                ReceiptHandle: message.ReceiptHandle
                            };
                            //Delete message after response have been sent
                            sqs.deleteMessage(deleteParams, function (err, data) {
                                if (err) {
                                    console.log("Delete Error", err);
                                } else {
                                    console.log("Message Deleted", data);
                                }
                            });
                        }
                    });
                }
            })
        });
    }
});
