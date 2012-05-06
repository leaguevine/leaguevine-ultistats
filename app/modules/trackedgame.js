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
		create_event: function () {
			var GameEvent = require("modules/gameevent");
			var d = new Date();//"2011-12-19T15:28:46.493Z"
			var time = d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate() + "T" + d.getUTCHours() + ":" + d.getUTCMinutes() + ":" + d.getUTCSeconds();
			var gameid = this.get("game").id;
			return new GameEvent.Model({time: time, game_id: gameid});
		},
		save_event: function(event) {
			var trackedgame=this;
			event.save([], {
                success: function(model, response, xhr){
					trackedgame.get("gameevents").add(model);//Add the event to the trackedgame.get("gameevents"). Will trigger a change in the last play display.
					trackedgame.save();//save the trackedgame.
				},
                error: function(originalModel, resp, options) {
                    //TODO: Do something with the error. Maybe log the error and retry again later?
                }
			});
		},
        player_prompt_strings: { //Maps the current event state to a readable string
            received: "Completed pass to:",
            picked_up: "Who picked up?",
            pulled: "Who pulled?",
            marked: "Who was marking?",
            scored: "Who caught the goal?",
            dropped: "Who dropped the disc?",
            blocked: "Who got the D?",
        },
        previous_action_strings: { //Maps the current event state to a previous action
            blank: "",
            received: "caught a pass",
            picked_up: "picked up the disc",
            pulled: "pulled",
            marked: "got a marking D",
            scored: "threw a goal",
            dropped: "dropped the disc",
            blocked: "got a D",
            throwaway: "threw the disc away",
            unknown_turn: "turnover",
            timeout: "timeout",
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
        //The previous_action types that should not associate a player with them when being displayed
        previous_action_omit_player: ["blank", "unknown_turn", "timeout"], 
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
        set_current_state: function(current_state, previous_state) { 
            // This should get called every time an action happens on the field
            // Arguments:
            //      current_state - The state you are changing to.
            //      previous_state - (optional) The state you are coming from. If omitted, it defaults to 
            //                       what current_state previously was.
            //                       This should be one of the keys in "previous_action_strings"
            if (previous_state) {
                this.set("previous_state", previous_state);
            }
            else {
                this.set("previous_state",this.get("current_state"));
            }
            this.set("current_state",current_state);
        },
		player_tap: function(pl_id, pl_name){
			//pl_id is the tapped player. Might be NaN
            //pl_name is the text on the button of the tapped player.
            this.set("player_in_possession_name", pl_name);
			var this_event = this.create_event();
			var team_ix = this.get("team_in_possession_ix");
			var last_pl_id = this.get("player_in_possession_id");//last_player_id might be NaN
			//team_ix is index of team that player is on. Might be NaN.
			var team_id = this.get("game").get("team_"+team_ix).id;
			var other_team_id = this.get("game").get("team_"+(3-team_ix)).id;
			
			// The meaning of a player tap depends on the current state.
			// https://github.com/leaguevine/leaguevine-ultistats/issues/7
			switch (this.get("current_state")){//pickup, dropped, ded, scored, pulled, default
				case "picked_up"://pickup event(10) --> default
					this_event.set({type: 10, player_1_id: pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: pl_id});
					this.set_current_state("received");
					break;
				case "dropped"://Drop event --> turnover --> pickup
					this_event.set({type: 33, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set("team_in_possession_ix",3-team_ix);
					this.set({player_in_possession_id: NaN});
					this.set_current_state("picked_up");
					break;
				case "blocked"://D event --> pickup
					this_event.set({type: 34, player_1_id: last_pl_id, player_3_id: pl_id, player_1_team_id: other_team_id, player_3_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set_current_state("picked_up");
					break;
				case "scored"://score event --> pulled + substitution screen
					this_event.set({type: 22, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set_current_state("pulled");
					//Update score
					this.get("game").set("team_"+team_ix+"_score",this.get("game").get("team_"+team_ix+"_score")+1);
					$(".t_game").hide();
					$(".sub_team_1").show();
					$(".sub_team_2").hide();
					break;
				case "pulled"://pull event --> turnover --> pickup
					this_event.set({type: 1, player_1_id: pl_id, player_1_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
					this.set_current_state("picked_up");
					break;
				case "received":
					this_event.set({type: 21, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: pl_id});
					this.set_current_state("received"); //Call this method for consistency, ensuring all switch statements do this
					//neither team nor state change.
					break;
				case "marked"://stall event --> pickup
					this_event.set({type: 51, player_1_id: last_pl_id, player_2_id: pl_id, player_1_team_id: other_team_id, player_2_team_id: team_id});
					this.set({player_in_possession_id: NaN});
					this.set_current_state("picked_up");
					break;
				default://pass event.
			}
			//save the event to the server.
			this.save_event(this_event, this);//TODO: DO I need to pass "this" ?
		},
		//Score, Dropped pass, D"ed pass, stall all require a player tap which will handle the event creation.
		score: function(){
			this.set_current_state("scored");
		},
		completion: function(){
			this.set_current_state("received");
		},
		dropped_pass: function() {
			this.set_current_state("dropped");
		},
		defd_pass: function(){
			this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			this.set_current_state("blocked");
		},
		stall: function(){
			this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			this.set_current_state("marked");
		},
		//Untouched throwaway, unknown turn, injury, timeout are all events
		throwaway: function() {
			var this_event = this.create_event();
			var last_pl_id = this.get("player_in_possession_id");
			var team_id = this.get("game").get("team_"+this.get("team_in_possession_ix")).id;
			this_event.set({type: 32, player_1_id: last_pl_id, player_1_team_id: team_id});
			this.set({player_in_possession_id: NaN});
			this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			this.set_current_state("picked_up", "throwaway");
			this.save_event(this_event);
		},
		unknown_turn: function(){
			var this_event = this.create_event();
			var team_id = this.get("game").get("team_"+this.get("team_in_possession_ix")).id;
            //An unknown turnover does not require a player ID, as it is attributed to the team and not a player
			this_event.set({type: 30, player_1_team_id: team_id});
			this.set({player_in_possession_id: NaN});
			this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			this.set_current_state("picked_up", "unknown_turn");
			this.save_event(this_event);
		},
		injury: function(){
			$(".t_game").hide();
			$(".sub_team_1").show();
			$(".sub_team_2").hide();
			var this_event = this.create_event();
			var team_id = this.get("game").get("team_"+this.get("team_in_possession_ix")).id;
			this_event.set({type: 92, int_1: team_id});//TODO: This assumes the team calling timeout was the one in possession.
			this.save_event(this_event);
			this.set("injury_to",true);
		},
		timeout: function(){
			var this_event = this.create_event();
			var team_id = this.get("game").get("team_"+this.get("team_in_possession_ix")).id;
			this_event.set({type: 91, int_1: team_id});
                        this.set_current_state("picked_up", "timeout");
			this.save_event(this_event);
		},
		substitution: function(){
			$(".t_game").hide();
			$(".sub_team_1").show();
			$(".sub_team_2").hide();
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
		game_over: function(){
			var this_event = this.create_event();
			this_event.set({type: 98});
			this.save_event(this_event);
			this.set("is_over",true);
			this.save();//save the trackedgame.
			Backbone.history.navigate("games/"+this.get("game").id, true);
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
			return view.render({player_prompt: this.model.player_prompt_strings[this.model.get("current_state")]}).then(function(el) {
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
            var player_name = button.find(".player_name").html();
			this.model.player_tap(player_id, player_name);
		}
	});
	TrackedGame.Views.TeamPlayerArea = Backbone.View.extend({
		initialize: function() {
			//Specific players should only be added or removed on the substitution screen.
			//We don"t need to update our player buttons on each add or remove, not until the sub screen is done. That will trigger a reset.
			this.collection.bind("reset", function() {this.render().then(function(el) {this.options.tracked_game.setButtonHeight();})}, this);
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
		//then we"ll need access to the trackedgame object which is not easily available in this view.
		//Thus player taps will be handled by the parent view: TeamPlayerArea
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
			"click .undo": "undo",
			"click .misc": "toggle_action_buttons",
			"click .score": "score",
			"click .completion": "completion",
			"click .throwaway": "throwaway",
			"click .dropped_pass": "dropped_pass",
			"click .defd_pass": "defd_pass",
			"click .unknown_turn": "unknown_turn",
			"click .timeout": "timeout",
            "click .substitution": "substitution",
			//"click .end_of_period": "end_of_period",
			"click .injury": "injury",
			"click .stall": "stall"
		},
		undo: function(ev){
			console.log("TODO: undo after WebSQL")
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
		score: function(ev){this.model.score();},
		completion: function(ev){this.model.completion();},
		throwaway: function(ev){this.model.throwaway();},
		dropped_pass: function(ev){this.model.dropped_pass();},
		defd_pass: function(ev){this.model.defd_pass();},
		unknown_turn: function(ev){this.model.unknown_turn();},
		timeout: function(ev){this.model.timeout();},
		substitution: function(ev){this.model.substitution();},
		//end_of_period: function(ev){this.model.end_of_period();},
		injury: function(ev){this.model.injury();},
		stall: function(ev){this.model.stall();},
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
