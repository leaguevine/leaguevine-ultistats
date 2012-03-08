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
		routes : {
			"track/:gameId": "trackGame",
		},
		trackGame: function (gameId) {
			var trackedGame = new Game.Model({id: gameId});
			trackedGame.fetch();
			//This router won't get called again unless manually refreshed,
			//so pass the views as much data as they need.
			var myLayout = app.router.useLayout("tracked_game");
			myLayout.setViews({
				".scoreboard": new TrackedGame.Views.Scoreboard({trackedGame:trackedGame}),
				".player_area": new TrackedGame.Views.PlayerArea({trackedGame:trackedGame}),
				".action_area": new TrackedGame.Views.ActionArea({trackedGame:trackedGame, show_main:true})
			});
			
			myLayout.render(function(el) {$("#main").html(el);});
		},
	});
	TrackedGame.router = new TrackedGame.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		template: "trackedgame/scoreboard",
		serialize: function() {return this.options.trackedGame.toJSON();},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		template: "trackedgame/player_area",
		serialize: function() {return this.options.trackedGame.toJSON();},
		//Get what we need from this.options.trackedGame and set the player buttons
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	TrackedGame.Views.ActionArea = Backbone.View.extend({
		template: "trackedgame/action_area",
		events: {
			"click .undo": "undo",
			"click .misc": "misc",
			"click .score": "score",
			"click .completion": "completion",
			"click .throwaway": "throwaway",
			"click .dropped_pass": "dropped_pass",
			"click .defd_pass": "defd_pass",
			"click .unknown_turn": "unknown_turn",
			"click .timeout": "timeout",
			"click .end_of_period": "end_of_period",
			"click .injury": "injury"
		},
		undo: function(ev){
			console.log("TODO: undo")
		},
		misc: function(ev){
			if (this.options.show_main) {
				this.$('.alternate_action').show();
				this.$('.main_action').hide();
				this.options.show_main=false;
			}
			else {
				this.$('.main_action').show();
				this.$('.alternate_action').hide();
				this.options.show_main=true;
			}
		},
		score: function(ev){
			console.log("TODO: score")
		},
		completion: function(ev){
			console.log("TODO: completion")
		},
		throwaway: function(ev){
			console.log("TODO: throwaway")
		},
		dropped_pass: function(ev){
			console.log("TODO: dropped_pass")
		},
		defd_pass: function(ev){
			console.log("TODO: defd_pass")
		},
		unknown_turn: function(ev){
			console.log("TODO: unknown_turn")
		},
		timeout: function(ev){
			console.log("TODO: timeout")
		},
		end_of_period: function(ev){
			console.log("TODO: end_of_period")
		},
		injury: function(ev){
			console.log("TODO: injury")
		},
		
		render: function(layout) {
			var view = layout(this);
			return view.render().then(function(el) {
				if (this.options.show_main) {
					this.$('.alternate_action').hide();
					this.$('.main_action').show();
				}
				else {
					this.$('.alternate_action').show();
					this.$('.main_action').hide();
				}
			});
		},
		initialize: function() {this.options.trackedGame.bind("change", function() {this.render();}, this);}
	});
	return TrackedGame;
});