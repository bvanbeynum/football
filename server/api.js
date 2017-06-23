var data = require("./datamodels");

module.exports = function (app) {
	
	app.get("/api/teamlist", function (request, response) {
		var filter = {};
		if (request.query.filter) {
			switch (request.query.filter) {
			case "current":
				
				var season, currentDate = new Date();
				if (currentDate.getMonth() < 5) {
					season = new RegExp("^spring$", "i");
				}
				else if (currentDate.getMonth() < 7) {
					season = new RegExp("^summer$", "i");
				}
				else {
					season = new RegExp("^fall$", "i");
				}
				
				filter = { 
					year: (new Date()).getFullYear(),
					//season: season
				};
				break;
			}
		}
		
		data.team.find(filter)
			.exec()
			.then(function (teams) {
				response.status(200).json(teams.map(function (team) {
					return {
						id: team._id,
						name: team.name,
						coach: team.coach,
						division: team.division,
						year: team.year,
						season: team.season,
						color: team.color
					};
				}));
			})
			.catch(function (error) {
				response.status(500).send(error);
			});
	});
	
	app.post("/api/teamsave", function (request, response) {
		if (!request.body.team || !request.body.team.name || !request.body.team.season || !request.body.team.year || !request.body.team.division) {
			response.status(500).send("Invalid team save request");
			return;
		}
		
		var team = request.body.team;
		
		if (team.id) {
			// Update
			data.team.findById(team.id)
				.exec()
				.then(function (teamDb) {
					if (!teamDb) {
						response.status(404).send("Could not find requested team");
						return;
					}
					
					teamDb.name = team.name;
					teamDb.coach = team.coach;
					teamDb.year = team.year;
					teamDb.season = team.season;
					teamDb.division = team.division;
					teamDb.color = team.color;
					
					return teamDb.save();
				})
				.then(function (teamDb) {
					response.status(200).send("ok");
				})
				.catch(function (error) {
					response.status(500).send(error);
				});
		}
		else {
			// Add
			
			data.team
				.findOne({
					name: new RegExp("^" + team.name + "$", "i"),
					division: new RegExp("^" + team.division + "$", "i"),
					season: new RegExp("^" + team.season + "$", "i"),
					year: team.year
				})
				.exec()
				.then(function (error, teamFind) {
					if (teamFind) {
						// Team already exists
						response.status(200).send("ok");
						return;
					}
					
					return new data.team({
						name: team.name,
						coach: team.coach,
						division: team.division.toUpperCase(),
						year: team.year,
						season: team.season,
						color: team.color
					})
					.save();
				})
				.then(function (teamDb) {
					response.status(200).send("ok");
				})
				.catch(function (error) {
					response.status(500).send(error);
				});
		}
	});
	
	app.delete("/api/teamdelete", function (request, response) {
		if (!request.query.teamId) {
			response.status(500).send("Invalid team");
			return;
		}
		
		data.team.findById(request.query.teamId)
			.exec()
			.then(function (teamDb) {
				if (!teamDb) {
					response.status(200).send("ok");
					return;
				}
				
				return teamDb.remove();
			})
			.then(function () {
				response.status(200).send("ok");
			})
			.catch(function (error) {
				response.status(500).send(error);
			});
	});
	
		
	app.get("/api/playerlist", function (request, response) {
		data.player.find()
			.exec()
			.then(function (playersDb) {
				var players = players.map(function (player) {
					return {
						id: player._id,
						number: player.number,
						name: player.name,
						birthDate: player.birthDate,
						team: player.team
					};
				});
				
				response.status(200).json(players);
			})
			.catch(function (error) {
				response.status(500).send(error);
			});
	});
	
};

