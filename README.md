# fabric-dev-harness
## Network Setup

### 2x2 Network
The credentials are setup for 2 Orgs with 2 peers each.
However, this config is meant for chaincode development adding support for interaction via node-sdk.
The docker-compose launches only one of the peers and launches it in developer mode.

    cd ./workshops/2x2-network
    docker-compose up

## Chaincode
We are using a docker container to compile and deploy our chaincode.
The container is launched by the provided docker-compose.

After starting the network, attach to chaincode dev container

    sudo docker exec -it chaincode bash

Then build an run the chaincode

    cd hands-on
    go build
    CORE_CHAINCODE_ID_NAME=mycc:0 ./hands-on

Attach to cli container

    sudo docker exec -it cli bash

Instantiate and Init (from within cli container)

    // 2x2-network
    peer chaincode install -p chaincode/hands-on -n mycc -v 0
    peer chaincode instantiate -n mycc -v 0 -c '{"Args":[]}' -C mychannel

Query and Invoke (from within cli container)

    // 2x2-network
    peer chaincode invoke -n mycc -c '{"Args":["set", "a", "20"]}' -C mychannel
    peer chaincode query -n mycc -c '{"Args":["get","a"]}' -C mychannel

For interaction via node-sdk, first copy the contents of the node-sdk-scripts/creds directory into `~/.hfc-key-store`

    mkdir ~/.hfc-key-store
    cp creds/* ~/.hfc-key-store/    

Query and Invoke (via node-sdk)

    // 2x2-network, only
    node custom-cc/invoke.js
    node custom-cc/query.js
    node system-cc/display-latest-block.js

    // specify request in a json file
    cd custom-cc
    node invoke.js -f my-json-file.json
    node query.js -f my-json-file.json

NOTE: the file paths must be specified relative to the invoke.js/query.js.
      The easiest is to cd into the custom-cc directory and place your request files there.

## Cheatsheet

### SDK
You can enable advanced logging for the node-sdk, by setting this environment variable

    export HFC_LOGGING={"debug":"console"}

### Chaincode

Using docker containers for the compile and run workflow is ok, but has a major drawback:
if you have to stop the network (`dcp down`) this will also close your cli and chaincode terminal.
After restarting the network you have to attach to both containers again, AND you lost your command history.

Unfortunately the instantiation cannot be done twice with the same chaincode name. For developing the init function this means
A) you have to restart the network every time you test (with the mentioned drawback) or
B) instantiate with a different name every time.
