define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/title",
  
  "modules/tournteam",
  "modules/game"
],
function(require, namespace, Backbone, Leaguevine, Navigation, Title) {
	var app = namespace.app;
	var Tournament = namespace.module();
	
	Tournament.Model = Backbone.Model.extend({
		defaults: {
			name: '',
			start_date: '',
			end_date: '',
			info: '',
			season: {},
			tournteams: {},
			games: {}
		},
		urlRoot: Leaguevine.API.root + "tournaments",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {//get rid of tournteams
			return _.clone(this.attributes);
		}
	});
	
	Tournament.Collection = Backbone.Collection.extend({
		model: Tournament.Model,
		urlRoot: Leaguevine.API.root + "tournaments",
		comparator: function(tournament) {
		  return tournament.get("name").toLowerCase();
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
        		this.season_id = options.season_id;
    		}
		}
	});
	
	Tournament.Router = Backbone.Router.extend({
		routes : {
			"tournaments": "listTournaments", //List all tournaments.
			"tournaments/:tournamentId": "showTournament" //Show detail for one tournament.
		},
		listTournaments: function () {
			// Prepare the data.
			tournaments = new Tournament.Collection([],{season_id: Leaguevine.API.season_id});
			tournaments.fetch();
			
			var myLayout = app.router.useLayout("nav_content");
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newtournament", name: "New"}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Tournaments", right_btn_href: "#newtournament", right_btn_class: "add"}));
			myLayout.view(".content", new Tournament.Views.List ({collection: tournaments}));
			myLayout.render(function(el) {$("#main").html(el);});
		},
		showTournament: function (tournamentId) {
			tournament = new Tournament.Model({id: tournamentId});
			tournament.fetch();
			
			var TournTeam = require("modules/tournteam");
			tournteams = new TournTeam.Collection([],{tournament_id: tournament.get('id')});
			tournteams.fetch();
			
			var Game = require("modules/game");
			games = new Game.Collection([],{tournament_id: tournament.get('id')});
			games.fetch();
			
			var myLayout = app.router.useLayout("nav_detail_list");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#edittournament/"+tournamentId, name: "Edit"}),
				".detail": new Tournament.Views.Detail( {model: tournament}),
				".list_children": new Tournament.Views.Multilist({ games: games, tournteams: tournteams }),					
				".titlebar": new Title.Views.Titlebar({title: tournament.get("name"), left_btn_href:"#tournaments", left_btn_class:"back", left_btn_txt:"Tournaments", 
					right_btn_href: "#edittournament/"+tournamentId, right_btn_txt: "Edit"})
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
			var TournTeam = require("modules/tournteam");
			var Game = require("modules/game");
			this.setViews({
				".lstandings": new TournTeam.Views.TeamList( {collection: this.options.tournteams} ),
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
			this.options.tournteams.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Tournament;// Required, return the module for AMD compliance
});
