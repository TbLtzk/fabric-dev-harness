package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

var logger = shim.NewLogger("MYCC")

// Chaincode is the main type, implementing the chaincode interface mandatory methods
type Chaincode struct {
}

// main function starts up the chaincode in the container during instantiate
func main() {
	if err := shim.Start(new(Chaincode)); err != nil {
		fmt.Printf("Error starting Chaincode: %s", err)
	}
}

func debug(format string, a ...interface{}) {
	logger.SetLevel(shim.LogDebug)
	msg := fmt.Sprintf(format, a...)
	logger.Debug(msg)
}

// Init is called during chaincode instantiation to initialize any
// data. Note that chaincode upgrade also calls this function to reset
// or to migrate data.
func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
	// Get the args from the transaction proposal
	args := stub.GetStringArgs()
	if len(args) != 0 {
		return shim.Error("Incorrect arguments. Constructor doesn't expect arguments!")
	}
	logger.Info("successfully initialized")
	return shim.Success(nil)
}

// Invoke is called per transaction on the chaincode. Each transaction is
// either a 'get' or a 'set' on the given key.
func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	// Extract the function and args from the transaction proposal
	fn, args := stub.GetFunctionAndParameters()
	debug("try to call function '%s' with %d args", fn, len(args))

	var result string
	var err error
	if fn == "set" {
		result, err = set(stub, args)
	} else if fn == "get" {
		result, err = get(stub, args)
	} else {
		err = fmt.Errorf("unknown function call: %s", fn)
	}
	if err != nil {
		return shim.Error(err.Error())
	}

	// Return the result as success payload
	return shim.Success([]byte(result))
}

// Set stores the key value pair on the ledger. If the key exists,
// it will override the value with the new one
func set(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 2 {
		return "", fmt.Errorf("Incorrect arguments. Expecting a key and a value")
	}

	debug("try to write property with key '%s'", args[0])
	bytes := []byte(args[1])
	err := stub.PutState(args[0], bytes)
	if err != nil {
		return "", fmt.Errorf("Failed to set value for key '%s' with error: %s", args[0], err)
	}
	debug("written value: %s", bytes)
	return args[1], nil
}

// Get returns the value of the specified key
func get(stub shim.ChaincodeStubInterface, args []string) (string, error) {
	if len(args) != 1 {
		return "", fmt.Errorf("Incorrect arguments. Expecting a key")
	}

	debug("try to read property with key '%s'", args[0])
	value, err := stub.GetState(args[0])
	if err != nil {
		return "", fmt.Errorf("Failed to get value for key: '%s' with error: %s", args[0], err)
	}
	if value == nil {
		return "", fmt.Errorf("Key not found: %s", args[0])
	}
	debug("read value: %s", value)
	return string(value), nil
}
