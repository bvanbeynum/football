var jwt = require("jsonwebtoken");
var data = require("./datamodels");
var config = require("./config");

module.exports = function (app) {
	
	app.get("/", function(request, response) {
		var session = (Math.floor(Math.random() * 100000000000)) + "";
		
		var sendFile = function () {
			response.sendFile("/client/index.html", { root: app.get("root") });
		};
		
		var buildCookie = function () {
			new data.user({
				userAgent: request.get("User-Agent"),
				created: new Date(),
				session: session,
				login: [new Date()]
			})
			.save()
			.then((userDb) => {
				var token = jwt.sign({ session: session, id: userDb._id }, config.jwtSecret),
					expireDate = new Date();
				
				expireDate.setYear(expireDate.getFullYear() + 1);
				response.cookie("session", token, { expires: expireDate });
				
				sendFile();
			})
			.catch(() => { sendFile() });
		};
		
		if (request.cookies.session) {
			// Have a cookie but need to validate
			jwt.verify(request.cookies.session, config.jwtSecret, function (error, token) {
				if (error) {
					// Invalid cookie, build a new one
					buildCookie();
				}
				else {
					// Valid cookie check the DB
					data.user.findById(token.id)
						.exec()
						.then((userDb) => {
							if (userDb && userDb.session == token.session) {
								// Cookie matches session from db update login
								data.user.update(
									{ _id: token.id }, 
									{ 
										$push: { login: new Date() },
										session: session
									}
									)
									.exec()
									.then(() => { 
										// Updated cookie, reset the expire date
										var token = jwt.sign({ session: session, id: userDb._id }, config.jwtSecret),
											expireDate = new Date();
										
										expireDate.setYear(expireDate.getFullYear() + 1);
										response.cookie("session", token, { expires: expireDate });
										
										sendFile();
									})
									.catch(() => { sendFile() });
							}
							else {
								// Couldn't find in the database new cookie
								buildCookie();
							}
						})
						.catch(() => { buildCookie() });
				}
			});
		}
		else {
			buildCookie();
		}
		
	});
	
	app.get("/test", function(request, response) {
		response.send("version: 12");
	});
	
	app.get("*", function (request, response) {
		response.sendFile("/client" + request.path, { root: app.get("root") });
	});
	
};
