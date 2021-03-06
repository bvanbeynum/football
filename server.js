// Setup =======================================================================

var express = require("express");
var app = express();
var port = process.env.PORT || 8080;

var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var config = require("./server/config");
var logging = require("./server/weblog");
var authenticate = require("./server/authenticate");

// Config =======================================================================

mongoose.Promise = require("bluebird");

if (config.mongo.user) {
	mongoose.connect("mongodb://" + config.mongo.user + ":" + config.mongo.password + "@" + config.mongo.servers.join(",") + "/" + config.mongo.database + "?authSource=admin");
}
else {
	mongoose.connect("mongodb://" + config.mongo.servers.join(",") + "/" + config.mongo.database);
}

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("*", logging);
app.use("/app/*", authenticate);

app.set("x-powered-by", false);
app.set("root", __dirname);

// Routes =======================================================================

require("./server/app")(app);
require("./server/static")(app);

// listen (start app with node server.js) ======================================

app.listen(port);
console.log("App listening on port " + port);
