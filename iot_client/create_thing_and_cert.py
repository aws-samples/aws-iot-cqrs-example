'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''

import boto3
import argparse
import json

client = boto3.client('iot')
parser = argparse.ArgumentParser(description="Send and receive messages through and MQTT connection.")
parser.add_argument('--thingname', default='CQRS-Sample-Thing', help="The Thing name")
args = parser.parse_args()

thing_name = args.thingname

# Create thing, cert and key
thing = client.create_thing(
    thingName=thing_name
)
response = client.create_keys_and_certificate(
    setAsActive=True
)
certId = response['certificateId']
certArn = response['certificateArn']
certPem = response['certificatePem']
privateKey = response['keyPair']['PrivateKey']

# Attach to policy that was created in the CDK stack
response = client.attach_policy(
    policyName='sample-cqrs-iot-policy',
    target=certArn
)
response = client.attach_thing_principal(
    thingName=thing_name,
    principal=certArn,
)

# Save the certificate and key
certfilename = "{}-cert.pem".format(thing_name)
with open(certfilename, "w") as certfile:
    print("---Saving certificate file: {}".format(certfilename))
    certfile.write(certPem)

keyfilename = "{}-private.key".format(thing_name)
with open(keyfilename, "w") as keyfile:
    print("---Saving private key file: {}".format(keyfilename))
    keyfile.write(privateKey)

# Get the iot endpoint to be used to connect to AWS IoT core
iotEndpoint = client.describe_endpoint(endpointType='iot:Data-ATS')['endpointAddress']

# Save variables to be used later
print("---Saving values to config file (client.config)")
config_data = {}
config_data["iotendpoint"] = iotEndpoint
config_data["thingname"] = thing_name
config_data["certfile"] = certfilename
config_data["keyfile"] = keyfilename
with open("client.config", "w") as configfile:
    configfile.write(json.dumps(config_data))
