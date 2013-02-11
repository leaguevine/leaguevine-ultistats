define([
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/navigation",
  
  "plugins/backbone.localStorage"
],
function(require, app, Backbone, Navigation) {
    
	var Settings = app.module();
	
	Settings.MySettings = [
		{
			"order": 1,
			"name": "Online Status",
			"type": "Toggle Button",
			"value": function() {return app.api.is_logged_in();},
			//"value": false,
			"toggle_prompt_ft": ["Logged Out (click to login)","Logged In (click to logout)"]
		},
		{
			"order": 2,
			"name": "Sort players by:",
			"type": "Select",
			"value": "jersey",
			"option_list":["jersey","full name","first name","nick name","last name"]
		},
		{
			"order": 3,
			"name": "Battery Usage",
			"type": "Scale",
			"value": 0
		},
		{
			"order": 4,
			"name": "Stats Entry:",
			"type": "Select",
			"value": "detailed",
			"option_list": ["score only", "detailed"] //TODO: players and scores
		}
	];
	
	Settings.Model = Backbone.Model.extend({
		sync: Backbone.localSync,
		idAttribute: "name",
		localStorage: new Backbone.LocalStore("settings"),
		defaults: {
			"order": -1,
			"name": "Setting Name",
			"type": "Widget Type",
			"value": true,
			"list_items":[],
			"toggle_prompt_ft":[]
		},
		toggle: function(){//Method used by toggle buttons
			//Hack for login
			if (this.get("name") == "Online Status"){
				if (this.get("value")()){app.api.logout();}
				else {app.api.login();}
			} else {
				this.set("value",!this.get("value"));
				this.save();
			}
		}
	});
	
	Settings.Collection = Backbone.Collection.extend({
		model: Settings.Model,
		sync: Backbone.localSync,
		localStorage: new Backbone.LocalStore("settings"),
		comparator: function(setting) {// Define how items in the collection will be sorted.
			return setting.get("order");
		}
	});
	
	Settings.Router = Backbone.Router.extend({
		routes : {
			"settings": "showSettings" 
		},
		showSettings: function () {
			var settings = new Settings.Collection(Settings.MySettings);
			_.each(settings.models, function(setting){
				setting.fetch();
			});
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "setting", level: "list"}),
				".content_1": new Settings.Views.List({collection: settings})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
        }
    });
	Settings.router = new Settings.Router();// INITIALIZE ROUTER

	Settings.Views.List = Backbone.View.extend({
		template: "settings/list",
		initialize: function() {
			this.collection.on("reset", this.render, this);
		},
		cleanup: function() {
			this.collection.off(null, null, this);
		},
		render: function(layout){
			var view = layout(this);
			_.each(this.collection.models, function(setting){
				switch (setting.get("type")){
				case "Toggle Button":
					this.insertView("ul", new Settings.Views.ToggleButton({model: setting}));
					break;
				case "Select":
					this.insertView("ul", new Settings.Views.Select({model: setting}));
					break;
				case "Scale":
					break; 
				}
			}, this);
			return view.render();
		}
	});

	Settings.Views.ToggleButton = Backbone.View.extend({
		template: "settings/toggleButton",
		tagName: "li",
		render: function(layout) {
			var value = _.isFunction(this.model.get("value")) ? this.model.get("value")() : this.model.get("value");
			var prompt_ix = value ? 1 : 0;
			var btn = {"prompt": this.model.get("name"), "text": this.model.get("toggle_prompt_ft")[prompt_ix]};
			return layout(this).render({"btn": btn});
		},
        events: {
            "click button": "toggle"
        },
        toggle: function() {
			this.model.toggle();
			this.render();
		}
	});
	
	Settings.Views.Select = Backbone.View.extend({
		template: "settings/select",
		tagName: "li",
		render: function(layout) {
			var view = layout(this);
			/*_.each(this.model.get("option_list"), function(option_item){
				view.insert("select", new Settings.Views.SelectOption({option_text: option_item}));
			});*/
			return view.render({prompt: this.model.get("name")}).then(function(){
				var opt_html = "";
				_.each(this.model.get("option_list"), function(option_item){
					opt_html += '<option value="' + option_item + '">' + option_item + '</option>';
				});
				this.$el.children()[1].innerHTML = opt_html;
				this.$el.children()[1].value = this.model.get("value");
			});
		},
		events: {
			"change": "select_changed"
		},
		select_changed: function(ev){
			this.model.set("value",ev.target.value);
			this.model.save();
		}
	});
});
