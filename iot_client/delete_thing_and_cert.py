'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''

import boto3
import json

client = boto3.client('iot')

with open("client.config", "r") as configfile:
    config_data = json.load(configfile)

thing_name = config_data["thingname"]

principals = client.list_thing_principals(
    thingName=thing_name
)
for principal in principals['principals']:
    response = client.detach_thing_principal(
        thingName=thing_name,
        principal=principal
    )
    response = client.detach_policy(
        policyName='sample-cqrs-iot-policy',
        target=principal
    )
    client.update_certificate(
        certificateId=principal.split('/')[-1],
        newStatus='INACTIVE'
    )
    client.delete_certificate(
        certificateId=principal.split('/')[-1],
        forceDelete=True
    )
client.delete_thing(
    thingName=thing_name
)

print("Thing and certificate has been deleted...")