#Introduction

This is the remote API library and binarys for hopjs

See http://github.com/celer/hopjs for more details about hopjs

# API Library

You can instantiate a hopjs based api locally for a remote service by doing:

```javascript

var Hop = require('hop-remote')

Hop.remoteAPI("http://www.mywebsite.com/",function(err,api){
	api.UserService.create({ username:"bob",password:"password"},function(err,user){
		console.log("The user was created with ",user);
	});
});


```

# Command line tools

There are also two command line tools:

## hopjs

hopjs is a tool which allows:
 
 * Remote unit testing
 * Executing individual calls
 * Evaluation of a script of calls

```shell

hopjs --url http://www.mywebsite.com/ --unitTest


## hopjs-browser-test

hopjs-browser-test allows running hopjs unit tests against a specific browser

hopjs-browser-test --url http://www.mywebsite.com/ --browser firefox


