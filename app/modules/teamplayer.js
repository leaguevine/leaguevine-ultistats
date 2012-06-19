define([
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine"
],
function(require, app, Backbone, Leaguevine) {
    
	var TeamPlayer = app.module();
	
	//
	// MODEL
	//
	TeamPlayer.Model = Backbone.Model.extend({
		defaults: {
			number: "",
			team: {},
			//player: {id: "", last_name: ""}
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
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored
			return _.clone(this.attributes);
		}
	});
	//
	// COLLECTION
	//
	TeamPlayer.Collection = Backbone.Collection.extend({
		model: TeamPlayer.Model,
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
			if (sort_setting){
				if (sort_setting.value == "nick name"){return this_obj.nick_name;}
				else if (sort_setting.value == "jersey"){return this_obj.number;}
				else if (sort_setting.value == "last name"){return this_obj.last_name;}
			}
			return this_obj.full_name;
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
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
		serialize: function() {return this.model.toJSON();}
	});
	TeamPlayer.Views.PlayerList = Backbone.View.extend({
		template: "teamplayers/playerlist",
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
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	
	TeamPlayer.Views.Team = Backbone.View.extend({
		template: "teamplayers/team",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	TeamPlayer.Views.TeamList = Backbone.View.extend({
		template: "teamplayers/playerlist",
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
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	
	return TeamPlayer;
});
