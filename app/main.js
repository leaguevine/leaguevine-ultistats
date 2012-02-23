require(
	/*
	 * Load 'require'd javascript. Code loaded this way should not execute,
	 * simply define variables and functions.
	 */
	[
	"namespace",//needed for namepsace.module() and namespace.app = {}
    // Libs
    "jquery",
    "use!backbone",
    // Modules
    "modules/team", //Requiring Team includes its dependents (e.g., Player)
	"modules/tournament"
	],

/*
 * The following callback is called after the dependices are loaded.
 * The dependencies are passed to the callback in the order they are required.
 * The Require callback normally returns an object that defines the module,
 * but in this case we are defining the jQuery ready function which will execute
 * once everything has finished loading.
 */
function(namespace, jQuery, Backbone, Team, Tournament) {

	var app = namespace.app; //Shorthanded app instance.
	app.auth = {//Set the defaults for the auth object.
		//token:"f3273ddf6b",//hardcoded for debugging.
		api_root: "http://api.playwithlv.com/v1/",
		api_base: "http://playwithlv.com/oauth2/authorize/?response_type=token&scope=universal&",
		client_id: "5b830cb7c788b095c94732c8ca03cb",
		redirect_uri: "http://localhost:8000/",
		season: "20041",
		d_token: function() {//Modules will reference this dynamic token			
			if (this.token) {return this.token}//Return a token if we have it. Else go to the oauth2 login site.
			else {window.location = this.api_base + "&client_id=" + this.client_id + "&redirect_uri=" + this.redirect_uri}
			//this.whatever can be overwritten by localStorage
		}
	};
	
	/*
	 * Loading modules also instantiate their routers.
	 * There is also a top-level router here that matches ""
	 * TODO: "" matches index, index should execute settings or a scoreboard instead of teams.
	 */

	 // Defining the application router, you can attach sub routers here.
	var Router = Backbone.Router.extend({
		//Ask tbranyen why this is app.router.useLayout(name) instead of app.useLayout(name)
		//the context (this) is only used for storing currentLayout so theoretically this function
		//could go anywhere.
		useLayout: function(name) {// Super-simple layout swapping and reusing
			var currentLayout = this.currentLayout;
	        // If there is an existing layout and its the current one, return it.
	        if (currentLayout && currentLayout.options.template == name) { return currentLayout;}
	        // Create the new layout and set it as current.
	        this.currentLayout = new Backbone.LayoutManager({template: name});
	        return this.currentLayout;
	    },
		routes: {
			"": "index",
			"access_:hash": "token_received"
		},
		index: function () {Backbone.history.navigate('teams', true);}, // Only works if I have a route to match teams
		token_received: function(hash) {//route matched by oauth/:hash
			hash = hash.split("&"); //break the URL hash into its segments.
			_.each(hash, function(element){ //For each segment...
				var pair = element.split("="); //Get the key and value.
				var temp_obj = {};
				temp_obj[pair[0]]=pair[1]; //Put the key and value into a temp object.
				_.extend(app.auth,temp_obj); //Extend/overwrite our app.auth with the key/value of the temp object.
			});
			app.auth.last_update=new Date();
			localStorage.setItem('auth_object', JSON.stringify(app.auth));			
			Backbone.history.navigate('teams', true);//After the token has been updated, navigate to some index site.
		}
	});

  // Treat the jQuery ready function as the entry point to the application.
  // Inside this function, kick-off all initialization, everything up to this
  // point should be definitions.
  jQuery(function($) {
    // Define your master router on the application namespace
    app.router = new Router();
	var stored_auth = JSON.parse(localStorage.getItem('auth_object')); //Pull our token out of local storage if it exists.
	_.extend(app.auth,stored_auth); //Update our hard-coded auth object with what we pulled out of local storage.
    // Trigger the initial route and enable HTML5 History API support
    // Backbone.history.start({ pushState: true, root: '/~cboulay/lvus/'});
    Backbone.history.start({ pushState: false});
  });
  
  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router.  If the link has a data-bypass
  // attribute, bypass the delegation completely.
  $(document).on("click", "a:not([data-bypass])", function(evt) {
    // Get the anchor href and protcol
    var href = $(this).attr("href");
    var protocol = this.protocol + "//";

    // Ensure the protocol is not part of URL, meaning its relative.
    if (href && href.slice(0, protocol.length) !== protocol &&
        href.indexOf("javascript:") !== 0) {
      // Stop the default event to ensure the link will not cause a page
      // refresh.
      evt.preventDefault();

      // This uses the default router defined above, and not any routers
      // that may be placed in modules.  To have this work globally (at the
      // cost of losing all route events) you can change the following line
      // to: Backbone.history.navigate(href, true);
      app.router.navigate(href, true);
	  //TODO: If app.router.navigate is just a proxy for Backbone.history.navigate,
	  //then what does tbranyen mean by losing all route events?
    }
  });

});
