var exec = require('child_process').exec;


function reload() {
	console.log("Checking remote master branch for changes and merging");
	
	console.log("git fetch");
	exec("git fetch", function (error, stdout, stderr) {
		if (stderr.length) {
			console.log(stderr);
		}
		
		console.log("git diff master origin/master");
		exec("git diff master origin/master", function(error, stdout, stderr) {
			
			if (stdout.length > 0) {
				console.log(stdout);
				
				console.log("git merge");
				exec("git merge", function(error, stdout, stderr) {
					if (stdout.length > 0) {
						console.log(stdout);
					}
				});
			}
			else {
				console.log("no changes");
			}
			
		});
	});
}

reload();
setInterval(reload, 60000);
