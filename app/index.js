/*
 * Based on tbranyen's layout manager example.
 * https://github.com/tbranyen/layoutmanager-example
 * Which is itself based on his amd branch of backbone-boilerplate
 * https://github.com/tbranyen/backbone-boilerplate/tree/amd
 */

// Set the require.js configuration
require.config({

  deps: ["main"],// Initialize the application with the main application file
  
  paths: {
    // JavaScript folders
    libs: "../assets/js/libs",
    plugins: "../assets/js/plugins",

    // Libraries
    jquery: "../assets/js/libs/jquery",
    underscore: "../assets/js/libs/underscore",
    backbone: "../assets/js/libs/backbone",

    // Plugins
    use: "../assets/js/plugins/use"
  },

  use: {//a plugin needed to help backbone find underscore and jquery in order.
    backbone: {
      deps: ["use!underscore", "jquery"],
      attach: "Backbone"
    },

    underscore: {
      attach: "_"
    },
    
    "plugins/backbone.layoutmanager": {//a plugin which is a fancy extension of regular Backbone.View
      deps: ["use!backbone"]
    },

    "plugins/jquery.ba-throttle-debounce": {//throttling is used to limit a function execution even if it is called very very often.
      deps: ["jquery"]
    }
  }
});
// End require.js configuration