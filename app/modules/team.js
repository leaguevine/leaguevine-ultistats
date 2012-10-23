define([
  "app",

  // Libs
  "backbone",
  
  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/game",
  "modules/teamplayer",
  
  // Plugins
  "plugins/backbone-tastypie"
],

function(app, Backbone, Leaguevine, Navigation) {

	var Team = app.module();
	
	//
	// MODEL
	//
	Team.Model = Backbone.Tastypie.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			//id: "",//id is used as href in template so we need default.
			name: "",
			info: "",
			season: {},
			season_id: null,
			teamplayers: [],
			games: []
		},
		urlRoot: Leaguevine.API.root + "teams/",
		toJSON: function() {
			var temp = _.clone(this.attributes);
			//delete temp.teamplayers;
			//delete temp.games;
			//delete temp.season;
			return temp;
		},
		associations: {"season_id": "season"}
	});
  
	//
	// COLLECTION
	//
	Team.Collection = Backbone.Tastypie.Collection.extend({
		model: Team.Model,
		urlRoot: Leaguevine.API.root + "teams/",
		comparator: function(team) {// Define how items in the collection will be sorted.
			if (team.season && team.season.name) {return team.get("name").toLowerCase() + team.season.name.toLowerCase();}
            else {return team.get("name").toLowerCase();}
		},
		initialize: function(models, options) {
			if (options) {
				//When a collection/model is instantiated with a second argument
				//then that argument is passed in as options
				//However, some other functions check for the existence of certain options
				//but the parameter "options" itself might not exist, so the check results in an undefined error
				//i.e. this.options.var_name gives an error if this.options does not exist.
				//So instead we set our options to be higher-level parameters here and 
				//then check for the existence of these higher-level parameters.
				//i.e. this.var_name returns undefined but does not return an error if this model/collection was not instantiated with these options.
				//Note that this might also be true for views though thus far we seem to always instantiate them with their required options.
				this.season_id = options.season_id;
				this.name = options.name;
			}
		}
	});
	
	//
	// ROUTER
	//
	Team.Router = Backbone.Router.extend({
		// Create a router to map faux-URLs to actions.
		// Faux-URLs come from Backbone.history.navigate or hashes in a URL from a followed link.
		routes : {
			"teams": "listTeams", //List all teams.
			"teams/:teamId": "showTeam", //Show detail for one team.
			"newteam": "editTeam",
			"editteam/:teamId": "editTeam"
		},
		listTeams: function () {//Route for all teams.
			// Prepare the data.
			var teams = new Team.Collection([],{season_id: Leaguevine.API.season_id});
			//var teams = new Team.Collection();//No defaults?
			teams.fetch();

			//var Search = require("modules/search"); If that module is an argument to this module's function then it does not need to be required again.
			// Prepare the layout/view(s)
			var myLayout = app.useLayout("layouts/main");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "team", level: "list"}),
				".content_1": new Navigation.Views.SearchableList({
					collection: teams, 
					CollectionClass: Team.Collection, 
					ViewsListClass: Team.Views.List, 
					//right_btn_class: "", right_btn_txt: "Create", right_btn_href: "#newteam",
					search_object_name: "team"
				})
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		showTeam: function (teamId) {
			//Prepare the data.
			var team = new Team.Model({id: teamId});
			
            team.fetch();

			var TeamPlayer = require("modules/teamplayer");
			var teamplayers = new TeamPlayer.Collection([],{team_id: team.id});
			teamplayers.fetch();
			//team.set("teamplayers", teamplayers);
			
			var Game = require("modules/game");
			var games = new Game.Collection([],{team_1_id: team.id});
			games.fetch();
			//team.set("games", games);
			
			var myLayout = app.useLayout("layouts/main");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "team", level: "show", model: team}),
				".content_1": new Team.Views.Detail( {model: team}),
				".content_2": new Team.Views.Multilist({ teamplayers: teamplayers, games: games})
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		editTeam: function (teamId) {
			if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
                return;
            }
			//If we have teamId, then we are editing. If not, then we are creating a new team.
			var team = new Team.Model();
			if (teamId) { //make the edit team page
				team.id=teamId;
                team.fetch(); //Fetch this team instance
			}
			var myLayout = app.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "team", level: "edit", model: team}),
				".content_1": new Team.Views.Edit({model: team})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
		}
	});
	Team.router = new Team.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Team.Views.List = Backbone.View.extend({
		template: "teams/list",
		initialize: function() {
			this.collection.on("reset", this.render, this);
		},
		cleanup: function() {
			this.collection.off(null, null, this);
		},
		className: "teams-wrapper",
		data: function(){
			return {count: this.collection.length};
		},
		beforeRender: function(layout) {
			var filter_by = this.collection.name || "";
			var tap_method = this.options.tap_method;
			this.collection.each(function(team) {//for each team in the collection.
				//Do collection filtering here
				if (!filter_by || team.get("name").toLowerCase().indexOf(filter_by.toLowerCase()) != -1) {
					this.insertView("ul", new Team.Views.Item({//Inserts the team into the ul in the list template.
						model: team, //pass each team to a Item view instance.
                        tap_method: tap_method //passing on tap_method from caller
					}));
				}
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
		}
	});
	Team.Views.Item = Backbone.View.extend({
		template: "teams/item",
        events: {
            "click": "team_tap_method"
        },
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul by the list's render function.
		data: function() {
            // Add a couple attributes to the team for displaying
            var team = _.clone(this.model.attributes);
            team.season_name = "";
            team.league_name = "";
            if (team.season !== null && _.has(team.season,"name")) {
                team.season_name = team.season.name;
                team.league_name = team.season.league.name;
            }
			return team;
		}, //render looks for this to manipulate model before passing to the template.
        initialize: function() {
            if (this.options.tap_method) {
                this.team_tap_method = this.options.tap_method;
            }
            else {
                this.team_tap_method = function() {
                    Backbone.history.navigate("teams/"+this.model.get("id"), true);
                };
            }
        }
	});
	Team.Views.Detail = Backbone.View.extend({
		//We were passed a model on creation by Team.Router.showTeam(), so we have this.model
		template: "teams/detail",
		initialize: function() {
			this.model.on("change", this.render, this);
		},
		cleanup: function() {
			this.model.off(null, null, this);
		},
        events: {
            "click .bcreategame": "createGame"
        },
        createGame: function(ev) {
            Backbone.history.navigate("newgame/"+this.model.get("id"), true);
        },
		data: function() {
			return _.clone(this.model.attributes);
		}
	});
	Team.Views.Multilist = Backbone.View.extend({
		template: "teams/multilist",
		initialize: function() {
			this.options.teamplayers.on("reset", this.render, this);
		},
		cleanup: function() {
			this.options.teamplayers.off(null, null, this);
		},
		events: {
			"click .bplayers": "showPlayers",
			"click .bgames": "showGames"
		},
		showPlayers: function(ev){
			$(".lgames").hide();
			$(".lplayers").show();
            $("button.bgames").removeClass("is_active");
            $("button.bplayers").addClass("is_active");
		},
		showGames: function(ev){
			$(".lplayers").hide();
			$(".lgames").show();
            $("button.bplayers").removeClass("is_active");
            $("button.bgames").addClass("is_active");
		},
		beforeRender: function(){
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			this.setViews({
				".lgames": new Game.Views.List( {collection: this.options.games} ),
				".lplayers": new TeamPlayer.Views.PlayerList( {collection: this.options.teamplayers} )
			});
		},
		afterRender: function() {
			//I'd rather the render function only do this once, instead of everytime the data are reset
			//But it might turn out to be a non-issue.
			$(".lplayers").hide();
		}
	});
	Team.Views.Edit = Backbone.View.extend({
		initialize: function() {
			this.model.on("reset", this.render, this);
		},
		cleanup: function() {
			this.model.off(null, null, this);
		},
		template: "teams/edit",
		//data: function() {return {this.model};},
		events: {
			"click button.save": "saveModel",
			"click button.delete": "deleteModel"
		},
		saveModel: function(ev){
			this.model.save(
				{
					name:$("#name").val(),
					info:$("#info").val()
				},
				{
                    success: function(model, status, xhr) {
                        Backbone.history.navigate("teams/"+model.get("id"), true); //Redirect to the team detail page
                    },
                    error: function() {
                        //TODO: Handle the error by giving the user a message

                        // For now, just redirect
                        Backbone.history.navigate("teams", true);
                    }
				}
			);
            return false; //Disable the regular form submission
		},
		deleteModel: function(ev) {
			this.model.destroy(
				{
                    success: function() {
                        Backbone.history.navigate("teams", true);
                    },
                    error: function() {
                        //TODO: Handle the error by giving the user a message

                        // For now, just redirect
                        Backbone.history.navigate("teams", true);
                    }
				}
			);
            return false; //Disable the regular form submission
		}
	});
	return Team;// Required, return the module for AMD compliance
});