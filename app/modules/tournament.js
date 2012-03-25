define([
	"require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/title",
  "modules/search",  
  "modules/tournteam",
  "modules/game"
],
function(require, namespace, Backbone, Leaguevine, Navigation, Title, Search) {
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

			var Search = require("modules/search");
			var myLayout = app.router.useLayout("nav_content");
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newtournament", name: "New"}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Tournaments"}));
			//myLayout.view(".content", new Tournament.Views.List ({collection: tournaments}));
			myLayout.view(".content", new Search.Views.SearchableList({collection: tournaments, CollectionClass: Tournament.Collection, ViewsListClass: Tournament.Views.List,
                            right_btn_class: "", right_btn_txt: "Create", right_btn_href: "#newtournament", search_object_name: "tournament"}));
			myLayout.render(function(el) {$("#main").html(el);});
		},
		showTournament: function (tournamentId) {
            tournament = new Tournament.Model({id: tournamentId});
            titlebarOptions = {title: tournament.get("name"), 
                               left_btn_href:"#tournaments", 
                               left_btn_class:"back", 
                               left_btn_txt:"Tournaments"};
            tournament.fetch({success: function (model, response) {
                // After the tournament has been fetched, render the nav-bar with the tournament's fetched name
                var myLayout = app.router.useLayout("div");
                titlebarOptions.title = model.get("name");
                myLayout.view("div", new Title.Views.Titlebar(titlebarOptions));
                myLayout.render(function(el) {$(".titlebar").html(el)});
                }
            });

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
				".titlebar": new Title.Views.Titlebar(titlebarOptions)
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
			this.$el.empty()
			this.collection.each(function(tournament) {
				view.insert("ul", new Tournament.Views.Item({ model: tournament}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
                if (Backbone.history.fragment == "tournaments") {
                    this.render();
                }
			}, this);
		}
	});
	Tournament.Views.Detail = Backbone.View.extend({  	
		template: "tournaments/detail",
		render: function(layout) {
            tournament = this.model.toJSON();
            // Create a human-readable date for this tournament
            tournament.start_date_string = '';
            if (tournament.start_date != '') {
                start_date = new Date(tournament.start_date);
                tournament.start_date_string = start_date.toLocaleDateString();
            }
            return layout(this).render(tournament);
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
			"click .bgames": "showGames",
        /*
			"click .bpools": "showPools",
			"click .bbrackets": "showBrackets"
            */
		},
        showGames: function(ev){
			$('.lbrackets').hide();
			$('.lpools').hide();
			$('.lstandings').hide();
            $('.lgames').show();
            $('.list_children button').removeClass('is_active');
            $('button.bgames').addClass('is_active');
        },
		showStandings: function(ev){
			$('.lbrackets').hide();
			$('.lpools').hide();
			$('.lgames').hide();
			$('.lstandings').show();
            $('.list_children button').removeClass('is_active');
            $('button.bstandings').addClass('is_active');
			//console.log("TODO: Show Standings");
		},
        /* 
        // Don't show these yet. To enable showing pools and brackets, we 
        // need to return lists of pools and brackets instead of games, and then style these.
		showPools: function(ev){
			$('.lstandings').hide();
			$('.lbrackets').hide();
			$('.lgames').hide();
			$('.lpools').show();
            $('.list_children button').removeClass('is_active');
            $('button.bpools').addClass('is_active');
			//console.log("TODO: Show Pools");
		},
		showBrackets: function(ev){
			$('.lstandings').hide();
			$('.lpools').hide();
			$('.lgames').hide();
			$('.lbrackets').show();
            $('.list_children button').removeClass('is_active');
            $('button.bbrackets').addClass('is_active');
			//console.log("TODO: Show Brackets")
		},
        */
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var TournTeam = require("modules/tournteam");
			var Game = require("modules/game");
			this.setViews({
				".lstandings": new TournTeam.Views.TeamList( {collection: this.options.tournteams} ),
				".lgames": new Game.Views.List( {collection: this.options.games} ),
                /*
				".lpools": new Game.Views.List( {collection: this.options.games} ),
				".lbrackets": new Game.Views.List( {collection: this.options.games} )
                */
			});
			return view.render().then(function(el) {
                /*
				$('.lpools').hide();
				$('.lbrackets').hide();
                */
				$('.lstandings').hide();
			});
		},
		initialize: function() {
			this.options.games.bind("reset", function() {this.render();}, this);
			this.options.tournteams.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Tournament;// Required, return the module for AMD compliance
});
