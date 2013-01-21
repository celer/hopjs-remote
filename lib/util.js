var path = require('path');

var webpath = {};

//joining process for URL's, on windows will replace backslashes with forward.
webpath.join = function(){
	var pathArgs = [];
	
	for(var i in arguments){
		pathArgs.push(arguments[i]);		
	}
	var ret = path.join.apply(null,pathArgs);
	if(path.sep == "\\"){
		ret=ret.replace(/\\/g, "/");
	}
	return ret;
};

var Stream = require('stream');

exports.appendForm=function(form,object,path){
	var hasData=false;
	form=form|| { append:function(){}};
	for(var i in object){
		var v = object[i];
		var p = i;
		if(typeof path!="undefined"){
			p=path+'['+p+']';
		}
		if(v===null){
			form.append(p,"");
			hasData=true;
		} else if(typeof Stream!="undefined" && v instanceof Stream){
			form.append(p,v);
			hasData=true;
		} else if(typeof Buffer!="undefined" && v instanceof Buffer){
			form.append(p,v);
			hasData=true;
		} else if(typeof Blob!="undefined" && v instanceof Blob){
			form.append(p,v);
			hasData=true;
		} else if(typeof File!="undefined" && v instanceof File){
			form.append(p,v);
			hasData=true;
		} else if(typeof v=="object"){
			hasData=Hop.appendForm(form,v,p);	
		} else if(typeof v!="undefined"){
			form.append(p,v.toString());
			hasData=true;
		}
	}
	return hasData;
}

exports.webpath = webpath;

