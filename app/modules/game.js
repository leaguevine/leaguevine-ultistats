define([
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/team",
  "modules/player_per_game_stats",
  "modules/team_per_game_stats",
  
  // Plugins
  "plugins/backbone-tastypie"
],
function(require, app, Backbone, Leaguevine, Navigation, Team, PlayerPerGameStats, TeamPerGameStats) {
	
	var Game = app.module();
	
	Game.Model = Backbone.Tastypie.Model.extend({
		urlRoot: Leaguevine.API.root + "games/",
		defaults: {
			//id: "",
			season_id: null,
			//season: {},
			tournament_id: null,
			tournament: {},
			team_1_id: null,
			team_1_score: null,
			team_1: {name: ""},
			team_2_id: null,
			team_2_score: null,
			team_2: {name: ""},
			start_time: ""
			//pool, swiss_round, bracket
		},
		toJSON: function() {
			var game = _.clone(this.attributes);

            // Add a formatted start time 
            // TODO: Put this function in namespace?
            game.start_time_string = "";
            if (game.start_time !== "" ){ //parse the start time and make it human-readable
                var arr = game.start_time.split(/[\- :T]/);
                var start_time_utc = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4]); //Parse the ISOformat start time
                var tz_minutes_offset = new Date().getTimezoneOffset();//The offset in minutes from GMT/UTC
                var start_time = new Date(start_time_utc.getTime() + (tz_minutes_offset * 60 * 1000)); //Start time using user's system clock
                var minutes = start_time.getMinutes();
                if (minutes < 10) {minutes = "0" + minutes;} //Make the minutes field two digits
                game.start_time_string = start_time.getHours() + ":" + minutes + " " + start_time.toLocaleDateString();
            }
            
            game.team_1 = _.isFunction(this.get("team_1").get) ? this.get("team_1").toJSON() : this.get("team_1");
            game.team_2 = _.isFunction(this.get("team_2").get) ? this.get("team_2").toJSON() : this.get("team_2");
            game.tournament = (this.get("tournament")!==null && _.isFunction(this.get("tournament").get)) ? this.get("tournament").toJSON() : this.get("tournament");
            
            //delete game.tournament;
            //delete game.team_1;
            //delete game.team_2;

            return game;
		}
	});
	
	Game.Collection = Backbone.Tastypie.Collection.extend({
		model: Game.Model,
		urlRoot: Leaguevine.API.root + "games/",
		associations: [
			//the name of the association is the name of the passed-in option
			//within the association, the the type helps to determine how to structure the search string
			//and the search_filter is what string to add to the URL.
			{"name": "models", "type": "to_many", "search_filter": "game_ids"},
			{"name": "season_id", "type": "to_one", "search_filter": "season_id"},
			{"name": "tournament_id", "type": "to_one", "search_filter": "tournament_id"},
			{"name": "team_1_id", "type": "to_many", "search_filter": "team_ids"},
			{"name": "team_2_id", "type": "to_many", "search_filter": "team_ids"}
		],
		initialize: function(models, options) {
			if (options) {
				this.options = options;//Initialized with some search options
				/*if (options.season_id) {this.season_id = options.season_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
				if (options.team_1_id) {this.team_1_id = options.team_1_id;}
				if (options.team_2_id) {this.team_2_id = options.team_2_id;}*/
			}
		},
		comparator: function(game) {// Define how items in the collection will be sorted.
			return game.get("start_time");
		}		
	});
	
	Game.Router = Backbone.Router.extend({
		routes : {
			"games": "findGames", //List all games.
			"games/:gameId": "showGame", //Show detail for one game.
            "newgame/:teamId": "editGame"
     //                   "editgame/:gameId": "editGame"
		},
		findGames: function () {
			var myLayout = app.router.useLayout("main");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "game", level: "list"}),
				".content_1": new Game.Views.Find()
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		showGame: function (gameId) {
			//Prepare the data.
			var game = new Game.Model({id: gameId});
			
			game.fetch();

            var playerstats = new PlayerPerGameStats.Collection([],{game_ids: [gameId]});
            playerstats.fetch();

            var teamstats = new TeamPerGameStats.Collection([],{game_ids: [gameId]});
            teamstats.fetch();
			
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "/editgame/"+gameId, name: "Edit"}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "game", level: "show", model: game}),
				".content_1": new Game.Views.Detail( {model: game}),
				".content_2": new Game.Views.Multilist({
                    model: game, 
                    playerstats: playerstats,
                    teamstats: teamstats
                })
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
        editGame: function(teamId, gameId) {
			if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
                return;
            }
            
            var myLayout = app.router.useLayout("main");

            /*if (gameId) { //edit existing game

            }
            else*/ if (teamId) { //create new game
				var Team = require("modules/team");
				var this_team = new Team.Model({id: teamId});
				this_team.fetch();
				var placeholder_team = new Team.Model({name: "Select opponent from list below:"});
				var this_game = new Game.Model({team_1_id: teamId, team_1: this_team, team_2: placeholder_team});
				//this_game.fetch(); Game is not persisted yet so it cannot be fetched.
                var teams = new Team.Collection([],{season_id: Leaguevine.API.season_id});
                teams.fetch();
                myLayout.setView(".titlebar", new Navigation.Views.Titlebar({model_class: "game", level: "edit", model: this_game}));
                myLayout.setView(".content_1", new Game.Views.Edit({model: this_game, teams: teams}));
            }
            myLayout.setView(".navbar", new Navigation.Views.Navbar({}));
            //myLayout.render(function(el) {$("#main").html(el);});
            myLayout.render();
        }
	});
	Game.router = new Game.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Game.Views.Item = Backbone.LayoutView.extend({
		template: "games/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		data: function() {
			var game = this.model.toJSON();
			if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			return game;
		} //render looks for this to manipulate model before passing to the template.
	});
    Game.Views.Find = Backbone.View.extend({
        template: "games/find"
    });
	Game.Views.List = Backbone.LayoutView.extend({
		template: "games/list",
		className: "games-wrapper",
		initialize: function() {
			this.collection.bind("reset", this.render, this);
		},
		beforeRender: function() {
			this.collection.each(function(game) {//for each game in the collection.
				this.insertView("ul", new Game.Views.Item({//Inserts the game into the ul in the list template.
					model: game//pass each game to a Item view instance.
				}));
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
		},
		data: function (){
			return {count: this.collection.length};
		}
	});
	Game.Views.Detail = Backbone.LayoutView.extend({
		template: "games/detail",
		initialize: function() {
			this.model.on("change", this.render, this);
		},
		cleanup: function() {
			this.model.off(null, null, this);
		},
		data: function() {
            var game = this.model.toJSON();
            if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			if (this.model.get("tournament") !== null){
				game.tournament = _.isFunction(this.model.get("tournament").get) ? this.model.get("tournament").toJSON() : this.model.get("tournament");
			} else {game.tournament = {name: ""};}
			var track_mode = JSON.parse(localStorage.getItem("settings-Stats Entry:"));
			game.track = (track_mode && track_mode.value == "score only") ? "basic" : "track";
			return {game: game};
		},
        checkPermission: function() {
            // If the user is not logged in, redirect to login and disable the page transition
            /*if (!app.api.is_logged_in()) {
                app.api.login();
                return false;
            }*/
           return app.api.d_token();
         },
		events: {
			"click button.btrack_game": "checkPermission"
        }
	});
	Game.Views.Multilist = Backbone.LayoutView.extend({
		template: "games/multilist",
		initialize: function(){
			this.model.on("reset", this.render, this);
		},
		cleanup: function(){
			this.model.off(null, null, this);
		},
		events: {
			"click button.bteam_stats": "showTeamStats",
			"click button.bplayer_stats": "showPlayerStats"
		},
		showTeamStats: function(ev){
			$(".lplayer_stats").hide();
			$(".lteam_stats").show();
            $("button.bplayer_stats").removeClass("is_active");
            $("button.bteam_stats").addClass("is_active");
		},
		showPlayerStats: function(ev){
			$(".lteam_stats").hide();
			$(".lplayer_stats").show();
            $("button.bteam_stats").removeClass("is_active");
            $("button.bplayer_stats").addClass("is_active");
		},
		beforeRender: function() {
			this.setViews({
				".lplayer_stats": new PlayerPerGameStats.Views.BoxScore( {collection: this.options.playerstats, game: this.model } ),
				".lteam_stats": new TeamPerGameStats.Views.BoxScore( {collection: this.options.teamstats} )
			});
        }
	});
	
    Game.Views.Edit = Backbone.LayoutView.extend({
        template: "games/edit",
        beforeRender: function() {
            var Team = require("modules/team");
            this.setViews({
				".edit_area": new Game.Views.EditArea({model: this.model}),
                ".team_search_list": new Navigation.Views.SearchableList({
					collection: this.options.teams, CollectionClass: Team.Collection, ViewsListClass: Team.Views.List, right_btn_class: "",
                    right_btn_txt: "Create", right_btn_href: "/newteam", search_object_name: "team",
                    tap_method: function() {
						this.model.set("team_2",this.model);//check the context here.
                    }
                })
            });
        }
    });
	Game.Views.EditArea = Backbone.LayoutView.extend({
		initialize: function() {
			//We need to re-render whenever the game's team_1 or team_2 changes.
			this.model.get("team_1").on("change", this.render, this);
			this.model.get("team_2").on("change", this.render, this);
			this.model.on("change", this.render, this);
		},
		cleanup: function() {
			this.model.get("team_1").off(null, null, this);
			this.model.get("team_2").off(null, null, this);
			this.model.off(null, null, this);
		},
		template: "games/edit_area",
		events: {
			"click .save": "saveGame",
			"click .delete": "deleteGame"
		},
		saveGame: function(ev) {
			this.model.save(
				{
					start_time: $("#start_time").val()
				},
				{
                    success: function(model, status, xhr) {
                        Backbone.history.navigate("games/"+model.get("id"), true);
                    },
                    error: function() {
                        Backbone.history.navigate("teams", true);
                    }
				}
			);
		},
		deleteGame: function(ev) {},
		data: function() {
			var game = this.model.toJSON();
			if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			return game;
		}
	});
	return Game;// Required, return the module for AMD compliance
});
