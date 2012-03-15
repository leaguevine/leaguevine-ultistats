define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules  
  "modules/game",
  "modules/player",
  "modules/gameevent"
],
/*
This module is an interface for tracking game action.
It has some data that is not persisted to the server.
*/
function(require, namespace, Backbone) {
	var app = namespace.app;
	var TrackedGame = namespace.module();
	
	TrackedGame.Model = Backbone.Model.extend({
		defaults: {
			game: {},
			teamplayers_1: {},
			teamplayers_1_onfield : [],
			teamplayers_2: {},
			teamplayers_2_onfield : [],
			gameevents: {}
		},
		toJSON: function() {//flatten the data so they are easy to read.
			var temp = _.clone(this.attributes);
			temp.game = this.get('game').toJSON();
			temp.teamplayers_1 = this.get('teamplayers_1').toJSON();
			temp.teamplayers_2 = this.get('teamplayers_2').toJSON();
			temp.gameevents = this.get('gameevents').toJSON();
			return temp;
		},
		bootstrap: function(){
			console.log('TODO: Bootstrap');
		}
	});
	
	//
	// ROUTER
	//
	TrackedGame.Router = Backbone.Router.extend({
		routes : {
			"track/:gameId": "trackGame",
		},
		trackGame: function (gameId) {
			var myLayout = app.router.useLayout("tracked_game");
			//var Team = require("modules/team");
			var Game = require("modules/game");
			var Player = require("modules/player");
			var GameEvent = require("modules/gameevent");
			
			trackedgame = new TrackedGame.Model();
			
			//Get the game
			game = new Game.Model({id: gameId});
			game.fetch();
			trackedgame.set('game',game);
			
			//Get the roster for each team
			teamplayers_1 = new Player.Collection([],{team_id: game.get('team_1_id')});
			trackedgame.set('teamplayers_1',teamplayers_1);
			teamplayers_2 = new Player.Collection([],{team_id: game.get('team_2_id')});
			trackedgame.set('teamplayers_2',teamplayers_2);
			
			//Get events for the game
			gameevents = new GameEvent.Collection([],{game_id: gameId});
			gameevents.fetch();
			trackedgame.set('gameevents',gameevents);
			
			//Bootstrap the TrackedGame state from the events.
			//TODO: bind something to bootstrap.
			trackedgame.bootstrap();
			//Maybe I need to bind some change events so trackedgame will register a change when the previous fetch's return.'
			
			//This router might not get called again for a while if user stays on track-game screen.
			myLayout.setViews({
				".sub_team_1": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:1}),
				".sub_team_2": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:2}),
				".t_game": new TrackedGame.Views.GameAction({model: trackedgame})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render(function(el) {
				$("#main").html(el);
				//$('.sub_team_1').hide();
				$('.sub_team_2').hide();
				$('.t_game').hide();
			});
		},
	});
	TrackedGame.router = new TrackedGame.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	TrackedGame.Views.GameAction = Backbone.View.extend({
		template: "trackedgame/game_action",
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".scoreboard": new TrackedGame.Views.Scoreboard({model: this.model}),
				".player_area": new TrackedGame.Views.PlayerArea({model: this.model}),
				".action_area": new TrackedGame.Views.ActionArea({model: this.model, showing_alternate: true})
			});
			return view.render();
		},
		//render will be called anytime the data change.
		initialize: function() {this.model.bind("change", function() {this.render();}, this);}
	});
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		template: "trackedgame/scoreboard",
		serialize: function() {
			return this.model.toJSON();
		},
		initialize: function() {
			this.model.get('game').bind("change", function() {this.render();}, this);
		}
	});
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		template: "trackedgame/player_area",
		serialize: function() {return this.model.toJSON();},
		//Get what we need from this.options.trackedGame and set the player buttons
		initialize: function() {this.model.bind("change", function() {this.render();}, this);}
		//ev.currentTarget.classList
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
		misc: function(ev){//toggle which buttons are being displayed.
			if (this.options.showing_alternate) {
				this.$('.alternate_action').hide();
				this.$('.main_action').show();
				this.options.showing_alternate=false;
			}
			else {
				this.$('.main_action').hide();
				this.$('.alternate_action').show();
				this.options.showing_alternate=true;
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
			//show the substitution screen for a team.
			$('.t_game').hide();
			$('.sub_team_1').show();
			$('.sub_team_2').hide();
		},
		
		render: function(layout) {
			var view = layout(this);
			//return view.render();
			return view.render().then(function(el) {
				this.misc();
			});
		},
		initialize: function() {this.model.bind("change", function() {this.render();}, this);}
	});
	
	TrackedGame.Views.SubTeam = Backbone.View.extend({
		template: "trackedgame/game_substitution",
		initialize: function() {
			this.model.get('game').bind("change", function() {this.render();}, this);
			this.model.get('teamplayers_1').bind("change", function() {this.render();}, this);
			this.model.get('teamplayers_2').bind("change", function() {this.render();}, this);
		},
		events: {
			"click .sub_next": "sub_next",
			"click .sub_done": "sub_done"
		},
		sub_next: function(ev){
			if (this.options.team_ix==1) {
				$('.sub_team_1').hide();
				$('.sub_team_2').show();
			}
			else {
				$('.sub_team_2').hide();
				$('.sub_team_1').show();
			}
		},
		sub_done: function(ev){
			$('.sub_team_1').hide();
			$('.sub_team_2').hide();
			$('.t_game').show();
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var this_team = this.options.team_ix==1 ? this.model.get('game').get('team_1') : this.model.get('game').get('team_2');
			//this_team.attributes.players.each(function(player) {
			//	view.insert("ul .off_field", new Player.Views.Item({
			//		model: player
			//	}));
			//});
			//I probably want to construct some nested object that includes the relevant team and playerlist
			return view.render(this_team);
		}
	});
	
	return TrackedGame;
});