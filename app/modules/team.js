define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/navigation",
  "modules/player",
  "modules/game",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
//Return the team module as an object or function.
//We return it as an object, see the bottom of this callback.
function(namespace, Backbone, Navigation, Player, Game) {
	var app = namespace.app;
	var Team = namespace.module();
	//
	// MODEL
	//
	Team.Model = Backbone.Model.extend({// If you want to overshadow some model methods or default values then do so here.
		defaults: {// Include defaults for any attribute that will be rendered.
			name: "Team Name",
			leaguevine_url: "",
			info: ""
		},
		url: function() {//Our model URL does not conform to the default Collection.url + /this.id so we must define it here.
			if (this.id) {return app.api.root + "teams/" + this.id + "/?access_token=" + app.api.d_token();}
			else {return app.api.root + "teams/?access_token=" + app.api.d_token();} //For a new team post request. 
			
		}/*,
		parse: function(resp, xhr) {//Here for debugging.
			return resp; //Default behaviour.
		}*//*,
		validate: function(attrs) {//Here for debugging. Lets us check the attributes.
			//Check the attrs.
			//console.log(attrs)
		}*/
	});
  
	//
	// COLLECTION
	//
	Team.Collection = Backbone.Collection.extend({
		model: Team.Model,
		url: function() {// It is necessary to define the URL so that we can get the data from the API using .fetch
			return app.api.root + "teams/?season_id=" + app.api.season_id + "&limit=200&access_token=" + app.api.d_token();
		},
		parse: function(resp, xhr) {// Override the default parse so we can get at the list of teams from the API response
		//The Leaguevine API gives resp = {meta: Object, objects: [90 objects]}; We don't want meta.
		//Each of objects is a JSON object with {id: some_id, info: "", leaguvine_url: "...", name: "team name", etc}
		  if (resp.objects) {// Safety check ensuring only valid data is used
			return resp.objects;//Return the array of objects.
		  }
		  return this.models;//If we didn't get valid data, return whatever we have for models
		},
		/*initialize: function(models, options) {//initialize is an empty function by default.
			//That's surprising because the docs suggest it should be possible to pass it models and options. 
			//Here we implement initialize to accept models and options.
		  if (models) {
			this.models = models;
		  }
		  if (options) {
			this.season = options.season;
		  }
		},*/
		comparator: function(team) {// Define how items in the collection will be sorted.
		  return team.get("name").toLowerCase();
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
			// TODO: Eventually we will use a local storage so fetching will get from a local db
			// instead of an API. For now, get from the API every time (very slow).
			app.teams = new Team.Collection();
			app.teams.fetch(); //Fetch automatically pulls the active season from the app object.
			
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newteam", name: "New"}));
			myLayout.view(".content", new Team.Views.List ({collection: app.teams}));//pass the List view a collection of (fetched) teams.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showTeam: function (teamId) {
			//Prepare the data.
			if (!app.teams) {app.teams = new Team.Collection();}//Will create an empty collection.
			if (!app.teams.get(teamId)) {app.teams.add( [{id: parseInt(teamId)}] );}//Insert this team into the collection.
			team = app.teams.get(teamId);
			team.fetch();
			team.players = new Player.Collection([],{team: team});
			//_.extend(team.players, {team : team}); //? Can't remember what I was planning here.
			team.players.fetch();
			team.games = new Game.Collection([],{team: team});
			team.games.fetch();
			
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#editteam/"+teamId, name: "Edit"}),
				".detail": new Team.Views.Detail( {model: team}),
				".list_children": new Team.Views.Multilist({ players: team.players, games: team.games})					
			});
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		editTeam: function (teamId) {			
			var myLayout = app.router.useLayout("nav_content");
			if (!app.teams) {app.teams = new Team.Collection();}//Will create an empty collection.
			//If we have teamId, then we are editing. If not, then we are creating a new team.
			if (teamId) {
				if (!app.teams.get(teamId)) {app.teams.add( [{id: parseInt(teamId)}] );}//Insert this team into the collection.
				team = app.teams.get(teamId);
				team.fetch();
				myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#teams/"+teamId, name: "Cancel"}));
			}
			else {
				team = new Team.Model({season_id: app.api.season_id});
				myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#teams", name: "Cancel"}));
			}
			myLayout.view(".content", new Team.Views.Edit({model: team}));
			myLayout.render(function(el) {$("#main").html(el);});
		}
	});
	Team.router = new Team.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	// Some of these views are very generic and would work across modules untouched with the exception of the template and maybe the className.
	// TODO: (maybe) put generic views in a generic module. Allow the views to be initialized with template and classname.
	Team.Views.Item = Backbone.View.extend({
		template: "teams/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul by the list's render function.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
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
			this.collection.bind("reset", function() {this.render();}, this);//This one is necessary
			this.collection.bind("change", function() {this.render();}, this);//Testing using others to try and find a bug
			this.collection.bind("sync", function() {this.render();}, this);//Where the list does not reflect newly added or newly deleted
			this.collection.bind("all", function() {this.render();}, this);//teams, though this might be due to the slow API
			this.collection.bind("add", function() {this.render();}, this);//and won't be a problem when we switch to local storage.
		}
	});	
	Team.Views.Detail = Backbone.View.extend({
		//We were passed a model on creation by Team.Router.showTeam(), so we have this.model  	
		template: "teams/detail",
		//I don't really need the render function, instead I can use a serialize function.
		render: function(layout) {return layout(this).render(this.model.toJSON());},
		// The model might not yet be hydrated by the asynchronous fetch process on the first render, so bind
		//to the change action so that we can rerender when the fetch process is complete.
		initialize: function() {this.model.bind("change", function() {this.render();}, this);}
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
	Team.Views.Multilist = Backbone.View.extend({
		template: "teams/multilist",
		events: {
			"click .button_players": "showPlayers",
			"click .button_games": "showGames"
		},
		showPlayers: function(ev){console.log("Show players")},//TODO: Use jquery to show .players and hide .games
		showGames: function(ev){console.log("Show games")},//TODO: Use jquery to show .games and hide .players
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			view.insert(".lists", new Player.Views.List( {collection: this.options.players} ));
			view.insert(".lists", new Game.Views.List( {collection: this.options.games} ));
			return view.render();
		},
		initialize: function() {
			this.options.players.bind("reset", function() {this.render();}, this);
			this.options.games.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Team;// Required, return the module for AMD compliance
});
