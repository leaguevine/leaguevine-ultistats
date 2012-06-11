define([
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
],

function(require, app, Backbone, Leaguevine) {
    
	var Stats = app.module();

	Stats.BaseModel = Backbone.Model.extend({
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			return _.clone(this.attributes);
		}
    });

    return Stats
});

