/* global angular */

var log = {};
var recApp = angular.module("recApp", ["ngMaterial", "ngMessages", "ngRoute", "ngCookies"]);

recApp.config(function ($mdThemingProvider, $routeProvider) {
	$mdThemingProvider.theme("default")
		.primaryPalette("teal")
		.accentPalette("blue");
	
	$routeProvider
		.when("/gameplay", {
			templateUrl: "/view/gameplay.html",
			controller: "gameplay"
		})
		.when("/teams", {
			templateUrl: "view/teamlist.html",
			controller: "teamListCtl"
		})
		.when("/players", {
			templateUrl: "view/playerlist.html",
			controller: "playerListCtl"
		})
		.otherwise({
			templateUrl: "view/home.html",
			controller: "homeCtl"
		});
});

recApp.directive("ontransitionend", function ($parse) {
	return {
		restrict: "A",
		link: function (scope, element, attributes) {
			var func = $parse(attributes["ontransitionend"]);
			
			element.bind("transitionend", function (event) {
				if (scope.$root.$$phase == "$apply" || scope.$root.$$phase == "$digest") {
					func();
				}
				else {
					scope.$apply(func);
				}
			});
		}
	};
});

recApp.directive("setfocus", function ($timeout, $parse) {
	return {
		restrict: "A",
		link: function (scope, element, attributes) {
			var object = $parse(attributes["setfocus"]);
			
			scope.$watch(object, function (value) {
				if (value === true) {
					$timeout(function () {
						element[0].focus();
					});
				}
			});
		}
	};
});

recApp.controller("recCtl", function ($scope, $rootScope, $location, $mdSidenav) {
	log.scope = {primary: $scope, root: $rootScope};
	
	if ($location.path().length > 0) {
		$location.path("");
	}
	
	$rootScope.materialColors = ["red", "pink", "purple", "deep-purple", "indigo", "blue", "light-blue", "cyan", "teal", "green", "light-green", "lime", "yellow", "amber", "orange", "deep-orange", "brown", "grey", "blue-grey"]
		.sort(function (prev, curr) {
			return prev < curr ? -1 : 1;
		});
	
	$scope.closeNav = function () {
		$mdSidenav("left").close();
	};
	
	$scope.openNav = function () {
		$mdSidenav("left").open();
	};
	
	$rootScope.navigate = function (location) {
		$location.path(location);
		$scope.closeNav();
	};
});

recApp.controller("homeCtl", function($scope, $http, $location, $rootScope, $cookies) {
	log.scope.home = $scope;
	
	$rootScope.currentGame = null;
	
	$scope.load = function () {
		$scope.isLoading = true;
		
		$http({
			method: "GET",
			url: "/app/home/load",
			headers: {
				"Authorization": "Basic " + $cookies.get("session")
			}
		})
		.then(function (response) {
			$scope.games = response.data.games
				.sort(function (prev, curr) {
					return (new Date(curr.created)) - (new Date(prev.created));
				});
			
			var currentDate = new Date(), gameDate;
			$scope.games.forEach(function (game) {
				game.teamHome.letter = game.teamHome.name.substring(0,1).toUpperCase();
				game.teamAway.letter = game.teamAway.name.substring(0,1).toUpperCase();
				
				game.teamHome.score = game.teamHome.score || 0;
				game.teamAway.score = game.teamAway.score || 0;
				
				gameDate = new Date(game.created);
				
				if ((currentDate - gameDate) / 1000 < 60) {
					game.age = "A few seconds ago";
				}
				else if ((currentDate - gameDate) / 1000 / 60 < 60) {
					game.age = Math.round((currentDate - gameDate) / 1000 / 60) + " minutes ago";
				}
				else if ((currentDate - gameDate) / 1000 / 60 / 60 < 24) {
					game.age = Math.round((currentDate - gameDate) / 1000 / 60 / 60) + " hours ago";
				}
				else if ((currentDate - gameDate) / 1000 / 60 / 60 / 24 < 8) {
					game.age = Math.round((currentDate - gameDate) / 1000 / 60 / 60 / 24) + " days ago";
				}
				else {
					game.age = gameDate.toDateString();
				}
			});
			
			$scope.isLoading = false;
		}, function (response) {
			console.log(response);
			$scope.errorMessage = "Error communicating with the server";
			
			$scope.isLoading = false;
		});	
	};
	
	$scope.startGame = function () {
		$location.path("/gameplay");
	};
	
	$scope.loadGame = function (game) {
		$rootScope.currentGame = game;
		$location.path("/gameplay");
	};
	
	$scope.deleteGame = function (game) {
		$scope.isLoading = true;
		
		$http({
			method: "DELETE",
			url: "/app/home/game?gameId=" + game.id,
			headers: {
				"Authorization": "Basic " + $cookies.get("session")
			}
		})
		.then(response => {
			$scope.load();
		}, response => {
			console.log(response);
			$scope.errorMessage = "There was an error deleting the game";
			$scope.isLoading = false;
		});
	};
	
	$scope.load();
});

recApp.controller("gameplay", function($scope, $http, $mdDialog, $location, $rootScope, $cookies) {
	log.scope.gamePlay = $scope;
	
	var updateGame = function () {
		$scope.game.players.forEach(function (player) {
			player.stats = d3.nest()
				.key(function (stat) { return stat.name})
				
				.entries(
					$scope.game.stats.filter(function (stat) { return stat.playerId == player.id})
				)
				
				.reduce(function (output, groupItem) {
					output[groupItem.key] = groupItem.values.reduce(function (sum, stat) { return sum += stat.value || 1 }, 0);
					return output;
				}, {});
		});
		
		$scope.game.teamHome.score = $scope.game.stats
			.filter(function (stat) { return stat.teamId == $scope.game.teamHome.id && stat.name == "Points" })
			.reduce(function (output, stat) { return output += stat.value}, 0);
		
		$scope.game.teamAway.score = $scope.game.stats
			.filter(function (stat) { return stat.teamId == $scope.game.teamAway.id && stat.name == "Points" })
			.reduce(function (output, stat) { return output += stat.value}, 0);
	};
	
	var load = function () {
		$scope.isLoading = true;
		
		$http({
			method: "GET",
			url: "/app/gameplay/load?gameId=" + $scope.game.id,
			headers: {
				"Authorization": "Basic " + $cookies.get("session")
			}
		})
		.then(function (response) {
			
			$scope.game = response.data.game;
			$scope.header = $scope.game.teamHome.name + " vs " + $scope.game.teamAway.name;
			
			$scope.game.teamHome.letter = $scope.game.teamHome.name.charAt(0).toUpperCase();
			$scope.game.teamHome.score = $scope.game.teamHome.score || 0;
			
			$scope.game.teamAway.letter = $scope.game.teamAway.name.charAt(0).toUpperCase();
			$scope.game.teamAway.score = $scope.game.teamAway.score || 0;
			
			$scope.game.players.forEach(function (player) {
				player.displayName = player.firstName + " " + player.lastName.charAt(0).toUpperCase() + ".";
			});
			
			$scope.selectTeam("home");
			updateGame();
			$scope.isLoading = false;
			
		}, function (response) {
			console.log(response);
			$scope.errorMessage = "There was an error loading the game";
			$scope.isLoading = false;
		});
	};
	
	$scope.game = { teamAway: {}, teamHome: {}, players: [] };
	
	if ($rootScope.currentGame) {
		$scope.game = $rootScope.currentGame;
		load();
	}
	else {
		$scope.isLoading = true;
		
		$mdDialog.show({
			templateUrl: "/view/dialog/gamesetup.html",
			controller: gameSetupCtl,
			clickOutsideToClose: false,
			escapeToClose: false,
			openFrom: {
				top: document.documentElement.clientHeight,
				left: 0
			},
			closeTo:{
				top: document.documentElement.clientHeight,
				left: 0
			}
		})
		.then(function (game) {
			$scope.game = game;
			load();
		}, function () {
			// Cancel
			$location.path("");
		});
	}
	
	$scope.addPlayer = function () {
		var player = {
		};
		
		$mdDialog.show({
			templateUrl: "/view/dialog/playeredit.html",
			controller: playerEditlCtl,
			locals: { player: player },
			clickOutsideToClose: true,
			escapeToClose: true,
			fullscreen: true,
			openFrom: {
				top: document.documentElement.clientHeight,
				left: 0
			},
			closeTo:{
				top: document.documentElement.clientHeight,
				left: 0
			}
		})
		.then(function () {
			// Update
			$scope.isLoading = true;
			load();
		});
		
	};
	
	$scope.addStat = function (player) {
		$mdDialog.show({
			templateUrl: "/view/dialog/gamestat.html",
			controller: gamestatCtl,
			locals: { gameId: $scope.game.id, player: player },
			clickOutsideToClose: true,
			escapeToClose: true,
			fullscreen: false,
			openFrom: { top: document.documentElement.clientHeight, left: 0 },
			closeTo: { top: document.documentElement.clientHeight, left: 0 }
		})
		.then(function (stats) {
			log.stats = stats;
			$scope.game.stats = $scope.game.stats.concat(stats);
			updateGame();
		});
	};
	
	$scope.selectTeam = function (team) {
		$scope.selectedTeam = team;
		
		if (team == "home") {
			$scope.playerDisplay = $scope.game.players
				.filter(function (player) { return player.teamId == $scope.game.teamHome.id; });
		}
		else {
			$scope.playerDisplay = $scope.game.players
				.filter(function (player) { return player.teamId == $scope.game.teamAway.id; });
		}
	};
	
});

recApp.controller("teamListCtl", function ($scope, $rootScope, $mdDialog, $http) {
	log.scope.team = $scope;
	$scope.isLoading = true;
	
	var loadTeams = function () {
		$http({
			method: "GET",
			url: "/api/teamlist",
			headers: { Accept: "application/json" }
		})
		.then(function (response) {
			$scope.teams = response.data.map(function (team) {
				return {
					id: team.id,
					name: team.name,
					coach: team.coach,
					year: team.year,
					division: team.division ? team.division.toUpperCase() : "",
					season: team.season ? team.season.substring(0,1).toUpperCase() + team.season.substring(1) : "",
					letter: team.name.substring(0,1).toUpperCase(),
					color: team.color
				};
			})
			.sort(function (prev, curr) {
				if (prev.year != curr.year) {
					return curr.year - prev.year;
				}
				else if (prev.division != curr.division) {
					return prev.division < curr.division ? -1 : 1;
				}
				else {
					return prev.name < curr.name ? -1 : 1;
				}
			});
			
			$scope.isLoading = false;
		}, function (response) {
			console.log(response);
			$scope.error = response;
			
			$scope.isLoading = false;
		});
	};
	
	var showDialog = function (team) {
		$mdDialog.show({
			templateUrl: "/view/dialog/teamedit.html",
			controller: teamEditCtl,
			locals: { team: team },
			clickOutsideToClose: true,
			escapeToClose: true,
			fullscreen: true,
			openFrom: {
				top: document.documentElement.clientHeight,
				left: 0
			},
			closeTo:{
				top: document.documentElement.clientHeight,
				left: 0
			}
		})
		.then(function () {
			// Update
			$scope.isLoading = true;
			loadTeams();
		});
	};
	
	loadTeams();
	
	$scope.addTeam = function () {
		var newTeam = {
			year: (new Date()).getFullYear()
		};
		
		showDialog(newTeam);
	};
	
	$scope.editTeam = function (team) {
		showDialog(team);
	};
});

recApp.controller("playerListCtl", function ($scope, $rootScope, $mdDialog, $http, $cookies) {
	log.scope.playerlist = $scope;
	
	var load = function () {
		$http({
			method: "GET",
			url: "/app/playerlist/load",
			headers: {
				"Authorization": "Basic " + $cookies.get("session")
			}
		})
		.then(function (response) {
			$scope.players = response.data.players.map(function (player) {
				return {
					id: player.id,
					firstName: player.firstName,
					lastName: player.lastName,
					number: player.number,
					age: player.age,
					team: player.team,
					color: player.team ? player.team.color : "brown"
				};
			});
			
			filterPlayers();
			
			$scope.isLoading = false;
		}, function (response) {
			console.log(response);
			$scope.error = response;
			
			$scope.isLoading = false;
		});
	};
	
	var filterPlayers = function () {
		$scope.playersDisplay = $scope.players
			.filter(player => 
				(!$scope.filters.year || (player.team && $scope.filters.year == player.team.year))
				&& (!$scope.filters.season || (player.team && $scope.filters.season == player.team.season))
				&& (!$scope.filters.division || (player.team && $scope.filters.division == player.team.division))
				&& (!$scope.filters.team || (player.team && $scope.filters.team.id == player.team.id))
			)
			.sort((prev, curr) =>
				prev.firstName < curr.firstName ? -1 : 1
			);
	};
	
	var showEdit = function (player) {
		$mdDialog.show({
			templateUrl: "/view/dialog/playeredit.html",
			controller: playerEditlCtl,
			locals: { player: player },
			clickOutsideToClose: true,
			escapeToClose: true,
			fullscreen: true,
			duration: 1000,
			openFrom: {
				top: document.documentElement.clientHeight,
				left: 0
			},
			closeTo:{
				top: document.documentElement.clientHeight,
				left: 0
			}
		})
		.then(function () {
			// Update
			$scope.isLoading = true;
			load();
		});
	};
	
	$scope.isLoading = true;
	$scope.filters = {};
	load();
	
	$scope.addPlayer = function () {
		showEdit({});
	};
	
	$scope.editPlayer = function (playerId) {
		showEdit($scope.players.find(function (player) { return player.id == playerId}));
	};
	
	$scope.filterDialog = function () {
		$mdDialog.show({
			templateUrl: "/view/dialog/playerfilter.html",
			controller: playerFilterCtl,
			locals: { filters: $scope.filters },
			clickOutsideToClose: true,
			openFrom: {
				top: document.documentElement.clientHeight,
				left: 0
			},
			closeTo: {
				top: document.documentElement.clientHeight,
				left: 0
			}
		})
		.then(function (filters) {
			$scope.filters = filters;
			filterPlayers();
		});
	};
	
});
