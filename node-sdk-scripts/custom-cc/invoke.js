'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var hfc = require('fabric-client');
var path = require('path');
var util = require('util');

var config = {
    walletPath: path.join(__dirname, '../creds'),
    userId: 'PeerAdmin',
    channelId: 'mychannel',
    peerUrl: 'grpc://localhost:7051',
    eventUrl: 'grpc://localhost:7053',
    ordererUrl: 'grpc://localhost:7050'
};

var requestFileName ='i_template.json';
process.argv.forEach(function (val, index) {
    if(val === '-f')
        requestFileName = process.argv[index + 1];
});
const requestFilePath = path.join(__dirname, requestFileName)

var channel = {};
var client = null;
var targets = [];
var tx_id = null;

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
    var peerObj = client.newPeer(config.peerUrl);
    targets.push(peerObj);

    channel = client.newChannel(config.channelId);
    channel.addPeer(peerObj);    
    channel.addOrderer(client.newOrderer(config.ordererUrl));
}

function proposeTransaction() {
    const request = require(requestFilePath);
    
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);
    request.txId = tx_id;

    request.targets = targets;
    request.chainId = config.channelId;
    // convert args to strings. This is especially useful for json payload.
    request.args = request.args.map(stringify); 
    
    // send proposal to endorser
    return channel.sendTransactionProposal(request);
}

function handleResults(results) {
    var proposalResponses = results[0];
    var proposal = results[1];
    var header = results[2];
    let isProposalGood = false;
    if (proposalResponses && proposalResponses[0].response &&
        proposalResponses[0].response.status === 200) {
        isProposalGood = true;
        console.log('transaction proposal was good');
    } else {
        console.error('transaction proposal was bad');
    }
    if (isProposalGood) {
        console.log(util.format(
            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
            proposalResponses[0].response.status, proposalResponses[0].response.message,
            proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
        var request = {
            proposalResponses: proposalResponses,
            proposal: proposal,
            header: header
        };
        // set the transaction listener and set a timeout of 30sec
        // if the transaction did not get committed within the timeout period,
        // fail the test
        var transactionID = tx_id.getTransactionID();
        var eventPromises = [];
        let eh = client.newEventHub();
        eh.setPeerAddr(config.eventUrl);
        eh.connect();

        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                eh.disconnect();
                reject();
            }, 30000);

            eh.registerTxEvent(transactionID, (tx, code) => {
                clearTimeout(handle);
                eh.unregisterTxEvent(transactionID);
                eh.disconnect();

                if (code !== 'VALID') {
                    console.error(
                        'The transaction was invalid, code = ' + code);
                    reject();
                } else {
                    console.log(
                        'The transaction has been committed on peer ' +
                        eh._ep._endpoint.addr);
                    resolve();
                }
            });
        });
        eventPromises.push(txPromise);
        var sendPromise = channel.sendTransaction(request);
        return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
            console.log(' event promise all complete and testing complete');
            return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
        }).catch((err) => {
            console.error(
                'Failed to send transaction and get notifications within the timeout period.'
            );
            return 'Failed to send transaction and get notifications within the timeout period.';
        });
    } else {
        console.error(
            'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
        );
        return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
    }
}

function onTrxProposalError(err) {
    console.error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
    return 'Failed to send proposal due to error: ' + err.stack ? err.stack : err;
}

function handleResponse(response) {
    if (response.status === 'SUCCESS') {
        console.log('Successfully sent transaction to the orderer.');
        return tx_id.getTransactionID();
    } else {
        console.error('Failed to order the transaction. Error code: ' + response.status);
        return 'Failed to order the transaction. Error code: ' + response.status;
    }
}

function onTrxError(err) {
    console.error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
    return 'Failed to send transaction due to error: ' + err.stack ? err.stack : err;
}

Promise.resolve()
.then(initClient)
.then(initUser)
.then(initChannel)
.then(proposeTransaction)
.then(handleResults, onTrxProposalError)
.then(handleResponse, onTrxError)
.catch(console.error);