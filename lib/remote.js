/**
  Client side remote API utilities

  @module Hop
  @submodule Remote
**/

if(typeof Hop=="undefined"){
  var Hop = {};
}

var path = require('path');
var request = require('hopjs-request');
var querystring = require('querystring');
var url = require('./url');
var fs = require('fs');
var util = require('hopjs-common');

var _csrf = null;


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

  if(!(/.*\/api.json/.test(_url))){
    var _u = url.parse(_url);
    _url = _u.protocol+"//"+_u.host+"/_hopjs/api.json";
  }

  request.get(_url,{ json:true },function(err,ahr,data){


    if(err) return onComplete(err);
    if(!data) return onComplete("Invalid _url"); 
    
    
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
               
                api[objName][methodName]=function(input,onComplete,req){
                  input=input||{};
                  var _u = url.parse(_url);
                  var _path = method.fullPath;
          
                  _path = _u.protocol+"//"+_u.host+_path;
                  
           
                  var _input={};  

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
                    if(_path.indexOf(":"+paramName)!=-1){
                      _path= _path.replace(":"+paramName,input[paramName]);
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
                          request({ uri: _path+"?"+query, method: method.method, headers: headers, json:true}, function(err,ahr,data){
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
                          }  

                          var r = request({uri: _path, method: method.method, json:json, headers: headers, callback: function(err,ahr,data){
                            responseHandler(err,ahr,data,onComplete);
                          } });

                          if(useForm){
                              var form = r.form();
                              de = new util.DataEncoder(form);
                              de.encode(_input);
                          }

                  }
                };

      
        })(objName,methodName,options);
      }
    }
    onComplete(null,api);    

  }); 
}


Hop.remoteAPITestHarness=function(_url,onComplete){
  if(!(/.*\/apitest.js/.test(_url))){
    var _u = url.parse(_url);
    _url = _u.protocol+"//"+_u.host+"/_hopjs/apitest.js";
  }

  request.get(_url,function(err,ahr,data){

    if(err) return onComplete(err);
    if(!data) return onComplete("Invalid url"); 
    
    onComplete(null,data.toString());    

  }); 
}



Hop.remoteAPITest=function(_url,onComplete){
  if(!(/.*\/apitest.json/.test(_url))){
    var _u = url.parse(_url);
    _url = _u.protocol+"//"+_u.host+"/_hopjs/apitest.json";
  }

  request.get(_url,function(err,ahr,data){

    if(err) return onComplete(err);
    if(!data) return onComplete("Invalid url"); 
    
    onComplete(null,data);    

  }); 
}

module.exports=Hop;
