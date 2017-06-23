var jwt = require("jsonwebtoken");
var data = require("./datamodels");
var config = require("./config");

module.exports = function (app) {
	app.use("/blah", function (request, response, next) {
		var session;
		
		if (request.cookies.session) {
			console.log(request.path + " has cookie");
			next();
		}
		else {
			console.log(request.path + " needs cookie");
			session = (Math.floor(Math.random() * 100000000000)) + "";
			
			new data.user({
				userAgent: request.get("User-Agent"),
				created: new Date(),
				session: session
			})
			.save()
			.then((userDb) => {
				var token = jwt.sign({ session: session, id: userDb._id }, config.jwtSecret),
					expireDate = new Date();
				
				expireDate.setYear(expireDate.getFullYear() + 1);
				response.cookie("session", token, { expires: expireDate });
				
				next();
			})
			.catch((error) => { response.status(500).send(error.message) });
		}
	});
};