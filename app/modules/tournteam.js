define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/tournament",
  "modules/team"
],
function(namespace, Backbone, Tournament, Team) {
	var app = namespace.app;
	var TournTeam = namespace.module();
	//
	// MODEL
	//
	TournTeam.Model = Backbone.RelationalModel.extend({
		relations: [
			{
				key: 'tournament',
				relatedModel: Tournament.Model,
				type: Backbone.HasOne
			},
			{
				key: 'team',
				relatedModel: Team.Model,
				type: Backbone.HasOne
			}
		],
		defaults: {// Include defaults for any attribute that will be rendered.
			final_standing: "",
			seed: ""
		},
		url: function() {
			var temp_url = app.api.root + "tournament_teams/";
			url_options = url_options + "/" + this.tournament.id + "/" + this.team.id + "/";
			return temp_url + "?access_token=" + app.api.d_token(); 
		}
	});
	//
	// COLLECTION
	//
	TournTeam.Collection = Backbone.Collection.extend({
		model: TournTeam.Model,
		url: function() {// It is necessary to define the URL so that we can get the data from the API using .fetch
			return app.api.root + "tournament_teams/?" + "tournament_ids=%5B" + this.tournament.id + "%5D&access_token=" + app.api.d_token();
		},
		parse: function(resp, xhr) {
		  if (resp.objects) {return resp.objects;}
		  return this.models;
		},
		comparator: function(tournteam) {return tournteam.get("final_standing");},
		initialize: function(models, options) {
			if (options) {
        		this.tournament = options.tournament;
    		}
		}
	});
	
	//
	// VIEWS
	//
	TournTeam.Views.Item = Backbone.View.extend({
		template: "tournteams/item",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	TournTeam.Views.List = Backbone.View.extend({
		template: "tournteams/list",
		className: "tournteams-wrapper",
		render: function(layout) {
			var view = layout(this);
			this.collection.each(function(team) {
				view.insert("ul", new TournTeam.Views.Item({
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