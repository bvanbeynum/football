// Setup =======================================================================

var express = require("express");
var app = express();
var port = process.env.PORT || 7575;

var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var config = require("./server/config");

// Config =======================================================================

mongoose.Promise = require("bluebird");
if (config.mongo.user) {
	mongoose.connect("mongodb://" + config.mongo.user + ":" + config.mongo.password + "@" + config.mongo.server + "/" + config.mongo.database + "?authSource=admin");
}
else {
	mongoose.connect("mongodb://" + config.mongo.server + "/" + config.mongo.database);
}

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("x-powered-by", false);
app.set("root", __dirname);

// Routes =======================================================================

// require("./server/api")(app);
// require("./server/app")(app);
require("./server/static")(app);

// listen (start app with node server.js) ======================================

app.listen(port);
console.log("App listening on port " + port);
