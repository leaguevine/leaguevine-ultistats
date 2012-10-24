define([
  "app",

  // Libs
  "backbone"

  // Modules

  // Plugins
],

function(app, Backbone) {
	/*
	* This module has some simple helpers.
	*/

	// Create a new module
	var Helper = app.module();

	Helper.Utils = {};
	Helper.Utils.concat_collections = function(c1, c2) {
        //Concatenates collections c1 and c2, making sure we remove any duplicate entries from c2 before appending
        
        var models = _.reject(c2.models, function(model) {
            return c1.pluck("id").indexOf(model.get("id")) != -1;
        });
        //The models var consists of new results only.
        //So we union the two collections to create our more comprehensive collection.
        //Union does not trigger anything, so we do the union via a .reset
        //.reset also makes sure the instances in our collection are Backbone.Models and not simple JS objects.
        c1.reset(_.union(c1.models, models));
   };

    Helper.Views.MoreItems = Backbone.View.extend({
		template: "leaguevine/more_items",
            events: {
                click: "fetch_more_items"
            },
		tagName: "li",
        initialize: function() {
            this.collection = this.options.collection;
        },
        data: function() {
            // Determine how many items will be fetched with the next call and return this context so we can display it
            var context = {};
            if (this.collection.meta && this.collection.meta.next) {
                var limit = this.collection.meta.limit;
                if (limit + this.collection.length > this.collection.meta.total_count) {
                    // If we are almost at the end of the list of items
                    context.num_items = this.collection.meta.total_count - this.collection.length; 
                } else {
                    context.num_items = this.collection.meta.limit;
                }
            } else {
                context.num_items = 0;
            }
            return context;
       },
        fetch_more_items: function() {
            $('.more-items-main-txt').hide();
            $('.more-items-loading-txt').show(); //Display a loading message
            var old_collection = this.collection;
            var new_collection = $.extend({},this.collection); //Make a clone of the collection that we can modify safely
            var next_url = this.collection.meta.next;
            new_collection.url = function() {return next_url;}; //Set the URL to fetch the next x number of items
            new_collection.fetch({
                success: function(collection, response) {
                    //Combine these results with the existing items in the list
                    Helper.Utils.concat_collections(old_collection, collection);
                }
            });
        }
    });
    Helper.Views.Empty = Backbone.View.extend({
    	tagName: "div"
    });
		
	return Helper;
});