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
	
	Season.Model = Backbone.RelationalModel.extend({
		//urlRoot: Leaguevine.API.root + "seasons",
		defaults: {
			name: '',
			start_date: '',
			end_date: ''
		},
		urlRoot: Leaguevine.API.root + "seasons"
	});
	
	Season.Collection = Backbone.Collection.extend({
		model: Season.Model,
		urlRoot: Leaguevine.API.root + "seasons"
	});
	
	Season.Router = Backbone.Router.extend({
		routes : {
			"seasons": "test"
		},
		test: function () {
			//app.seasons = new Season.Collection();
			//app.seasons.fetch();
			app.season = new Season.Model({id: Leaguevine.API.season_id});
		}
	});
	Season.router = new Season.Router();// INITIALIZE ROUTER
	
	return Season;// Required, return the module for AMD compliance
});
