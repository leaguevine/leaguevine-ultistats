/*
 * Use a namespace to isolate the application instance
 * from the global namespace.
 * 
 * This is required by index.js
 * Then when index finishes loading all of its dependencies
 * namespace.app is called as lvus.app
 * 
 * Exposed are the method lvus.module and object lvus.app
 * 
 * Also within is a customization of LayoutManager
 */

define([
  // Libs
  "jquery",
  "use!underscore",
  "use!backbone",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],

function($, _, Backbone) {

  // Customize the LayoutManager
  // See more here: https://github.com/tbranyen/backbone.layoutmanager
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
  
  /* When namespace is required by a module, the following
   * can be accessed with namespace.module or namespace.app
   */
  return {
    // Create a custom object with a nested Views object
    module: function(additionalProps) {
      return _.extend({ Views: {} }, additionalProps);
    },

    // Keep active application instances namespaced under an app object.
    app: _.extend({}, Backbone.Events),
    /*
     * Remember that since we are using require.js to load this module,
     * throughout our app this module is only loaded once and its
     * public object namespace.app is shared between modules.
     */
  };

});
