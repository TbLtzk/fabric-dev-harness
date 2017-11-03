'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Hyperledger Fabric Sample Query Program
 */

var hfc = require('fabric-client');
var path = require('path');

var config = {
    walletPath: path.join(__dirname, '../creds'),
    userId: 'PeerAdmin',
    channelId: 'mychannel',
    peerUrl: 'grpc://localhost:7051',
};

var requestFileName ='q_template.json';
process.argv.forEach(function (val, index) {
    if(val === '-f')
        requestFileName = process.argv[index + 1];
});
const requestFilePath = path.join(__dirname, requestFileName)

var channel = {};
var client = null;

function stringify(obj) {
    if(typeof obj === 'string')
        return obj;
    return JSON.stringify(obj);
}

function initClient(){
    console.log("Create a client and the user");
    client = new hfc();

    client.setDevMode(true);

    return hfc.newDefaultKeyValueStore({ path: config.walletPath })
    .then(wallet => {
        return client.setStateStore(wallet); 
    })
}

function initUser(){
    return client.getUserContext(config.userId, true)
    .then(user => {
        if(!user)
            return;
        console.log("Check user is enrolled, and set a query URL in the network");
        if (user === undefined || user.isEnrolled() === false) {
            console.error("User not defined, or not enrolled - error");
        }
    });
}

function initChannel() {
    channel = client.newChannel(config.channelId);
    channel.addPeer(client.newPeer(config.peerUrl));    
}

function makeQuery() {
    console.log("Make query");
    const request = require(requestFilePath);

    var tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);
    request.txId = tx_id;
    // convert args to strings. This is especially useful for json payload.
    request.args = request.args.map(stringify); 
    
    return channel.queryByChaincode(request);
}

function handleResponses(query_responses) {
    console.log("returned from query");
    if (!query_responses.length) {
        console.log("No payloads were returned from query");
    } else {
        console.log("Query result count = ", query_responses.length)
    }
    if (query_responses[0] instanceof Error) {
        console.error("error from query = ", query_responses[0]);
    }
    console.log("Response is ", JSON.parse(query_responses[0]));
}

Promise.resolve()
.then(initClient)
.then(initUser)
.then(initChannel)
.then(makeQuery)
.then(handleResponses)
.catch(console.error);