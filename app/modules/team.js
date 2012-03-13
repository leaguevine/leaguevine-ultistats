define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/navigation",
  "modules/title",
  "modules/player",
  "modules/game",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
//Return the team module as an object or function.
//We return it as an object, see the bottom of this callback.
function(namespace, Backbone, Navigation, Title, Player, Game) {
	var app = namespace.app;
	var Team = namespace.module();
	//
	// MODEL
	//
	Team.Model = Backbone.Model.extend({// If you want to overshadow some model methods or default values then do so here.
		defaults: {// Include defaults for any attribute that will be rendered.
			name: "Team Name",
			leaguevine_url: "",
			info: "",
			has_possession: false,
			players: new Player.Collection(),
			games: new Game.Collection()
		},
		url: function() {//Our model URL does not conform to the default Collection.url + /this.id so we must define it here.
			var temp_url = app.api.root + "teams/";
			if (this.id) {temp_url = temp_url + this.id + "/";}
			return temp_url + "?access_token=" + app.api.d_token(); 
		}
	});
  
	//
	// COLLECTION
	//
	Team.Collection = Backbone.Collection.extend({
		model: Team.Model,
		url: function() {// It is necessary to define the URL so that we can get the data from the API using .fetch
			var temp_url = app.api.root + "teams/?";
			var url_options = "";
			url_options = url_options + "&season_id=" + app.api.season_id + "&limit=200" + "&access_token=" + app.api.d_token();
			return temp_url + url_options.substring(1);
		},
		parse: function(resp, xhr) {
		  if (resp.objects) {
			return resp.objects;//Return the array of objects.
		  }
		  return this.models;//If we didn't get valid data, return whatever we have for models
		},
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
			myLayout.view(".navbar", new Navigation.Views.Navbar({}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Teams", right_btn_href: "#newteam", right_btn_class: "add"}));
			myLayout.view(".content", new Team.Views.List ({collection: app.teams}));//pass the List view a collection of (fetched) teams.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showTeam: function (teamId) {
			//Prepare the data.
			if (!app.teams) {app.teams = new Team.Collection();}//In case we were navigated to directly, recreate the top-level data.
			if (!app.teams.get(teamId)) {app.teams.add( [{id: parseInt(teamId)}] );}
			team = app.teams.get(teamId);
			team.fetch();
			team.players = new Player.Collection([],{team: team});
			//_.extend(team.players, {team : team}); //? Can't remember what I was planning here.
			team.players.fetch();
			team.games = new Game.Collection([],{team: team});
			team.games.fetch();
			
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({}),
				".detail": new Team.Views.Detail( {model: team}),
				".list_children": new Team.Views.Multilist({ players: team.players, games: team.games}), 
                ".titlebar": new Title.Views.Titlebar({title: team.get("name"), left_btn_href:"#teams", left_btn_class: "back", left_btn_txt: "Teams", right_btn_href: "#editteam/"+teamId, right_btn_txt: "Edit"})
			});
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		editTeam: function (teamId) {			
			var myLayout = app.router.useLayout("nav_content");
			if (!app.teams) {app.teams = new Team.Collection();}//Will create an empty collection.
			//If we have teamId, then we are editing. If not, then we are creating a new team.
			if (teamId) { //make the edit team page
				if (!app.teams.get(teamId)) {app.teams.add( [{id: parseInt(teamId)}] );}//Insert this team into the collection.
				team = app.teams.get(teamId);
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
			this.collection.bind("reset", function() {this.render();}, this);
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
			this.setViews({
				".lgames": new Game.Views.List( {collection: this.options.games} ),
				".lplayers": new Player.Views.List( {collection: this.options.players} )
			});
			return view.render().then(function(el) {
				//I'd rather the render function only do this once, instead of everytime the data are reset
				//But it might turn out to be a non-issue.
				$('.lplayers').hide();
			});
		},
		initialize: function() {
			this.options.players.bind("reset", function() {this.render();}, this);
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
});
