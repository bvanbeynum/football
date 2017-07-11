var data = require("./datamodels");

module.exports = function (app) {
	
	app.get("/app/home/load", function(request, response) {
		var output = {};
		
		data.game
			.find({user: request.token.id})
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
		var output = {};
		
		data.division
			.find()
			.exec()
			.then(function (divisionsDb) {
				output.divisions = divisionsDb.map(divisionDb => divisionDb.name);
				
				return data.team
					.find({ user: request.token.id })
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
				user: request.token.id,
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

	app.get("/app/playeradd/load", function (request, response) {
		data.team
			.find({ 
				user:request.token.id,
				division: request.query.divisions
			})
			.exec()
			.then(function (teamsDb) {
				var output = {};
				
				output.teams = teamsDb.map(function (teamDb) {
					return {
						id: teamDb._id,
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
	
	app.post("/app/teamsave", function (request, response) {
		if (!request.body.team || !request.body.team.name || !request.body.team.season || !request.body.team.year || !request.body.team.division) {
			response.status(500).send("Invalid team save request");
			return;
		}
		
		var team = request.body.team;

		data.team
			.findOne({
				name: new RegExp("^" + team.name + "$", "i"),
				division: new RegExp("^" + team.division + "$", "i"),
			})
			.exec()
			.then(function (error, teamFind) {
				if (teamFind) {
					// Team already exists
					response.status(200).json({ teamId: teamFind._id });
					return;
				}
				
				return new data.team({
					user: request.token.id,
					name: team.name,
					division: team.division.toUpperCase(),
					color: team.color
				})
				.save();
			})
			.then(function (teamDb) {
				response.status(200).json({ teamId: teamDb._id });
			})
			.catch(function (error) {
				response.status(500).send(error);
			});
	});
	
	app.post("/app/playeradd/save", function (request, response) {
		if (!request.body.player || !request.body.player.number) {
			response.status(500).send("Invalid player save request");
			return;
		}
		
		var playerSave = request.body.player;
		
		new data.player({
				user: request.token.id,
				firstName: playerSave.firstName,
				lastName: playerSave.lastName,
				number: playerSave.number,
				team: playerSave.team ? { id: playerSave.team.id, name: playerSave.team.name } : null
			})
			.save()
			.then(() => { response.status(200).send("ok"); })
			.catch((error) => { response.status(500).send(error.message); });

	});
	
};