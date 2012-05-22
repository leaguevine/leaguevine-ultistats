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
    "use strict";
	var app = namespace.app;
	var Settings = namespace.module();
	
	Settings.MySettings = [
		{
			"order": 1,
			"name": "Log In",
			"type": "Toggle Button",
			"value": false,
			"toggle_prompt_tf": ["Log Out","Log In"],
		},
		{
			"order": 2,
			"name": "Sort players by:",
			"type": "Dropdown",
			"value": 0,
			"list_items":["jersey","full name","first name","nick name","last name"]
		},
		{
			"order": 3,
			"name": "Battery Usage",
			"type": "Scale",
			"value": 0
		},
	];
	
	Settings.Model = Backbone.Model.extend({
		sync: Backbone.localSync,
		localStorage: new Backbone.LocalStore("settings"),
		defaults: {
			"order": -1,
			"name": "Setting Name",
			"type": "Widget Type",
			"value": true,
			"list_items":[],
			"toggle_prompt_tf":[],}
		//TODO: search by name
	});
	
	Settings.Collection = Backbone.Collection.extend({
		model: Settings.Model,
		sync: Backbone.localSync,
		localStorage: new Backbone.LocalStore("settings"),
		comparator: function(setting) {// Define how items in the collection will be sorted.
		  return setting.get("order");
		},
	});
	
	Settings.Router = Backbone.Router.extend({
		routes : {
			"settings": "showSettings", 
		},
        showSettings: function () {
        	settings = new Settings.Collection();
			settings.fetch();
			//TODO: Combine Settings.MySettings and overwrite with those fetched from localStorage
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			myLayout.view(".navbar", new Navigation.Views.Navbar({}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Settings"}));
			//myLayout.view(".content", new Settings.Views.Detail());
			myLayout.view(".content", new Settings.Views.List({collection: settings}));
            myLayout.render(function(el) {$("#main").html(el);});
        }
    });
	Settings.router = new Settings.Router();// INITIALIZE ROUTER

	Settings.Views.List = Backbone.LayoutManager.View.extend({
		tag: "form",
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
		render: function(layout){
			var view = layout(this);
			_.each(this.collection, function(setting){
				switch (setting.get("type")){
				case "Toggle Button":
					view.insert("form", new Settings.Views.ToggleButton({model: setting}));
					break;
				case "Dropdown":
					break;
				case "Scale":
					break; 
				}
			});
		},
	});
	
	Settings.Views.ToggleButton = Backbone.LayoutManager.View.extend({  	
		template: "settings/toggleButton",
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
