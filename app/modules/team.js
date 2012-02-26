define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/navigation",
  "modules/player",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
//Return the team module as an object or function.
//We return it as an object, see the bottom of this callback.
function(namespace, Backbone, Navigation, Player) {
	/******************
	* MODULE TEMPLATE *
	*******************/
	// var app = namespace.app;
	// var Team = namespace.module(); //Team is a custom module object containing a nested Views object.
	// Team.Model = Backbone.Model.extend({ /* ... */ });
	// Team.Collection = Backbone.Collection.extend({ /* ... */ });
	// Team.Router = Backbone.Router.extend({ /* ... */ });
	// Team.router = new Team.Router(); //initialize this router.
	// Team.Views.Something = Backbone.View.extend({ /* ... */ }) or Backbone.LayoutManager.View.extend
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
			if (this.id) {return app.auth.api_root + "teams/" + this.id + "/?access_token=" + app.auth.d_token();}
			else {return app.auth.api_root + "teams/?access_token=" + app.auth.d_token();} //For a new team post request. 
			
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
			return app.auth.api_root + "teams/?season_id=" + app.auth.season + "&limit=200&access_token=" + app.auth.d_token();
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
			//_.extend(team.players, {team : team});
			team.players.fetch();
			
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#editteam/"+teamId, name: "Edit"}));
			myLayout.view(".detail", new Team.Views.Detail( {model: team}));//Pass an options object to the view containing our team.
			myLayout.view(".list_children", new Player.Views.List({ collection: team.players }))
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
				team = new Team.Model({season_id: app.auth.season});
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
/*
 * With Backbone.LayoutManager, a View's default render: function(layout){return layout(this).render();}
 * We should override render for anything more complex like variable fields in the view or iterating a collection.
 * If the View's template expects any JSON, then a JSON object must be passed as a parameter to .render()/
 * The following is an example view with some defaults explained.
	Team.Views.AView = Backbone.View.extend({
		template: "path/to/template",//Must specify the path to the template.
		className: "some-class-name",//Each top-level View in our layout is always wrapped in a div. We can give it a class.
		tagName: "div",//By default inserts the contents of our templates into a div. Can use another type.
		serialize: function() {return this.model.toJSON();},//looked for by render() if no argument is passed.
		render: function(layout) {return layout(this).render();},//Default render method.
		//render: function(layout) {return layout(this).render(this.model.toJSON());},//Combines the previous two lines, i.e., doesn't need serialize.
		initialize: function() { //It is necessary to bind a model's change to re-render the view because the model is fetched asynchronously.
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		},
		events: { click: "clickAction"}, //Bind this view's click to clickAction
		clickAction: function(ev){ //some click handling logic},//Handle the click.
	})
 */
	
	Team.Views.Item = Backbone.View.extend({
		template: "teams/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
	Team.Views.List = Backbone.View.extend({
		template: "teams/list",
		className: "teams-wrapper", //This seems to create a div no matter what we do so it doesn't really matter.
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
				this.render();
			}, this);
		}
	});
	Team.Views.Detail = Backbone.View.extend({  	
		template: "teams/detail",
		//We were passed a model on creation, so we have this.model
		render: function(layout) {//Do I need this here?
			return layout(this).render(this.model.toJSON());
			// The model might not yet be hydrated by the asynchronous fetch process
		},
		initialize: function() {
			// We might need to re-render after asynchronous fetch is complete.
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		}
	});
	Team.Views.Edit = Backbone.View.extend({
		template: "teams/edit",
		render: function(layout) {return layout(this).render(this.model.toJSON());},
		initialize: function() {
			// We might need to re-render after asynchronous fetch is complete.
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		},
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
					headers: { "Authorization": "bearer " + app.auth.d_token() }
					//error: function(){...} }//TODO: Add an error callback if not authorized.
				}
			);
			Backbone.history.navigate('teams', true);
			
		},
		deleteModel: function(ev) {
			this.model.destroy(
				{
					headers: { "Authorization": "bearer " + app.auth.d_token() },
					//error: function(model,respose){...}//TODO: Add an error callback to handle unauthorized delete requests.
				}
			);
			//TODO: .destroy is supposed to bubble up through the collection but it doesn't seem to be in this case.
			Backbone.history.navigate('teams', true);
		}
	})
	
	return Team;// Required, return the module for AMD compliance
});
