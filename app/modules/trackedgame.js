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
 * Chad's TODO list:
 * -enable/disable buttons depending on state
 * -Player model needs a function that returns its formatted name from its attributes.
 */

/*
This module is an interface for tracking game action.
It has some data that is not persisted to the server.

There are basically 3 types of buttons.
1. Buttons that create an event
	-player-action buttons
	-immediate-event buttons (e.g., throwaway)
	-player substitution buttons
2. Buttons that temporarily change the game state
3. Buttons that change what is visible on the screen but do not modify any data
	-Rotate through action/sub1/sub2 screens
	-MISC action buttons
	
The basic workflow for event buttons is as follows:
1. create an event.
2. Using the type of button pressed and the current game state, set the event type, player ids and team ids.
3. $.when(save).then(add event to stack of events); this triggers
4. event_added: makes sure trackedgame's attributes are set properly. Then it saves trackedgame.
5. Setting the attributes causes a re-render of the UI elements that reflect the state (e.g., play-by-play, player prompt)

A button that temporarily changes the game state does just that. It is not saved.
*/

function(require, namespace, Backbone) {
    "use strict";
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
            //previous_state: "blank",
			current_state: "pulling",
			is_over: false,
			period_number: NaN,
			team_pulled_to_start_ix: NaN,
			team_in_possession_ix: NaN,
			player_in_possession_id: NaN,
			injury_to: false,//Whether or not substitutions will be injury substitutions.
			visible_screen: 0,
			showing_alternate: -1//I seem to be having trouble with using a boolean or using 0 and 1. So use 1 and -1.
		},
		toJSON: function() {//flatten the data so they are easy to read.
			var temp = _.clone(this.attributes);
			temp.game = this.get("game").toJSON();
			temp.onfield_1 = this.get("onfield_1").toJSON();
			temp.offfield_1 = this.get("offfield_1").toJSON();
			temp.onfield_2 = this.get("onfield_2").toJSON();
			temp.offfield_2 = this.get("offfield_2").toJSON();
			temp.gameevents = this.get("gameevents").toJSON();
			return temp;
		},
		
		screens_list: [{b_class: ".sub_team_1", b_string: "Roster Screen"}, {b_class: ".sub_team_2", b_string: "Next Roster Screen"}, {b_class: ".t_game", b_string: "Action Screen"}],
		rotate_visibility: function() {
			var n_screens = this.screens_list.length;
			var sc_ix = this.get("visible_screen");
			this.set("visible_screen", sc_ix==n_screens-1 ? 0 : sc_ix + 1);
			this.toggle_screens();
		},
		toggle_screens: function(){
			var n_screens = this.screens_list.length;
			for (var ix=0;ix<n_screens;ix++) {$(this.screens_list[ix].b_class).hide();}
			$(this.screens_list[this.get("visible_screen")].b_class).show();
            window.scrollTo(0, 5000); //Scroll to the bottom where the toggle button is
		},
		
		setButtonHeight: function() { 
             //Dynamically calculates and sets the button height for all buttons in the 
             //game tracking screen (not the substitution screen)
            
             // Get the browser height
             // Taken from here: http://bugs.jquery.com/ticket/6724
             var browser_height = window.innerHeight ? window.innerHeight : $(window).height();

             // Save some space for the text, space between buttons, and the rotate button
             var non_button_height = 240;
             
             // Divide the rest of the height between 5 rows of buttons
             var button_height = Math.floor((browser_height - non_button_height)/5);
             $(".t_game button").css({"height": button_height});

             // Make the score button larger than the rest
             var score_height = button_height + 30;
             $("button.score").css({"height": score_height});
        },
		
		/*
		 * FUNCTIONS FOR GAME EVENTS
		 * 
		 * Pressing a player button will always create event.
		 * The type of button created will depend on the game state.
		 * 
		 * Pressing an auxilliary button might create an
		 * event (throwaway, unknown turn, injury, timeout, end_period).
		 * Tapping an aux button will always result in a state change.
		 * 
		 */
		
		/*
		 * Define game states. Game state determines effect of tapping a player button.
		 */
		game_states: {
			pulling: {player_prompt: "Who pulled?", player_tap_event_type: 1},
			picking_up: {player_prompt: "Who picked up?", player_tap_event_type: 10},
			receiving: {player_prompt: "Completed pass to:", player_tap_event_type: 21, same_team: true},
			scoring: {player_prompt: "Who caught the goal?", player_tap_event_type: 22, same_team: true},
			dropping: {player_prompt: "Who dropped the disc?", player_tap_event_type: 33, same_team: true},
			blocking: {player_prompt: "Who got the D?", player_tap_event_type: 34, same_team: false},
			stalling: {player_prompt: "Who was marking?", player_tap_event_type: 51, same_team: false},
		},
		
		/*
		 * Define the event types. Also specify whether the event is a turnover,
		 * whether it is usually accompanied by a screen toggle, and what the
		 * play-by-play will display.
		 */
		events_meta: {
			1: {is_turnover: true, toggle_screen: false, next_player_as: 1, play_string: "pulled", next_state: "picking_up"},
			10: {is_turnover: false, toggle_screen: false, next_player_as: 1, play_string: "picked up the disc", next_state: "receiving"},
			21: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "completed a pass to", next_player_as: 2, next_state: "receiving"},
			22: {is_turnover: false, toggle_screen: true, last_player_as: 1, play_string: "threw a goal to", next_player_as: 2, next_state: "pulling"},
			30: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "turnover", next_state: "picking_up"},
			32: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "threw the disc away", next_state: "picking_up"},
			33: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "'s pass was dropped by", next_player_as: 2, next_state: "picking_up"},
			34: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "'s pass was blocked by", next_player_as: 3, next_state: "picking_up"},
			51: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "ran out of time while marked by", next_player_as: 2, next_state: "picking_up"},
			80: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "stepped on the field"},
			81: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "stepped off the field"},
			91: {is_turnover: false, toggle_screen: false, play_string: "Timeout", next_state: "picking_up"},
			92: {is_turnover: false, toggle_screen: true, play_string: "Injury timeout", next_state: "picking_up"},
			94: {is_turnover: false, toggle_screen: true, play_string: "End of period", next_state: "pulling"},
			98: {is_turnover: false, toggle_screen: false, play_string: "Game over"},
		},
		
		//A helper function to create a template gameevent. Futher details will be added after.
		create_event: function () {
			var GameEvent = require("modules/gameevent");
			var d = new Date();//"2011-12-19T15:28:46.493Z"
			var time = d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate() + "T" + d.getUTCHours() + ":" + d.getUTCMinutes() + ":" + d.getUTCSeconds();
			var gameid = this.get("game").id;
			return new GameEvent.Model({time: time, game_id: gameid});
		},
		
		//Event type will be set either by an event button or by a player tap button.
		
		//Untouched throwaway, unknown turn, injury, timeout are all immediate events that do not require a game state.
		immediate_event: function(event_type){
			var this_event = this.create_event();
			this_event.set({type: event_type});
			this.process_event(this_event);
		},
		
		player_tap: function(pl_id){//pl_id is the tapped player. Might be NaN
			var this_event = this.create_event();
			//Set the event's type based on the current state.
			var state_meta = this.game_states[this.get("current_state")];
			var event_type = state_meta["player_tap_event_type"];
			this_event.set({type: event_type});
			
			var event_meta = this.events_meta[event_type];
			
			//Determine how pl_id should be used.
			var team_ix = this.get("team_in_possession_ix");
			var team_id = this.get("game").get("team_"+team_ix+"_id");
			if (_.has(event_meta,"next_player_as")){	
				this_event.set("player_"+event_meta["next_player_as"]+"_id",pl_id);
				this_event.set("player_"+event_meta["next_player_as"]+"_team_id",team_id);
			}
			
			//For some states, setting the state swaps possession.
			//Swap back (temporarily) because we will swap again when processing the event.
			if (_.has(state_meta,"same_team") && !state_meta["same_team"]){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
			
			this.process_event(this_event);
		},
		
		process_event: function(this_event){
			//The disc is still currently in possession of the team that started with the disc.
			//Despite this, events where the second player is on the defending team already have
			//the correct player_id and team_id set for the defending player.
			
			var last_pl_id = this.get("player_in_possession_id");
			var team_ix = this.get("team_in_possession_ix");//team_ix is index of team that player is on. Might be NaN.
			var last_team_id = this.get("game").get("team_"+team_ix).id;
			var event_meta = this.events_meta[this_event.get("type")];
			
			if (_.has(event_meta,"last_player_as")){
				//Hack for unknown turn which has a team but not a player.
				if (this_event.get("type")!=30){
					this_event.set("player_"+event_meta["last_player_as"]+"_id",last_pl_id);
				}
				this_event.set("player_"+event_meta["last_player_as"]+"_team_id",last_team_id);
			}
			
			//Hack for timeout, assumes possession team is calling team.
			if (this_event.get("type")==91 || this_event.get("type")==92){
				this_event.set("int_1", last_team_id);
			}
			
			//save the event to the server.
			this.save_event(this_event, this);
			
		},
		
		end_period: function(){
			//the End Period button should be disabled if we are in an injury_to... but I will check for the state anywyay.
			if (this.get("current_state")=="pulling" && !this.get("injury_to")) {
				var ev_type = 94;
				var last_per_num = this.get("period_number");
				//The following line COULD be used for specific end of period types,
				//except that non AUDL games would have "end of first" events instead of half-time events.
				//if (last_per_num <=3){ev_type = ev_type + last_per_num;}
				this.set("period_number", last_per_num+1);
				this.start_period_pull();
				
				var this_event = this.create_event();
				this_event.set({type: ev_type});
				this.save_event(this_event);
			} 
		},
		
		game_over: function(){
			var this_event = this.create_event();
			this_event.set({type: 98});
			$.when(this.save_event(this_event)).then( function() {
				this.set("is_over"); 
			});
			Backbone.history.navigate("games/"+this.get("game").id, true);
		},
		
		add_removed_player_to_other_collection: function(model, collection, options){
			//Determine which collection we will be swapping TO.
			var team_ix = collection.team_id == this.get("game").get("team_1_id") ? 1 : 2;
			var was_off = collection == this.get("offfield_"+team_ix);
			var new_model = model.clone();
			var event_needs_saving = true;
			var event_type = 80;
			if (was_off) {
				//If onfield has < 7, add it, otherwise add it back to offield
				if (this.get("onfield_"+team_ix).length<7){
					this.get("onfield_"+team_ix).add(new_model);
				} else {
					this.get("offfield_"+team_ix).add(new_model);
                    event_needs_saving = false;
				}
			} else {
				event_type=event_type+1;
				this.get("offfield_"+team_ix).add(new_model);
			}
			if (this.get("injury_to")){event_type = event_type + 2;}
			var this_event = this.create_event();
			this_event.set({type: event_type, player_1_id: model.get("player_id"), player_1_team_id: model.get("team_id")});
			if (event_needs_saving) {this.save_event(this_event);}
		},
		
		save_event: function(event) {
			var trackedgame=this;
			$.when(event.save()).then(function(){
				trackedgame.get("gameevents").add(event);//Triggers play-by-play update, and this.event_added
			});
		},
		
		update_state: function(){
			//TODO: This might better belong in the immediate_event function.
			//The state is changed elsewhere. This simply handles changing possession.
			//The UI changes are handled by the views bound to the change in state.
			var state_name = this.get("current_state");
			if (_.has(this.game_states[state_name],"same_team") && !this.game_states[state_name].same_team){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
		},
		
		undo: function(){
			var event_coll = this.get("gameevents");
			var last_event = event_coll.at(event_coll.length-1);
			last_event.destroy({wait: true});//Will trigger a remove event, which triggers event_removed.
		},
		
		event_removed: function(model, collection, options){
			//This is triggered when an event is successfully removed from the data store and then the events stack.
			var last_event_meta = this.events_meta[model.get("type")];
			
			if (last_event_meta.is_turnover){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
			
			var event_coll = this.get("gameevents");
			var remaining_event = event_coll.at(event_coll.length-1);
			this.state_for_event(remaining_event);
		},
		
		event_added: function(model, collection, options){
			//Triggered when an event is successfully added to the stack.
			var team_ix = this.get("team_in_possession_ix");
			var event_meta = this.events_meta[model.get("type")];
			
			this.set("team_in_possession_ix",event_meta["is_turnover"] ? 3-team_ix : team_ix);
			
			//Hack for score.
			if (model.get("type")== 22){
				var game_model = this.get("game");
				var team_score_string = "team_" + team_ix + "_score";
				var last_score = game_model.get(team_score_string);
				var new_score = last_score == "" ? 1 : last_score + 1;
				game_model.set(team_score_string,new_score);
			}
			
			if (event_meta["toggle_screen"]){
				this.rotate_visibility();
			}
			
			this.state_for_event(model);
		},
		
		state_for_event: function(event){
			var team_ix = this.get("team_in_possession_ix");
			var event_meta = this.events_meta[event.get("type")];
			
			if (_.has(event_meta,"next_state")){
				this.set("current_state",event_meta["next_state"]);
				this.set("player_in_possession_id",event_meta["next_state"] == "receiving" ? event.get("player_" + event_meta["next_player_as"] + "_id"): NaN);
			}
			
			this.save();
		},
		
		start_period_pull: function(){
			//This function is called at the beginning of a period (including the first) to determine which team has the disc.
			var per_num = this.get("period_number");
			if ( per_num==1 ){
				//Alert to ask which team is pulling to start.
				//TODO: Replace this with a nice view or style the alert.
				var pulled_team_1=confirm("Press OK if " + this.get("game").get("team_1").name + " is pulling to start the game.");
				this.set("team_pulled_to_start_ix", pulled_team_1 ? 1 : 2);
			}
			//Determine who should be pulling disc.
			//If the period number is odd, then the team now pulling is the team that pulled to start the game.
			var tip_ix = per_num%2==1 ? this.get("team_pulled_to_start_ix") : 3-this.get("team_pulled_to_start_ix");
			this.set("team_in_possession_ix", tip_ix)
		},
		
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
                return;
            }
			
			var myLayout = app.router.useLayout("tracked_game");
			//var Team = require("modules/team");
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			var GameEvent = require("modules/gameevent");
			
			var trackedgame = new TrackedGame.Model({id: gameId});
			trackedgame.fetch(); //localStorage. localStorage requests are synchronous.
			
			//Check to see if the game is over and if so ask if it should be enabled.
			if (trackedgame.get("is_over")) {
				var undo_over = confirm("You previously marked this game as over. Press OK to resume taking stats.");
				if (undo_over){
					var events = trackedgame.get("gameevents");
					var last_event = events.at(events.length-1);
					if (last_event.get("type")==98) {
						$.when(last_event.destroy()).then(function() {trackedgame.set("is_over",false);});
					}
				} else {
					Backbone.history.navigate("games/"+gameId, true);
				}
			}
			
			//If we don't have a period number then assume it is the first and we are pulling to start.
			if (isNaN(trackedgame.get("period_number"))){//Game has not yet started. Set it up now.
				trackedgame.set("period_number", 1);
				trackedgame.set("current_state","pulling");
			}
			
			/*
			 * Trackedgame has many child objects.
			 * These need to be the proper model types.
			 * These need to be refreshed from the data store.
			 */
			
			//.game
			var newGame = new Game.Model(trackedgame.get("game"));
			if (!trackedgame.get("game").id) {
				newGame.id = gameId;
			}
			trackedgame.set("game", newGame, {silent:true});
			trackedgame.get("game").fetch();
			//Game also has team_1 and team_2 objects that are not Backbone Models but could be.
			
			//.onfield and .offfield
			for (var ix=1;ix<3;ix++) {//Setup offfield or onfield with data from localStorage (or empty)
				trackedgame.set("offfield_"+ix, new TeamPlayer.Collection(trackedgame.get("offfield_"+ix)));
				trackedgame.set("onfield_"+ix, new TeamPlayer.Collection(trackedgame.get("onfield_"+ix)));
			}
			//.offfield and onfield require team_id before they can be fetched. See bindings below.
			//TODO: Is there anyway for offfield to know its team id before game is fetched?
			
			//.gameevents
			trackedgame.set("gameevents",
				new GameEvent.Collection(trackedgame.get("gameevents"),{game_id: gameId}));
			//trackedgame.get("gameevents").fetch(); //TODO: Fetch gameevents once the API only returns events created by this user.
			
			/*
			 * MODEL BINDINGS.
			 */
			trackedgame.bind("change:current_state",trackedgame.update_state,trackedgame);
			trackedgame.bind("change:is_over",trackedgame.save);
			trackedgame.get("gameevents").bind("add",trackedgame.event_added,trackedgame);
			trackedgame.get("gameevents").bind("remove",trackedgame.event_removed,trackedgame);
			
			
			var game = trackedgame.get("game");
			game.bind("change:team_1", function(){
				if (game.get("team_1").name && !trackedgame.get("team_pulled_to_start_ix")){
					trackedgame.start_period_pull();
				}
			});
			
			//I can't seem to setup the onfield and offfield fetches properly with loops so I will write it out manually.
			game.bind("change:team_1_id", function(){
				var onf = trackedgame.get("onfield_1");
				var offf = trackedgame.get("offfield_1");
				var team_id = game.get("team_1_id");
				_.extend(onf,{team_id: team_id});
				_.extend(offf,{team_id: team_id});
				offf.fetch();
				if (onf.length>0){onf.fetch();}
			});
			trackedgame.get("offfield_1").bind("remove",trackedgame.add_removed_player_to_other_collection,trackedgame);
			trackedgame.get("onfield_1").bind("remove",trackedgame.add_removed_player_to_other_collection,trackedgame);
			
			game.bind("change:team_2_id", function(){
				var onf = trackedgame.get("onfield_2");
				var offf = trackedgame.get("offfield_2");
				var team_id = game.get("team_2_id");
				_.extend(onf,{team_id: team_id});
				_.extend(offf,{team_id: team_id});
				offf.fetch();
				if (onf.length>0){onf.fetch();}
			});
			trackedgame.get("offfield_2").bind("remove",trackedgame.add_removed_player_to_other_collection,trackedgame);
			trackedgame.get("onfield_2").bind("remove",trackedgame.add_removed_player_to_other_collection,trackedgame);
	
			myLayout.setViews({
				".sub_team_1": new TrackedGame.Views.SubTeam({onfield: trackedgame.get("onfield_"+1), offfield: trackedgame.get("offfield_"+1), game: trackedgame.get("game"), team_ix: 1}),
				".sub_team_2": new TrackedGame.Views.SubTeam({onfield: trackedgame.get("onfield_"+2), offfield: trackedgame.get("offfield_"+2), game: trackedgame.get("game"), team_ix: 2}),
				//Game action of course requires the full trackedgame.
				".t_game": new TrackedGame.Views.GameAction({model: trackedgame}),
				".rotate_screen": new TrackedGame.Views.RotateButton({model: trackedgame})
			});
		    var callback = trackedgame.setButtonHeight;
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render(function(el) {
				$("#main").html(el);
			}).then(function() {
                // Unbind any other bindings to the browser height
                $(window).unbind("resize"); //Is there a better way to do this besides binding globally?
                $(window).bind("resize", function() {
                    callback();
                });
                callback();
                
                trackedgame.toggle_screens();
            });
		},
	});
	TrackedGame.router = new TrackedGame.Router();// INITIALIZE ROUTER
	
	/*
	 * TrackedGame page view hierarchy:
	 * 
	 * sub_team_1 = SubTeam
	 *   - sub_on_field_area = RosterList
	 *     - many RosterItem
	 *   - sub_off_field_area = RosterList
	 *     - many RosterItem
	 * sub_team_2 = SubTeam. Same as above.
	 * t_game = GameAction
	 *   - scoreboard = Scoreboard
	 *	   - undo_button
	 *   - play_by_play = PlayByPlay
	 *   - player_area = PlayerArea
	 *     - player_area_1 = TeamPlayerArea
	 *       - many PlayerButton
	 *     - player_area_2 = TeamPlayerArea
	 *       - many PlayerButton
	 *   - action_area = ActionArea
	 * rotate_button = RotateButton
	 */
  	
	//
	// VIEWS
	//
	
	/*
	Parent view for the substitution screen. The layout has 2 of these.
	*/
	TrackedGame.Views.SubTeam = Backbone.View.extend({
		initialize: function(){
			this.options.game.bind("reset", function(){this.render();},this);
		},
		template: "trackedgame/game_substitution",
		events: {
			"click .game_over": "game_over",
		},
		game_over: function(ev){this.model.game_over();},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.setViews({
				".sub_on_field_area": new TrackedGame.Views.RosterList({collection: this.options.onfield, remove_all_button: true}),
				".sub_off_field_area": new TrackedGame.Views.RosterList({collection: this.options.offfield})
			});
			return view.render({ team: this.options.game.get("team_"+this.options.team_ix)});
		}
	});
	TrackedGame.Views.RosterList = Backbone.View.extend({
		initialize: function() {
			this.collection.bind("reset", function(){
				this.render();
			}, this);
			this.collection.bind("add", this.add_roster_item, this);
		},
		tagName: "ul",
		//add_roster_item: function (model, collection, options){
		add_roster_item: function (){
			//I would love to simply add the views individually but this does not work currently with layoutmanager.
			//https://github.com/tbranyen/backbone.layoutmanager/pull/47
			//this.view("ul", new TrackedGame.Views.RosterItem({model: model}), true);
			//This callback is being triggered twice for every press... I"m not sure why.
			this.render();
		},
		render: function(layout){
			var view = layout(this);
			//this.$el.empty()
			view.cleanup();// call .cleanup() on all child views, and remove all appended views
			this.collection.each(function(tp) {//for each teamplayer in the collection.
				view.insert(new TrackedGame.Views.RosterItem({model: tp}));
			});
            if (this.options.remove_all_button) {
                view.insert(new TrackedGame.Views.RosterItemRemoveAll({}));
            }
			return view.render();
		},
		events: {
			"click .roster_remove_all": "swap_all"
		},
		swap_all: function(ev){
			this.collection.remove(this.collection.models);
			this.render();
		},
	});
	TrackedGame.Views.RosterItem = Backbone.View.extend({
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
	TrackedGame.Views.RosterItemRemoveAll = Backbone.View.extend({
	    template: "trackedgame/roster_item_remove_all",
	    tagName: "li"
	});
    
    /*
	Parent view for the game screen
	*/
	TrackedGame.Views.GameAction = Backbone.View.extend({
		//this.model = trackedgame
		template: "trackedgame/game_action",
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".scoreboard": new TrackedGame.Views.Scoreboard({model: this.model}),
				".playbyplay": new TrackedGame.Views.PlayByPlay({model: this.model}),
				".player_area": new TrackedGame.Views.PlayerArea({model: this.model}),
				".action_area": new TrackedGame.Views.ActionArea({model: this.model})
			});
			return view.render().then(function() {this.model.setButtonHeight();});
		}
	});
	
	/*
	View for Scoreboard
	*/
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		//this.model = trackedgame
		template: "trackedgame/scoreboard",
		initialize: function() {
			this.model.get("game").bind("change:team_1_score change:team_2_score", function() {this.render();}, this);
			this.model.bind("change:team_in_possession_ix", function() {this.render();}, this);
		},
		//cleanup - unbind, etc.
		serialize: function() {
			return this.model.toJSON();
		},
		//render_helpers
		show_previous_action: function(ev){
        	//TODO: Move this into its own play-by-play view and include the Undo button.
            // Update the Previous Play: based on the last event.
            var last_event = this.model.get("gameevents").at(this.model.get("gameevents").length-1);
            var event_meta = this.model.events_meta[last_event.get("type")];
            
            var player_name = "";
            if (event_meta.needs_player_name){
            	//TODO: Get player names from ids of last players.
            }
            
            // Display the previous action 
            this.$(".last_action").html(player_name + " " +  event_meta.play_string + ".");
        }
	});
	
	/*
	 * View for PlayByPlay
	 */
	TrackedGame.Views.PlayByPlay = Backbone.View.extend({
		//this.model is trackedgame
		template: "trackedgame/playbyplay",
		initialize: function() {
			this.model.get("gameevents").bind("add remove", function() {this.render();}, this);
		},
		//cleanup
		render: function(layout) {
			var view = layout(this);
			var playtext = "";
			//Use the last event to determine how to draw the play-by-play screen.
			var _events = this.model.get("gameevents");
			if (_events.length>0){
				var last_event = _events.at(_events.length-1);
				var event_meta = this.model.events_meta[last_event.get("type")];
				//if event_meta has last_player_as or next_player_as and either of them have a value of 1.
				var lpix = _.has(event_meta,"last_player_as") ? event_meta["last_player_as"] : null;
				var npix = _.has(event_meta,"next_player_as") ? event_meta["next_player_as"] : null;
				if (lpix || npix){
					var t1 = this.model.get("onfield_1").pluck("player");
					var t2 = this.model.get("onfield_2").pluck("player");
					var players = _.union(t1,t2);
				}
				if (lpix==1 || npix==1){
					var pl1 = _.find(players, function(pl_obj){return pl_obj.id == last_event.get("player_1_id");});
                    if (pl1 != undefined) {
                        playtext = pl1.first_name[0] + ". " + pl1.last_name + " ";
                    } else {
                        playtext = "Unknown ";
                    }
				}
				
				playtext += event_meta["play_string"];
				
				if (npix>1){
					var pl2 = _.find(players, function(pl_obj){return pl_obj.id == last_event.get("player_" + npix + "_id");});
                    var pl2_name = 'Unknown';
                    if (pl2 != undefined){
                        pl2_name = pl2.first_name[0] + ". " + pl2.last_name;
                    }
					playtext = playtext + " " + pl2_name + ".";
				}
			}
			return view.render({playtext: playtext});
		},
	});
	
	/*
	Nested views for player buttons. PlayerArea>TeamPlayerArea*2>PlayerButton*8
	*/
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		//this.model is trackedgame
		template: "trackedgame/player_area",
		initialize: function() {
			//I have moved the action prompt from the subview to here, because the action prompt is not team-specific.
			this.model.bind("change:current_state", function() {this.render();}, this);//Update the action prompt.
			this.model.bind("change:team_in_possession_ix", function() {this.show_teamplayer();}, this);//Update which player buttons to display.
		},
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				//Need to pass the full trackedgame to the children views because we need to bind to its attributes that are not yet backbone model's'
				".player_area_1": new TrackedGame.Views.TeamPlayerArea({model: this.model, team_ix: 1}),
				".player_area_2": new TrackedGame.Views.TeamPlayerArea({model: this.model, team_ix: 2}),
				//".player_area_1": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get("onfield_1"), model: this.model.get("game").get("team_1"), trackedgame: this.model}),
				//".player_area_2": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get("onfield_2"), model: this.model.get("game").get("team_2"), trackedgame: this.model})
			});
			return view.render({
				//player_prompt: this.model.player_prompt_strings[this.model.get("current_state")]
				player_prompt: this.model.game_states[this.model.get("current_state")].player_prompt
			}).then(function(el) {
				this.show_teamplayer();
			});
		},
		show_teamplayer: function () {
			this.$(".player_area_"+(3-this.model.get("team_in_possession_ix"))).hide();
			this.$(".player_area_"+this.model.get("team_in_possession_ix")).show();
		}
	});
	TrackedGame.Views.TeamPlayerArea = Backbone.View.extend({
		//this.model = trackedgame; this.options.team_ix = 1 or 2
		template: "trackedgame/teamplayer_area",
		initialize: function() {
			//Specific players should only be added or removed on the substitution screen.
			var ix = this.options.team_ix;
			this.onf = this.model.get("onfield_"+ix);
			this.onf.bind("add", function() {this.render().then(function(el) {this.model.setButtonHeight();})}, this);
			//team is not a Backbone.Model yet. 
			this.model.get("game").bind("change:team_"+this.options.team_ix,function(){this.render();}, this);//Team name will update when returned from db.
		},
		render: function(layout) { 
			var view = layout(this);
			var _this = this;
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.onf.each(function(tp) {
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: tp, trackedgame: _this.model
				}));
			});
			//insert unknown buttons for less than 8 players.
			var TeamPlayer = require("modules/teamplayer");
			for(var i=this.onf.length;i<8;i++){
				view.insert("ul", new TrackedGame.Views.PlayerButton({
					model: new TeamPlayer.Model({player: {id:NaN, last_name:"unknown"}}),
					trackedgame: _this.model
				}));
			}
			var team = this.model.get("game").get("team_"+this.options.team_ix);
			return view.render({ team: team });
		}
	});
	TrackedGame.Views.PlayerButton = Backbone.View.extend({
		template: "trackedgame/player_button",
		tagName: "li",
		serialize: function() {
			return this.model.toJSON();//TODO: Player model to generate name?
		},
		events: {
			"click": "player_tap",
		},
		player_tap: function(ev){
            var player_id = parseInt(this.$el.find("button.player").attr("id"));
			this.options.trackedgame.player_tap(player_id);
		}
	});
	
	
	/*
	View for action buttons. ActionArea> (should this be nested?)
	*/
	TrackedGame.Views.ActionArea = Backbone.View.extend({
		template: "trackedgame/action_area",
		initialize: function() {			
			this.model.bind("change:player_in_possession_id change:current_state change:period_number", function() {this.render();}, this);
			this.model.bind("change:showing_alternate", this.show_action_buttons, this);//Which buttons are we showing?
		},
		render: function(layout) {
			var view = layout(this);
			var pl_string = "";
			var ac_string = "";
			var pl_id = this.model.get("player_in_possession_id");
			var team_ix = this.model.get("team_in_possession_ix");
			if (pl_id){
				var pl_model = _.find(this.model.get("onfield_" + team_ix).pluck("player"), function(pl_obj){return pl_obj.id == pl_id;});
                if (pl_model != undefined) {
                	pl_string = pl_model.first_name[0] + ". " + pl_model.last_name + " ";
                	ac_string = "throws a:";
                }
			}
			return view.render({
					player_string: pl_string,
					action_string: ac_string,
					per_num: this.model.get("period_number"),
				}).then(function(el) {
					this.show_action_buttons();
	                this.show_player_name();
	                this.model.setButtonHeight();
			});
		},
		show_action_buttons: function(ev){//shows or hides buttons depending on this.model.get("showing_alternate")
			if (this.model.get("showing_alternate")==1) {
				this.$(".main_action").hide();
				this.$(".alternate_action").show();
			}
			else {
				this.$(".alternate_action").hide();
				this.$(".main_action").show();
			}
		},
		toggle_action_buttons: function(ev){//toggle which buttons are being displayed.
			this.model.set("showing_alternate",-1*this.model.get("showing_alternate"));//Changing this should trigger show_action_buttons.
		},
        show_player_name: function(ev){
            //Update the player name that is shown above the action buttons
            this.$(".action_prompt_player").html(this.model.get("player_in_possession_name"));
        },
		events: {
			"click .misc": "toggle_action_buttons",
			"click .score": "score",
			"click .completion": "completion",
			"click .dropped_pass": "dropped_pass",
			"click .defd_pass": "defd_pass",
			"click .stall": "stall",
			"click .throwaway": "throwaway",
			"click .unknown_turn": "unknown_turn",
			"click .timeout": "timeout",
			"click .injury": "injury",
			"click .end_of_period": "end_of_period",
        	"click .undo": "undo",
		},
		undo: function(){this.model.undo();},
		score: function(){this.model.set("current_state","scoring");},
		completion: function(){this.model.set("current_state","receiving");},
		dropped_pass: function(){this.model.set("current_state","dropping");},
		defd_pass: function(){this.model.set("current_state","blocking");},
		stall: function(){this.model.set("current_state","stalling");},
		throwaway: function(){this.model.immediate_event(32);},
		unknown_turn: function(){this.model.immediate_event(30);},
		timeout: function(){this.model.immediate_event(91);},
		injury: function(){this.model.immediate_event(92);},
		end_of_period: function(){this.model.end_of_period();},
	});
	
	TrackedGame.Views.RotateButton = Backbone.View.extend({
		template: "trackedgame/rotate_button",
		initialize: function() {			
			this.model.bind("change:visible_screen", function() {this.render();}, this);
		},
		render: function(layout) {
			var view = layout(this);
			var n_screens = this.model.screens_list.length;
			var sc_ix = this.model.get("visible_screen");
			var next_screen_text = "";
			sc_ix = sc_ix == n_screens-1 ? 0 : sc_ix + 1;
			return view.render({next_screen: this.model.screens_list[sc_ix].b_string});
		},
		events: {
			"click .rotate": "rotate_screen"
		},
		rotate_screen: function(){this.model.rotate_visibility();}
	});

	return TrackedGame;
});
