define([
    "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",

  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine) {

    var TeamPlayer = app.module();

    //
    // MODEL
    //
    TeamPlayer.Model = Backbone.Model.extend({
        defaults: {
            number: null,
            team_id: null,
            team: {},
            player_id: null,
            player: {last_name: "", first_name: ""}
        },
        urlRoot: Leaguevine.API.root + "team_players",
        //TODO: override URL to /team_players/team_id/player_id/
        url: function(models) {
            var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
            url += "/?";
        },
        parse: function(resp, xhr) {
            resp = Backbone.Model.prototype.parse(resp);
            resp.id = resp.team_id + "/" + resp.player_id;
            return resp;
        },
        toJSON: function() {
            //TODO: Remove attributes that are not stored
            var tp = _.clone(this.attributes);
            //delete tp.team;
            //delete tp.player;
            return tp;
        },
        sync: Backbone.WebSQLAjaxSync,
        store: new Backbone.WebSQLStore("teamplayer"),
        associations: {
            "team_id": "team",
            "player_id": "player"
        }
    });
    //
    // COLLECTION
    //
    TeamPlayer.Collection = Backbone.Collection.extend({
        model: TeamPlayer.Model,
        sync: Backbone.WebSQLAjaxSync,
        store: new Backbone.WebSQLStore("teamplayer"),
        urlRoot: Leaguevine.API.root + "team_players",
        url: function(models) {
            var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
            url += "/?";
            if (this.team_id) {
                url += "team_ids=%5B" + this.team_id + "%5D&";
            } else if (this.models && this.models.length) {
                url += "team_ids=%5B" + this.models[0].get("team").id + "%5D&";
            }
            //If we already have a list of players,
            if (this.player_id) {url += "player_ids=%5B" + this.player_id + "%5D&";}
            else if (this.models && this.models.length) {
                url += "player_ids=%5B";
                _.each(this.models, function(tp) {
                    url = url + tp.get("player").id + ",";
                });
                url = url.substr(0,url.length-1) + "%5D&";
            }
            url += "limit=50&"; //Make sure we grab all of the players. Omitting this defaults to 20 players
            url += "fields=%5Bnumber%2Cplayer%2Cplayer_id%2Cteam%2Cteam_id%2Ctime_created%2Ctime_last_updated%5D&";
            return url.substr(0,url.length-1);
        },
        comparator: function(teamplayer) {// Define how items in the collection will be sorted.
            //Build an object containing different string representations.
            var temp_player = teamplayer.get("player");
            var this_obj = {"number": teamplayer.get("number")};
            if (_.isFunction(temp_player.get)) {//If this is a proper model.
                _.extend(this_obj,{
                    "first_name": temp_player.get("first_name").toLowerCase(),
                    "last_name": temp_player.get("last_name").toLowerCase(),
                    "nick_name": temp_player.get("nickname").toLowerCase(),
                    "full_name": temp_player.get("last_name").toLowerCase() + temp_player.get("first_name").toLowerCase()[0]
                });
            } else {//If this is a JSON object.
                _.extend(this_obj,{
                    "first_name": temp_player.first_name.toLowerCase(),
                    "last_name": temp_player.last_name.toLowerCase(),
                    "nick_name": temp_player.nickname.toLowerCase(),
                    "full_name": temp_player.last_name.toLowerCase() + temp_player.first_name.toLowerCase()[0]
                });
            }
            var sort_setting = JSON.parse(localStorage.getItem("settings-Sort players by:"));
            if (sort_setting){//Possible values: "jersey","full name","first name","nick name","last name"
                if (sort_setting.value == "jersey"){return this_obj.number;}
                else if (sort_setting.value == "full name"){return this.obj.full_name;}
                else if (sort_setting.value == "first name"){return this_obj.first_name;}
                else if (sort_setting.value == "nick name"){return this_obj.nick_name;}
                else if (sort_setting.value == "last name"){return this_obj.last_name;}
            }
            return this_obj.number;//Default property to sort on if this setting is not yet saved.
        },
        parse: function(resp, xhr) {
            resp = Backbone.Collection.prototype.parse(resp);
            //The websql plugin doesn't know how to sort, meaning we'll get back every teamplayer in the db.
            //We need to weed them out here.
            var _this = this;
            if (this.team_id) {
                resp = _.filter(resp, function(obj){
                    return obj.team_id == _this.team_id;
                });
            }
            if (this.player_id) {
                resp = _this.filter(resp, function(obj){
                    return obj.player_id == _this.player_id;
                });
            }
            _.map(resp, function(resp_){
                resp_ = Backbone.Model.prototype.parse(resp_);
                resp_.id = resp_.team_id + "/" + resp_.player_id;
                return resp_;
            });
            //
            /*var _this = this;
            if (this.team_id){resp = _.filter(resp, function(obj){
                return obj.team_id == _this.team_id;
            });}
            if (this.player_id){resp = _.filter(resp, function(obj){
                return obj.player_id == _this.player_id;
            });}*/
            return resp;
        },
        initialize: function(models, options) {
            if (options) {
                if (options.team_id) {this.team_id = options.team_id;}
                if (options.player_id) {this.player_id = options.player_id;}
            }
        }
    });

    TeamPlayer.Views.Player = Backbone.View.extend({
        template: "teamplayers/player",
        tagName: "li",
        serialize: function() {return _.clone(this.model.attributes);}
    });
    TeamPlayer.Views.PlayerList = Backbone.View.extend({
        template: "teamplayers/playerlist",
        initialize: function() {
            this.collection.on("reset", this.render, this);
        },
        cleanup: function() {
            this.collection.off(null, null, this);
        },
        className: "players-wrapper",
        render: function(layout) {
            var view = layout(this);
            //this.$el.empty()
            // call .cleanup() on all child views, and remove all appended views
            //view.cleanup();
            this.collection.each(function(teamplayer) {
                this.insertView("ul", new TeamPlayer.Views.Player({
                    model: teamplayer
                }));
            }, this);
            return view.render();
        }
    });

    TeamPlayer.Views.Team = Backbone.View.extend({
        template: "teamplayers/team",
        tagName: "li",
        serialize: function() {return _.clone(this.model.attributes);}
    });
    TeamPlayer.Views.TeamList = Backbone.View.extend({
        template: "teamplayers/playerlist",
        initialize: function() {
            this.collection.on("reset", this.render, this);
        },
        cleanup: function() {
            this.collection.off(null, null, this);
        },
        className: "teams-wrapper",
        render: function(layout) {
            var view = layout(this);
            //this.$el.empty()
            // call .cleanup() on all child views, and remove all appended views
            //view.cleanup();
            this.collection.each(function(teamplayer) {
                this.insertView("ul", new TeamPlayer.Views.Team({
                    model: teamplayer
                }));
            }, this);
            return view.render();
        }
    });

    return TeamPlayer;
});
