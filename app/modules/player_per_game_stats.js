define([
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/stats"
],

function(require, app, Backbone, Leaguevine) {
	
	var PlayerPerGameStats = app.module();
	
	//
	// MODEL
	//
	PlayerPerGameStats.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
            game: {id: ""},
            //league: {},
            //player: {id: ""},
            player: {},
            //season: {},
            //team: {id: ""},
            //team: {},
            //tournament: {},
            player_id: "",
            callahans: "",
            completed_passes_thrown: "",
            completion_percent: "",
            defense_plus_minus: "",
            drops: "",
            ds: "",
            goals_caught: "",//*
            goals_thrown: "",//*
            incomplete_passes_thrown: "",
            offense_plus_minus: "",
            passes_caught: "",
            passes_thrown: "",
            picked_up_disc: "",
            plus_minus: "",
            points_played: "",
            pulls: "",
            throwaways: "",
            turnovers: ""
		},
        idAttribute: "player_id", // The unique identifier in a collection is a player. A player who is on both
                                  // teams in the same game could cause problems here.
		urlRoot: Leaguevine.API.root + "stats/ultimate/player_stats_per_game",
		
		toJSON: function(){
			var ppgs = _.clone(this.attributes);
			//delete ppgs.game;
			//delete ppgs.player;
			return ppgs;
		}
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
                url += "game_ids=%5B" + this.game_ids + "%5D&";
            }
            if (this.player_ids) {
                url += "player_ids%5B" + this.player_ids + "%5D&";
            }
			url += "limit=30&";
            url += "order_by=%5B-points_played,-goals_caught,-goals_thrown%5D";
            url += "&fields=%5Bplayer%2Cplayer_id%2Ccallahans%2Ccompleted_passes_thrown%2Ccompletion_percent%2Cdefense_plus_minus";
            url += "%2Cdrops%2Cds%2Cgoals_caught%2Cgoals_thrown%2Cincomplete_passes_thrown%2Coffense_plus_minus%2Cpasses_caught";
            url += "%2Cpasses_thrown%2Cpicked_up_disc%2Cplus_minus%2Cpoints_played%2Cpulls%2Cthrowaways%2Cturnovers%2Cteam_id%5D";
			return url;
		},
		comparator: function(stat_line) {// Define how items in the collection will be sorted.
            return 1-stat_line.get("points_played");
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
		serialize: function() {
			var ppgs = this.model.toJSON();
			ppgs.player = _.isFunction(this.model.get("player").get) ? this.model.get("player").toJSON() : this.model.get("player");
			return ppgs;
		}
	});
    PlayerPerGameStats.Views.BoxScore = Backbone.View.extend({
        /* Usage:
         *     required arguments:
         *          collection - A collection of player stat lines
         *          game - The game object you are rendering a box score for
         */
		template: "playerstats/boxscore",
		className: "playerstats-boxscore-wrapper",
        serialize: function() {//I think serialize is ignored if render is provided.
			var game = this.options.game.toJSON();
			if (this.options.game.get("team_1") !== null){
				game.team_1 = _.isFunction(this.options.game.get("team_1").get) ? this.options.game.get("team_1").toJSON() : this.options.game.get("team_1");
			}
			if (this.options.game.get("team_1") !== null){
				game.team_2 = _.isFunction(this.options.game.get("team_2").get) ? this.options.game.get("team_2").toJSON() : this.options.game.get("team_2");
			}
			if (this.options.game.get("tournament") !== null){
				game.tournament = _.isFunction(this.options.game.get("tournament").get) ? this.options.game.get("tournament").toJSON() : this.options.game.get("tournament");
			}
			return game;
		},
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			// view.cleanup();
            var team_1_id = this.options.game.get("team_1_id");
            var team_2_id = this.options.game.get("team_2_id");
			this.collection.each(function(playerstats) {
                // Render a single line of stats for a player
                stat_line = new PlayerPerGameStats.Views.PlayerStats({model: playerstats});

                // Check which team's boxscore the stat line should be appended to
                if (playerstats.get("team_id") == team_1_id) {
                    this.insertView("table#player_per_game_stats_1", stat_line);
                }
                else if (playerstats.get("team_id") == team_2_id) {
                    this.insertView("table#player_per_game_stats_2", stat_line);
                }
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
    PlayerPerGameStats.Views.PlayerStatsList = Backbone.View.extend({
		template: "playerstats/list",
		className: "stats_list_wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(playerstats) {
				this.insertView("table", new PlayerPerGameStats.Views.PlayerStats({
					model: playerstats
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

    return PlayerPerGameStats;
});
