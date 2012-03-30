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
			current_state: 'pulled',
			team_in_possession_ix: 1,
			player_in_possession_id: NaN,
			team_pulled_ix: NaN,
			injury_to: false,//Whether or not substitutions will be injury substitutions.
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
		create_event: function () {
			var GameEvent = require("modules/gameevent");
			var d = new Date();//"2011-12-19T15:28:46.493Z"
			var time = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate() + 'T' + d.getUTCHours() + ':' + d.getUTCMinutes() + ':' + d.getUTCSeconds();
			var gameid = this.get('game').get('id');
			return new GameEvent.Model({time: time, game_id: gameid});
		},
		save_event: function(event) {
			var trackedgame=this;
			event.save([], {
				headers: {"Authorization": "bearer " + app.api.d_token()},
                success: function(model, response, xhr){
					trackedgame.get('gameevents').add(model);//Add the event to the trackedgame.get('gameevents'). Will trigger a change in the last play display.
					trackedgame.save();//save the trackedgame.
				},
                error: function(originalModel, resp, options) {
                    //TODO: Do something with the error. Maybe log the error and retry again later?
                }
			});
		},
		swap_player: function(model,collection,team_ix){
			var was_offfield = collection==this.get('offfield_'+team_ix);
			var team_id = this.get('game').get('team_'+team_ix).id;
			var pl_id = model.get('player_id');
			var new_model = model.clone();
			var this_event = this.create_event();
			var event_id = 80;
			if (was_offfield) {
				//If onfield has < 7, add it, otherwise add it back to offield
				if (this.get('onfield_'+team_ix).length<7){
					this.get('onfield_'+team_ix).add(new_model);
				} else {
					this.get('offfield_'+team_ix).add(new_model);
				}
			} else {
				event_id=event_id+1;
				this.get('offfield_'+team_ix).add(new_model);
			}
			if (this.get('injury_to')){event_id = event_id + 2;}
			this_event.set({type: event_id, player_1_id: pl_id, player_1_team_id: team_id});
			this.save_event(this_event);
		},
		player_tap: function(pl_id){
			//pl_id is the tapped player. Might be NaN
			var this_event = this.create_event();
			var team_ix = this.get('team_in_possession_ix');
			var last_pl_id = this.get('player_in_possession_id');//last_player_id might be NaN
			//team_ix is index of team that player is on. Might be NaN.
			var team_id = this.get('game').get('team_'+team_ix).id;
			var other_team_id = this.get('game').get('team_'+(3-team_ix)).id;
			
			// The meaning of a player tap depends on the current state.
			// https://github.com/leaguevine/leaguevine-ultistats/issues/7
			switch (this.get('current_state')){//pickup, dropped, ded, scored, pulled, default
				case 'picked up'://pickup event(10) --> default
					this_event.set({type: 10, player_1_id: pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: pl_id});
					this.set('current_state','received');
					break;
				case 'dropped'://Drop event --> turnover --> pickup
					this_event.set({type: 33, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set('team_in_possession_ix',3-team_ix);
					this.set({player_in_possession_id: NaN});
					this.set('current_state','picked up');
					break;
				case 'blocked'://D event --> pickup
					this_event.set({type: 34, player_1_id: last_pl_id, player_3_id: pl_id, player_1_team_id: other_team_id, player_3_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('current_state','picked up');
					break;
				case 'scored'://score event --> pulled + substitution screen
					this_event.set({type: 22, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('current_state','pulled');
					//Update score
					this.get('game').set('team_'+team_ix+'_score',this.get('game').get('team_'+team_ix+'_score')+1);
					$('.t_game').hide();
					$('.sub_team_1').show();
					$('.sub_team_2').hide();
					break;
				case 'pulled'://pull event --> turnover --> pickup
					this_event.set({type: 1, player_1_id: last_pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
					this.set('current_state','picked up');
					break;
				case 'received':
					this_event.set({type: 21, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: pl_id});
					//neither team nor state change.
					break;
				case 'marked'://stall event --> pickup
					this_event.set({type: 51, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: other_team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set('current_state','picked up');
					break;
				default://pass event.
                    this.set({player_in_possession_id: pl_id});
			}
			//save the event to the server.
			this.save_event(this_event, this);//TODO: DO I need to pass 'this' ?
		},
		//Score, Dropped pass, D'ed pass, stall all require a player tap which will handle the event creation.
		score: function(){
			this.set('current_state','scored');
		},
		completion: function(){
			this.set('current_state','received');
		},
		dropped_pass: function() {
			this.set('current_state','dropped');
		},
		defd_pass: function(){
			this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
			this.set('current_state','blocked');
		},
		stall: function(){
			this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
			this.set('current_state','marked');
		},
		//Untouched throwaway, unknown turn, injury, timeout are all events
		throwaway: function() {
			var this_event = this.create_event();
			var last_pl_id = this.get('player_in_possession_id');
			var team_id = this.get('game').get('team_'+this.get('team_in_possession_ix')).id;
			this_event.set({type: 32, player_1_id: last_pl_id, player_1_team_id: team_id});
			this.set({player_in_possession_id: NaN});
			this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
			this.set('current_state','picked up');
			this.save_event(this_event);
		},
		unknown_turn: function(){
			var this_event = this.create_event();
			var team_id = this.get('game').get('team_'+this.get('team_in_possession_ix')).id;
			//Does an unknown turnover require a player_id ?
			//this_event.set({type: 30, player_1_id: last_pl_id, player_1_team_id: team_id});
			this_event.set({type: 30, player_1_team_id: team_id});
			this.set({player_in_possession_id: NaN});
			this.set('team_in_possession_ix',3-this.get('team_in_possession_ix'));
			this.set('current_state','picked up');
			this.save_event(this_event);
		},
		injury: function(){
			$('.t_game').hide();
			$('.sub_team_1').show();
			$('.sub_team_2').hide();
			var this_event = this.create_event();
			var team_id = this.get('game').get('team_'+this.get('team_in_possession_ix')).id;
			this_event.set({type: 92, int_1: team_id});//TODO: This assumes the team calling timeout was the one in possession.
			this.save_event(this_event);
			this.set('injury_to',true);
		},
		timeout: function(){
			var this_event = this.create_event();
			var team_id = this.get('game').get('team_'+this.get('team_in_possession_ix')).id;
			this_event.set({type: 91, int_1: team_id});
			this.save_event(this_event);
		},
		end_of_period: function(){
			console.log("TODO: end_of_period in model def.")
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
            if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
            }
			
			var myLayout = app.router.useLayout("tracked_game");
			//var Team = require("modules/team");
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			var GameEvent = require("modules/gameevent");
			
			var trackedgame = new TrackedGame.Model({id: gameId});
			trackedgame.id=gameId;
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
				if (!trackedgame.get('team_pulled_ix')){
					//Alert to ask which team is pulling to start.
					//TODO: Replace this with a nice view.
					var pulled_team_1=confirm("Press OK if " + trackedgame.get('game').get('team_1').name + " is pulling to start the game.");
					trackedgame.set('team_pulled_ix', pulled_team_1 ? 1 : 2);
					trackedgame.set('team_in_possession_ix', trackedgame.get('team_pulled_ix'));
					trackedgame.get('game').set('team_1_score',0);
					trackedgame.get('game').set('team_2_score',0);
					trackedgame.set('current_state','pulled',{silent: true});
				}
			}});
			
			//Events should have been loaded from localStorage if they exist,
			//but they must be made into a collection of game events.
			trackedgame.set('gameevents',
				new GameEvent.Collection(trackedgame.get('gameevents'),{game_id: gameId}));
			
			//TODO: It would be nice if we could figure out the game state entirely from the events,
			//then we wouldn't have to persist anything about the game to localStorage.
			//This also makes undoing an event much easier (just delete the event and re-bootstrap)
			//I'll work on that after WebSQL is implemented.
			//In the meantime assume that the saved state of the trackedGame is the most recent.
			
			//This router might not get called again for a while if user stays on track-game screen.
			myLayout.setViews({
				".sub_team_1": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:1}),//have to pass the full model so we get onfield and offfield
				".sub_team_2": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:2}),
				".t_game": new TrackedGame.Views.GameAction({model: trackedgame})
			});
			
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render(function(el) {
				$("#main").html(el);
				$('.t_game').hide();
				$('.sub_team_1').hide();
				$('.sub_team_2').hide();
				if (trackedgame.get('current_state')=='pulled' || trackedgame.get('injury_to')){
					$('.sub_team_1').show();
				} else {
					$('.t_game').show();
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
		template: "trackedgame/scoreboard",
		serialize: function() {
			return this.model.toJSON();
		}
		//TODO: Replace serialize with a render function that makes a useful JSON out of team_in_possession, the last gameevent, team names and scores
		//so that we may populate the scoreboard with this information.
	});
	
	/*
	Nested views for player buttons. PlayerArea>TeamPlayerArea*2>PlayerButton*8
	*/
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		initialize: function() {
			//I have moved the action prompt from the subview to here, because the action prompt is not team-specific.
			this.model.bind("change:current_state", function() {this.render();}, this);//Update the action prompt.
			this.model.bind("change:team_in_possession_ix", function() {this.show_teamplayer();}, this);//Update which player buttons to display.
		},
		template: "trackedgame/player_area",
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".player_area_1": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get('onfield_1'), model: this.model.get('game').get('team_1')}),
				".player_area_2": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get('onfield_2'), model: this.model.get('game').get('team_2')})
			});
			return view.render({current_state: this.model.get('current_state')}).then(function(el) {
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
			this.collection.bind("reset", function() {this.render();}, this);
		},
		template: "trackedgame/teamplayer_area",
		render: function(layout) { 
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.collection.each(function(tp) {
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: tp
				}));
			});
			//insert unknown buttons for less than 8 players.
			var TeamPlayer = require("modules/teamplayer");
			for(var i=this.collection.length;i<8;i++){
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: new TeamPlayer.Model({player: {id:NaN, last_name:"unknown"}})
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
		//Since tapping a player button will have different action depending on the current_state
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
			"click .injury": "injury",
			"click .stall": "stall"
		},
		undo: function(ev){
			console.log("TODO: undo after WebSQL")
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
		injury: function(ev){this.model.injury();},
		stall: function(ev){this.model.stall();},
		render: function(layout) {
			//TODO: Show the player name
			//TODO: Disable some buttons depending on this.model.get('current_state');
			var view = layout(this);
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
			//Tapping a player removes them from their collection
			//Removing them from their collection triggers a swap from their old collection to their new collection
			this.model.get('offfield_'+this.options.team_ix).bind("remove", this.swap_collection, this);
			this.model.get('onfield_'+this.options.team_ix).bind("remove", this.swap_collection, this);
			//There's no reason to expect the game to change (i.e. score or team names) while doing a substitution.
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
			this.model.get('onfield_'+this.options.team_ix).trigger('reset');
			$('.sub_team_1').hide();
			$('.sub_team_2').hide();
			$('.t_game').show();
			this.model.trigger('change:showing_alternate');
			//^Hack to get the action buttons to show when a game is loaded but no one is subbed.
			this.model.set('injury_to',false);
		},
		swap_collection: function(model, collection, options){
			this.model.swap_player(model,collection,this.options.team_ix);
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.setViews({
				".sub_on_field_area": new TrackedGame.Views.RosterList({collection: this.model.get('onfield_'+this.options.team_ix)}),
				".sub_off_field_area": new TrackedGame.Views.RosterList({collection: this.model.get('offfield_'+this.options.team_ix)})
			});
			return view.render({ team: this.model.get('game').get('team_'+this.options.team_ix) });
		}
	});
	TrackedGame.Views.RosterList = Backbone.View.extend({
		initialize: function() {
			//This initialize function is being called many times upon page load.
			//4 times makes sense, twice for each team.
			//Maybe 8 times makes sense if the collection reset triggers the parent to render.
			this.collection.bind("add", this.add_view, this);
			//Swapping players from one collection to the other triggers add_view
		},
		//template: "trackedgame/ul",
		tagName: "ul",
		add_view: function (model, collection, options){
			//I would love to simply add the views individually but this does not work currently with layoutmanager.
			//https://github.com/tbranyen/backbone.layoutmanager/pull/47
			//this.view("ul", new TrackedGame.Views.RosterItem({model: model}), true);
			//This callback is being triggered twice for every press... I'm not sure why.
			this.render();
		},
		render: function(layout){
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.collection.each(function(tp) {//for each team in the collection.
				//view.insert("ul", new TrackedGame.Views.RosterItem({model: tp}));
				view.insert(new TrackedGame.Views.RosterItem({model: tp}));
			});
			return view.render();
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
			this.remove();//remove the view.
		}
	});
	
	return TrackedGame;
});
