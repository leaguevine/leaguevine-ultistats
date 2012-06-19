define([
  "app",

  // Libs
  "backbone",

  // Plugins
  "plugins/backbone.layoutmanager"
],
function(app, Backbone, Game) {
    
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
	
	Navigation.Views.Navbar = Backbone.View.extend({
		template: "navigation/navbar",
		//className: "navbar-wrapper",
		//href: "",
		//name: "",
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
                //href: this.options.href, 
                //name: this.options.name, 
                tournaments_class: tournaments_class,
                teams_class: teams_class,
                games_class: games_class,
                settings_class: settings_class,
                tournaments_href: app.navigation.tournaments_href,
                teams_href: app.navigation.teams_href,
                games_href: app.navigation.games_href,
                settings_href: app.navigation.settings_href
            });
		},
		initialize: function() {
			this.bind("change", function() {
				this.render();
			}, this);
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
		render: function(layout) {
			var view = layout(this);
			var my_class = this.options.model_class || null;
			var my_level = this.options.level || null;
			var my_title; //Title is from the dict if list, else it is
			var list_titles = {"team": "Teams", "game": "Games", "tournament": "Tournaments", "player": "Players", "setting": "Settings"}; 
			if (my_level === "list"){my_title = list_titles[my_class];}
			else if (my_level === "edit"){my_title = this.model.isNew() ? "Create" : "Edit";}
			else if (my_level == "show"){
				if (my_class === "player"){
					var this_first = this.model.get("first_name") || "";
					var this_last = this.model.get("last_name") || "";
					my_title = this_first + " " + this_last;
				} else {my_title = this.model.get("name") || "";}
			} else {my_title = "";}

			var lbc, lbh, lbt, rbc, rbh, rbt;
			//var list_hrefs = {"team": "#teams", "game": "#games", "tournament": "#tournaments", "player": "#players", "setting": "#settings"};
			var list_hrefs = {"team": "/teams", "game": "/games", "tournament": "/tournaments", "player": "/players", "setting": "/settings"};
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
				lbh = list_hrefs[my_class];
				lbt = list_titles[my_class];
				//Right button is Edit if we are viewing an item.
				rbc = ""; //No class for the 'edit' button.
				rbh = "/edit" + my_class + "/" + this.model.id;
				rbt = "Edit";
			} else if (my_level === "edit"){
				//Left button is 'cancel' if we are editing.
				lbc = "back";
				lbh = list_hrefs[my_class];
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

			return view.render({href: "",
				title: my_title,
				left_btn_href: lbh,
				left_btn_txt: lbt,
				left_btn_class: lbc,
				right_btn_href: rbh,
				right_btn_txt: rbt,
				right_btn_class: rbc
			});
		},
		initialize: function() {
			if (this.model){
				this.model.bind("change", function() {
					this.render();
				}, this);
			}
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
		search_results: _.extend({}, Backbone.Events),
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
		render: function(manage) {
			//var temp_collection = {};
			//Leaguevine.Utils.concat_collections(this.collection, this.search_results);
			this.setView(".object_list_area", new this.options.ViewsListClass({collection: this.collection, tap_method: this.options.tap_method}));
            return manage(this).render({
                search_object_name: this.options.search_object_name
                /*right_btn_class: this.options.right_btn_class,
                right_btn_txt: this.options.right_btn_txt,
                right_btn_href: this.options.right_btn_href,*/
            })/*.then(function(el) {
                $(".object_list_area").html(el);
                //This should only be necessary for views that have no template, no setViews, or other view setting mechanism
                //In this case it is probably causing a (slow) double-render
            })*/;
        },
		initialize: function() {
			this.search_results = new this.options.CollectionClass();
			this.search_results.bind("reset", function() {
				this.concat_collections(this.collection, this.search_results);
				//Leaguevine.Utils.concat_collections(this.collection, this.search_results);
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
        }
    });
    
	return Navigation;// Required, return the module for AMD compliance
});
