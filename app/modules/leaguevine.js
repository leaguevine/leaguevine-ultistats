define([
  "app",

  // Libs
  "backbone"

  // Modules

  // Plugins
],

function(app, Backbone) {
    /*
    * This module defines the API properties.
    */

    // Create a new module
    var Leaguevine = app.module();

    Leaguevine.Utils = {};
    Leaguevine.Utils.concat_collections = function(c1, c2) {
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

    Leaguevine.Router = Backbone.Router.extend({

        //http://local.ultistats.com/expires_in=157680000&token_type=bearer&access_token=22db8beda6&scope=universal
        routes: {
            "token_:hash": "token_received",
            "expires_:hash": "token_received",
            "access_:hash": "token_received",
            "error_description:hash": "login_error"
        },

        token_received: function(hash) {//route matched by oauth/:hash
            hash = hash.split("&"); //break the URL hash into its segments.
          //Restore the matched part of the url
            var pair0 = hash[0].split("=");
            pair0[0] = pair0[0] == "type" ? "token_" + pair0[0] : pair0;
            pair0[0] = pair0[0] == "in" ? "expires_" + pair0[0] : pair0;
            pair0[0] = pair0[0] == "token" ? "access_" + pair0[0] : pair0;
            hash[0] = pair0[0] + "=" + pair0[1];
            _.each(hash, function(element){ //For each segment...
                var pair = element.split("="); //Get the key and value.
                var temp_obj = {};
                temp_obj[pair[0]]=pair[1]; //Put the key and value into a temp object.
                _.extend(app.api,temp_obj); //Extend/overwrite our app.api with the key/value of the temp object.
            });

            //After token is received, navigate to the href that was saved earlier
            localStorage.setItem("auth_object", JSON.stringify(app.api));
            //window.location.href = "#" + localStorage.getItem("login_redirect");
            window.location.href = localStorage.getItem("login_redirect");
            return false;
        },
        login_error: function(hash) {
            Backbone.history.navigate("settings", true); //Redirect to the settings page where there is a prompt to log in again
         }

    });
    Leaguevine.router = new Leaguevine.Router();// INITIALIZE ROUTER

    Leaguevine.Views.MoreItems = Backbone.View.extend({
        template: "leaguevine/more_items",
            events: {
                click: "fetch_more_items"
            },
        tagName: "li",
        initialize: function() {
            this.collection = this.options.collection;
        },
        serialize: function() {
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
                    Leaguevine.Utils.concat_collections(old_collection, collection);
                }
            });
        }
    });

    Leaguevine.API = {
        root: "http://api.playwithlv.com/v1/",
        base: "http://playwithlv.com/oauth2/authorize/?response_type=token&scope=universal",
        client_id: "ab9a5a75a96924bcdda7ee94f9c7ca",
        redirect_uri: "http://local.ultistats.com/",
        season_id: null,
        d_token: function() {//Modules will reference this dynamic token
            if (!this.access_token) {
                var stored_api = JSON.parse(localStorage.getItem("auth_object")); //Pull our token out of local storage if it exists.
                _.extend(this,stored_api);
            }
            if (!this.access_token) {
                //return this.login();
                this.login();
                return false;
            }
            else {
                return this.access_token;
            }
        },
        is_logged_in: function() {//Returns true if the user is logged in and false if not
            if (!this.access_token) {
                var stored_api = JSON.parse(localStorage.getItem("auth_object"));
                _.extend(this, stored_api);
            }
            return (this.access_token !== null && this.access_token !== undefined);
        },
        login: function() {//Redirects a user to the login screen
            localStorage.setItem("login_redirect", Backbone.history.fragment);
            window.location.href = this.base + "&client_id=" + this.client_id + "&redirect_uri=" + this.redirect_uri;
            //return false;
        },
        logout: function() {//Logs a user out by removing the locally stored token
            localStorage.removeItem("auth_object");
            this.access_token = undefined;
        }
    };

    if (typeof localSettings != "undefined" &&
        typeof localSettings.Leaguevine != "undefined" &&
        typeof localSettings.Leaguevine.API != "undefined") {
        _.extend(Leaguevine.API, localSettings.Leaguevine.API);
    }

    Backbone.API = Leaguevine.API;

    return Leaguevine;
});
