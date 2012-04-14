define([
  // Libs
  "jquery",
  "use!underscore",
  "use!backbone",
  // Plugins
  "use!plugins/backbone.layoutmanager",
  "use!plugins/backbone-tastypie",
  //,"use!plugins/backbone-relational"
  "use!plugins/spinner"
],

function($, _, Backbone) {
    "use strict";
  
  Backbone.LayoutManager.configure({
	
	paths: {
      layout: "app/templates/layouts/",
      template: "app/templates/"
    },

    fetch: function(path) {//Fetch the template
      path = path + ".html";
      var done = this.async();
      var JST = window.JST = window.JST || {};
      // Should be an instant synchronous way of getting the template, if it
      // exists in the JST object.
      if (JST[path]) {
        return done(JST[path]);
      }
      // Fetch it asynchronously if not available from JST
      $.get(path, function(contents) {
        var tmpl = _.template(contents);
        JST[path] = tmpl;
        done(tmpl);
      });
    },

    render: function(template, context) {
      return template(context);
    }
    
  });//end Backbone.LayoutManager.configure

  return {
    // Create a custom object with a nested Views object and a blank Model
    module: function(additionalProps) {
		return _.extend({
			/*Model: Backbone.RelationalModel.extend(),*/
			Views: {}
		}, additionalProps);
    },

    // Keep active application instances namespaced under an app object.
    app: _.extend({}, Backbone.Events)
  };
});
