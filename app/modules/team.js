define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/title",
  "modules/teamplayer",
  "modules/game"
],

function(require, namespace, Backbone, Leaguevine, Navigation, Title) {
	var app = namespace.app;
	var Team = namespace.module();
	
	//
	// MODEL
	//
	Team.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			id: "",//id is used as href in template so we need default.
			name: "",
			info: "",
			season: {},
			teamplayers: {},
			games: {}
		},
		urlRoot: Leaguevine.API.root + "teams",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (teamplayers, games)
			return _.clone(this.attributes);
		}
	});
  
	//
	// COLLECTION
	//
	Team.Collection = Backbone.Collection.extend({
		model: Team.Model,
		urlRoot: Leaguevine.API.root + "teams",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += '/?'
			if ( models && models.length ) {
				url += 'team_ids=' + JSON.stringify(models.pluck('id')) + '&';
			}
            if (this.name) {
                url += 'name=' + this.name + '&';
            }
			if (this.season_id) {
				url += 'season_id=' + this.season_id + '&';
			}
			url += 'limit=30';
			return url;
		},
		comparator: function(team) {// Define how items in the collection will be sorted.
            return team.get("name").toLowerCase();
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
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
			app.teams = new Team.Collection([],{season_id: Leaguevine.API.season_id});
			app.teams.fetch();
			
			// Prepare the layout/view(s)
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar({}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Teams", right_btn_href: "#newteam", right_btn_class: "add"}));
			myLayout.view(".content", new Team.Views.SearchableList({collection: app.teams}));//pass the List view a collection of (fetched) teams.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showTeam: function (teamId) {
			//Prepare the data.
			team = new Team.Model({id: teamId});
			
            titlebarOptions = {title: team.get("name"), left_btn_href:"#teams", left_btn_class: "back", left_btn_txt: "Teams", right_btn_href: "#editteam/"+teamId, right_btn_txt: "Edit"};

            team.fetch({success: function (model, response) {
                // After the team has been fetched, render the nav-bar with the team's fetched name
                var myLayout = app.router.useLayout("div");
                titlebarOptions.title = team.get("name");
                myLayout.view("div", new Title.Views.Titlebar(titlebarOptions));
                myLayout.render(function(el) {$(".titlebar").html(el)});
                }
            });

			var TeamPlayer = require("modules/teamplayer");
			teamplayers = new TeamPlayer.Collection([],{team_id: team.get('id')});
			teamplayers.fetch();
			//team.set('teamplayers', teamplayers);
			
			var Game = require("modules/game");
			games = new Game.Collection([],{team_1_id: team.get('id')});
			games.fetch();
			//team.set('games', games);
			
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({}),
				".detail": new Team.Views.Detail( {model: team}),
				".list_children": new Team.Views.Multilist({ teamplayers: teamplayers, games: games}), 
                ".titlebar": new Title.Views.Titlebar(titlebarOptions)
			});
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		editTeam: function (teamId) {			
			var myLayout = app.router.useLayout("nav_content");
			if (!app.teams) {app.teams = new Team.Collection();}//Will create an empty collection.
			//If we have teamId, then we are editing. If not, then we are creating a new team.
			if (teamId) { //make the edit team page
				team = new Team.Model({id: teamId});
				team.fetch();
				myLayout.view(".navbar", new Navigation.Views.Navbar({}));
                myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Edit", left_btn_href: "#teams/"+teamId, left_btn_class: "back", left_btn_txt: "Cancel"}));
			}
			else { //make the add team page
				team = new Team.Model({season_id: app.api.season_id});
				myLayout.view(".navbar", new Navigation.Views.Navbar({}));
                myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Add a Team", left_btn_href: "#teams", left_btn_class: "back", left_btn_txt: "Cancel"}));
			}
			myLayout.view(".content", new Team.Views.Edit({model: team}));
			myLayout.render(function(el) {$("#main").html(el);});
		}
	});
	Team.router = new Team.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	Team.Views.Item = Backbone.View.extend({
		template: "teams/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul by the list's render function.
		serialize: function() {
            // Add a couple attributes to the team for displaying
            team = this.model.toJSON();
            team.season_name = '';
            team.league_name = '';
            if (team.season != null) {
                team.season_name = team.season.name;
                team.league_name = team.season.league.name;
            }
            return team
        } //render looks for this to manipulate model before passing to the template.
	});
	Team.Views.List = Backbone.View.extend({
		template: "teams/list",
		className: "teams-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.collection.each(function(team) {//for each team in the collection.
				view.insert("ul", new Team.Views.Item({//Inserts the team into the ul in the list template.
					model: team//pass each team to a Item view instance.
				}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() { 
                if (Backbone.history.fragment == "teams") {
                    this.render();
                }
            }, this);
		}
	});	
    Team.Views.SearchableList = Backbone.View.extend({
        template: "teams/searchable_list",
        events: {
            "keyup #team_search": "filterTeams"
        },
        filterTeams: function(ev){//If a user types something into the search box, filter on the string
            var search_string = ev.currentTarget.value;
			teams = new Team.Collection([],{name: search_string});
			teams.fetch();
            teams.fetch({success: function (model, response) {
                app.teams.reset(model.models);
                }
            });
        },
		render: function(layout) {
            var view = layout(this); //Get this view from the layout.
			this.setViews({
				".team_list_area": new Team.Views.List( {collection: this.collection} ),
			});
			return view.render().then(function(el) {
				$('.team_list_area').html(el);
			});
        }
    });
	Team.Views.Detail = Backbone.View.extend({
		//We were passed a model on creation by Team.Router.showTeam(), so we have this.model  	
		template: "teams/detail",
		serialize: function() {return this.model.toJSON();},
		initialize: function() {this.model.bind("change", function() {this.render();}, this);}
	});
	Team.Views.Multilist = Backbone.View.extend({
		template: "teams/multilist",
		events: {
			"click .bplayers": "showPlayers",
			"click .bgames": "showGames"
		},
		showPlayers: function(ev){
			$('.lgames').hide();
			$('.lplayers').show();
            $('.list_children button').removeClass('is_active');
            $('button.bplayers').addClass('is_active');
		},
		showGames: function(ev){
			$('.lplayers').hide();
			$('.lgames').show();
            $('.list_children button').removeClass('is_active');
            $('button.bgames').addClass('is_active');
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			this.setViews({
				".lgames": new Game.Views.List( {collection: this.options.games} ),
				".lplayers": new TeamPlayer.Views.PlayerList( {collection: this.options.teamplayers} )
			});
			return view.render().then(function(el) {
				//I'd rather the render function only do this once, instead of everytime the data are reset
				//But it might turn out to be a non-issue.
				$('.lplayers').hide();
			});
		},
		initialize: function() {
			this.options.teamplayers.bind("reset", function() {this.render();}, this);
			this.options.games.bind("reset", function() {this.render();}, this);
		}
	});
	Team.Views.Edit = Backbone.View.extend({
		template: "teams/edit",
		render: function(layout) {return layout(this).render(this.model.toJSON());},
		initialize: function() {this.model.bind("change", function() {this.render();}, this);},
  		events: {
			"click .save": "saveModel",
			"click .delete": "deleteModel"
		},
		saveModel: function(ev){
			app.teams.add(this.model);
			this.model.save(
				{
					name:$("#name").val(),
					info:$("#info").val()
				},
				{
					headers: { "Authorization": "bearer " + app.api.d_token() }
					//error: function(){...} }//TODO: Add an error callback if not authorized.
				}
			);
			Backbone.history.navigate('teams', true);
			
		},
		deleteModel: function(ev) {
			this.model.destroy(
				{
					headers: { "Authorization": "bearer " + app.api.d_token() },
					//error: function(model,respose){...}//TODO: Add an error callback to handle unauthorized delete requests.
				}
			);
			//TODO: .destroy is supposed to bubble up through the collection but it doesn't seem to be in this case.
			Backbone.history.navigate('teams', true);
		}
	});
	
	return Team;// Required, return the module for AMD compliance
	//exports.Team = Team;
});
