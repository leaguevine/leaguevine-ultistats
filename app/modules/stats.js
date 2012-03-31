define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
],

function(require, namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var Stats = namespace.module();

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

