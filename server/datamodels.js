var mongoose = require("mongoose");

module.exports = {
	division: mongoose.model("division", {
		name: String,
		ages: [Number]
	}),
	
	team: mongoose.model("team", {
		name: String,
		coach: String,
		division: String,
		year: Number,
		season: String,
		color: String,
		user: String
	}),
	
	player: mongoose.model("player", {
		firstName: String,
		lastName: String,
		number: Number,
		age: Number,
		team: {
			id: String,
			name: String
		},
		previousTeams: [{
			id: String,
			name: String
		}],
		user: String
	}),
	
	game: mongoose.model("game", {
		division: String,
		created: Date,
		teamHome: {
			id: String,
			name: String
		},
		teamAway: {
			id: String,
			name: String
		},
		stats: [{
			playerId: String,
			teamId: String,
			formation: String,
			name: String,
			time: Date,
			value: Number
		}],
		user: String
	}),
	
	user: mongoose.model("user", {
		userAgent: String,
		created: Date,
		session: String,
		login: [Date]
	})
};
