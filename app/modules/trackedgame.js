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
            previous_state: "blank",
			current_state: "pulled",
			is_over: false,
			period_number: NaN,
			team_pulled_to_start_ix: NaN,
			team_in_possession_ix: NaN,
			player_in_possession_id: NaN,
			injury_to: false,//Whether or not substitutions will be injury substitutions.
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
		
		setButtonHeight: function() { 
             //Dynamically calculates and sets the button height for all buttons in the 
             //game tracking screen (not the substitution screen)
            
             // Get the browser height
             // Taken from here: http://bugs.jquery.com/ticket/6724
             var browser_height = window.innerHeight ? window.innerHeight : $(window).height();

             // Save some space for the text and space between buttons
             var non_button_height = 200;
             
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
		 * TODO: Game state will also determine which buttons are enabled.
		 */
		game_states: {
			pulling: {player_prompt: "Who pulled?", player_tap_event_type: 1, next_player_as: 1},
			picking_up: {player_prompt: "Who picked up?", player_tap_event_type: 10, next_player_as: 1},
			receiving: {player_prompt: "Completed pass to:", player_tap_event_type: 21, same_team: true, next_player_as: 2},
			scoring: {player_prompt: "Who caught the goal?", player_tap_event_type: 22, same_team: true, next_player_as: 2},
			dropping: {player_prompt: "Who dropped the disc?", player_tap_event_type: 33, same_team: true, next_player_as: 2},
			blocking: {player_prompt: "Who got the D?", player_tap_event_type: 34, same_team: false, next_player_as: 3},
			stalling: {player_prompt: "Who was marking?", player_tap_event_type: 51, same_team: false, next_player_as: 2},
		},
		update_state: function(state_name){
			//Score, Dropped pass, D"ed pass, and stall buttons merely set the state.
			//The event will only be created once the player button is pressed.
			//The player_prompt will be updated by its view binding to this.get("current_state") changing.
			this.set("current_state",state_name);
			if (_.has(this.game_states["state_name"],"same_team") && !this.game_states["state_name"].same_team){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
		},
		
		/*
		 * Define the event types. Also specify whether the event is a turnover,
		 * whether it is usually accompanied by a screen toggle, and what the
		 * play-by-play will display.
		 */
		events_meta: {
			1: {is_turnover: true, toggle_screen: false, needs_player_name: true, play_string: "pulled", next_state: "picking_up"},
			10: {is_turnover: false, toggle_screen: false, needs_player_name: true, play_string: "picked up the disc", next_state: "receiving"},
			21: {is_turnover: false, toggle_screen: false, needs_player_name: true, play_string: "caught a pass", last_player_as: 1, next_state: "receiving"},
			22: {is_turnover: false, toggle_screen: true, needs_player_name: true, play_string: "threw a goal", last_player_as: 1, next_state: "pulling"},
			30: {is_turnover: true, toggle_screen: false, needs_player_name: false, play_string: "turnover", last_player_as: 1, next_state: "picking_up"},
			32: {is_turnover: true, toggle_screen: false, needs_player_name: true, play_string: "threw the disc away", last_player_as: 1, next_state: "picking_up"},
			33: {is_turnover: true, toggle_screen: false, needs_player_name: true, play_string: "dropped the disc", last_player_as: 1, next_state: "picking_up"},
			34: {is_turnover: true, toggle_screen: false, needs_player_name: true, play_string: "got a D", last_player_as: 1, next_state: "picking_up"},
			51: {is_turnover: true, toggle_screen: false, needs_player_name: true, play_string: "got a marking D", last_player_as: 1, next_state: "picking_up"},
			80: {is_turnover: false, toggle_screen: false, needs_player_name: true, play_string: "is on the field"},
			81: {is_turnover: false, toggle_screen: false, needs_player_name: true, play_string: "is off the field"},
			91: {is_turnover: false, toggle_screen: false, needs_player_name: false, play_string: "Timeout", next_state: "picking_up"},
			92: {is_turnover: false, toggle_screen: true, needs_player_name: false, play_string: "Injury timeout", next_state: "picking_up"},
			94: {is_turnover: false, toggle_screen: true, needs_player_name: false, play_string: "End of period", next_state: "pulling"},
			98: {is_turnover: false, toggle_screen: false, needs_player_name: false, play_string: "Game over"},
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
			
			//Determine how pl_id should be used.
			var team_id = this.get("game").get("team_"+team_ix).id;
			if (_.has(state_meta,"next_player_as")){	
				this_event.set("player_"+state_meta["next_player_as"]+"_id",pl_id);
				this_event.set("player_"+state_meta["next_player_as"]+"_team_id",team_id);
			}
			
			//Setting the state for some states would have swapped possession.
			//Swap back (temporarily) because we will swap when processing the event.
			if (_.has(state_meta,"same_team") && state_meta["same_team"]){this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));}
			
			this.process_event(this_event);
		},
		
		process_event: function(this_event){
			//The disc is still currently in possession of the team that started with the disc.
			//Despite this, events where the second player is on the defending team already have
			//the correct player_id and team_id set for the event.
			
			var last_pl_id = this.get("player_in_possession_id");
			var last_team_ix = this.get("team_in_possession_ix");//team_ix is index of team that player is on. Might be NaN.
			var last_team_id = this.get("game").get("team_"+team_ix).id;
			var event_meta = this.events_meta[this_event.get("type")];
			
			if (_.has(event_meta,"last_player_as")){
				if (this_event.get("type")!=30){//TODO: Hack for unknown turn which has a team but not a player.
					this_event.set("player_"+event_meta["last_player_as"]+"_id",last_pl_id);
				}
				this_event.set("player_"+event_meta["last_player_as"]+"_team_id",last_team_id);
			}
			
			if (this_event.get("type")==91 || this_event.get("type")==92){//TODO: Hack for timeout, assuming possession team is calling team.
				this_event.set("int_1", last_team_id);
			}
			
			//save the event to the server.
			this.save_event(this_event, this);//TODO: DO I need to pass "this" ?
			
			//The event is done. Now set the game into the next state correctly.
			//TODO: Move the following to the save callback.
			this.set("team_in_possession_ix",event_meta["is_turnover"] ? 3-team_ix : team_ix);
			if (_.has(state_meta,"next_state")){
				this.set("current_state",state_meta["next_state"]);
				this.set("player_in_possession_id",state_meta["next_state"] == "receiving" ? pl_id : NaN);
			}
			if (event_meta["toggle_screen"]){
				$(".t_game").hide();
				$(".sub_team_1").show();
				$(".sub_team_2").hide();
			}
		},
		
		end_period: function(){
			//the End Period button should be disabled if we are in an injury_to... but I will check for the state anywyay.
			if (this.get("current_state")=="pulled" && !this.get("injury_to")) {
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
			this.save_event(this_event);
			this.set("is_over",true);
			this.save();//save the trackedgame.
			Backbone.history.navigate("games/"+this.get("game").id, true);
		},
		
		
		
		//When teamplayer is tapped on the roster page. Swaps from onfield to off and vice versa
		swap_player: function(model,collection,team_ix){
			var was_offfield = collection==this.get("offfield_"+team_ix);
			var team_id = this.get("game").get("team_"+team_ix).id;
			var pl_id = model.get("player_id");
			var new_model = model.clone();
			var this_event = this.create_event();
			var event_id = 80;
            var event_needs_saving = true;
			if (was_offfield) {
				//If onfield has < 7, add it, otherwise add it back to offield
				if (this.get("onfield_"+team_ix).length<7){
					this.get("onfield_"+team_ix).add(new_model);
				} else {
					this.get("offfield_"+team_ix).add(new_model);
                    event_needs_saving = false;
				}
			} else {
				event_id=event_id+1;
				this.get("offfield_"+team_ix).add(new_model);
			}
			if (this.get("injury_to")){event_id = event_id + 2;}
            if (event_needs_saving) {
                this_event.set({type: event_id, player_1_id: pl_id, player_1_team_id: team_id});
                this.save_event(this_event);
            }
		},
		
		save_event: function(event) {
			var trackedgame=this;
			event.save([], {
                success: function(model, response, xhr){//Not necessary to get rid of success callback because trackedgame is localStorage only.
					trackedgame.get("gameevents").add(model);//Add the event to the trackedgame.get("gameevents"). Will trigger a change in the play-by-play.
					trackedgame.save();//save the trackedgame.
				},
                error: function(originalModel, resp, options) {
                    //TODO: Do something with the error. Maybe log the error and retry again later?
                }
			});
		},
		
		substitution: function(){
			//TODO: Make this a rotating toggle button that is always visible.
			$(".t_game").hide();
			$(".sub_team_1").show();
			$(".sub_team_2").hide();
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
		
		undo: function(){
			var event_coll = this.get("gameevents");
			var event_rem = event_coll.pop();
			console.log("TODO: undo event type " + event_rem.get("type"));
			
			/*
			 * For most events, it is sufficient to delete the last event then
			 * set the game state according to the previous event.
			 */
			//Set the state to the new last_event's next_state
			
			/*
			 * Events that result in turnovers are more complicated.
			 */
			//if (this.events_meta[event_rem.type].is_turnover){}
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
                return;
            }
			
			var myLayout = app.router.useLayout("tracked_game");
			//var Team = require("modules/team");
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			var GameEvent = require("modules/gameevent");
			
			var trackedgame = new TrackedGame.Model({id: gameId});
			trackedgame.fetch(); //localStorage. localStorage requests are synchronous.
			
			//We want the child objects to be converted to the proper model types.
			var newGame = new Game.Model(trackedgame.get("game"));
			if (!trackedgame.get("game").id) {
                newGame.set(newGame.idAttribute,gameId); //Set idAttribute instead of id because of the way the 
                                                         //backbone-tastypie module interacts with the id attribute
			}
			trackedgame.set("game",newGame, {silent:true});
				
			for (var ix=1;ix<3;ix++) {
				trackedgame.set("onfield_"+ix, new TeamPlayer.Collection(trackedgame.get("onfield_"+ix)));//Made not-silent so models would be properly rendered.
				trackedgame.set("offfield_"+ix, new TeamPlayer.Collection(trackedgame.get("offfield_"+ix)));
			}
			
			trackedgame.set("gameevents",
				new GameEvent.Collection(trackedgame.get("gameevents"),{game_id: gameId}));
			
			//TODO: I need to move the success callback's methods to a separate function and call it with $when(trackedgame.get("game").then(get the onfield and offield)
			//We want the child objects to be fresh. This is easy for game (just fetch), but we can"t fetch onfield or offfield immediately because we need team_id, which isn"t available until after game has returned.
			trackedgame.get("game").fetch({success: function(model, response) {
				for(var ix=1;ix<3;ix++) {
					if (trackedgame.get("onfield_"+ix).length==0) {
						_.extend(trackedgame.get("onfield_"+ix),{team_id: model.get("team_"+ix+"_id")});
					} else {trackedgame.get("onfield_"+ix).fetch();}
					if (trackedgame.get("offfield_"+ix).length==0) {
						_.extend(trackedgame.get("offfield_"+ix),{team_id: model.get("team_"+ix+"_id")});
					}
					trackedgame.get("offfield_"+ix).fetch();
				}
				if (trackedgame.get("is_over")) {
					//var undo_over = confirm("You previously marked this game as over. Press OK to resume taking stats.");
					var undo_over = true;
					if (undo_over){
						var events = trackedgame.get("gameevents");
						var last_event = events.at(events.length-1);
						if (last_event.get("type")==98) {
							last_event.destroy({
								success: function(model, response, xhr){
									trackedgame.set("is_over",false);
									//trackedgame.save();
									//We could save the fact that we set is_over to false...
									//but the game will be saved as soon as ANY other button is pressed.
									//If the user unsets game over, then exists this screen without tapping anything
									//assume they didn"t want to unset game over.
								},
				                error: function(originalModel, resp, options) {
				                	if (resp.status == 410) {trackedgame.set("is_over",false);}
				                	else {//^ event is already deleted. Below could be anything.
				                		Backbone.history.navigate("games/"+trackedgame.get("game").id, true);
				                	}
				                }
			             	});
						}
					} else {
						Backbone.history.navigate("games/"+trackedgame.get("game").id, true);
					}
				}
				if (isNaN(trackedgame.get("period_number"))){//Game has not yet started. Set it up now.
					trackedgame.get("game").set("team_1_score",0);
					trackedgame.get("game").set("team_2_score",0);
					trackedgame.set("period_number", 1);
					//trackedgame.set_current_state("pulled");
					trackedgame.set("current_state","pulled",{silent: true});//Nothing is bound to change:pulled so I"m not sure why this is silent.
					trackedgame.start_period_pull();
				}
			}});
			
			//TODO: It would be nice if we could figure out the game state entirely from the events,
			//then we wouldn"t have to persist anything about trackedgame to localStorage.
			//This also makes undoing an event much easier (just delete the event and re-bootstrap)
			//I"ll work on that after WebSQL is implemented.
			//In the meantime assume that the saved state of the trackedgame is the most recent.
			
			myLayout.setViews({
				".sub_team_1": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:1}),//have to pass the full model so we get onfield and offfield
				".sub_team_2": new TrackedGame.Views.SubTeam({model: trackedgame, team_ix:2}),
				".t_game": new TrackedGame.Views.GameAction({model: trackedgame})
			});
		    var callback = trackedgame.setButtonHeight;
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render(function(el) {
				$("#main").html(el);
				$(".t_game").hide();
				$(".sub_team_1").hide();
				$(".sub_team_2").hide();
				if (trackedgame.get("current_state")=="pulled" || trackedgame.get("injury_to")){
					$(".sub_team_1").show();
				} else {
					$(".t_game").show();
				}
			}).then(function() {
                // Unbind any other bindings to the browser height
                $(window).unbind("resize"); //Is there a better way to do this besides binding globally?
                $(window).bind("resize", function() {
                    callback();
                });
                callback();
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
	 *   - player_area = PlayerArea
	 *     - player_area_1 = TeamPlayerArea
	 *       - many PlayerButton
	 *     - player_area_2 = TeamPlayerArea
	 *       - many PlayerButton
	 *   - action_area = ActionArea
	 */
  	
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
			return view.render().then(function() {this.model.setButtonHeight();});
		}
	});
	
	/*
	View for Scoreboard
	*/
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		initialize: function() {
			this.model.get("game").bind("change", function() {this.render();}, this);//To update scores or teams
			this.model.bind("change:player_in_possession_name", function() {this.show_previous_action();}, this);//To update the previous action
			this.model.bind("change:previous_state", function() {this.show_previous_action();}, this);//To update the previous action
			this.model.bind("change:team_in_possession_ix", function() {this.render();}, this);//To highlight team in possession
		},
		template: "trackedgame/scoreboard",
		serialize: function() {
			return this.model.toJSON();
		},
        show_previous_action: function(ev){
            // Use the current state to get a string for the previous action
            var player_name = this.model.get("player_in_possession_name");
            var previous_state = this.model.get("previous_state");
            if (_.include(this.model.previous_action_omit_player, previous_state)) {
                player_name = "";
            }
            var previous_action = this.model.previous_action_strings[previous_state]

            // Display the previous action 
            this.$(".last_action").html(player_name + " " +  previous_action);
        },
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
				".player_area_1": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get("onfield_1"), model: this.model.get("game").get("team_1"), tracked_game: this.model}),
				".player_area_2": new TrackedGame.Views.TeamPlayerArea({collection: this.model.get("onfield_2"), model: this.model.get("game").get("team_2"), tracked_game: this.model})
			});
			return view.render({
				player_prompt: this.model.player_prompt_strings[this.model.get("current_state")]
			}).then(function(el) {
				this.show_teamplayer();
			});
		},
		show_teamplayer: function () {
			this.$(".player_area_"+(3-this.model.get("team_in_possession_ix"))).hide();
			this.$(".player_area_"+this.model.get("team_in_possession_ix")).show();
		},
		events: {
			"click .button": "player_tap",
		},
		player_tap: function(ev){
            var button = $(ev.target).parents("button").andSelf();
            var player_id = parseInt(button.attr("id"));
            //var player_name = button.find(".player_name").html(); //TODO: player_name should be a player model's '
			this.model.player_tap(player_id);
		}
	});
	TrackedGame.Views.TeamPlayerArea = Backbone.View.extend({
		initialize: function() {
			//Specific players should only be added or removed on the substitution screen.
			//We don"t need to update our player buttons on each add or remove, not until the sub screen is done. That will trigger a reset.
			this.collection.bind("reset", function() {this.render().then(function(el) {this.options.tracked_game.setButtonHeight();})}, this);
			//TODO: Does setButtonHeight need to be part of tracked_game? Otherwise we don't need to pass that model as an option to this view.
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
		//TODO: Move player taps from parent view to this view. It was in parent before because we used game state directly.
		//That is no longer necessary.
	});
	
	
	/*
	View for action buttons. ActionArea> (should this be nested?)
	*/
	TrackedGame.Views.ActionArea = Backbone.View.extend({
		initialize: function() {			
			this.model.bind("change:player_in_possession_id", function() {this.render();}, this);
			this.model.bind("change:current_state", function() {this.render();}, this);//TODO: Disable some buttons depending on state.
			this.model.bind("change:showing_alternate", this.show_action_buttons, this);//Which buttons are we showing?
		},
		template: "trackedgame/action_area",
		events: {
			"click .undo": this.model.undo(),
			"click .misc": "toggle_action_buttons",
			"click .score": this.model.update_state("scoring"),
			"click .completion": this.model.update_state("receiving"),
			"click .dropped_pass": this.model.update_state("dropping"),
			"click .defd_pass": this.model.update_state("blocking"),
			"click .stall": this.model.update_state("stalling"),
			"click .throwaway": this.model.immediate_event(32),
			"click .unknown_turn": this.model.immediate_event(30),
			"click .timeout": this.model.immediate_event(91),
			"click .injury": this.model.immediate_event(92),
			//"click .end_of_period": this.model.end_of_period(),
			"click .substitution": this.model.substitution(),//TODO: Toggle screen visibility only.
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
		render: function(layout) {
			//TODO: Disable some buttons depending on this.model.get("current_state");
			var view = layout(this);
			return view.render().then(function(el) {
				this.show_action_buttons();
                this.show_player_name();
                this.model.setButtonHeight();
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
			this.model.get("offfield_"+this.options.team_ix).bind("reset", function(){this.render();}, this);
			this.model.bind("change:period_number", function(){this.render();}, this);
			//Tapping a player removes them from their collection
			//Removing them from their collection triggers a swap from their old collection to their new collection
			this.model.get("offfield_"+this.options.team_ix).bind("remove", this.swap_collection, this);
			this.model.get("onfield_"+this.options.team_ix).bind("remove", this.swap_collection, this);
			//There"s no reason to expect the game to change (i.e. score or team names) while doing a substitution.
		},
		events: {
			"click .sub_next": "sub_next",
			"click .sub_done": "sub_done",
			"click .end_period": "end_period",//TODO: The button should be disabled if we are in an injury_to or if !pulled
			"click .game_over": "game_over",
                        "click .roster_remove_all": "remove_all_onfield",
		},
		sub_next: function(ev){
			this.model.get("onfield_"+this.options.team_ix).trigger("reset");
			//I would prefer to tighten the scope on this but I"m not sure how to access
			//the other team"s class without searching the whole DOM.
			$(".sub_team_"+this.options.team_ix).hide();
			$(".sub_team_"+(3-this.options.team_ix)).show();
		},
		sub_done: function(ev){
			this.model.get("onfield_"+this.options.team_ix).trigger("reset");
			$(".sub_team_1").hide();
			$(".sub_team_2").hide();
			$(".t_game").show();
			this.model.trigger("change:showing_alternate");
			//^Hack to get the action buttons to show when a game is loaded but no one is subbed.
			this.model.set("injury_to",false);
		},
		end_period: function(ev) {this.model.end_period();},
		game_over: function(ev){this.model.game_over();},
		swap_collection: function(model, collection, options){
			this.model.swap_player(model,collection,this.options.team_ix);
		},
                remove_all_onfield: function(ev) {
                    var onfield = this.model.get("onfield_"+this.options.team_ix);
                    onfield.remove(onfield.models);
                    this.render();
                },
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.setViews({
				".sub_on_field_area": new TrackedGame.Views.RosterList({collection: this.model.get("onfield_"+this.options.team_ix), remove_all_button: true}),
				".sub_off_field_area": new TrackedGame.Views.RosterList({collection: this.model.get("offfield_"+this.options.team_ix)})
			});
			return view.render({ team: this.model.get("game").get("team_"+this.options.team_ix), per_num: this.model.get("period_number") });
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
			//This callback is being triggered twice for every press... I"m not sure why.
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
                        if (this.options.remove_all_button) {
                            view.insert(new TrackedGame.Views.RosterItemRemoveAll({}));
                        }
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
        TrackedGame.Views.RosterItemRemoveAll = Backbone.View.extend({
            template: "trackedgame/roster_item_remove_all",
            tagName: "li"
        });

	return TrackedGame;
});
