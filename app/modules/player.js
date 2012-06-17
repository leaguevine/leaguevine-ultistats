define([
	"require",
  "app",

  // Libs
  "backbone",
  
  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/teamplayer",
  
  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine, Navigation) {
    
	var Player = app.module();
	
	//
	// MODEL
	//
	Player.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			//id: "", //Needed for template
			age: "",
			birth_date: "",
			first_name: "",
			height: "",
			last_name: "",
			nickname: "",
			weight: "",
			teamplayers: {}//used to get to teams
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("player"),
		urlRoot: Leaguevine.API.root + "players",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (templayers)
			return _.clone(this.attributes);
		}
	});
  
	//
	// COLLECTION
	//
	Player.Collection = Backbone.Collection.extend({
		model: Player.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("player"),
		comparator: function(player) {// Define how items in the collection will be sorted.
			return player.get("last_name").toLowerCase();
		},
		urlRoot: Leaguevine.API.root + "players",
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				this.season_id = options.season_id;
			}
		}
	});
  
	//
	// ROUTER
	//
	Player.Router = Backbone.Router.extend({
		// Create a router to map faux-URLs to actions.
		// Faux-URLs come from Backbone.history.navigate or hashes in a URL from a followed link.
		routes : {
			"players": "listPlayers", //List all players.
			"players/:playerId": "showPlayer" //Show detail for one player.
		},
		listPlayers: function () {//Route for all players.
			// Prepare the data.
			app.players = new Player.Collection();
			app.players.fetch();
			
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar());
            myLayout.view(".titlebar", new Navigation.Views.Titlebar({model_class: "player", level: "list"}));
			myLayout.view(".content", new Player.Views.List ({collection: app.players}));//pass the List view a collection of (fetched) players.
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		showPlayer: function (playerId) {
			//Prepare the data.
			var player = new Player.Model({id: playerId});

			player.fetch();
			
			var TeamPlayer = require("modules/teamplayer");
			var teamplayers = new TeamPlayer.Collection([],{player_id: player.get("id")});
			teamplayers.fetch();
			//player.set("teamplayers", teamplayers);
			
			//TODO: Get some player stats and add them to Multilist
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#editplayer/"+playerId, name: "Edit"}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "player", level: "show", model: player}),
				".detail": new Player.Views.Detail( {model: player}),
				".list_children": new Player.Views.Multilist({ teamplayers: teamplayers})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
		}
	});
	Player.router = new Player.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Player.Views.Item = Backbone.View.extend({
		template: "players/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {
            var player = this.model.toJSON();
            player.number = ''; //Set the player's number to be blank because numbers are specific to a player's team
            return player;
        } //render looks for this to manipulate model before passing to the template.
	});
	Player.Views.List = Backbone.View.extend({
		template: "players/list",
		className: "players-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.collection.each(function(player) {//for each player in the collection.
				this.insertView("ul", new Player.Views.Item({//Inserts the player into the ul in the list template.
					model: player//pass each player to a Item view instance.
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
	Player.Views.Detail = Backbone.View.extend({
		template: "players/detail",
		//We were passed a model on creation, so we have this.model
		render: function(layout) {
			// The model has not yet been filled by the fetch process if it was fetched just now
			// We need to update the view once the data have changed.
			return layout(this).render(this.model.toJSON());
		},
		initialize: function() {
			this.model.bind("change", function() {
				this.render();
			}, this);
		}
	});
	Player.Views.Multilist = Backbone.View.extend({
		template: "players/multilist",
		events: {
			"click .bteams": "showTeams"
		},
		showTeams: function(ev){
			$(".lteams").show();
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var TeamPlayer = require("modules/teamplayer");
			this.setViews({
				".lteams": new TeamPlayer.Views.TeamList( {collection: this.options.teamplayers} )
			});
			return view.render();
		},
		initialize: function() {
			this.options.teamplayers.bind("reset", function() {this.render();}, this);
		}
	});
	return Player;// Required, return the module for AMD compliance
});
