define([
  "namespace",

  // Libs
  "use!backbone",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone, Game) {
	var app = namespace.app;
	var Navigation = namespace.module();

    //Initialize the URLs for the navigation buttons
    //We remember the last page viewed within each sub-navigation so subsequent clicks on that
    //navigation button take the user to the most recently viewed page instead of the top menu
    app.navigation = {
        tournaments_href: "tournaments",
        teams_href: "teams",
        games_href: "games",
        settings_href: "settings"
    }
	
	Navigation.Views.Navbar = Backbone.View.extend({
    	template: "navbar/navbar",
    	//className: "navbar-wrapper",
    	href: "",
    	name: "",
        currently_viewed: "",
	    render: function(layout) {
	    	var view = layout(this);


            // Initialize the classes for the currently viewed navigation button
            var tournaments_class = "";
            var teams_class = "";
            var games_class = "";
            var settings_class = "";
            var currently_viewed = "currently_viewed";
            var fragment = Backbone.history.fragment;
            if (fragment.indexOf("tournament") != -1) { // If the current URL is a tournament URL
                tournaments_class = currently_viewed;
                app.navigation.tournaments_href = fragment;
            } 
            else if (fragment.indexOf("team") != -1) { // If the current URL is a team URL
                teams_class = currently_viewed;
                app.navigation.teams_href = fragment;
            } 
            else if (fragment.indexOf("games") != -1) {
                games_class = currently_viewed;
                app.navigation.games_href = fragment;
            }
            else if (fragment.indexOf("settings") != -1) {
                settings_class = currently_viewed;
                app.navigation.settings_href = fragment;
            }
        
	    	return view.render({
                href: this.options.href, 
                name: this.options.name, 
                tournaments_class: tournaments_class,
                teams_class: teams_class,
                games_class: games_class,
                settings_class: settings_class,
                tournaments_href: app.navigation.tournaments_href,
                teams_href: app.navigation.teams_href,
                games_href: app.navigation.games_href,
                settings_href: app.navigation.settings_href,
            });
	    },
	    initialize: function() {
    		this.bind("change", function() {
      			this.render();
    		}, this);
  		}
    });
    
	return Navigation;// Required, return the module for AMD compliance
});
