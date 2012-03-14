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
		render: function(layout) {
            // Render just a static template for now until we build a functional settings page
			return layout(this).render();
		},
	});

});
