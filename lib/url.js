var assert = require('assert');
var  url = require('url');

//url._parse=url.parse;

/**
	This is a fix for the fact that some 
	web servers are very unhappy if the header for host
	includes port 80 which is assumed to be the default
*/
/*
url.parse=function(u){
	var _u = url._parse(u);
	if(_u.host) {
		_u.host = _u.host.replace(/:80$/,"");
	}
	return _u;
}

assert.equal(url.parse("http://foo.com:80/").host,"foo.com");
assert.equal(url.parse("http://foo.com:8080/").host,"foo.com:8080");
*/

module.exports=url;


