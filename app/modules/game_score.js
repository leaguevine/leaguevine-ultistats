define([
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  
  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine) {
	
	var GameScore = app.module();
	
	GameScore.Model = Backbone.Model.extend({
		defaults: {
			game_id: null,
			team_1_score: null,
			team_2_score: null
		},
		//sync: Backbone.WebSQLAjaxSync,
		//store: new Backbone.WebSQLStore("game_score"),
		associations: {
			"game_id": "game"
		},
		urlRoot: Leaguevine.API.root + "game_scores",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			return _.clone(this.attributes);
		}
	});
	return GameScore;// Required, return the module for AMD compliance
});
