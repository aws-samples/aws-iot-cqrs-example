'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''

from __future__ import absolute_import
from __future__ import print_function
import argparse
from awscrt import io, mqtt
from awsiot import mqtt_connection_builder
import sys
import threading
import time
import json
import random


# Query model for the CQRS pattern
class QueryModel():
    def __init__(self, query_mqtt_connection):
        self.query_mqtt_connection = query_mqtt_connection

    def query(self, count, requestTopic, responseTopic, deviceid):
        print("Subscribing to topic '{}'...".format(responseTopic))
        self.query_mqtt_connection.subscribe(
            topic=responseTopic,
            qos=mqtt.QoS.AT_LEAST_ONCE,
            callback=self.response_received)
        
        request_count = 1
        while (request_count <= count) or (count == 0):
            message = json.dumps({"deviceid": deviceid, "topic": responseTopic})
            print("Query -> Get position data for {}".format(deviceid))
            self.query_mqtt_connection.publish(
                topic=requestTopic,
                payload=message,
                qos=mqtt.QoS.AT_LEAST_ONCE)
            time.sleep(5)
            request_count += 1
        
        # Make sure all responses have been received before disconnecting
        while (received_count < count) or (count == 0):
            time.sleep(1)

        print("Query Disconnecting...")
        disconnect_future = self.query_mqtt_connection.disconnect()
        disconnect_future.result()
        print("Query Disconnected!")

    def response_received(self, topic, payload, **kwargs):
        global received_count
        received_count += 1
        print("Response -> position data: {}".format(payload))


# Command model for the CQRS pattern
class CommandModel():
    def __init__(self, cmd_mqtt_connection):
        self.cmd_mqtt_connection = cmd_mqtt_connection
    
    def command(self, count, commandTopic, deviceid):
        cmd_count = 1
        while (cmd_count <= count) or (count == 0):
            message = json.dumps({"transactionid": "{}-{}".format(deviceid, cmd_count), "deviceid": deviceid, "message": "Position: [{}]".format(random.random())})
            print("Command -> {}".format(message))
            self.cmd_mqtt_connection.publish(
                topic=commandTopic,
                payload=message,
                qos=mqtt.QoS.AT_LEAST_ONCE)
            time.sleep(5)
            cmd_count += 1
        
        print("Command Disconnecting...")
        disconnect_future = self.cmd_mqtt_connection.disconnect()
        disconnect_future.result()
        print("Command Disconnected!")


parser = argparse.ArgumentParser(description="Send and receive messages through and MQTT connection.")
parser.add_argument('--count', default=10, type=int, help="Number of messages to publish/receive before exiting. " +
                                                          "Specify 0 to run forever.")
parser.add_argument('--deviceid', default='SampleClient1', help="The unique id for this IoT sample client")

# Using globals to simplify sample code
args = parser.parse_args()

io.init_logging(io.LogLevel.NoLogs, 'stderr')

received_count = 0
received_all_event = threading.Event()

with open("client.config", "r") as configfile:
    config_data = json.load(configfile)


# Callback when connection is accidentally lost.
def on_connection_interrupted(connection, error, **kwargs):
    print("Connection interrupted. error: {}".format(error))


# Callback when an interrupted connection is re-established.
def on_connection_resumed(connection, return_code, session_present, **kwargs):
    print("Connection resumed. return_code: {} session_present: {}".format(return_code, session_present))

    if return_code == mqtt.ConnectReturnCode.ACCEPTED and not session_present:
        print("Session did not persist. Resubscribing to existing topics...")
        resubscribe_future, _ = connection.resubscribe_existing_topics()

        # Cannot synchronously wait for resubscribe result because we're on the connection's 
        # event-loop thread, evaluate result with a callback instead.
        resubscribe_future.add_done_callback(on_resubscribe_complete)


def on_resubscribe_complete(resubscribe_future):
    resubscribe_results = resubscribe_future.result()
    print("Resubscribe results: {}".format(resubscribe_results))

    for topic, qos in resubscribe_results['topics']:
        if qos is None:
            sys.exit("Server rejected resubscribe to topic: {}".format(topic))


def initiate_mqtt_connection(endpoint, cert, root_ca, key, client_id, client_bootstrap):
    mqtt_connection = mqtt_connection_builder.mtls_from_path(
        endpoint=endpoint,
        cert_filepath=cert,
        pri_key_filepath=key,
        client_bootstrap=client_bootstrap,
        ca_filepath=root_ca,
        on_connection_interrupted=on_connection_interrupted,
        on_connection_resumed=on_connection_resumed,
        client_id=client_id,
        clean_session=False,
        keep_alive_secs=6)
    connect_future = mqtt_connection.connect()

    # Future.result() waits until a result is available
    connect_future.result()
    print("{} Connected!".format(client_id))

    return mqtt_connection

if __name__ == '__main__':
    # Spin up resources
    event_loop_group = io.EventLoopGroup(1)
    host_resolver = io.DefaultHostResolver(event_loop_group)
    client_bootstrap = io.ClientBootstrap(event_loop_group, host_resolver)

    # Create Threads for the Query and Command modules
    queryMQTTConn = initiate_mqtt_connection(
        config_data["iotendpoint"], 
        config_data["certfile"], 
        "root-CA.crt", 
        config_data["keyfile"], 
        "SampleReadClient", 
        client_bootstrap)
    queryModel = QueryModel(queryMQTTConn)
    queryThread = threading.Thread(target=queryModel.query, args=(args.count, 'cqrs/request', 'cqrs/{}/response'.format(args.deviceid), args.deviceid, ))
    queryThread.start()
    # queryThread.join()

    cmdMQTTConn = initiate_mqtt_connection(
        config_data["iotendpoint"], 
        config_data["certfile"], 
        "root-CA.crt", 
        config_data["keyfile"], 
        "SampleWriteClient", 
        client_bootstrap)
    commandModel = CommandModel(cmdMQTTConn)
    commandThread = threading.Thread(target=commandModel.command, args=(args.count, 'cqrs/command', args.deviceid, ))
    commandThread.start()
    commandThread.join()
