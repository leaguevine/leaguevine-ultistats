require([
	"app",

	// Libs
	"jquery",
	"backbone",

	//Do we need all modules or only those with routers or that are not required by other modules?
	"modules/leaguevine",
	"modules/navigation",
	"modules/settings",	
	"modules/season",
	"modules/teamplayer",
	"modules/player",
	"modules/tournteam",
	"modules/stats",
	"modules/player_per_game_stats",
	"modules/team_per_game_stats",
	"modules/team",
	"modules/game",
	"modules/tournament",
	"modules/gameevent",
	"modules/trackedgame"
],
/*
 * The following callback is called after the dependices are loaded.
 * The dependencies are passed to the callback in the order they are required.
 * The Require callback normally returns an object that defines the module,
 * but in this case we are defining the jQuery ready function which will execute
 * once everything has finished loading.
 */
function(app, $, Backbone, Leaguevine) {
    
// Defining the application router, you can attach sub routers here.
	var Router = Backbone.Router.extend({
		//Routes are defined in sub modules.
		routes: {
			"": "index"
		},
		
		index: function () {
			Backbone.history.navigate('/teams', true); // Only works if I have a route to match teams
		},
		
		// Shortcut for building a url.
		go: function(){
			return this.navigate(_.toArray(arguments).join("/"), true);
		},
		useLayout: function(name) {
			// If already using this Layout, then don't re-inject into the DOM.
			if (this.layout) {
				return this.layout;
			}
		
			// Create a new Layout.
			this.layout = new Backbone.Layout({
				template: name,
				className: "layout " + name,
				id: "layout"
			});
		
			// Insert into the DOM.
			$("#main").html(this.layout.el);
			
			// Render the layout.
			this.layout.render();
			return this.layout;
		}
	});	

	// Treat the jQuery ready function as the entry point to the application.
	// Inside this function, kick-off all initialization, everything up to this
	// point should be definitions.
	$(function() {
		// Define your master router on the application namespace and trigger all
		// navigation from this instance.
		app.router = new Router(); //Necessary to catch default route.
		app.api = Leaguevine.API; //This will be useful if we ever use another API.

		// Trigger the initial route and enable HTML5 History API support
		Backbone.history.start({ pushState: true });
	});
    window.applicationCache.addEventListener('updateready', function(e) {
        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
            // Browser downloaded a new app cache.
            // Swap it in and reload the page to get the new code.
            window.applicationCache.swapCache();
            if (confirm('A new version of this site is available. Would you like to load it? (highly recommended)')) {
                $('body').html('Loading the new site...'); //Remove the current elements from the page to reduce confusion
                window.location.reload(); //Completely reload the page and re-fetch everything
            }
        } else {
            // Manifest didn't changed. Nothing new to load.
        }
    }, false);
  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router.  If the link has a data-bypass
  // attribute, bypass the delegation completely.
	$(document).on("click", "a:not([data-bypass])", function(evt) {
		// Get the anchor href and protcol
		var href = $(this).attr("href");
		var protocol = this.protocol + "//";

        // TODO: If this is not localhost, only check to see if the cache is updated at most once an hour
        // Check to see if the cache has been updated. The request is done in the background and is not blocking

		window.applicationCache.update(); 
         
		// Ensure the protocol is not part of URL, meaning its relative.
		if (href && href.slice(0, protocol.length) !== protocol &&
			href.indexOf("javascript:") !== 0) {
			// Stop the default event to ensure the link will not cause a page
			// refresh.
			evt.preventDefault();

			// `Backbone.history.navigate` is sufficient for all Routers and will
			// trigger the correct events.  The Router's internal `navigate` method
			// calls this anyways.
			Backbone.history.navigate(href, true);
		}
	});
	
});
