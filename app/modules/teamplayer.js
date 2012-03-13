define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine"
],
function(require, namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var TeamPlayer = namespace.module();
	
	//
	// MODEL
	//
	TeamPlayer.Model = Backbone.Model.extend({
		defaults: {
			number: "",
			team: {},
			player: {}
		},
		urlRoot: Leaguevine.API.root + "team_players",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += '/?'
		},
		//TODO: override URL to /team_players/team_id/player_id/
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
			url += '/?'
			if (this.team_id) {
				url += 'team_ids=%5B' + this.team_id + '%5D&';
			}
			if (this.player_id) {
				url += 'player_ids=%5B' + this.player_id + '%5D&';
			}
			return url.substr(0,url.length-1);
		},
		comparator: function(teamplayer) {// Define how items in the collection will be sorted.
		  return teamplayer.get("number");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
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
	TeamPlayer.Views.PlayerList = Backbone.LayoutManager.View.extend({
		template: "teamplayers/playerlist",
		className: "players-wrapper",
		render: function(layout) {
			var view = layout(this);
			this.collection.each(function(teamplayer) {
				view.insert("ul", new TeamPlayer.Views.Player({
					model: teamplayer
				}));
			});
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});
	
	TeamPlayer.Views.Team = Backbone.View.extend({
		template: "teamplayers/team",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	TeamPlayer.Views.TeamList = Backbone.LayoutManager.View.extend({
		template: "teamplayers/playerlist",
		className: "teams-wrapper",
		render: function(layout) {
			var view = layout(this);
			this.collection.each(function(teamplayer) {
				view.insert("ul", new TeamPlayer.Views.Team({
					model: teamplayer
				}));
			});
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});
	
	return TeamPlayer;
});
