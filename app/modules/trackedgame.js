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
			current_state: 'default',
			team_in_possession_ix: 1,
			player_in_possession_id: NaN,
			team_pulled_ix: NaN,
			showing_alternate: -1//I seem to be having trouble with using a boolean or using 0 and 1. So use 1 and -1.
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
			var team_id = this.get('game').get('team_'+this.get('team_in_possession_ix')).id;
			var other_team_id = this.get('game').get('team_'+(3-this.get('team_in_possession_ix'))).id;
			
			// The meaning of a player tap depends on the current state.
			// https://github.com/leaguevine/leaguevine-ultistats/issues/7
			switch (this.get('current_state')){//pickup, dropped, ded, scored, pulled, default
				case 'pickup'://pickup event(10) --> default
					this_event.set({type: 10, player_1_id: pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: pl_id});
					this.set('current_state','pulled');
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
					this.get('gameevents').add(model);//Add the event to the trackedgame.get('gameevents'). Will trigger a change in the last play display.
					this.save();//save the trackedgame.
				}
			});
		},
		score: function(){
			console.log("TODO: score in model def.")
		},
		completion: function(){
			console.log("TODO: completion in model def.")
		},
		throwaway: function() {
			console.log("TODO: throwaway in model def.")
		},
		dropped_pass: function() {
			console.log("TODO: dropped_pass in model def.")
		},
		defd_pass: function(){
			console.log("TODO: defd_pass in model def.")
		},
		unknown_turn: function(){
			console.log("TODO: unknown_turn in model def.")
		},
		timeout: function(){
			console.log("TODO: timeout in model def.")
		},
		end_of_period: function(){
			console.log("TODO: end_of_period in model def.")
		},
		injury: function(){
			console.log("TODO: injury in model def.")
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
				trackedgame.set('onfield_'+ix, new TeamPlayer.Collection(trackedgame.get('onfield_'+ix)), {silent: true});//Why is this silent?
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
			
			console.log("TODO: If game is new, ask out who pulled to start");
			console.log("TODO: If game is not new, hopefully the loaded model has everything we need.");
			//It would be nice if we could figure out the game state entirely from the events.
			
			//This router might not get called again for a while if user stays on track-game screen.
			myLayout.setViews({
				".sub_team_1": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:1}),//have to pass the full model so we get onfield and offfield
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
				".action_area": new TrackedGame.Views.ActionArea({model: this.model})
			});
			return view.render();
		}
	});
	
	/*
	View for Scoreboard
	*/
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		initialize: function() {
			this.model.get('game').bind("change", function() {this.render();}, this);//To update scores or teams
			this.model.get('gameevents').bind("add", function() {this.render();}, this);//To update previous action
			this.model.get('gameevents').bind("remove", function() {this.render();}, this);//To update previous action
			this.model.bind("change:team_in_possession_ix", function() {this.render();}, this);//To highlight team in possession
		},
		cleanup: function() {
			this.model.get('game').unbind("change");
			this.model.get('gameevents').unbind("add");
			this.model.get('gameevents').unbind("remove");
		},
		template: "trackedgame/scoreboard",
		serialize: function() {
			return this.model.toJSON();
		}
		//TODO: Replace serialize with a render function that makes a useful JSON out of team_in_possession, the last gameevent, team names and scores
	});
	
	/*
	Nested views for player buttons. PlayerArea>TeamPlayerArea*2>PlayerButton*8
	*/
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		initialize: function() {
			//It seems like rendering the subviews does not add player_buttons upon player_buttons
			//Thus we can bind to the more specific views for player_buttons.
			//However I have moved the action prompt from the subview to here, because the action prompt is not team-specific.
			this.model.bind("change:current_state", function() {this.render();});//Update the action prompt.
			this.model.bind("change:team_in_possession_ix", function() {this.show_teamplayer();});//Update which player buttons to display.
		},
		template: "trackedgame/player_area",
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".player_area_1": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get('onfield_1'), model: this.model.get('game').get('team_1')}),
				".player_area_2": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get('onfield_2'), model: this.model.get('game').get('team_2')})
			});
			return view.render().then(function(el) {
				//TODO: Change the action prompt depending on the current state.
				this.show_teamplayer();
			});
		},
		show_teamplayer: function () {
			this.$('.player_area_'+(3-this.model.get('team_in_possession_ix'))).hide();
			this.$('.player_area_'+this.model.get('team_in_possession_ix')).show();
		},
		events: {
			"click .button": "player_tap",
		},
		player_tap: function(ev){
			this.model.player_tap(parseInt($(ev.target).parents('button').attr('id')));
		}
	});
	TrackedGame.Views.TeamPlayerArea = Backbone.View.extend({
		initialize: function() {
			//Specific players should only be added or removed on the substitution screen.
			//We don't need to update our player buttons on each add or remove, not until the sub screen is done. That will trigger a reset.
			this.collection.bind("reset", function() {this.render();}, this);//Can't unbind because it is bound elsewhere too.
		},
		template: "trackedgame/teamplayer_area",
		render: function(layout) { 
			var view = layout(this);
			this.collection.each(function(tp) {
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: tp
				}));
			});
			//insert unknown buttons for less than 8 players.
			var TeamPlayer = require("modules/teamplayer");
			for(var i=this.collection.length;i<8;i++){
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: new TeamPlayer.Model({player: {id:"unknown",last_name:"unknown"}})
				}));
			}
			return view.render({ team: this.model });
		}
	});
	TrackedGame.Views.PlayerButton = Backbone.View.extend({
		//Could bind this teamplayer change to render... useful if player name/number changes. Why would it?
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
			this.model.bind("change:player_in_possession_id", function() {this.render();}, this);//TODO: Show the Player name
			this.model.bind("change:current_state", function() {this.render();}, this);//TODO: Disable some buttons depending on state.
			this.model.bind("change:showing_alternate", this.show_action_buttons, this);//Which buttons are we showing?
		},
		cleanup: function() {
			this.model.unbind("change:showing_alternate");
  		},
		template: "trackedgame/action_area",
		events: {
			"click .undo": "undo",
			"click .misc": "toggle_action_buttons",
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
		show_action_buttons: function(ev){//shows or hides buttons depending on this.model.get('showing_alternate')
			if (this.model.get('showing_alternate')==1) {
				this.$('.main_action').hide();
				this.$('.alternate_action').show();
			}
			else {
				this.$('.alternate_action').hide();
				this.$('.main_action').show();
			}
		},
		toggle_action_buttons: function(ev){//toggle which buttons are being displayed.
			this.model.set('showing_alternate',-1*this.model.get('showing_alternate'));//Changing this should trigger show_action_buttons.
		},
		score: function(ev){this.model.score();},
		completion: function(ev){this.model.completion();},
		throwaway: function(ev){this.model.throwaway();},
		dropped_pass: function(ev){this.model.dropped_pass();},
		defd_pass: function(ev){this.model.defd_pass();},
		unknown_turn: function(ev){this.model.unknown_turn();},
		timeout: function(ev){this.model.timeout();},
		end_of_period: function(ev){this.model.end_of_period();},
		injury: function(ev){
			this.model.injury();
			$('.t_game').hide();
			$('.sub_team_1').show();
			$('.sub_team_2').hide();
		},
		render: function(layout) {
			//TODO: Show the player name
			//TODO: Disable some buttons depending on this.model.get('current_state');
			var view = layout(this);
			//return view.render();
			return view.render().then(function(el) {
				this.show_action_buttons();
			});
		}
	});

	
	/*
	Parent view for the substitution screen. The layout has 2 of these.
	*/
	TrackedGame.Views.SubTeam = Backbone.View.extend({
		template: "trackedgame/game_substitution",
		initialize: function() {
			//Bind to offfield reset for the first load. What happens if the game is fetched from localStorage and offfield is empty. Still trigger reset?
			this.model.get('offfield_'+this.options.team_ix).bind("reset", function(){this.render();}, this);
			this.model.get('offfield_'+this.options.team_ix).bind("remove", this.swap_collection, this);
			this.model.get('onfield_'+this.options.team_ix).bind("remove", this.swap_collection, this);
			
			//There's no reason to expect the game to change (i.e. score or team names)
		},
		cleanup: function() {
    		this.model.get('offfield_'+this.options.team_ix).unbind("add");
    		this.model.get('onfield_'+this.options.team_ix).unbind("add");
    		this.model.get('offfield_'+this.options.team_ix).unbind("remove");
    		this.model.get('onfield_'+this.options.team_ix).unbind("remove");
    		this.model.get('offfield_'+this.options.team_ix).unbind("reset");
  		},
		events: {
			"click .sub_next": "sub_next",
			"click .sub_done": "sub_done"
		},
		sub_next: function(ev){
			this.model.get('onfield_'+this.options.team_ix).trigger('reset');
			//I would prefer to tighten the scope on this but I'm not sure how to access
			//the other team's class without searching the whole DOM.
			$('.sub_team_'+this.options.team_ix).hide();
			$('.sub_team_'+(3-this.options.team_ix)).show();
		},
		sub_done: function(ev){
			$('.sub_team_1').hide();
			$('.sub_team_2').hide();
			$('.t_game').show();
		},
		swap_collection: function(model, collection, options){
			var new_model = model.clone();
			if (collection==this.model.get('offfield_'+this.options.team_ix) && this.model.get('onfield_'+this.options.team_ix).length<7){//was offfield
				this.model.get('onfield_'+this.options.team_ix).add(new_model);
			} else {//was onfield
				this.model.get('offfield_'+this.options.team_ix).add(new_model);
			}
			this.render();
		},
		render: function(layout) {
			//https://github.com/tbranyen/backbone.layoutmanager/pull/47
			app.api.d_token(); //Ensure that the user is logged in
			var view = layout(this); //Get this view from the layout.
			this.model.get('onfield_'+this.options.team_ix).each(function(tp) {
				view.insert(".sub_on_field", new TrackedGame.Views.RosterItem({model: tp}));
			});
			this.model.get('offfield_'+this.options.team_ix).each(function(tp) {
				view.insert(".sub_off_field", new TrackedGame.Views.RosterItem({model: tp}));
			});
			return view.render({ team: this.model.get('game').get('team_'+this.options.team_ix) });
		}
	});
	TrackedGame.Views.RosterItem = Backbone.View.extend({
		//Can bind this teamplayer change to render... useful if player name/number changes. Why would it?
		template: "trackedgame/roster_item",
		tagName: "li",
		serialize: function() {
			return this.model.toJSON();
		},
		events: {
			"click": "remove_me"
		},
		remove_me: function(ev) {
			this.model.collection.remove(this.model);//remove the model from the collection
		}
	});
	
	return TrackedGame;
});
