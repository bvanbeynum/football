var jwt = require("jsonwebtoken");
var data = require("./datamodels");
var config = require("./config");

module.exports = function (request, response, next) {
	var authentication = request.get("Authorization");
	
	if (!authentication || authentication.split(" ")[0].toLowerCase() != "basic" || authentication.indexOf(" ") < 0) {
		response.status(403).send("Invalid authentication method");
		return;
	}
	
	var session = authentication.split(" ")[1];
	
	jwt.verify(session, config.jwtSecret, function (error, token) {
		if (error) {
			response.status(403).send("Invalid token");
			return;
		}
		
		data.user.findById(token.id)
			.exec()
			.then(() => {
				request.token = token;
				next();
			})
			.catch((error) => {
				response.status(500).send(error.message);
			});
	});
};