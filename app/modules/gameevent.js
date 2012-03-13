define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine"
],

function(require, namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var GameEvent = namespace.module();
	GameEvent.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			time: '',//YYYY-MM-DDTHH:MM:SS±hh:mm
			type: 0,//Need to set a dict somewhere, probably in Leaguevine.API
			ordinal_number: '',//smaller is earlier
			game: {},
			player_1: {},
			player_2: {},
			player_3: {}
		},
		urlRoot: Leaguevine.API.root + "events",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (events)
			return _.clone(this.attributes);
		}
	});
	GameEvent.Collection = Backbone.Collection.extend({
		model: GameEvent.Model,
		urlRoot: Leaguevine.API.root + "events",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += '/?'
			if (this.game_id) {
				url += 'game_ids=%5B' + this.game_id + '%5D&';
			}
			return url.substr(0,url.length-1);
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			//I don't know what these will look like yet.
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.game_id) {this.game_id = options.game_id;}
    		}
		},
		comparator: function(gameevent) {// Define how items in the collection will be sorted.
		  return gameevent.get("ordinal_number");
		}
	});
  
  	
	//
	// VIEWS
	//
	GameEvent.Views.Item = Backbone.View.extend({
		template: "events/item",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	GameEvent.Views.List = Backbone.View.extend({
		template: "events/list",
		className: "events-wrapper",
		render: function(layout) {
			var view = layout(this);
			this.collection.each(function(gameevent) {
				view.insert("ul", new Event.Views.Item({
					model: gameevent
				}));
			});
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {this.render();}, this);
		}
	});	
	
	return GameEvent;// Required, return the module for AMD compliance
});
