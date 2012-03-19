define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules  
  "modules/game",
  "modules/player",
  "modules/gameevent",
  
  "use!plugins/backbone.localStorage"
],
/*
This module is an interface for tracking game action.
It has some data that is not persisted to the server.
*/
function(require, namespace, Backbone) {
	var app = namespace.app;
	var TrackedGame = namespace.module();
	
	TrackedGame.Model = Backbone.Model.extend({
		sync: Backbone.localSync,
		localStorage: new Backbone.LocalStore("trackedGame"),
		defaults: {
			game: {},
			gameevents: [],
			onfield_1: [],
			offfield_1: [],
			onfield_2: [],
			offfield_2: [],
			team_in_possession_ix: 1,
			player_in_possession_id: NaN,
			current_state: 'default',
			team_pulled_ix: NaN
		},
		toJSON: function() {//flatten the data so they are easy to read.
			var temp = _.clone(this.attributes);
			temp.game = this.get('game').toJSON();
			temp.onfield_1 = this.get('onfield_1').toJSON();
			temp.offfield_1 = this.get('offfield_1').toJSON();
			temp.onfield_2 = this.get('onfield_2').toJSON();
			temp.offfield_2 = this.get('offfield_2').toJSON();
			temp.gameevents = this.get('gameevents').toJSON();
			return temp;
		},
		player_tap: function(pl_id){
			var GameEvent = require("modules/gameevent");
			var d = new Date();//"2011-12-19T15:28:46.493Z"
			var time = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate() + 'T' + d.getUTCHours() + ':' + d.getUTCMinutes() + ':' + d.getUTCSeconds();
			var gameid = this.get('game').get('id');
			var this_event = new GameEvent.Model({time: time, game_id: gameid});
			//pl_id is the tapped player. Might be NaN
			var last_pl_id = this.get('player_in_possession_id');//last_player_id might be NaN
			//team_ix is index of team that player is on. Might be NaN.
			var team_id = this.get('game').get('team_'+team_in_possession_ix).id;
			var other_team_id = this.get('game').get('team_'+(3-this.team_in_possession_ix)).id;
			
			// The meaning of a player tap depends on the current state.
			// https://github.com/leaguevine/leaguevine-ultistats/issues/7
			switch (this.get('current_state')){//pickup, dropped, ded, scored, pulled, default
				case 'pickup'://pickup event(10) --> default
					this_event.set({type: 10, player_1_id: pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: pl_id});
					break;
				case 'drop'://Drop event --> turnover --> pickup
					this_event.set({type: 33, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
					this.set({player_in_possession_id: NaN});
					this.set('current_state','pickup');
					break;
				case 'd'://D event --> pickup
					this_event.set({type: 34, player_1_id: last_pl_id, player_3_id: pl_id, player_1_team_id: other_team_id, player_3_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('current_state','pickup');
					break;
				case 'score'://score event --> pulled + substitution screen
					this_event.set({type: 22, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('current_state','pulled');
					//TODO: Show the substitution screen
					break;
				case 'pulled'://pull event --> turnover --> pickup
					this_event.set({type: 1, player_1_id: last_pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
					this.set('current_state','pickup');
					break;
				default://pass event.
					this_event.set({type: 21, player_1_id: last_pl_id, player_2_id: pl_id});
					this.set({player_in_possession_id: pl_id});
					//neither team nor state change.
			}
			//save the event to the server.
			this_event.save([], {
				headers: {"Authorization": "bearer " + app.api.d_token()},
                error: function(originalModel, resp, options) {
                    //TODO: Do something with the error. Maybe log the error and retry again later?
                },
				succes: function(model, response){
				}
			});
			this.get('gameevents').add(model);//Add the event to the trackedgame.get('gameevents')
			this.save();//save the trackedgame.
			this.trigger("change");//Should trigger some re-renders.
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
			var TeamPlayer = require("modules/teamplayer");
			var GameEvent = require("modules/gameevent");
			
			var trackedgame = new TrackedGame.Model({id: gameId});
			trackedgame.fetch(); //localStorage
			
			//We want the child objects to be converted to the proper model types.
			var newGame = new Game.Model(trackedgame.get('game'));
			if (!trackedgame.get('game').id) {newGame.set('id',gameId);}
			trackedgame.set('game',newGame, {silent:true});
				
			for (var ix=1;ix<3;ix++) {
				trackedgame.set('onfield_'+ix, new TeamPlayer.Collection(trackedgame.get('onfield_'+ix)), {silent: true});
				trackedgame.set('offfield_'+ix, new TeamPlayer.Collection(trackedgame.get('offfield_'+ix)), {silent: true});
			}
			
			//We want the child objects to be fresh. This is easy for game (just fetch), but we can't fetch onfield or offfield immediately because we need team_id, which isn't available until after game has returned.
			trackedgame.get('game').fetch({success: function(model, response) {
				for(var ix=1;ix<3;ix++) {
					if (trackedgame.get('onfield_'+ix).length==0) {
						_.extend(trackedgame.get('onfield_'+ix),{team_id: model.get('team_'+ix+'_id')});
					} else {trackedgame.get('onfield_'+ix).fetch();}
					if (trackedgame.get('offfield_'+ix).length==0) {
						_.extend(trackedgame.get('offfield_'+ix),{team_id: model.get('team_'+ix+'_id')});
					}
					trackedgame.get('offfield_'+ix).fetch();
				}
			}});
			
			//Events should have been loaded from localStorage if they exist,
			//but they must be made into a collection of game events.
			trackedgame.set('gameevents',
				new GameEvent.Collection(trackedgame.get('gameevents'),{game_id: gameId}));
			
			console.log("TODO: figure out trackedgame.get('team_pulled_ix')");
			
			//This router might not get called again for a while if user stays on track-game screen.
			myLayout.setViews({
				".sub_team_1": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:1}),
				".sub_team_2": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:2}),
				".t_game": new TrackedGame.Views.GameAction({model: trackedgame})
			});
			
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render(function(el) {
				$("#main").html(el);
				$('.sub_team_1').hide();
				$('.sub_team_2').hide();
				$('.t_game').hide();
				if (trackedgame.get('gameevents').length>0) {
					$('.t_game').show();
				} else {
					$('.sub_team_1').show();
				}
			});
		},
	});
	TrackedGame.router = new TrackedGame.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	
	/*
	Parent view for the game screen
	*/
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
		}
	});
	
	/*
	View for Scoreboard
	*/
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		initialize: function() {
			//I only want this to re-render when details about the game (score) change.
			this.model.get('game').bind("change", function() {this.render();}, this);
			//Can I bind to this.model.get('team_in_possession_ix') ?
		},
		template: "trackedgame/scoreboard",
		serialize: function() {
			return this.model.toJSON();
		}
	});
	
	/*
	Nested views for player buttons. PlayerArea>TeamPlayerArea*2>PlayerButton*8
	*/
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		initialize: function() {
			//TODO: Make the render bindings more specific.
			//Can I bind to this.model.get('team_in_possession_ix') change to show_teamplayer?
			//Can I bind to this.model.get('onfield_1') add or remove events to add or remove specific views?
			this.model.bind("change", function() {this.render();}, this);
			this.model.get('game').bind("change", function() {this.render();}, this);
			this.model.get('onfield_1').bind("reset", function() {this.render();}, this);
			this.model.get('onfield_2').bind("reset", function() {this.render();}, this);
		},
		//tracked_game(layout)<div .t_game>->GameAction<div .player_area>->PlayerArea
		template: "trackedgame/player_area",
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".player_area_1": new TrackedGame.Views.TeamPlayerArea({model: this.model, team_ix:1}),
				".player_area_2": new TrackedGame.Views.TeamPlayerArea({model: this.model, team_ix:2}),
			});
			return view.render().then(function(el) {
				this.show_teamplayer();
			});
		},
		show_teamplayer: function () {
			this.$('.player_area_'+(3-this.model.get('team_in_possession_ix'))).hide();
			this.$('.player_area_'+this.model.get('team_in_possession_ix')).show();
		}
	});
	TrackedGame.Views.TeamPlayerArea = Backbone.View.extend({
		//DO NOT BIND RE-RENDER TO ANYTHING HERE! Otherwise we will just insert buttons upon buttons. --actually this probably isn't true if we bind to 'reset'
		template: "trackedgame/teamplayer_area",
		render: function(layout) {
			var view = layout(this);
			this.model.get('onfield_'+this.options.team_ix).each(function(player) {
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: player
				}));
			});
			//insert unknown buttons for less than 8 players.
			var TeamPlayer = require("modules/teamplayer");
			for(var i=this.model.get('onfield_'+this.options.team_ix).length;i<8;i++){
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: new TeamPlayer.Model({player: {id:"unknown",last_name:"unknown"}})
				}));
			}
			return view.render({ team: this.model.get('game').get('team_'+this.options.team_ix) });
		},
		events: {
			"click .button": "player_tap"
		},
		player_tap: function(ev){
			this.model.player_tap(parseInt($(ev.target).parents('button').attr('id')));
			console.log("TODO: Be clever about player taps");
		}
		
	});
	TrackedGame.Views.PlayerButton = Backbone.View.extend({
		//Can bind this teamplayer change to render... useful if player name/number changes. Why would it?
		template: "trackedgame/player_button",
		tagName: "li",
		serialize: function() {
			return this.model.toJSON();
		}
		//Since tapping a player button will have different action depending on the context (the last event)
		//then we'll need access to the trackedgame object which is not easily available in this view.
		//Thus player taps will be handled by the parent view: TeamPlayerArea
	});
	
	
	/*
	View for action buttons. ActionArea> (should this be nested?)
	*/
	TrackedGame.Views.ActionArea = Backbone.View.extend({
		initialize: function() {
			//This should re-render whenever ... ?
			this.model.bind("change", function() {this.render();}, this);
		},
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
		}
	});

	
	/*
	Parent view for the substitution screen. The layout has 2 of these.
	*/
	TrackedGame.Views.SubTeam = Backbone.View.extend({
		template: "trackedgame/game_substitution",
		initialize: function() {
			//This should re-render whenever onfield, offfield, or game change.
			this.model.get('game').bind("change", function() {this.render();}, this);
			this.model.get('offfield_'+this.options.team_ix).bind("reset", function() {this.render();}, this);
			//Is it possible for onfield to change without offfield changing? I don't think so.
			//It is possible for the opposite to be true, e.g. on new game.
			//this.model.get('onfield_'+this.options.team_ix).bind("change", function() {this.render();}, this);
		},
		render: function(layout) {
            app.api.d_token(); //Ensure that the user is logged in
			var view = layout(this); //Get this view from the layout.
			this.model.get('onfield_'+this.options.team_ix).each(function(tp) {
				view.insert(".sub_on_field", new TrackedGame.Views.RosterItem({
					model: tp
				}));
			});
			this.model.get('offfield_'+this.options.team_ix).each(function(tp) {
				view.insert(".sub_off_field", new TrackedGame.Views.RosterItem({
					model: tp
				}));
			});
			return view.render({ team: this.model.get('game').get('team_'+this.options.team_ix) });
		},
		events: {
			"click .sub_next": "sub_next",
			"click .sub_done": "sub_done",
			"click .roster_player": "toggle_roster"
		},
		sub_next: function(ev){
			//I would prefer to tighten the scope on this but I'm not sure how to access
			//the parent element's class without searching the whole DOM.
			$('.sub_team_'+this.options.team_ix).hide();
			$('.sub_team_'+(3-this.options.team_ix)).show();
		},
		sub_done: function(ev){
			this.model.trigger('change');
			$('.sub_team_1').hide();
			$('.sub_team_2').hide();
			$('.t_game').show();
		},
		toggle_roster: function(ev){			
			var player_id = parseInt(ev.target.id);
			var is_onfield = this.$(ev.target).parents('.roster').hasClass('sub_on_field');
			var old_tp_list = is_onfield ? this.model.get('onfield_'+this.options.team_ix) : this.model.get('offfield_'+this.options.team_ix);
			var new_tp_list = is_onfield ? this.model.get('offfield_'+this.options.team_ix) : this.model.get('onfield_'+this.options.team_ix);
			if (is_onfield || new_tp_list.length<7){
				var this_player = old_tp_list.find( function(tp) {
					return tp.get('player_id')==player_id;
				});
				//var player_ix = _.pluck(old_tp_list.pluck("player"),"id").indexOf(player_id);
				//var this_player = old_tp_list.at(player_ix);
				old_tp_list.remove(this_player);
				new_tp_list.add(this_player);
				
				//Instead of calling this.render() it might be faster to remove/insert the views.
				this.render();
			}
		}
	});
	TrackedGame.Views.RosterItem = Backbone.View.extend({
		//Can bind this teamplayer change to render... useful if player name/number changes. Why would it?
		template: "trackedgame/roster_item",
		tagName: "li",
		serialize: function() {
			return this.model.toJSON();
		}
	});
	
	
	
	return TrackedGame;
});
