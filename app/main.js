require([
	"app",
	"router"
],
/*
 * The following callback is called after the dependices are loaded.
 * The dependencies are passed to the callback in the order they are required.
 * The Require callback normally returns an object that defines the module,
 * but in this case we are defining the jQuery ready function which will execute
 * once everything has finished loading.
 */
function(app, Router) {
	// Define your master router on the application namespace and trigger all
	// navigation from this instance.
	app.router = new Router();
	
	// Trigger the initial route and enable HTML5 History API support, set the
	// root folder to '/' by default.  Change in app.js.
	Backbone.history.start({ pushState: true, root: app.root });
	
    window.applicationCache.addEventListener('updateready', function(e) {
        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
            // Browser downloaded a new app cache.
            // Swap it in and reload the page to get the new code.
            window.applicationCache.update();
            window.applicationCache.swapCache();
            $('body').html('A new (better) version of this app is now loading...'); //Remove the current elements from the page to reduce confusion
            window.location.reload(); //Completely reload the page and re-fetch everything
        } else {
            // Manifest didn't changed. Nothing new to load.
        }
    }, false);
    
	// All navigation that is relative should be passed through the navigate
	// method, to be processed by the router. If the link has a `data-bypass`
	// attribute, bypass the delegation completely.
	$(document).on("click", "a:not([data-bypass])", function(evt) {
		// Get the absolute anchor href.
		var href = { prop: $(this).prop("href"), attr: $(this).attr("href") };
		// Get the absolute root.
		var root = location.protocol + "//" + location.host + app.root;
		
		// Ensure the root is part of the anchor href, meaning it's relative.
		if (href.prop && href.prop.slice(0, root.length) === root) {
			// Stop the default event to ensure the link will not cause a page
			// refresh.
			evt.preventDefault();
			
			// `Backbone.history.navigate` is sufficient for all Routers and will
			// trigger the correct events. The Router's internal `navigate` method
			// calls this anyways.  The fragment is sliced from the root.
			Backbone.history.navigate(href.attr, true);
		}
	});
});
