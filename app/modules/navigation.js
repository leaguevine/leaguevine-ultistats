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
	
	Navigation.Views.Navbar = Backbone.View.extend({
    	template: "navbar/navbar",
    	//className: "navbar-wrapper",
    	href: "",
    	name: "",
        currently_viewed: "",
	    render: function(layout) {
	    	var view = layout(this);

            // Set the classes for the currently viewed navigation button
            var tournaments_class = "";
            var teams_class = "";
            var game_class = "";
            var settings_class = "";
            var currently_viewed = "currently_viewed";
            var fragment = Backbone.history.fragment;
            if (fragment.indexOf("tournament") != -1) { // If the current URL is a tournament URL
                tournaments_class = currently_viewed;
            } 
            else if (fragment.indexOf("team") != -1) { // If the current URL is a team URL
                teams_class = currently_viewed;
            } 
            else if (fragment.indexOf("game") != -1) {
                game_class = currently_viewed;
            }
            else if (fragment.indexOf("settings") != -1) {
                settings_class = currently_viewed;
            }
        
	    	return view.render({
                href: this.options.href, 
                name: this.options.name, 
                tournaments_class: tournaments_class,
                teams_class: teams_class,
                game_class: game_class,
                settings_class: settings_class,
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
