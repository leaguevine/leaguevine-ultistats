define([
	"require",
  "namespace",

  // Libs
  "use!backbone",
  
  // Modules
  "modules/navigation",
  "modules/teamplayer"
],
function(namespace, Backbone, Navigation) {
	var app = namespace.app;
	var Player = namespace.module();
	
	//
	// MODEL
	//
	Player.Model = Backbone.RelationalModel.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			age: "",
			birth_date: "",
			first_name: "",
			height: "",
			last_name: "",
			nickname: "",
			weight: "",
		}
	});
  
	//
	// COLLECTION
	//
	Player.Collection = Backbone.Collection.extend({
		model: Player.Model,
		comparator: function(player) {// Define how items in the collection will be sorted.
		  return player.get("last_name").toLowerCase();
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
			myLayout.view(".navbar", new Player.Views.Nav ());//TODO: Make the navbar more dynamic.
			myLayout.view(".content", new Player.Views.List ({collection: app.players}));//pass the List view a collection of (fetched) players.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showPlayer: function (playerId) {
			//Prepare the data.
			if (!app.players) {app.players = new Player.Collection();}//Will create an empty collection.
			if (!app.players.get(playerId)) {app.players.add( [{id: parseInt(playerId)}] );}//Insert this player into the collection.
			player = app.players.get(playerId);
			player.fetch();
			
			//TODO: Get some player stats.
			
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.view(".navbar", new Player.Views.Nav ());
			myLayout.view(".detail", new Player.Views.Detail( {model: player}));//Pass an options object to the view containing our player.
			//myLayout.view(".list_children", new Player.Views.List({ collection: player.players }))
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		}
	});
	Player.router = new Player.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
/*
 * With Backbone.LayoutManager, a View's default render: function(layout){return layout(this).render();}
 * We should override render for anything more complex (like iterating a collection).
 * The following is an example view with some defaults explained.
	Player.Views.AView = Backbone.View.extend({
		template: "path/to/template",//Must specify the path to the template.
		className: "some-class-name",//Each top-level View in our layout is always wrapped in a div. We can give it a class.
		tagName: "div",//By default inserts the contents of our templates into a div. Can use another type.
		serialize: function() {return this.model.toJSON();},//looked for by render()
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

	Player.Views.Nav = Backbone.View.extend({//TODO: More!
		template: "navbar/navbar"
	});
	Player.Views.Item = Backbone.View.extend({
		template: "players/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
	Player.Views.List = Backbone.LayoutManager.View.extend({
		template: "players/list",
		className: "players-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.collection.each(function(player) {//for each player in the collection.
				view.insert("ul", new Player.Views.Item({//Inserts the player into the ul in the list template.
					model: player//pass each player to a Item view instance.
				}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});
	Player.Views.Detail = Backbone.LayoutManager.View.extend({  	
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
	
	return Player;// Required, return the module for AMD compliance
});
