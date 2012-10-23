define([
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  
  // Plugins
  "plugins/backbone-tastypie"
],
function(require, app, Backbone, Leaguevine) {
    
	var TeamPlayer = app.module();
	
	//
	// MODEL
	//
	TeamPlayer.Model = Backbone.Tastypie.Model.extend({
		defaults: {
			number: null,
			team_id: null,
			team: {},
			player_id: null,
			player: {last_name: "", first_name: ""}
		},
		urlRoot: Leaguevine.API.root + "team_players/",
		toJSON: function() {
			var tp = _.clone(this.attributes);
			//delete tp.team;
			//delete tp.player;
			return tp;
		},
		associations: {
			"team_id": "team",
			"player_id": "player"
		}
	});
	//
	// COLLECTION
	//
	TeamPlayer.Collection = Backbone.Tastypie.Collection.extend({
		model: TeamPlayer.Model,
		urlRoot: Leaguevine.API.root + "team_players/",
		comparator: function(teamplayer) {// Define how items in the collection will be sorted.
			//Build an object containing different string representations.
			var temp_player = _.isFunction(teamplayer.get("player").get) ? teamplayer.get("player").toJSON() : teamplayer.get("player");
			var this_obj = {"number": teamplayer.get("number")};
			_.extend(this_obj,{
				"first_name": temp_player.first_name.toLowerCase(),
				"last_name": temp_player.last_name.toLowerCase(),
				"nick_name": temp_player.nickname ? temp_player.nickname.toLowerCase() : "",
				"full_name": temp_player.last_name.toLowerCase() + temp_player.first_name.toLowerCase()[0]
			});
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
		data: function() {return _.clone(this.model.attributes);}
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
		beforeRender: function(layout) {
			this.collection.each(function(teamplayer) {
				this.insertView("ul", new TeamPlayer.Views.Player({
					model: teamplayer
				}));
			}, this);
		}
	});
	
	TeamPlayer.Views.Team = Backbone.View.extend({
		template: "teamplayers/team",
		tagName: "li",
		data: function() {return _.clone(this.model.attributes);}
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
		beforeRender: function(layout) {
			this.collection.each(function(teamplayer) {
				this.insertView("ul", new TeamPlayer.Views.Team({
					model: teamplayer
				}));
			}, this);
		}
	});
	
	return TeamPlayer;
});
