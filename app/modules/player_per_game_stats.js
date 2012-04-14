define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/stats",
],

function(require, namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var PlayerPerGameStats = namespace.module();
	
	//
	// MODEL
	//
	PlayerPerGameStats.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
            game: {id: ""},
            league: {},
            player: {id: ""},
            season: {},
            team: {id: ""},
            tournament: {},
            player_id: "",
            callahans: "",
            completed_passes_thrown: "",
            completion_percent: "",
            defense_plus_minus: "",
            drops: "",
            ds: "",
            goals_caught: "",
            goals_thrown: "",
            incomplete_passes_thrown: "",
            offense_plus_minus: "",
            passes_caught: "",
            passes_thrown: "",
            picked_up_disc: "",
            plus_minus: "",
            points_played: "",
            pulls: "",
            throwaways: "",
            turnovers: "",
		},
        idAttribute: "player_id", // The unique identifier in a collection is a player. A player who is on both
                                  // teams in the same game could cause problems here.
		urlRoot: Leaguevine.API.root + "stats/ultimate/player_stats_per_game",
	});

	//
	// COLLECTION
	//
	PlayerPerGameStats.Collection = Backbone.Collection.extend({
		model: PlayerPerGameStats.Model,
		urlRoot: Leaguevine.API.root + "stats/ultimate/player_stats_per_game",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
            if (this.game_ids) {
                url += "game_ids=[" + this.game_ids + "]&";
            }
            if (this.player_ids) {
                url += "player_ids[" + this.player_ids + "]&";
            }
			url += "limit=30&";
            url += "order_by=[-points_played, -goals_caught, -goals_thrown]";
			return url;
		},
		comparator: function(stat_line) {// Define how items in the collection will be sorted.
            return stat_line.get("points_played");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
        		this.game_ids = options.game_ids;
        		this.player_ids = options.player_ids;
    		}
		}
	});

	//
	// VIEWS
	//
	PlayerPerGameStats.Views.PlayerStats = Backbone.View.extend({
		template: "playerstats/per_game_stat_line",
		tagName: "tr",
		serialize: function() {return this.model.toJSON();}
	});
    PlayerPerGameStats.Views.BoxScore = Backbone.LayoutManager.View.extend({
        /* Usage:
         *     required arguments:
         *          collection - A collection of player stat lines
         *          game - The game object you are rendering a box score for
         */
		template: "playerstats/boxscore",
		className: "playerstats-boxscore-wrapper",
        serialize: function() {return this.options.game.toJSON();},
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
            var team_1_id = this.options.game.get("team_1_id");
            var team_2_id = this.options.game.get("team_2_id");
			this.collection.each(function(playerstats) {
                // Render a single line of stats for a player
                stat_line = new PlayerPerGameStats.Views.PlayerStats({model: playerstats});

                // Check which team's boxscore the stat line should be appended to
                if (playerstats.get("team_id") == team_1_id) {
                    view.insert("table#player_per_game_stats_1", stat_line);
                }
                else if (playerstats.get("team_id") == team_2_id) {
                    view.insert("table#player_per_game_stats_2", stat_line);
                }
			});
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});
    PlayerPerGameStats.Views.PlayerStatsList = Backbone.LayoutManager.View.extend({
		template: "playerstats/list",
		className: "stats_list_wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.collection.each(function(playerstats) {
				view.insert("table", new PlayerPerGameStats.Views.PlayerStats({
					model: playerstats
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

    return PlayerPerGameStats;
});
