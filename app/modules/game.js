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
  
  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine, Navigation, Team, PlayerPerGameStats, TeamPerGameStats) {
	
	var Game = app.module();
	
	Game.Model = Backbone.Model.extend({
		defaults: {
			//id: "",
			team_1_score: "",
			team_2_score: "",
			start_time: "",
			season: {},
			tournament: {},
			team_1: {name: ""},
			team_2: {name: ""}
			//pool, swiss_round, bracket
            
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("game"),
		urlRoot: Leaguevine.API.root + "games",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (gameevents)
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
            
            if (this.get("team_1") !== null && _.isFunction(this.get("team_1").get)) {game.team_1 = this.get("team_1").toJSON();}
            if (this.get("team_2") !== null && _.isFunction(this.get("team_2").get)) {game.team_2 = this.get("team_2").toJSON();}

            return game;
		}
	});
	
	Game.Collection = Backbone.Collection.extend({
		model: Game.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("game"),
		comparator: function(game) {// Define how items in the collection will be sorted.
			return game.get("start_time");
		},
		urlRoot: Leaguevine.API.root + "games",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if ( models && models.length ) {
				url += "game_ids=" + JSON.stringify(models.pluck("id")) + "&";
			}
			if (this.season_id) {
				url += "season_id=" + this.season_id + "&";
			}
			if (this.tournament_id) {
				url += "tournament_id=" + this.tournament_id + "&";
			}
			if (this.team_1_id || this.team_2_id) {
				url += "team_ids=%5B";
				if (this.team_1_id){url += this.team_1_id;}
				if (this.team_1_id && this.team_2_id){url += ",";}
				if (this.team_2_id){url += this.team_2_id;}
				url += "%5D&";
			}
			return url.substr(0,url.length-1);
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			var _this = this;
			//If we have criteria to filter by, reject resp objects that do not meet the criteria.
			if (this.team_1_id){resp = _.filter(resp, function(obj){
				return obj.team_1_id == _this.team_1_id || obj.team_2_id == _this.team_1_id;
			});}
			if (this.team_2_id){resp = _.filter(resp, function(obj){
				return obj.team_2_id == _this.team_2_id || obj.team_1_id == _this.team_2_id;
			});}
			if (this.tournament_id){resp = _.filter(resp, function(obj){
				return obj.tournament_id == _this.tournament_id;
			});}
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.season_id) {this.season_id = options.season_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
				if (options.team_1_id) {this.team_1_id = options.team_1_id;}
				if (options.team_2_id) {this.team_2_id = options.team_2_id;}
			}
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
				".navbar": new Navigation.Views.Navbar({href: "#editgame/"+gameId, name: "Edit"}),
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
	Game.Views.Item = Backbone.View.extend({
		template: "games/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
    Game.Views.Find = Backbone.View.extend({
        template: "games/find"
    });
	Game.Views.List = Backbone.View.extend({
		template: "games/list",
		className: "games-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(game) {//for each game in the collection.
				this.insertView("ul", new Game.Views.Item({//Inserts the game into the ul in the list template.
					model: game//pass each game to a Item view instance.
				}));
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	Game.Views.Detail = Backbone.View.extend({
		template: "games/detail",
		render: function(layout) {
            var game = this.model.toJSON();
			return layout(this).render(game);
		},
		initialize: function() {
			this.model.bind("change", function() {
				this.render();
			}, this);
		},
        checkPermission: function() {
            // If the user is not logged in, redirect to login and disable the page transition
            if (!app.api.is_logged_in()) {
                app.api.login();
                return false;
            }
         },
		events: {
			"click button.btrack_game": "checkPermission"
        }
	});
	Game.Views.Multilist = Backbone.View.extend({
		template: "games/multilist",
		events: {
			"click button.bteam_stats": "showTeamStats",
			"click button.bplayer_stats": "showPlayerStats"
		},
		showTeamStats: function(ev){
			$(".lplayer_stats").hide();
			$(".lteam_stats").show();
            $(".list_children button").removeClass("is_active");
            $("button.bteam_stats").addClass("is_active");
		},
		showPlayerStats: function(ev){
			$(".lteam_stats").hide();
			$(".lplayer_stats").show();
            $(".list_children button").removeClass("is_active");
            $("button.bplayer_stats").addClass("is_active");
		},
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".lplayer_stats": new PlayerPerGameStats.Views.BoxScore( {collection: this.options.playerstats, game: this.model } ),
				".lteam_stats": new TeamPerGameStats.Views.BoxScore( {collection: this.options.teamstats} )
			});
			return view.render();
        },
		initialize: function() {
			this.model.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	
    Game.Views.Edit = Backbone.View.extend({
        template: "games/edit",
        render: function(layout) {
            var view = layout(this);
            var edit_view = this;
            var Team = require("modules/team");
            this.setViews({
				".edit_area": new Game.Views.EditArea({model: this.model}),
                ".team_search_list": new Navigation.Views.SearchableList({
					collection: this.options.teams, CollectionClass: Team.Collection, ViewsListClass: Team.Views.List, right_btn_class: "",
                    right_btn_txt: "Create", right_btn_href: "#newteam", search_object_name: "team",
                    tap_method: function() {
						edit_view.model.set("team_2",this.model);//check the context here.
                    }
                })
            });
            return view.render();
        }
    });
	Game.Views.EditArea = Backbone.View.extend({
		initialize: function() {
			//We need to re-render whenever the game's team_1 or team_2 changes.
			this.model.get("team_1").bind("change", function() {this.render();},this);
			this.model.get("team_2").bind("change", function() {this.render();},this);
			this.model.bind("change", function() {this.render();}, this);
			
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
		serialize: function() {
			return this.model.toJSON();
		}
	});
	return Game;// Required, return the module for AMD compliance
});
