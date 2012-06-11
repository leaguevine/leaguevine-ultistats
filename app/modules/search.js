define([
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",

  // Plugins
  "plugins/backbone.layoutmanager"
],
function(app, Backbone, Leaguevine) {
    
    var Search = app.module();
	
    Search.Views.SearchableList = Backbone.View.extend({
        /* Usage:
         *      required arguments:
         *          collection - Collection of models
         *          CollectionClass - the Collection class (e.g. Team.Collection)
         *          ViewsListClass - the Views.List class (e.g. Team.Views.List)
         *          search_object_name - type of object being searched
         *          Xright_btn_href - link for right button
         *          Xright_btn_txt - text of right button
         *          Xright_btn_class - additional class for right button
         * 	e.g.	myLayout.view(".content", new Search.Views.SearchableList({
         * 				collection: teams, CollectionClass: Team.Collection, 
         * 				ViewsListClass: Team.Views.List, right_btn_class: "",
         *              right_btn_txt: "Create", right_btn_href: "#newteam", 
         *              search_object_name: "team"}));
         * 			At least for the case of Team and Tournament, a lot of these
         * 			passed variables can be guessed from the module alone.
         * 	e.g.	myLayout.view(".content", new Search.Views.SearchableList({
         * 				collection: teams, Module: Team }))
         * 			Then we have Module.Collection, Module.Views.List,
         * 			and there must be a way to get a lower-case string from the module
         * 			name to make #newmodule and "module"
         * 			I don't know if simplifying the input arguments breaks any other 
         * 			modules that might use searchable list so I will hold off on 
         * 			this for now.
         */
        template: "search/searchable_list",
        events: {
            "keyup #object_search": "filterObjects"
        },
        search_results: _.extend({}, Backbone.Events),
        filterObjects: function(ev) {
            //var my_collection = this.options.collection;//collection is special in that it is not passed to options.
            var my_collection = this.collection; //Create a local closure so we can access this variable in the success callback.
            var search_string = ev.currentTarget.value;
            my_collection.name = search_string;

            //When we fetch a collection, upon its return the collection "reset" is triggered.
            //However, we cannot fetch our original collection because this will cause (error-generating) duplicates.
            //Thus we make a new collection then merge new results.
            this.search_results.reset();
            this.search_results.name = search_string;
            this.search_results.fetch();
            //Trigger a reset immediately so the already-present data are curated immediately.
            my_collection.trigger("reset");
        },
        render: function(layout) {
            var view = layout(this);
            //var temp_collection = {};
            //Leaguevine.Utils.concat_collections(this.collection, this.search_results);
            this.setViews({
                ".object_list_area": new this.options.ViewsListClass({collection: this.collection, tap_method: this.options.tap_method})
            });
            return view.render({
                search_object_name: this.options.search_object_name,
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
			 	Leaguevine.Utils.concat_collections(this.collection, this.search_results);
		 	}, this)
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
    
    return Search;// Required, return the module for AMD compliance
});
