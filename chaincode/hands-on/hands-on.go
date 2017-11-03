// chaincode for hyperledger fabric 1.0
package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

// Chaincode contains the state information that is not persisted on the blockchain
type Chaincode struct {
}

var logger = shim.NewLogger("MYCC")

func main() {
	cc := new(Chaincode)
	err := shim.Start(cc)
	if err != nil {
		logger.Error("Error starting chaincode:", err)
	}
}

func debug(format string, a ...interface{}) {
	logger.SetLevel(shim.LogDebug)
	logger.Debugf(format, a...)
}

func error(format string, a ...interface{}) peer.Response {
	msg := fmt.Sprintf(format, a...)
	logger.Error(msg)
	return shim.Error(msg)
}

// Init is one of two mandatory exported methods for valid chaincode.
// It is called on deployment.
func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
	// Get the args from the transaction proposal
	args := stub.GetStringArgs()
	if len(args) != 0 {
		return error("Incorrect arguments. Constructor doesn't expect arguments!")
	}
	logger.Info("successfully initialized")
	return shim.Success(nil)
}

// Invoke is one of three mandatory exported methods for valid chaincode.
// It is called to modify the world state.
func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	// Extract the function and args from the transaction proposal
	fn, args := stub.GetFunctionAndParameters()
	debug("try to call function '%s' with %d args", fn, len(args))

	// reading access
	if fn == "read" {
		return t.read(stub, args)
		// writing access
	} else if fn == "write" {
		return t.write(stub, args)
	}

	return error("Received unknown function invocation: %s", fn)
}

func (t *Chaincode) read(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 1 {
		return error("Incorrect number of arguments. Expecting 1: property key")
	}
	key := args[0]

	debug("try to read property with key '%s'", key)
	bytes, err := stub.GetState(key)

	if err == nil {
		debug("read value: %s", bytes)
	} else {
		debug("reading failed: %v", err)
	}

	return shim.Success(bytes)
}

func (t *Chaincode) write(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 2 {
		return error("Incorrect number of arguments. Expecting 2: property key, new value")
	}
	key := args[0]
	bytes := []byte(args[1])

	debug("try to write property with key '%s'", key)
	err := stub.PutState(key, bytes)

	if err != nil {
		return error("writing failed: %v", err)
	}

	debug("written value: %s", bytes)
	return shim.Success(bytes)
}
