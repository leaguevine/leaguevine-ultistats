define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/title",
],
function(require, namespace, Backbone, Leaguevine, Navigation, Title) {
	var app = namespace.app;
	var Settings = namespace.module();
	Settings.Router = Backbone.Router.extend({
		routes : {
			"settings": "showSettings", 
		},
        showSettings: function () {
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			myLayout.view(".navbar", new Navigation.Views.Navbar({}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Settings"}));
			myLayout.view(".content", new Settings.Views.Detail());
            myLayout.render(function(el) {$("#main").html(el);});
        }
    });
	Settings.router = new Settings.Router();// INITIALIZE ROUTER

	Settings.Views.Detail = Backbone.LayoutManager.View.extend({  	
		template: "settings/detail",
        className: "settings",
		render: function(layout) {
			return layout(this).render({
                //logged_in is a boolean context variable to specify if a user is authenticated
                logged_in: app.api.is_logged_in(),
            });
		},
        events: {
            "click button#login": "login",
            "click button#logout": "logout",
        },
        login: function(ev){
            app.api.login();
            this.render();
        },
        logout: function(ev){
            app.api.logout();
            this.render();
        }
	});
});
