define([
  // Application.
  "app"
],

function(app) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index"
    },

    index: function() {
    	Backbone.history.navigate('/teams', true); // Only works if I have a route to match teams
    }
  });

  return Router;

});
