require([
	"namespace",

	// Libs
	"jquery",
	"use!backbone",//depends on underscore so _ is loaded too

	// Modules - Only need Leaguevine and modules with Routers
	"modules/leaguevine",
	"modules/settings",
	"modules/team",
	"modules/tournament",
	"modules/trackedgame",
],
/*
 * The following callback is called after the dependices are loaded.
 * The dependencies are passed to the callback in the order they are required.
 * The Require callback normally returns an object that defines the module,
 * but in this case we are defining the jQuery ready function which will execute
 * once everything has finished loading.
 */
function(namespace, $, Backbone, Leaguevine) {
	
	var app = namespace.app; //Shorthanded app namespace.

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
		},
		
		index: function () {
			Backbone.history.navigate('teams', true); // Only works if I have a route to match teams
		}
	});	

	// Treat the jQuery ready function as the entry point to the application.
	// Inside this function, kick-off all initialization, everything up to this
	// point should be definitions.
	$(function() {
		// Define your master router on the application namespace and trigger all
		// navigation from this instance.
		app.router = new Router();
		app.api = Leaguevine.API;

		// Trigger the initial route and enable HTML5 History API support
		Backbone.history.start({ pushState: false });
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
		}
	});
	
});
