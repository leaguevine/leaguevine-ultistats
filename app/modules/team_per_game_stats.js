define([
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/stats",
],

function(require, app, Backbone, Leaguevine, Stats) {
	
	var TeamPerGameStats = app.module();
	
	//
	// MODEL
	//
	TeamPerGameStats.Model = Stats.BaseModel.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
            //game: {id: ""},
            game: {},
            league: {},
            season: {},
            //team: {id: ""},
            team: {},
            tournament: {},
            team_id: "",
            callahans: "",
            completed_passes_thrown: "",
            completion_percent: "",
            drops: "",
            ds: "",
            goals_caught: "",
            goals_thrown: "",
            losses: "",
            incomplete_passes_thrown: "",
            offense_plus_minus: "",
            opponent_callahans: "",
            opponent_completed_passes_thrown: "",
            opponent_drops: "",
            opponent_ds: "",
            opponent_passes_thrown: "",
            opponent_throwaways: "",
            opponent_turnovers: "",
            passes_caught: "",
            passes_thrown: "",
            points_allowed: "",
            points_scored: "",
            pulls: "",
            throwaways: "",
            timeouts: "",
            turnovers: "",
            wins: "",
        },
        idAttribute: "team_id", // The unique identifier in a collection is a team. 
        urlRoot: Leaguevine.API.root + "stats/ultimate/team_stats_per_game",
		toJSON: function() {
			obj = _.clone(this.attributes);
            comp_percent_float = parseFloat(obj.completion_percent); //Convert to float
            obj.completion_percent = String(Math.round(comp_percent_float*10)/10); //Round to 1 decimal point
            return obj
		}
    });
    
	//
	// COLLECTION
	//
	TeamPerGameStats.Collection = Backbone.Collection.extend({
		model: TeamPerGameStats.Model,
		urlRoot: Leaguevine.API.root + "stats/ultimate/team_stats_per_game",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
            if (this.team_ids) {
                url += "team_ids=[" + this.team_ids + "]&";
            }
            if (this.game_ids) {
                url += "game_ids=[" + this.game_ids + "]&";
            }
			url += "limit=30&";
            url += "order_by=[-game_id]";
			return url;
		},
		comparator: function(stat_line) {// Define how items in the collection will be sorted.
            return stat_line.get("game_id");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
        		this.team_ids = options.team_ids;
        		this.game_ids = options.game_ids;
    		}
		},
	});

	//
	// VIEWS
	//
	TeamPerGameStats.Views.TeamStats = Backbone.View.extend({
		template: "teamstats/per_game_stat_line",
		tagName: "tr",
		serialize: function() {return this.model.toJSON();}
	});
    TeamPerGameStats.Views.BoxScore = Backbone.View.extend({
        /* Usage:
         *     required arguments:
         *          collection - A collection of team stat lines
         */
		template: "teamstats/boxscore",
		className: "stats-boxscore-wrapper",
		render: function(layout) {
			var view = layout(this);
			// call .cleanup() on all child views, and remove all appended views
			// view.cleanup();
			this.collection.each(function(teamstats) {
                // Render a single line of stats for a team
                stat_line = new TeamPerGameStats.Views.TeamStats({model: teamstats});
                this.insertView("table#team_per_game_stats", stat_line);
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});

    return TeamPerGameStats;
});
