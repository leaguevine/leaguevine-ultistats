define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine"
	
],
function(namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var Season = namespace.module();
	
	Season.Model = Backbone.Model.extend({
		defaults: {
			name: "",
			start_date: "",
			end_date: "",
			teams: {}//one-to-many
		},
		urlRoot: Leaguevine.API.root + "seasons",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			return _.clone(this.attributes);
		}
	});
	
	Season.Collection = Backbone.Collection.extend({
		model: Season.Model,
		urlRoot: Leaguevine.API.root + "seasons"
	});
	
	return Season;// Required, return the module for AMD compliance
});
