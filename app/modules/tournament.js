define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/navigation",
  "modules/game",
  "modules/tournteam",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone, Navigation, Game, TournTeam) {
	var app = namespace.app;
	var Tournament = namespace.module();
	
	Tournament.Model = Backbone.Model.extend({
		defaults: {
			name: '',
			leaguevine_url: '',
			start_date: '',
			end_date: '',
			info: ''
		},
		url: function() {
			return app.api.root + "tournaments/" + this.id + "/?access_token=" + app.api.d_token();
		}
	});
	
	Tournament.Collection = Backbone.Collection.extend({
		model: Tournament.Model,
		url: function() {
			return app.api.root + "tournaments/?season_id=" + app.api.season_id + "&limit=200&access_token=" + app.api.d_token();
		},
		parse: function(resp, xhr) {
		  if (resp.objects) {
			return resp.objects;
		  }
		  return this.models;
		},
		comparator: function(tournament) {
		  return tournament.get("name").toLowerCase();
		}
	});
	
	Tournament.Router = Backbone.Router.extend({
		routes : {
			"tournaments": "listTournaments", //List all tournaments.
			"tournaments/:tournamentId": "showTournament" //Show detail for one tournament.
		},
		listTournaments: function () {
			app.tournaments = new Tournament.Collection();
			app.tournaments.fetch(); 
			
			var myLayout = app.router.useLayout("nav_content");
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newtournament", name: "New"}));
			myLayout.view(".content", new Tournament.Views.List ({collection: app.tournaments}));
			myLayout.render(function(el) {$("#main").html(el);});
		},
		showTournament: function (tournamentId) {
			if (!app.tournaments) {app.tournaments = new Tournament.Collection();}
			if (!app.tournaments.get(tournamentId)) {app.tournaments.add( [{id: parseInt(tournamentId)}] );}
			tournament = app.tournaments.get(tournamentId);
			tournament.fetch();
			tournament.games = new Game.Collection([],{tournament: tournament});
			tournament.games.fetch();
			tournament.teams = new TournTeam.Collection([],{tournament: tournament});
			tournament.teams.fetch();
			
			var myLayout = app.router.useLayout("nav_detail_list");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#edittournament/"+tournamentId, name: "Edit"}),
				".detail": new Tournament.Views.Detail( {model: tournament}),
				".list_children": new Tournament.Views.Multilist({ games: tournament.games, teams: tournament.teams })					
			});
			myLayout.render(function(el) {$("#main").html(el);});
		}
	});
	Tournament.router = new Tournament.Router();// INITIALIZE ROUTER
	
	Tournament.Views.Nav = Backbone.View.extend({
		template: "navbar/navbar"
	});
	Tournament.Views.Item = Backbone.View.extend({
		template: "tournaments/item",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	Tournament.Views.List = Backbone.LayoutManager.View.extend({
		template: "tournaments/list",
		className: "tournaments-wrapper",
		render: function(layout) {
			var view = layout(this);
			this.collection.each(function(tournament) {
				view.insert("ul", new Tournament.Views.Item({ model: tournament}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	Tournament.Views.Detail = Backbone.View.extend({  	
		template: "tournaments/detail",
		render: function(layout) {
			//this.model.toJSON().info is escaped HTML so we need to do something a little fancy to get the info in there.
			return layout(this).render(this.model.toJSON());
		},
		initialize: function() {
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		}
	});
	Tournament.Views.Multilist = Backbone.View.extend({
		template: "tournaments/multilist",
		events: {
			"click .bstandings": "showStandings",
			"click .bpools": "showPools",
			"click .bbrackets": "showBrackets"
		},
		showStandings: function(ev){
			$('.lbrackets').hide();
			$('.lpools').hide();
			$('.lstandings').show();
			//console.log("TODO: Show Standings");
		},
		showPools: function(ev){
			$('.lstandings').hide();
			$('.lbrackets').hide();
			$('.lpools').show();
			//console.log("TODO: Show Pools");
		},
		showBrackets: function(ev){
			$('.lstandings').hide();
			$('.lpools').hide();
			$('.lbrackets').show();
			//console.log("TODO: Show Brackets")
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.setViews({
				".lstandings": new TournTeam.Views.List( {collection: this.options.teams} ),
				".lpools": new Game.Views.List( {collection: this.options.games} ),
				".lbrackets": new Game.Views.List( {collection: this.options.games} )
			});
			return view.render().then(function(el) {
				$('.lpools').hide();
				$('.lbrackets').hide();
			});
		},
		initialize: function() {
			this.options.games.bind("reset", function() {this.render();}, this);
			this.options.teams.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Tournament;// Required, return the module for AMD compliance
});
