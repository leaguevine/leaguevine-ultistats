define([
  // Libs
  "jquery",
  "lodash",
  "backbone",
  
  // Plugins
  "plugins/backbone.layoutmanager",
  "plugins/backbone-tastypie",
  "plugins/spinner"
],

function($, _, Backbone) {
  // Localize or create a new JavaScript Template object.
  var JST = window.JST = window.JST || {};
  
	Backbone.LayoutManager.configure({
		manage: true,
		paths: {
			layout: "app/templates/layouts/",
			template: "app/templates/"
		},
		fetch: function(path) {
			var done;
			path = path + ".html";
			// If the template has not been loaded yet, then load.
			if (!JST[path]) {
				done = this.async();
				$.ajax({ url: "/" + path, async: false }).then(function(contents) {
					JST[path] = _.template(contents);
				});
			} 
			return JST[path];
		}
	});//end Backbone.LayoutManager.configure

	// Mix Backbone.Events, modules, and layout management into the app object.
	return _.extend(app, {
		// Create a custom object with a nested Views object.
		module: function(additionalProps) {
			return _.extend({ Views: {} }, additionalProps);
		},
		
		// Helper for using layouts.
		useLayout: function(name, options) {
			// If already using this Layout, then don't re-inject into the DOM.
			if (this.layout && this.layout.options.template === name) {
				return this.layout;
			}
			
			// If a layout already exists, remove it from the DOM.
			if (this.layout) {
				this.layout.remove();
			}
			
			// Create a new Layout with options.
			var layout = new Backbone.Layout(_.extend({
				template: name,
				className: "layout " + name,
				id: "layout"
			}, options));
			
			// Insert into the DOM.
			$("#main").empty().append(layout.el);
			
			// Render the layout.
			layout.render();
			
			// Cache the refererence.
			this.layout = layout;
			
			// Return the reference, for chainability.
			return layout;
		}
	}, Backbone.Events);
});
