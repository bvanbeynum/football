var data = require("./datamodels");

module.exports = function (app) {
	
	app.get("/app/home/load", function(request, response) {
		var output = {};
		
		data.game
			.find()
			.exec()
			.then(gamesDb => {
				output.games = gamesDb.map(gameDb => ({
					id: gameDb._id,
					division: gameDb.division,
					created: gameDb.created,
					teamHome: { 
						id: gameDb.teamHome.id, 
						name: gameDb.teamHome.name,  
						players: gameDb.teamHome.players,
						score: gameDb.stats
							.filter((stat) => stat.teamId == gameDb.teamHome.id && stat.name == "Points" )
							.reduce((sum, stat) => sum += stat.value, 0)
					},
					teamAway: { 
						id: gameDb.teamAway.id, 
						name: gameDb.teamAway.name, 
						players: gameDb.teamAway.players,
						score: gameDb.stats
							.filter((stat) => stat.teamId == gameDb.teamAway.id && stat.name == "Points" )
							.reduce((sum, stat) => sum += stat.value, 0)
					}
				}));
				
				var teamIds = output.games
					.reduce((array, game) => array.concat(game.teamHome.id).concat(game.teamAway.id), []);
				
				return data.team
					.find({_id: {$in: teamIds } })
					.exec();
			})
			.then(teamsDb => {
				var team;
				output.games.forEach(game => {
					team = teamsDb.find(teamDb => teamDb._id == game.teamHome.id);
					if (team) game.teamHome.color = team.color;
					
					team = teamsDb.find(teamDb => teamDb._id == game.teamAway.id);
					if (team) game.teamAway.color = team.color;
				});
				
				response.status(200).json(output);
			})
			.catch(error => { response.status(500).send(error.message); });
	});
	
	app.delete("/app/home/game", (request, response) => {
		if (!request.query.gameId) {
			response.status(500).send("Invalid game to delete");
			return;
		}
		
		data.game.findById(request.query.gameId)
			.exec()
			.then((gameDb) => { 
				if (gameDb) {
					return gameDb.remove();
				}
				else {
					response.status(200).send("ok"); 
				}
			})
			.then(() => { response.status(200).send("ok"); })
			.catch((error) => { response.status(500).send(error.message) });
			
	});
	
	app.get("/app/gamesetup/load", function(request, response) {
		var output = {}, season, currentDate = new Date(), year = currentDate.getFullYear();
		
		if (currentDate.getMonth() < 5) {
			season = new RegExp("^spring$", "i");
		}
		else if (currentDate.getMonth() < 7) {
			season = new RegExp("^summer$", "i");
		}
		else {
			season = new RegExp("^fall$", "i");
		}
		
		data.division
			.find()
			.exec()
			.then(function (divisionsDb) {
				output.divisions = divisionsDb.map(divisionDb => divisionDb.name);
				
				return data.team
					.find({
						year: year,
						season: season
					})
					.exec();
			})
			.then(teamsDb => {
				output.teams = teamsDb.map(teamDb => ({
					id: teamDb._id,
					name: teamDb.name,
					division: teamDb.division
				}));
				
				response.status(200).json(output);
			})
			.catch(error => {
				response.status(500).send(error.message);
			});
	});
	
	app.post("/app/gamesetup/save", function(request, response) {
		if (!request.body.game || !request.body.game.division || !request.body.game.teamHome || !request.body.game.teamAway) {
			response.status(500).send("Invalid game");
			return;
		}
		
		var gameSave = request.body.game;
		
		// New Game
		new data.game({
				division: gameSave.division,
				created: new Date(),
				teamHome: { 
					id: gameSave.teamHome.id, 
					name: gameSave.teamHome.name
				},
				teamAway: { 
					id: gameSave.teamAway.id, 
					name: gameSave.teamAway.name
				}
			})
			.save()
			.then(gameDb => { response.status(200).json({ gameId: gameDb._id }); })
			.catch(error => { response.status(500).send(error.message); });
		
	});
	
	app.get("/app/gameplay/load", function(request, response) {
		if (!request.query.gameId) {
			response.status(500).send("Invalid game");
			return;
		}
		
		var output = {};
		
		data.game.findById(request.query.gameId)
			.exec()
			.then(gameDb => {
				output.game = {
					id: gameDb._id,
					teamHome: { id: gameDb.teamHome.id },
					teamAway: { id: gameDb.teamAway.id },
					stats: gameDb.stats
				};
				
				return data.team.find({ _id: { $in: [output.game.teamHome.id, output.game.teamAway.id] } })
					.exec();
			})
			.then(teamsDb => {
				var home = teamsDb.find(teamDb => teamDb.id == output.game.teamHome.id),
					away = teamsDb.find(teamDb => teamDb.id == output.game.teamAway.id);
				
				output.game.teamHome.name = home.name;
				output.game.teamHome.color = home.color;
				output.game.teamAway.name = away.name;
				output.game.teamAway.color = away.color;
				
				return data.player.find({"team.id": { $in: [output.game.teamHome.id, output.game.teamAway.id] }})
					.exec();
			})
			.then((playersDb) => {
				output.game.players = playersDb.map((playerDb) => ({
					id: playerDb.id,
					teamId: playerDb.team.id,
					firstName: playerDb.firstName,
					lastName: playerDb.lastName,
					number: playerDb.number
				}));
				
				response.status(200).json(output);
			})
			.catch(error => {
				response.status(500).send(error.message);
			});
	});
	
	app.post("/app/gamestat/save", function(request, response) {
		if (!request.body.gameId || !request.body.stats) {
			response.status(500).send("Invalid stat");
			return;
		}
		
		var statsSave = request.body.stats.map((statSave) => ({
				teamId: statSave.teamId,
				playerId: statSave.playerId,
				formation: statSave.formation,
				name: statSave.name,
				value: statSave.value,
				time: new Date()
			}));
		
		data.game
			.update(
				{_id: request.body.gameId}, 
				{ $push: { stats: { $each: statsSave } } }
			)
			.exec()
			.then(() => {
				response.status(200).send("ok");
			})
			.catch((error) => {
				response.status(500).send(error.message);
			});
	});
	
	app.get("/app/playerlist/load", function(request, response) {
		var output = {};
		
		data.player
			.find()
			.exec()
			.then(function (playersDb) {
				var teamIds = [];
				
				output.players = playersDb.map(function (playerDb) {
					if (playerDb.team) {
						teamIds.push(playerDb.team.id);
					}
					
					return {
						id: playerDb._id,
						firstName: playerDb.firstName,
						lastName: playerDb.lastName,
						age: playerDb.age,
						number: playerDb.number,
						team: { id: playerDb.team.id, name: playerDb.team.name }
					};
				});
				
				return data.team.find({ _id: { $in: teamIds } })
					.exec();
			})
			.then(function (teamsDb) {
				var team;
				
				output.players
					.forEach(function (player) {
						team = teamsDb.find(function (teamDb) { 
							return teamDb._id == player.team.id; 
						});
						
						if (team) {
							player.team = {
								id: team._id,
								name: team.name,
								year: team.year,
								season: team.season,
								division: team.division,
								color: team.color
							};
						}
					});
				
				response.status(200).json(output);
			})
			.catch(function (error) {
				response.status(500).send(error.message);
			});
	});
	
	app.get("/app/playeredit/load", function (request, response) {
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
		
		data.team
			.find({ season: season, year: currentDate.getFullYear() })
			.exec()
			.then(function (teamsDb) {
				var output = {};
				
				output.teams = teamsDb.map(function (teamDb) {
					return {
						id: teamDb._id,
						division: teamDb.division,
						name: teamDb.name,
						color: teamDb.color
					};
				});
				
				response.status(200).json(output);
			})
			.catch(function (error) {
				response.status(500).send(error.message);
			});
	});
	
	app.post("/app/playeredit/save", function (request, response) {
		if (!request.body.player || !request.body.player.firstName || !request.body.player.lastName || !request.body.player.number || !request.body.player.age) {
			response.status(500).send("Invalid player save request");
			return;
		}
		
		var playerSave = request.body.player;
		
		if (playerSave.id) {
			// Update
			
			data.player.findById(playerSave.id)
				.exec()
				.then(function (playerDb) {
					if (!playerDb) {
						response.status(404).send("Could not find requested player");
						return;
					}
					
					playerDb.firstName = playerSave.firstName;
					playerDb.lastName = playerSave.lastName;
					playerDb.number = playerSave.number;
					playerDb.age = playerSave.age;
					
					data.team.findById(playerSave.team.id)
						.exec()
						.then((teamDb) => {
							if (teamDb.length > 0) {
								playerDb.team = { id: teamDb._id, name: teamDb.name };
							}
							
							return playerDb.save();
						})
						.then(() => { response.status(200).send("ok"); })
						.catch((error) => { response.status(500).send(error.message); });
					
				})
				.catch(function (error) {
					response.status(500).send(error.message);
				});
		}
		else {
			// Add
			
			new data.player({
					firstName: playerSave.firstName,
					lastName: playerSave.lastName,
					number: playerSave.number,
					age: playerSave.age,
					team: playerSave.team ? { id: playerSave.team.id, name: playerSave.team.name } : null
				})
				.save()
				.then(() => { response.status(200).send("ok"); })
				.catch((error) => { response.status(500).send(error.message); });
			
		}
	});
	
	app.get("/app/playerfilter/load", function(request, response) {
		var output = {};
		
		data.team
			.find()
			.exec()
			.then(function (teamsDb) {
				output.years = teamsDb
					.map(team => team.year)
					.filter((year, index, array) => array.indexOf(year) === index);
				
				output.seasons = teamsDb
					.map(team => team.season)
					.filter((season, index, array) => array.indexOf(season) === index);
				
				output.divisions = teamsDb
					.map(team => team.division)
					.filter((division, index, array) => array.indexOf(division) === index);
				
				output.teams = teamsDb
					.map(teamDb => ({
						id: teamDb._id,
						year: teamDb.year,
						name: teamDb.name,
						division: teamDb.division,
						season: teamDb.season
					}));
				
				response.status(200).json(output);
			})
			.catch(function (error) {
				response.status(500).send(error.message);
			});
	});
	
};