fs = require('fs');

var file = "node_modules/request/node_modules/form-data/node_modules/combined-stream/lib/combined_stream.js";

fs.readFile(file,function(err,data){
	if(err){
		console.log("Error reading combined-stream file for patching", err);
		process.exit(0);
	}
	data = data.toString();

	data = data.replace("(!stream)","(typeof stream==\"undefined\")");


	fs.writeFile(file,data,function(err){
		if(err) {
			console.log("Error reading combined-stream file for patching", err);
			process.exit(0);
		} else process.exit(0);	
	});
});
