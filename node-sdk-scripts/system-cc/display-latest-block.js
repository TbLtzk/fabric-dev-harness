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
    // chaincode_id: 'fabcar',
    peerUrl: 'grpc://localhost:7051',
};

var channel = {};
var client = null;

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

function getChannelInfo() {
    return channel.queryInfo()
    // .then(ci => {
    //     console.log('channel info', ci);
    //     return ci;
    // })
    ;
}

function getCurrentBlock(channelInfo){
    let currentBlockIndex = channelInfo.height.toNumber() - 1;
    return channel.queryBlock(currentBlockIndex)
}

function displayBlockInfo(block){
    console.log('\n-----------------------------------------------------------------------------------');
    console.log('This is the current block on channel', config.channelId)
    console.log('\nheader:', JSON.stringify(block.header, null, '\t'));
    console.log('\ndata:', JSON.stringify(block.data));
    console.log('-----------------------------------------------------------------------------------\n');
}

Promise.resolve()
.then(initClient)
.then(initUser)
.then(initChannel)
.then(getChannelInfo)
.then(getCurrentBlock)
.then(displayBlockInfo)
.catch(console.error);
