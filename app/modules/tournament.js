define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/title",
  "modules/season"
],
function(namespace, Backbone, Leaguevine, Navigation, Title, Season) {
	var app = namespace.app;
	var Tournament = namespace.module();
	
	Tournament.Model = Backbone.RelationalModel.extend({
		//only has a season as child
		//is backref'd by game, and many-to-many to Team throuh TournTeam
		relations: [
			{
				key: 'season',
				relatedModel: Season.Model,
				type: Backbone.HasOne
			}
		],
		defaults: {
			name: '',
			start_date: '',
			end_date: '',
			info: ''
		}
	});
	
	Tournament.Collection = Backbone.Collection.extend({
		model: Tournament.Model,
		comparator: function(tournament) {
		  return tournament.get("name").toLowerCase();
		},
		urlRoot: Leaguevine.API.root + "tournaments"
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
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Tournaments", right_btn_href: "#newtournament", right_btn_class: "add"}));
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
				".list_children": new Tournament.Views.Multilist({ games: tournament.games, teams: tournament.teams }),					
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
