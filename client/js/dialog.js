function gameSetupCtl($scope, $http, $mdDialog, $cookies) {
	log.scope.setup = $scope;
	
	var loadData = function (teamId) {
		$scope.isLoading = true;
		
		$http({
			method: "GET",
			url: "/app/gamesetup/load",
			headers: {
				"Authorization": "Basic " + $cookies.get("session")
			}
		})
		.then(function (response) {
			$scope.divisions = response.data.divisions;
			$scope.teams = response.data.teams;
			
			// If a division is selected, then update
			if ($scope.game.division) {
				$scope.updateTeams();
			}
			
			$scope.isLoading = false;
		}, function (response) {
			console.log(response);
			$scope.errorMessage = "Error connecting to the server";
			$scope.isLoading = false;
		});
	};
	
	var season, currentDate = new Date();
	
	if (currentDate.getMonth() < 5) {
		season = "Spring";
	}
	else if (currentDate.getMonth() < 7) {
		season = "Summer";
	}
	else {
		season = "Fall";
	}
	
	$scope.game = {
		year: currentDate.getFullYear(),
		season: season
	};
	$scope.selectTeams = [];
	
	loadData();
	
	$scope.changeTeam = function (team) {
		if (team == "Add Team") {
			team = null;
			
			var newTeam = {
				year: $scope.game.year,
				season: $scope.game.season,
				division: $scope.game.division
			};
			
			$mdDialog.show({
				templateUrl: "/view/dialog/teamadd.html",
				controller: teamAddCtl,
				locals: { team: newTeam },
				clickOutsideToClose: true,
				escapeToClose: true,
				fullscreen: false,
				skipHide: true,
				openFrom: {
					top: document.documentElement.clientHeight,
					left: 0
				},
				closeTo:{
					top: document.documentElement.clientHeight,
					left: 0
				}
			})
			.then(function (teamId) {
				loadData(teamId);
			});
		}
	};
	
	$scope.updateTeams = function () {
		$scope.selectTeams = $scope.teams.filter(team => team.division == $scope.game.division);
	};
	
	$scope.cancel = function () {
		$mdDialog.cancel();
	};
	
	$scope.ok = function () {
		$scope.isLoading = true;
		
		$http({
			method: "POST",
			url: "/app/gamesetup/save",
			headers: { 
				"Authorization": "Basic " + $cookies.get("session"),
				"Content-Type": "application/json"
			},
			data: { game: $scope.game }
		})
		.then(response => {
			$scope.game.id = response.data.gameId;
			$mdDialog.hide($scope.game);
		},
		response => {
			console.log(response);
			$scope.errorMessage = "Unable to start the game";
			$scope.isLoading = false;
		});
	};
}

function teamAddCtl(team, $scope, $rootScope, $http, $mdDialog, $cookies) {
	$scope.team = team;
	$scope.colorOptions = $rootScope.materialColors;
	
	$scope.save = function () {
		if	(!team.name || !team.name.length > 0 || !team.color) {
			$scope.errorMessage = "Required fields missing";
			return;
		}
		
		$scope.isLoading = true;
		
		$http({
			method: "POST",
			url: "/app/teamsave",
			headers: {
				"Authorization": "Basic " + $cookies.get("session"),
				"Content-Type": "application/json"
			},
			data: { team: team }
		})
		.then(function (response) {
			$mdDialog.hide(response.data.teamId );
		}, 
		function (response) {
			console.log(response);
			$scope.errorMessage = "Error saving team";
			$scope.isLoading = false;
		});
	};
	
	$scope.close = function () {
		$mdDialog.cancel();
	};
}

function playerAddCtl(player, $scope, $rootScope, $http, $mdDialog, $cookies) {
	log.scope.player = $scope;
	$scope.player = player;
	$scope.isLoading = true;

	$scope.maxDate = new Date();
	$scope.teams = [];
	
	$http({ 
		method: "GET", 
		url: "/app/playeradd/load",
		headers: {
			"Authorization": "Basic " + $cookies.get("session")
		}
		})
		.then(function (response) {
			$scope.teams = response.data.teams
				.sort(function (prev, curr) {
					if (prev.division != curr.division) {
						return prev.division < curr.division ? -1 : 1;
					}
					else {
						return prev.name < curr.name ? -1 : 1;
					}
				});
			
			$scope.isLoading = false;
		}, function(response) {
			console.log(response);
			$scope.errorMessage = "Error loading data";
			
			$scope.isLoading = false;
		});
	
	$scope.save = function () {
		if	(!player.number) {
			$scope.errorMessage = "Required fields missing";
			return;
		}
		
		$scope.isLoading = true;
		
		var playerSave = {
			firstName: player.firstName,
			lastName: player.lastName,
			number: player.number,
			team: (player.team) ? {id: player.team.id, name: player.team.name } : null
		};
		
		$http({
			method: "POST",
			url: "/app/playeradd/save",
			headers: {
				"Authorization": "Basic " + $cookies.get("session"),
				"Content-Type": "application/json"
			},
			data: { player: playerSave }
		})
		.then(function (response) {
			$mdDialog.hide();
		}, 
		function (response) {
			console.log(response);
			$scope.errorMessage = "Error saving player";
			
			$scope.isLoading = false;
		});
	};
	
	$scope.close = function () {
		$mdDialog.cancel();
	};
}

function gamestatCtl($scope, gameId, player, $mdDialog, $http, $cookies) {
	log.scope.stat = $scope;
	$scope.player = player;
	
	$scope.stats = [
		{ formation: "offense", name: "Reception", display: "button", selected: false },
		{ formation: "offense", name: "Yards", display: "input", selected: false },
		{ formation: "offense", name: "Points", display: "input", selected: false },
		{ formation: "defense", name: "Flag", display: "button", selected: false },
		{ formation: "defense", name: "Deflection", display: "button", selected: false },
		{ formation: "defense", name: "Pick", display: "button", selected: false }
		];
	
	$scope.selectStat = function (stat) {
		stat.selected = !stat.selected;
		
		if (stat.display == "input") {
			stat.isEdit = !stat.isEdit;
		}
	};
	
	$scope.transition = function (stat) {
		if (stat.isEdit) {
			stat.isFocus = !stat.isFocus;
		}
	};
	
	$scope.cancel = function () {
		$mdDialog.cancel();
	};
	
	$scope.ok = function () {
		var returnStats = $scope.stats
			.filter(function (stat) { return stat.selected && (stat.display != "input" || stat.value > 0); })
			.map(function (stat) { 
				return {
					playerId: player.id,
					teamId: player.teamId,
					formation: stat.formation,
					name: stat.name,
					value: stat.value
				};
			});
		
		$http({
			method: "POST",
			url: "/app/gamestat/save",
			headers: {
				"Authorization": "Basic " + $cookies.get("session"),
				"Content-Type": "application/json"
			},
			data: { gameId: gameId, stats: returnStats }
		});
		
		$mdDialog.hide(returnStats);
	};
}
