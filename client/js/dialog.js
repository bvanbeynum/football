function gameSetupCtl($scope, $http, $mdDialog) {
	log.scope.setup = $scope;
	
	var loadData = function () {
		$scope.isLoading = true;
		
		$http({
			method: "GET",
			url: "/app/gamesetup/load"
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
	
	$scope.addTeam = function () {
		
		var team = {
			year: $scope.game.year,
			season: $scope.game.season,
			division: $scope.game.division
		};
		
		$mdDialog.show({
			templateUrl: "/view/dialog/teamedit.html",
			controller: teamEditCtl,
			locals: { team: team },
			clickOutsideToClose: true,
			escapeToClose: true,
			fullscreen: true,
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
		.then(function () {
			loadData();
		});
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
			headers: { "Content-Type": "application/json" },
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

function teamEditCtl(team, $scope, $rootScope, $http, $mdDialog) {
	$scope.team = team;
	
	if ($scope.team.id) {
		$scope.header = "Edit " + $scope.team.name;
	}
	else {
		$scope.header = "Add Team";
	}
	
	$scope.yearOptions = [];
	for (var index = 0; index < 4; index++) {
		$scope.yearOptions.push((new Date()).getFullYear() - index);
	}
	
	$scope.divisionOptions = ["6U", "8U", "10U", "13U"];
	$scope.seasonOptions = ["Spring", "Summer", "Fall"];
	$scope.colorOptions = $rootScope.materialColors;
	
	$scope.save = function () {
		if	(
			!team.name || !team.name.length > 0
			|| !team.division
			|| !team.year
			|| !team.season
			|| !team.color
			) {
				$scope.errorMessage = "Required fields missing";
				return;
		}
		
		$scope.isLoading = true;
		
		$http({
			method: "POST",
			url: "/api/teamsave",
			headers: { "Content-Type": "application/json" },
			data: { team: team }
		}).then(function (response) {
			$mdDialog.hide("refresh");
		}, function (response) {
			console.log(response);
			$scope.errorMessage = "Error saving team";
			$scope.isLoading = false;
		});
	};
	
	$scope.delete = function () {
		if (team.id) {
			$scope.isLoading = true;
			
			$http({
				method: "DELETE",
				url: "/api/teamdelete?teamId=" + team.id
			})
			.then(function (response) {
				$mdDialog.hide("refresh");
			}, function (response) {
				console.log(response);
				$scope.errorMessage = "Error deleting team";
				$scope.isLoading = false;
			});
		}
	};
	
	$scope.close = function () {
		$mdDialog.cancel();
	};
	
	$scope.viewPlayers = function () {
		$rootScope.navigate("/players");
		$mdDialog.cancel();
	};
}

function playerEditlCtl(player, $scope, $rootScope, $http, $mdDialog) {
	$scope.player = player;
	$scope.isLoading = true;
	
	if ($scope.player.id) {
		$scope.header = "Edit " + $scope.player.firstName + " " + $scope.player.lastName;
	}
	else {
		$scope.header = "Add Player";
	}
	
	$scope.maxDate = new Date();
	$scope.teams = [];
	
	$http({ method: "GET", url: "/app/playeredit/load"})
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
		if	(
			!player.firstName || !player.firstName.length > 0
			|| !player.lastName || !player.lastName.length > 0
			|| !player.number
			|| !player.age
			) {
				$scope.errorMessage = "Required fields missing";
				return;
		}
		
		$scope.isLoading = true;
		
		var playerSave = {
			firstName: player.firstName,
			lastName: player.lastName,
			number: player.number,
			age: player.age,
			team: (player.team) ? {id: player.team.id, name: player.team.name } : null
		};
		
		$http({
			method: "POST",
			url: "/app/playeredit/save",
			headers: { "Content-Type": "application/json" },
			data: { player: playerSave }
		}).then(function (response) {
			$mdDialog.hide();
		}, function (response) {
			console.log(response);
			$scope.errorMessage = "Error saving player";
			
			$scope.isLoading = false;
		});
	};
	
	$scope.delete = function () {
	};
	
	$scope.close = function () {
		$mdDialog.cancel();
	};
}

function playerFilterCtl($scope, filters, $mdDialog, $http) {
	$scope.isLoading = true;
	$scope.filters = filters || {};
	$scope.allTeams = [];
	
	$http({
		method: "GET",
		url: "/app/playerfilter/load"
	})
	.then(function (response) {
		$scope.yearOptions = response.data.years;
		$scope.seasonOptions = response.data.seasons;
		$scope.divisionOptions = response.data.divisions;
		$scope.allTeams = response.data.teams;
		$scope.teamOptions = [];
		
		$scope.updateFilter();
		
		$scope.isLoading = false;
	}, function (response) {
		$scope.errorMessage = "Error loading from server";
		$scope.isLoading = false;
	});
	
	// Fired for divisions, years & seasons
	$scope.updateFilter = function () {
		var selectedTeamId = $scope.filters.team ? $scope.filters.team.id : null;
		
		if ($scope.filters.year && $scope.filters.season && $scope.filters.division) {
			
			// Now that we have limited the options for team, only show those teams as options
			$scope.teamOptions = $scope.allTeams.filter(team =>
				team.year == $scope.filters.year
				&& team.season == $scope.filters.season
				&& team.division == $scope.filters.division
			);
			
			// If the selected team is in the list then re-select it
			$scope.filters.team = $scope.teamOptions.find(team => team.id == selectedTeamId);
		}
	};
	
	$scope.ok = function () {
		$mdDialog.hide($scope.filters);
	};
	
	$scope.clear = function () {
		$mdDialog.hide({});
	};
	
	$scope.cancel = function () {
		$mdDialog.cancel();
	};
}

function gamestatCtl($scope, gameId, player, $mdDialog, $http) {
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
			headers: { "Content-Type": "application/json" },
			data: { gameId: gameId, stats: returnStats }
		});
		
		$mdDialog.hide(returnStats);
	};
}
