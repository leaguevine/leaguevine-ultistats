define([
  // Application.
  "app",
  
  // Module-specific routers
  "modules/team"
],

function(app) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index",
		"access_:hash": "token_received",
		"error_description:hash": "login_error"
    },

    index: function() {
    	Backbone.history.navigate('/teams', true); // Only works if I have a route to match teams
    },
    
    token_received: function(hash) {//route matched by access_:hash
		hash = hash.split("&"); //break the URL hash into its segments.
		_.each(hash, function(element){ //For each segment...
			var pair = element.split("="); //Get the key and value.
			var temp_obj = {};
			temp_obj[pair[0]]=pair[1]; //Put the key and value into a temp object.
			_.extend(API,temp_obj); //Extend/overwrite our app.api with the key/value of the temp object.
		});
		
		//After token is received, navigate to the href that was saved earlier
		localStorage.setItem("auth_object", JSON.stringify(API));
		//window.location.href = "#" + localStorage.getItem("login_redirect");
		window.location.href = localStorage.getItem("login_redirect");
		return false;
	},
	login_error: function(hash) {
		Backbone.history.navigate("settings", true); //Redirect to the settings page where there is a prompt to log in again
	}
  });

  return Router;

});