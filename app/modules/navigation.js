define([
  "app",
  "backbone",
],
function(app, Backbone) {
    
	var Navigation = app.module();

    //Initialize the URLs for the navigation buttons
    //We remember the last page viewed within each sub-navigation so subsequent clicks on that
    //navigation button take the user to the most recently viewed page instead of the top menu
    app.navigation = {
        tournaments_href: "/tournaments",
        teams_href: "/teams",
        games_href: "/games",
        settings_href: "/settings"
    };
	
	Navigation.Views.Navbar = Backbone.LayoutView.extend({
		template: "navigation/navbar",
		beforeRender: function() {
			var fragment = Backbone.history.fragment;
			app.navigation.tournaments_href = fragment.indexOf("tournament") != -1 ? fragment : app.navigation.tournaments_href;
			app.navigation.teams_href = fragment.indexOf("team") != -1 ? fragment : app.navigation.teams_href;
			app.navigation.games_href = fragment.indexOf("games") != -1 ? fragment : app.navigation.games_href;
			app.navigation.settings_href = fragment.indexOf("settings") != -1 ? fragment : app.navigation.settings_href;
		},
		data: function () {
			return {
				tournaments_class: Backbone.history.fragment.indexOf("tournament") != -1 ? "currently_viewed" : "",
                teams_class: Backbone.history.fragment.indexOf("team") != -1 ? "currently_viewed" : "",
                games_class: Backbone.history.fragment.indexOf("games") != -1 ? "currently_viewed" : "",
                settings_class: Backbone.history.fragment.indexOf("settings") != -1 ? "currently_viewed" : "",
                tournaments_href: app.navigation.tournaments_href,
                teams_href: app.navigation.teams_href,
                games_href: app.navigation.games_href,
                settings_href: app.navigation.settings_href
			};
		}
	});
    
    Navigation.Views.Titlebar = Backbone.View.extend({
        /* Usage:
         *      options:
         *			model_class - (required) One of 'team', 'game', 'tournament', 'player', 'setting'
         *			level - One of 'list', 'show', 'edit'
         *			model - The model. Required for levels 'show' and 'edit'
         * With these arguments we can construct
         * title, left_btn_class, left_btn_href, left_btn_txt, right_btn_class, right_btn_href, right_btn_txt
         * 
         * title is either the name of the group (Teams, Games, Players, Tournaments, Settings) or it is the name of the model being viewed.
         * left_btn_href: empty if we are at a top level (i.e. Teams list, etc), takes us back to the list if we are at the item, or takes us back to the item if we are editing the item
         * left_btn_txt: if list then "", if at item then group name, if at edit then item name
         * left_btn_class: always "back" unless disabled.
         * right_btn_href: if list then newX, if item then editX/model.id, if edit then disabled
         * right_btn_txt: if list then "" (+ button used), if item then "Edit", if edit then disabled
         * right_btn_class: if list then "add", if item then ?, if edit then disabled.
         */
        
		template: "navigation/titlebar",
		initialize: function(){
			if (this.model){
				this.model.on("change", this.render, this);
			}
		},
		cleanup: function(){
			if (this.model){
				this.model.off(null, null, this);
			}
		},
		data: function(){
			var my_class = this.options.model_class || null;
			var my_level = this.options.level || null;
			var my_title;
			if (my_level === "list"){my_title = this.title_meta[my_class].title;}
			else if (my_level === "edit"){my_title = this.model.isNew() ? "Create" : "Edit";}
			else if (my_level == "show"){
				if (my_class === "player"){
					var this_first = this.model.get("first_name") || "";
					var this_last = this.model.get("last_name") || "";
					my_title = this_first + " " + this_last;
				} else {my_title = this.model.get("name") || "";}
			} else {my_title = "";}

			var lbc, lbh, lbt, rbc, rbh, rbt;
			if (my_level === "list"){
				//Left button does not exist for list level.
				lbc = "disabled";
				lbh = "";
				lbt = "";
				//Right button is new/add for list
				rbc = "add";
				rbh = "/new" + my_class;
				rbt = "";//Doesn't matter because it'll be a plus button.
			} else if (my_level === "show"){
				//Left button is back to the list if we are viewing an item.
				lbc = "back";
				lbh = this.title_meta[my_class].href;
				lbt = this.title_meta[my_class].title;
				//Right button is Edit if we are viewing an item.
				rbc = ""; //No class for the 'edit' button.
				rbh = "/edit" + my_class + "/" + this.model.id;
				rbt = "Edit";
			} else if (my_level === "edit"){
				//Left button is 'cancel' if we are editing.
				lbc = "back";
				lbh = this.title_meta[my_class].href;
				if (!this.model.isNew()){
					lbh = lbh + "/" + this.model.id;
				}
				lbt = "Cancel";
				//Right button does not exist for edit level
				rbc = "disabled";
				rbh = "";
				rbt = "";
			}

			// Some hacks until these features are implemented.
			if (my_level === "show" && my_class === "player"){
				lbc = "disabled"; //We currently do not have a generic list of players.
				rbc = "disabled"; //We currently do not have a page to edit a player.
			}
			if (my_class === "tournament"){
				rbc = "disabled"; //We currently do not have pages to create or edit a tournament.
			}
			if (my_level === "show" && my_class === "game"){
				rbc = "disabled"; //We do not hav a way to edit games.
				if (this.model.get("tournament_id")){
					lbh = "/tournaments/" + this.model.get("tournament_id");
					lbt = this.model.get("tournament").name ? this.model.get("tournament").name : "Tournament";
				} else {lbc = "disabled";}//We do not have a generic list of games.
			}
			
			return {
				title: my_title,
				left_btn_href: lbh,
				left_btn_txt: lbt,
				left_btn_class: lbc,
				right_btn_href: rbh,
				right_btn_txt: rbt,
				right_btn_class: rbc
			};
		},
		title_meta: {
			"team": {"title": "Teams", "href": "/teams"},
			"game": {"title": "Games", "href": "/games"},
			"tournament": {"title": "Tournaments", "href": "/tournaments"},
			"player": {"title": "Players", "href": "/players"},
			"setting": {"title": "Settings", "href": "/settings"}
		}
	});

    Navigation.Views.SearchableList = Backbone.View.extend({
		/*Usage:
		*	required arguments:
		*		collection - Collection of models
		*			CollectionClass - the Collection class (e.g. Team.Collection)
		*			ViewsListClass - the Views.List class (e.g. Team.Views.List)
		*			search_object_name - type of object being searched
		*			tap_method (optional)
		*			Xright_btn_href - link for right button
		*			Xright_btn_txt - text of right button
		*			Xright_btn_class - additional class for right button
		*	e.g.	myLayout.view(".content", new Search.Views.SearchableList({
		*			collection: teams, CollectionClass: Team.Collection, 
		*				ViewsListClass: Team.Views.List, right_btn_class: "",
		*				right_btn_txt: "Create", right_btn_href: "#newteam", 
		*				search_object_name: "team"}));
		*			At least for the case of Team and Tournament, a lot of these
		*			passed variables can be guessed from the module alone.
		*	e.g.	myLayout.view(".content", new Search.Views.SearchableList({
		*				collection: teams, Module: Team }))
		*			Then we have Module.Collection, Module.Views.List,
		*			and there must be a way to get a lower-case string from the module
		*			name to make #newmodule and "module"
		*			I don't know if simplifying the input arguments breaks any other 
		*			modules that might use searchable list so I will hold off on 
		*			this for now.
		*/
		concat_collections: function(c1, c2) {
			var models = _.reject(c2.models, function(model) {
				return c1.pluck("id").indexOf(model.get("id")) != -1;
			});
			c1.reset(_.union(c1.models, models));
		},
		template: "navigation/searchable_list",
		events: {
			"keyup #object_search": "filterObjects"
		},
		//search_results: _.extend({}, Backbone.Events),
		filterObjects: function(ev) {
			var search_string = ev.currentTarget.value;
			this.collection.name = search_string;
			//When we fetch a collection, upon its return the collection "reset" is triggered.
			//However, we cannot fetch our original collection because this will cause (error-generating) duplicates.
			//Thus we make a new collection then merge new results.
			this.search_results.reset();
			this.search_results.name = search_string;
			this.search_results.fetch(); //When the fetch returns it will cause this.search_results to merge with this.collection  
			this.collection.trigger("reset");//Trigger a reset immediately so the already-present data are curated immediately.
		},
		data: function(){
			return {search_object_name: this.options.search_object_name};
		},
		beforeRender: function() {
			this.setView(".object_list_area", new this.options.ViewsListClass({collection: this.collection, tap_method: this.options.tap_method}));
        },
		initialize: function() {
			this.search_results = new this.options.CollectionClass();
			this.search_results.bind("reset", function() {
				this.concat_collections(this.collection, this.search_results);
			}, this);
			/*We could bind to reset here to re-render this whole thing.
			Instead we bind to reset in the module's .Views.List
			
			It is not necessary to take this.options and set them as higher level
			variables because we are assuming that we are always passing in these
			"required" arguments. If we make these arguments optional, to the point
			that this view might be insantiated with 0 options, AND we check for the
			presence of this.options.var_name somewhere else, then we will need to
			reassign these below variables and instead check for the presence of this.var_name
			
            this.CollectionClass = this.options.CollectionClass;
            this.ViewsListClass = this.options.ViewsListClass;
            this.search_object_name = this.options.search_object_name;
            this.right_btn_class = this.options.right_btn_class;
            this.right_btn_txt = this.options.right_btn_txt;
            this.right_btn_href = this.options.right_btn_href;
            */
       },
		cleanup: function() {
			this.search_results.off(null, null, this);
		}
    });
    
	return Navigation;// Required, return the module for AMD compliance
});