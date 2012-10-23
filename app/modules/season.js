define([
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine"
	
],
function(app, Backbone, Leaguevine) {
	
	var Season = app.module();
	
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
			var temp = _.clone(this.attributes);
			//delete temp.teams;
			return temp;
		}
	});
	
	Season.Collection = Backbone.Collection.extend({
		model: Season.Model,
		urlRoot: Leaguevine.API.root + "seasons"
	});
	
	return Season;// Required, return the module for AMD compliance
});
