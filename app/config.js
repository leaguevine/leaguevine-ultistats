// Set the require.js configuration for your application.
require.config({
  // Initialize the application with the main application file
  deps: ["main"],

  paths: {
    // JavaScript folders
    libs: "../assets/js/libs",
    plugins: "../assets/js/plugins",

    // Libraries
    jquery: "../assets/js/libs/jquery",
    underscore: "../assets/js/libs/underscore",
    backbone: "../assets/js/libs/backbone",

    // Shim Plugin
    use: "../assets/js/plugins/use"
  },

  use: {
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