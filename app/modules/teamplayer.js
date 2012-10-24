define([
	"require",
  "app",

  // Libs
  "backbone",
  
  // Modules
  
  // Plugins
  "plugins/localSettings",
  "plugins/backbone-tastypie"
],
function(require, app, Backbone) {
    
	var TeamPlayer = app.module();
	
	//
	// MODEL
	//
	TeamPlayer.Model = Backbone.Tastypie.Model.extend({
		urlRoot: Backbone.localSettings.root + "team_players/",
		defaults: {
			number: null,
			team_id: null,
			team: {},
			player_id: null,
			player: {last_name: "", first_name: ""}
		},
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
		urlRoot: Backbone.localSettings.root + "team_players/",
		associations: [
			{"name": "player", "type": "to_many", "search_filter": "player_ids"},
			{"name": "team", "type": "to_many", "search_filter": "team_ids"},
			{"name": "number", "type": "to_one", "search_filter": "number"}
		],
		initialize: function(models, options) {
			if (options) { this.options = options;
				/*if (options.team_id) {this.team_id = options.team_id;}
				if (options.player_id) {this.player_id = options.player_id;}*/
			}
		},
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
