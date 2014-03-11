/**
  Client side remote API utilities

  @module Hop
  @submodule Remote
**/

if(typeof Hop=="undefined"){
  var Hop = {};
}

var path = require('path');
var request = require('request');
var querystring = require('querystring');
var url = require('./url');
var fs = require('fs');
var util = require('hopjs-common');
var assert = require('assert');

var _csrf = null;


/*
  API Resource discovery
    -> if we got something that is URL without any paths -> do auto discovery
    -> if we got somethign that is a URL with a path -> use the URL there
    -> if we got an explicit resource api.json -> assume that is EXACTLY what we mean and swap it out for the right resource
*/
Hop.getAPIResource=function(_url,resource){
  //Does this end with the resource type -> return it
  if(_url.indexOf(resource)==_url.length-resource.length)
    return _url;

  //Strip things the user could ask for
  _url=_url.replace(/api.js(on)?$/,"");
  _url=_url.replace(/apitest.js(on)?$/,"");

  if(resource=="doc") resource="";

  var up = url.parse(_url)
  if(up.path=="/"){
      return _url.replace(/\/$/,"/_hopjs/"+resource);
  } else {
    return _url+resource;
  }
}
assert.equal(Hop.getAPIResource("http://foo.com/api/api.json","api.js"),"http://foo.com/api/api.js")
assert.equal(Hop.getAPIResource("http://foo.com/","api.js"),"http://foo.com/_hopjs/api.js")
assert.equal(Hop.getAPIResource("http://foo.com/api/","api.js"),"http://foo.com/api/api.js")

assert.equal(Hop.getAPIResource("http://foo.com/api/api.js","api.json"),"http://foo.com/api/api.json")
assert.equal(Hop.getAPIResource("http://foo.com/","api.json"),"http://foo.com/_hopjs/api.json")
assert.equal(Hop.getAPIResource("http://foo.com/api/","api.json"),"http://foo.com/api/api.json")

assert.equal(Hop.getAPIResource("http://foo.com/api/api.js","apitest.js"),"http://foo.com/api/apitest.js")
assert.equal(Hop.getAPIResource("http://foo.com/api/api.json","apitest.js"),"http://foo.com/api/apitest.js")
assert.equal(Hop.getAPIResource("http://foo.com/","apitest.js"),"http://foo.com/_hopjs/apitest.js")
assert.equal(Hop.getAPIResource("http://foo.com/api/","apitest.js"),"http://foo.com/api/apitest.js")

assert.equal(Hop.getAPIResource("http://foo.com/api/api.js","doc"),"http://foo.com/api/")
assert.equal(Hop.getAPIResource("http://foo.com/","doc"),"http://foo.com/_hopjs/")


var responseHandler=function(err,ahr,data,onComplete){
    if(err)
      return onComplete(err,null);

    if(ahr.headers['x-csrf-token']!=undefined)
      _csrf = ahr.headers['x-csrf-token'];
     if(ahr.statusCode=="404") return onComplete(null,null);
     if(ahr.statusCode*1 >= 400) return onComplete(data,null);

    return onComplete(null,data);
}

/**
  Use a remote URL to instantiate a client side Javascript implementation of the API

  @param {String} _url 
    The URL to use, this can be either the base URL for the website or api.json
  @param {Function} onComplete(err,api) 
    The call back which will return an error or the API 
  @param {Object} options
    @param  options.ignoreDemands - do not check for missing parameters before calling the API

  @method Hop.remoteAPI
  @static
*/
Hop.remoteAPI=function(_url,onComplete,options){
  options=options||{};

  _url = Hop.getAPIResource(_url,"api.json");

  request.get(_url,{ json:true,headers:options.headers },function(err,ahr,data){


    if(err) return onComplete(err);
    if(!data) return onComplete("Invalid url");

    if(!data.Objects){
      return onComplete("Did not find valid API, instead got: "+data);
    }
    
    
    var api = {};

    api.setOAuthAccessToken=function(token){
      api.OAuthAccessToken=token;
    }
    
    api.setCSRFToken=function(token){
      api._csrf=token;
    }

    api._json=data;
    for(var objName in data.Objects){
      api[objName]={};
      for(var methodName in data.Objects[objName].methods){
        (function(objName,methodName,apiOptions){
                var method = data.Objects[objName].methods[methodName];
                  
                var _u = ahr.request.uri;
                var _path = method.fullPath;
                _path = _u.protocol+"//"+_u.host+_path;
               
                api[objName][methodName]=function(input,onComplete,req){
                  input=input||{};

                  onComplete=onComplete||function(){};


                  
           
                  var _input={};  
                  var destPath = _path+"";

                  var inputFromURL=function(inputURL){
                    var _fileFromUrl = url.parse(inputURL);
                    if(!_fileFromUrl.host) _fileFromUrl.host = _u.host;
                    if(!_fileFromUrl.protocol) _fileFromUrl.protocol = _u.protocol;
                    var _fu = url.format(_fileFromUrl);
                    return request(_fu);
                  }
 
                  for(var paramName in method.params){
                    if(apiOptions.ignoreDemands!==true){
                      if(method.params[paramName].demand){
                        if(!input || typeof input[paramName]=="undefined")
                          return onComplete("Missing parameter '"+paramName+"'");
                      }
                    }
                    if(destPath.indexOf(":"+paramName)!=-1){
                      destPath =  destPath.replace(":"+paramName,input[paramName]);
                    } else {
                      if(typeof input=="object"  && typeof input[paramName]=="object" && input[paramName]!=null && input[paramName]._fileFromURL){
                        _input[paramName]=inputFromURL(input[paramName]._fileFromURL);
                      } else if(method.params[paramName].demandFile || method.params[paramName].optionalFile && typeof input[paramName]=="string"){
                        if(fs.existsSync(input[paramName])){
                          _input[paramName]=fs.createReadStream(input[paramName]);    
                        } else if(input[paramName].indexOf && input[paramName].indexOf("http://")==0){
                          _input[paramName]=inputFromURL(input[paramName]);
                        }
                      } else {    
                        if(typeof input[paramName]!="undefined"){
                          _input[paramName]=input[paramName];
                        }
                      }
                    }  
                  }
                  var headers = {};

                  if(options.headers){
                    for(var header in options.headers){
                      headers[header]=options.headers[header];
                    }
                  }

                  if(req){
                    if(req.headers){
                      for(var i in req.headers){  
                        i = i.toLowerCase();
                        if(["cookie","authorization"].indexOf(i)!=-1)
                          headers[i]=req.headers[i];
                      }
                    }
                    if(req.ip && req.ip.length>0)
                      headers['X-Forwarded-For']=req.ip;
                  }
                  if(_csrf!=null || api._csrf){
                    headers['X-CSRF-Token']=_csrf || api._csrf;
                  }
                  if(api.OAuthAccessToken){
                    headers['Authorization']='Bearer '+api.OAuthAccessToken;
                  }

                  if(method.method=="get" || method.method=="delete"){
                          var qo = {};
                          var encoder = new util.DataEncoder();
                          encoder.encode(_input);
                          var query = encoder.toQueryString();
                          request({ uri: destPath+"?"+query, method: method.method, headers: headers, json:true, jar:true}, function(err,ahr,data){
                            responseHandler(err,ahr,data,onComplete);
                          }) 
                  } else {
                          var json=true;
                          var useForm=false;
                          var de = new util.DataEncoder()
                          if(de.encode(_input)){
                            if(de.canEncodeAsJSON()){
                              json = (_input);  
                            } else { 
                              useForm=true;
                            } 
                          } else { json=_input; }
                          var r = request({uri: destPath, method: method.method, json:json, headers: headers, jar:true, callback: function(err,ahr,data){
                            responseHandler(err,ahr,data,onComplete);
                          } });

                          if(useForm){
                              var form = r.form();
                              de = new util.DataEncoder(form);
                              de.encode(_input);
                          }

                  }
                };
                  
                //Provide a small utility funciton to get the URL for a method call given the inputs
                api[objName][methodName].url=function(input){
                  var path = _path+"";
                  for(var paramName in method.params){
                    if(path.indexOf(":"+paramName)!=-1){
                      path= path.replace(":"+paramName,input[paramName]);
                    }
                  }
                  return path;
                }

      
        })(objName,methodName,options);
      }
    }
    onComplete(null,api);    

  }); 
}



Hop.remoteAPITestHarness=function(_url,onComplete){
  _url = Hop.getAPIResource(_url,"apitest.js");


  request.get(_url,function(err,ahr,data){

    if(err) return onComplete(err);
    if(!data) return onComplete("Invalid url"); 
    
    onComplete(null,data.toString());    

  }); 
}



Hop.remoteAPITest=function(_url,onComplete){
  _url = Hop.getAPIResource(_url,"apitest.js");

  request.get(_url,function(err,ahr,data){

    if(err) return onComplete(err);
    if(!data) { 
      return onComplete("Invalid url"); 
    }
    
    onComplete(null,data);    

  }); 
}

module.exports=Hop;
