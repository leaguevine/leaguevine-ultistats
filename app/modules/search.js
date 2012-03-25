define([
  "namespace",

  // Libs
  "use!backbone",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone) {
    var app = namespace.app;
    var Search = namespace.module();
	
    Search.Views.SearchableList = Backbone.View.extend({
        /* Usage:
         *      required arguments:
         *          collection - Collection of models
         *          CollectionClass - the Collection class (e.g. Team.Collection)
         *          ViewsListClass - the Views.List class (e.g. Team.Views.List)
         *          search_object_name - type of object being searched
         *          right_btn_href - link for right button
         *          right_btn_txt - text of right button
         *          right_btn_class - additional class for right button
         */
        template: "search/searchable_list",
        events: {
            "keyup #object_search": "filterObjects"
        },
        filterObjects: function(ev) {
            var my_collection = this.options.collection;
            var search_string = ev.currentTarget.value;
            my_collection.name = search_string;

            //Create a new collection for fetching
            var search_results = new this.CollectionClass([],{name: search_string});
            search_results.fetch({
                success: function(collection, response) {
                    var models = _.reject(collection.models, function(model) {
                        return my_collection.pluck("id").indexOf(model.get("id")) != -1
                    });
                    my_collection.reset(_.union(my_collection.models, models));
                }
            });
            my_collection.trigger('reset');
        },
        render: function(layout) {
            var view = layout(this);
            var temp_collection = {};
            this.setViews({
                ".object_list_area": new this.ViewsListClass({collection: this.collection})
            });

            return view.render({
                search_object_name: this.search_object_name,
                right_btn_class: this.right_btn_class,
                right_btn_txt: this.right_btn_txt,
                right_btn_href: this.right_btn_href,
            }).then(function(el) {
                $('.object_list_area').html(el);
            });
        },
	initialize: function() {
            this.CollectionClass = this.options.CollectionClass;
            this.ViewsListClass = this.options.ViewsListClass;
            this.search_object_name = this.options.search_object_name;
            this.right_btn_class = this.options.right_btn_class;
            this.right_btn_txt = this.options.right_btn_txt;
            this.right_btn_href = this.options.right_btn_href;
        }
    });
    
    return Search;// Required, return the module for AMD compliance
});
