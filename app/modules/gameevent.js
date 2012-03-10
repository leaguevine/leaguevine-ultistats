define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/game",
  "modules/player",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
//Return the team module as an object or function.
//We return it as an object, see the bottom of this callback.
function(namespace, Backbone, Game, Player) {
	var app = namespace.app;
	var GameEvent = namespace.module();
	//
	// MODEL
	//
	GameEvent.Model = Backbone.Model.extend({// If you want to overshadow some model methods or default values then do so here.
		defaults: {// Include defaults for any attribute that will be rendered.
			type: 0,
			player_1: {},
			player_2: {},
			player_3: {}
		},
		url: function() {//Our model URL does not conform to the default Collection.url + /this.id so we must define it here.
			var temp_url = app.api.root + "events/";
			if (this.id) {temp_url = temp_url + this.id + "/";}
			return temp_url + "?access_token=" + app.api.d_token(); 
		}
	});
  
	//
	// COLLECTION
	//
	GameEvent.Collection = Backbone.Collection.extend({
		model: GameEvent.Model,
		url: function() {// It is necessary to define the URL so that we can get the data from the API using .fetch
			var temp_url = app.api.root + "events/?";
			var url_options = "";
			url_options = url_options + "&access_token=" + app.api.d_token();
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
	// VIEWS
	//
	GameEvent.Views.Item = Backbone.View.extend({
		template: "teams/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul by the list's render function.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
	GameEvent.Views.List = Backbone.View.extend({
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
	
	return GameEvent;// Required, return the module for AMD compliance
});
