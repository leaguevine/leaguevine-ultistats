define([
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/tournament",
  "modules/team"
],
function(require, app, Backbone, Leaguevine) {
	
	var TournTeam = app.module();
	TournTeam.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			final_standing: "",
			seed: "",
			tournament_id: null,
			tournament: {},
			team_id: null,
			team: {}
		},
		urlRoot: Leaguevine.API.root + "tournament_teams",
		url: function(models) {
			var url = this.urlRoot;
			if (this.tournament) {url+=this.tournament.id;}
			url+="/";
			if (this.team) {url+=this.team.id;}
			url+="/";
			return url;
		},
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			var tt = _.clone(this.attributes);
			//delete tt.team;
			//delete tt.tournament;
			return tt;
		},
		associations: {
			"team_id": "team",
			"tournament_id": "tournament"
		}
	});
	TournTeam.Collection = Backbone.Collection.extend({
		model: TournTeam.Model,
		urlRoot: Leaguevine.API.root + "tournament_teams",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if (this.team_id) {
				url += "team_ids=%5B" + this.team_id + "%5D&";
			}
			if (this.tournament_id) {
				url += "tournament_ids=%5B" + this.tournament_id + "%5D&";
			}
			url += "fields=%5Bfinal_standing%2Cseed%2Ctournament_id%2Ctournament%2Cteam_id%2Cteam%2Ctime_created%2C%20time_last_updated%5D&";
			return url.substr(0,url.length-1);
		},
		comparator: function(tournteam) {// Define how items in the collection will be sorted.
			return tournteam.get("final_standing");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			/*
			var _this = this;
			if (this.team_id){resp = _.filter(resp, function(obj){
				return obj.team_id == _this.team_id;
			});}
			if (this.tournament_id){resp = _.filter(resp, function(obj){
				return obj.tournament_id == _this.tournament_id;
			});}*/
			
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
		initialize: function(){
			this.collection.on("reset", this.render, this);
		},
		cleanup: function(){
			this.collection.off(null, null, this);
		},
		className: "tournteams-wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(team) {
				this.insertView("table", new TournTeam.Views.Team({
					model: team
				}));
			}, this);
			return view.render({ count: this.collection.length });
		}
	});
	return TournTeam;
});
