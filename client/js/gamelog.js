var log = {};
var recApp = angular.module("recApp", ["ngMaterial", "ngMessages"]);

recApp.config(["$mdThemingProvider", function ($mdThemingProvider) {
	$mdThemingProvider.theme("default")
		.primaryPalette("teal")
		.accentPalette("blue");
}]);

recApp.controller("recCtl", function ($scope, $http) {
	log.scope = $scope;
	
	$scope.players = [
		{ name: "Josh Strictland", number: 1 },
		{ name: "Liam Dayton", number: 2 },
		{ name: "Thomas Almond", number: 3 },
		{ name: "Cayden Yeakley", number: 4 },
		{ name: "Cooper Firebaugh", number: 5 },
		{ name: "Cameron Norek", number: 6 },
		{ name: "Luke van Beynum", number: 7 },
		{ name: "Chase Larsen", number: 8 },
		{ name: "Mickey Nash", number: 9 },
		{ name: "Kobe Davis", number: 10 },
		{ name: "Seth Lunsford", number: 11 }
		]
		.sort(function (prev, curr) {
			return prev.name < curr.name ? -1 : 1;
		});
	
	$scope.statCategories = [
		{ responsibility: "offense", name: "Receptions", abbrivation: "REC" },
		{ responsibility: "offense", name: "Yards", abbrivation: "YRD" },
		{ responsibility: "offense", name: "Points", abbrivation: "PNT" },
		{ responsibility: "defense", name: "Pics", abbrivation: "PCK" },
		{ responsibility: "defense", name: "Flags", abbrivation: "FLG" },
		{ responsibility: "defense", name: "Deflections", abbrivation: "DFT" }
		];
});