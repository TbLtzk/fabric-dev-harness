# Go Chaincode - Cheat Sheet
For nice rendering of this markdown file, go to the [online version on github](https://github.com/TbLtzk/fabric-dev-harness/blob/master/go-chaincode-cheatsheet.md).

## Golang

### some useful packages

    import (
        "encoding/json"
        "fmt"
        "math/rand"
        "strconv"

        "github.com/hyperledger/fabric/core/chaincode/shim"
        "github.com/hyperledger/fabric/protos/peer"
    )

### implicit method access control
Go has implicit semantics about the captialization of method names. Upper case means public access, lower case means private.

    function myPrivateMethod()
    function MyPublicMethod()

### Variable declaration

    var i int // keyword 'var', then identifier, then type
    var i int = 2 // variable declartion with initializer
    var i = 2 // the type can be omitted, if it can be inferred by the initializer
    i:=2 // shorthand for var i=2

### range
With the range keyword you have a convenient way to iterate over the elements in a collection.
It is applicable to maps, arrays and slices.

    nums := []int{2, 3, 4}
    for i, val := range nums {
        fmt.Println("index:", i)
        fmt.Println("value:", val)
    }

if you don't need the index, you can use the so-called blank identifier `_`

    for _, val := range nums {
        fmt.Println("value:", val)
    }

### online docs
If you struggle more with golang than with chaincode, it might help to take the [tour of go](https://tour.golang.org), espacially the [basics section](https://tour.golang.org/basics/1)

## shim.ChaincodeStubInterface
(assume the parameter `stub shim.ChaincodeStubInterface`)

### GetFunctionAndParameters
Get the function and the parameters from the external call:

    fn, args := stub.GetFunctionAndParameters()

If you don't need the function, e.g. in the init method, where there is no concept of multiple functions, you can also use

    args := stub.GetStringArgs()

The return value `args` is always a string array ([]string). You might need some conversion for non-string types, e.g.

    intValue, err := strconv.Atoi(args[0])

### GetState
Read a value from the ledger.

	value, err := stub.GetState(args[0])

The result is always a byte array ([]byte) you might need to use explicit conversion for further processing, e.g.

    strValue := string(value)
    
### PutState
Write a value to the ledger.

    key := args[0]
	bytes := []byte(args[1])
	err := stub.PutState(key, bytes)

PutState accepts a string as key parameter and a byte array as value (and only a byte array).
If a value for the given key exists, it is overwritten.

NOTE: this method modifies the world state. Any chaincode operation using this method has to be called via invoke (not query)

### DelState
Delete value from the ledger.

    key := args[0]
    err := stub.DelState(key)

DelState accepts a string as key parameter.

NOTE: this method modifies the world state. Any chaincode operation using this method has to be called via invoke (not query)

### online docs
The methods of the shim stub are documented in the following interface:
https://github.com/hyperledger/fabric/blob/release/core/chaincode/shim/interfaces.go

## shim globals

### starting the chaincode
In the main function, you'll start the execution of the chaincode. 

	if err := shim.Start(new(Chaincode)); err != nil {
		fmt.Printf("Error starting Chaincode: %s", err)
	}

The start method expects an instance of an object satisfying the chaincode interface (Init and Invoke).

### returning peer.Response objects
The chaincode interface expects a return value of type `github.com.hyperledger.fabric.protos.peer.Response`.
The shim package provides static helper methods to create error or success Response objects.

    return shim.Success(bytes)
    return shim.Error(errMsg)

The Success method expects a byte array with the payload (or `nil` if there is nothing to return)
The Error method expects a string with the error message

## JSON package
With the JSON package you can do JSON encoding and decoding in your go application.

First define a struct with your object structure (make fields public by using upper case)

    type Payload struct {
        Page   int
        Fruits []string
    }

By default fields the field names are also the JSON keys. You can use tags to define different json keys (e.g. for lower case)

    type Payload struct {
        Page   int      `json:"page"`
        Fruits []string `json:"fruits"`
    }

you can then define an instance of this struct and use the Unmarshal method to decode a byte array and fill your struct with the data.

	var payload Payload
	err := json.Unmarshal(bytes, &payload)

Inversely you can have an instance of your struct and use the Marshal method to produce a JSON encoded byte array

	var payload Payload
    payload.Page = 10
	bytes, err := json.Marshal(payload)
