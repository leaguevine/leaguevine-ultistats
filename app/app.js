define([
  // Libs
  "jquery",
  "lodash",
  "backbone",
  
  // Plugins
  "plugins/backbone.layoutmanager",
  "plugins/backbone-tastypie",
  "plugins/localSettings"
  //"plugins/spinner"
],

function($, _, Backbone) {
  // Localize or create a new JavaScript Template object.
  var JST = window.JST = window.JST || {};
  
	Backbone.LayoutManager.configure({
	
		paths: {
			layout: "app/templates/layouts/",
			template: "app/templates/"
		},
		
		fetch: function(path) {
			path = path + ".html";
			
			if (!JST[path]) {
				$.ajax({ url: "/" + path, async: false }).then(function(contents) {
					JST[path] = _.template(contents);
				});
			} 

			return JST[path];
		},
		
		render: function(template, context) {
			return template(context);
		}
	
	});//end Backbone.LayoutManager.configure

	return {
		// Create a custom object with a nested Views object
		module: function(additionalProps) {
			return _.extend({ Views: {} }, additionalProps);
		},
		
		// Keep active application instances namespaced under an app object.
		app: _.extend({}, Backbone.Events)
	};
});