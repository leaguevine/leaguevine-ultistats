define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
],

function(require, namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var PlayerPerGameStats = namespace.module();
	
	//
	// MODEL
	//
	PlayerPerGameStats.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
            game: {},
            league: {},
            player: {},
            season: {},
            team: {},
            tournament: {},
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
		urlRoot: Leaguevine.API.root + "stats/ultimate/player_stats_per_game",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			return _.clone(this.attributes);
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
			url += '/?';
            if (this.game_ids) {
                url += 'game_ids=[' + this.game_ids + ']&';
            }
            if (this.player_ids) {
                url += 'player_ids[' + this.player_ids + ']&';
            }
			url += 'limit=30&';
            url += 'order_by=[-points_played, -goals_caught, -goals_thrown]';
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
		template: "playerstats/playerstats",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
    PlayerPerGameStats.Views.PlayerStatsList = Backbone.LayoutManager.View.extend({
		template: "playerstats/playerstatslist",
		className: "players-stats-wrapper",
		render: function(layout) {
			var view = layout(this);
			this.$el.empty();
			this.collection.each(function(playerstats) {
                //TODO: Check which team the player is on and append it to the appropriate list
				view.insert("ul", new PlayerPerGameStats.Views.PlayerStats({
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


});
