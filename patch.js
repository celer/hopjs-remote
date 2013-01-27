fs = require('fs');

var file = "node_modules/request/node_modules/form-data/node_modules/combined-stream/lib/combined_stream.js";

fs.readFile(file,function(err,data){
	if(err) process.exit(-1);
	data = data.toString();

	data = data.replace("(!stream)","(typeof stream==\"undefined\")");


	fs.writeFile(file,data,function(err){
		if(err) process.exit(-1);
		else process.exit(0);	
	});
});
