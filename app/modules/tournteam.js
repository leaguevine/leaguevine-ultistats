define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/tournament",
  "modules/team"
],
function(require, namespace, Backbone, Leaguevine) {
	var app = namespace.app;
	var TournTeam = namespace.module();
	TournTeam.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			final_standing: "",
			seed: "",
			tournament: {},
			team: {}
		},
		urlRoot: Leaguevine.API.root + "tournament_teams",
		url: function(models) {
			var url = this.urlRoot;
			if (this.tournament) {url+=this.tournament.id}
			url+="/";
			if (this.team) {url+=this.team.id}
			url+="/";
			return url;
		},
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			return _.clone(this.attributes);
		}
	});
	TournTeam.Collection = Backbone.Collection.extend({
		model: TournTeam.Model,
		urlRoot: Leaguevine.API.root + "tournament_teams",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?"
			if (this.team_id) {
				url += "team_ids=%5B" + this.team_id + "%5D&";
			}
			if (this.tournament_id) {
				url += "tournament_ids=%5B" + this.tournament_id + "%5D&";
			}
			return url.substr(0,url.length-1);
		},
		comparator: function(tournteam) {// Define how items in the collection will be sorted.
		  return tournteam.get("final_standing");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			var Team = require("modules/team");
			if (Team){
			output = _.map(resp, function (obj) {
				obj.team = new Team.Model(obj.team);
				return obj;
				},this);
			resp = output;}
			var Tournament = require("modules/tournament");
			output = _.map(resp, function (obj) {
					obj.tournament = new Tournament.Model(obj.tournament);
					return obj;
				},this);
			resp = output;
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.team_id) {this.team_id = options.team_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
    		}
		}
	});
	
	TournTeam.Views.Team = Backbone.View.extend({
		template: "tournteams/team",
		tagName: "tr",
        serialize: function() {
            tournteam = this.model.toJSON();
            tournteam.team = this.model.get("team").toJSON(); //Expand the team on the model as well
            return tournteam;
        }
	});
	TournTeam.Views.TeamList = Backbone.View.extend({//Renders the standings for a tournament
		template: "tournteams/list",
		className: "tournteams-wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.collection.each(function(team) {
				view.insert("table", new TournTeam.Views.Team({
					model: team
				}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {this.render();}, this);
		}
	});
	return TournTeam;
});
