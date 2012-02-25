define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/navigation",
  "modules/game",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone, Navigation, Game) {
	var app = namespace.app;
	var Tournament = namespace.module();
	
	Tournament.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			name: '',
			leaguevine_url: '',
			start_date: '',
			end_date: '',
			info: ''
		},
		url: function() {
			return app.auth.api_root + "tournaments/" + this.id + "/?access_token=" + app.auth.d_token();
		}
	});
	
	Tournament.Collection = Backbone.Collection.extend({
		model: Tournament.Model,
		url: function() {// It is necessary to define the URL so that we can get the data from the API using .fetch
			//TODO: Eventually data will be stored locally, eventually Leaguevine will have too much data to get all, so we will have to use smarter limits and offsets.
			return app.auth.api_root + "tournaments/?season_id=" + app.auth.season + "&limit=200&access_token=" + app.auth.d_token();
		},
		parse: function(resp, xhr) {// Override the default parse so we can get at the list of tournaments from the API response
		  if (resp.objects) {
			return resp.objects;
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
		comparator: function(tournament) {// Define how items in the collection will be sorted.
		  return tournament.get("name").toLowerCase();
		}
	});
	
	Tournament.Router = Backbone.Router.extend({
		// Create a router to map faux-URLs to actions.
		// Faux-URLs come from Backbone.history.navigate or hashes in a URL from a followed link.
		routes : {
			"tournaments": "listTournaments", //List all tournaments.
			"tournaments/:tournamentId": "showTournament" //Show detail for one tournament.
		},
		listTournaments: function () {//Route for all tournaments.
			// Prepare the data.
			app.tournaments = new Tournament.Collection();
			app.tournaments.fetch(); //Fetch automatically pulls the active season from the app object.
			
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newtournament", name: "+"}));
			myLayout.view(".content", new Tournament.Views.List ({collection: app.tournaments}));//pass the List view a collection of (fetched) tournaments.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showTournament: function (tournamentId) {
			//Prepare the data.
			if (!app.tournaments) {app.tournaments = new Tournament.Collection();}//Will create an empty collection.
			if (!app.tournaments.get(tournamentId)) {app.tournaments.add( [{id: parseInt(tournamentId)}] );}//Insert this tournament into the collection.
			tournament = app.tournaments.get(tournamentId);
			tournament.fetch();
			//TODO: Get pools
			//TODO: Get brackets
			
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#edittournament/"+tournamentId, name: "Edit"}));
			myLayout.view(".detail", new Tournament.Views.Detail( {model: tournament}));//Pass an options object to the view containing our tournament.
			//Use a dynamic view that changes between pools/brackets/info
			//myLayout.view(".list_children", new Game.Views.List({ collection: tournament.games }))
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		}
	});
	Tournament.router = new Tournament.Router();// INITIALIZE ROUTER
	
	Tournament.Views.Nav = Backbone.View.extend({
		template: "navbar/navbar"
	});
	Tournament.Views.Item = Backbone.View.extend({
		template: "tournaments/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
	Tournament.Views.List = Backbone.LayoutManager.View.extend({
		template: "tournaments/list",
		className: "tournaments-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.collection.each(function(tournament) {//for each tournament in the collection.
				view.insert("ul", new Tournament.Views.Item({//Inserts the tournament into the ul in the list template.
					model: tournament//pass each tournament to a Item view instance.
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
	Tournament.Views.Detail = Backbone.LayoutManager.View.extend({  	
		template: "tournaments/detail",
		//We were passed a model on creation, so we have this.model
		render: function(layout) {
			//this.model.toJSON().info is escaped HTML so we need to do something a little fancy to get the info in there.
			return layout(this).render(this.model.toJSON());
		},
		initialize: function() {
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		}
	});
	
	return Tournament;// Required, return the module for AMD compliance
});
