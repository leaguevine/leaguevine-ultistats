define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/player",
  "modules/game",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
/*
This module is an interface for tracking game action.
This module does not manage any of its own data but instead relies on its inherited modules.
*/
function(namespace, Backbone, Player, Game) {
	var app = namespace.app;
	var TrackedGame = namespace.module();

	//
	// ROUTER
	//
	TrackedGame.Router = Backbone.Router.extend({
		// Create a router to map faux-URLs to actions.
		// Faux-URLs come from Backbone.history.navigate or hashes in a URL from a followed link.
		routes : {
			"track/:gameId": "trackGame",
		},
		trackGame: function (gameId) {
			var trackedGame = new Game.Model({id: gameId});
			trackedGame.fetch();
		
			var myLayout = app.router.useLayout("tracked_game");
			myLayout.setViews({
				".header": new TrackedGame.Views.Header({trackedGame:trackedGame}),
				".scoreboard": new TrackedGame.Views.Scoreboard({trackedGame:trackedGame}),
				".player_buttons": new TrackedGame.Views.PlayerButtons({trackedGame:trackedGame}),
				".action_buttons": new TrackedGame.Views.ActionButtons({trackedGame:trackedGame}),
				".metadata": new TrackedGame.Views.Metadata({trackedGame:trackedGame})
			});
			
			
			myLayout.render(function(el) {$("#main").html(el);});
		},
	});
	TrackedGame.router = new TrackedGame.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	TrackedGame.Views.Header = Backbone.View.extend({
		template: "trackedgame/header",
		serialize: function() {
			return this.options.trackedGame.toJSON();
		},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		template: "trackedgame/scoreboard",
		serialize: function() {return this.options.trackedGame.toJSON();},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	TrackedGame.Views.PlayerButtons = Backbone.View.extend({
		template: "trackedgame/playerbuttons",
		serialize: function() {return this.options.trackedGame.toJSON();},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	TrackedGame.Views.ActionButtons = Backbone.View.extend({
		template: "trackedgame/actionbuttons",
		serialize: function() {return this.options.trackedGame.toJSON();},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);},
		events: {
			"click .drop": "drop",
			"click .score": "score",
			"click .timeout": "timeout"
		},
		drop: function(ev){
			console.log("TODO: Drop")
		},
		score: function(ev){
			console.log("TODO: Score")
		},
		timeout: function(ev){
			console.log("TODO: timeout")
		}
	});
	TrackedGame.Views.Metadata = Backbone.View.extend({
		template: "trackedgame/metadata",
		serialize: function() {return this.options.trackedGame.toJSON();},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	
	return TrackedGame;
});