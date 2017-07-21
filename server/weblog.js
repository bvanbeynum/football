var jwt = require("jsonwebtoken");
var data = require("./datamodels");
var config = require("./config");

module.exports = function (request, response, next) {
	if (request.cookies.session) {
		jwt.verify(request.cookies.session, config.jwtSecret, (error, token) => {
			
			new data.log({
				created: new Date(),
				userId: token.id,
				type: "web",
				requestIp: request.ip,
				method: request.method,
				host: request.header("Hostname"),
				url: request.url,
				referrer: request.header("Referrer")
			}).save();
			
		});
	}
	else {
		new data.log({
			created: new Date(),
			userId: null,
			type: "web",
			requestIp: request.ip,
			method: request.method,
			host: request.header("Hostname"),
			url: request.originalUrl,
			referrer: request.header("Referrer")
		}).save();
	}
	
	next();
};