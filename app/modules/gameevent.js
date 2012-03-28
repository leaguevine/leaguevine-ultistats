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
			type: NaN,//Need to set a dict somewhere, probably in Leaguevine.API
			time: NaN,//YYYY-MM-DDTHH:MM:SS±hh:mm
			ordinal_number: NaN,//smaller is earlier
			game_id: NaN,
			player_1_id: NaN,
			player_2_id: NaN,
			player_3_id: NaN,
			player_1_team_id: NaN,
			player_2_team_id: NaN,
			player_3_team_id: NaN,
			int_1: NaN
		},
		urlRoot: Leaguevine.API.root + "events",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored
			var temp = _.clone(this.attributes);
			var keys = _.keys(temp);
			_.each(keys, function(key){
				if (!temp[key]) {this.unset(key);}
			}, this);
            date = new Date(); //The time now
            this.set('time', date.toJSON().substring(0, 19) + "+00:00"); //The current time in ISO Format
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
			this.$el.empty()
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
