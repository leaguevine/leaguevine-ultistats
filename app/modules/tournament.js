define([
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/tournteam",
  "modules/game"
],
function(require, app, Backbone, Leaguevine, Navigation) {
    
	var Tournament = app.module();
	
	Tournament.Model = Backbone.Model.extend({
		defaults: {
			name: "",
			start_date: "",
			end_date: "",
			info: "",
			//season: {},
			tournteams: {},
			games: {}
		},
		urlRoot: Leaguevine.API.root + "tournaments",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		//If a tournament is saved to the API does it care about the teams and games?
		toJSON: function() {//get rid of tournteams
			return _.clone(this.attributes);
		}
	});
	
	Tournament.Collection = Backbone.Collection.extend({
		model: Tournament.Model,
		urlRoot: Leaguevine.API.root + "tournaments",
        url: function(models) {
            var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
            url += "/?"; 
            if ( models && models.length ) {
                url += "tournament_ids=" + JSON.stringify(models.pluck("id")) + "&";
            }
            if (this.name) {
                url += "name=" + this.name + "&";
            }           
            if (this.season_id) {
                url += "season_id=" + this.season_id + "&";
            }
            url += "limit=30&";
            url += "order_by=%5Bname,-season_id%5D&";
            url += "fields=%5Bid%2Cseason_id%2Cname%2Cstart_date%2Cend_date%2Cinfo%2Ctime_created%2C%20time_last_updated%5D&";
            return url;
        },
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
				this.name = options.name;
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
			var tournaments = new Tournament.Collection([],{season_id: Leaguevine.API.season_id});
			tournaments.fetch();

			//var Search = require("modules/search"); //If that module is an argument to this module's function then it does not need to be required again.
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "tournament", level: "list"}),
				".content_1": new Navigation.Views.SearchableList({collection: tournaments, CollectionClass: Tournament.Collection, ViewsListClass: Tournament.Views.List, search_object_name: "tournament"})
			});
			//myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newtournament", name: "New"}));
			//myLayout.view(".content", new Tournament.Views.List ({collection: tournaments}));
			//myLayout.view(".content", new Search.Views.SearchableList({collection: tournaments, CollectionClass: Tournament.Collection, ViewsListClass: Tournament.Views.List,
            //                right_btn_class: "", right_btn_txt: "Create", right_btn_href: "#newtournament", search_object_name: "tournament"}));
            //myLayout.render(function(el) {$("#main").html(el);});
            myLayout.render();
		},
		showTournament: function (tournamentId) {
            var tournament = new Tournament.Model({id: tournamentId});
            tournament.fetch();

			var TournTeam = require("modules/tournteam");
			var tournteams = new TournTeam.Collection([],{tournament_id: tournament.get("id")});
			tournteams.fetch();
			
			var Game = require("modules/game");
			var games = new Game.Collection([],{tournament_id: tournament.get("id")});
			games.fetch();
			
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				//".navbar": new Navigation.Views.Navbar({href: "#edittournament/"+tournamentId, name: "Edit"}),
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "tournament", level: "show", model: tournament}),
				".content_1": new Tournament.Views.Detail( {model: tournament}),
				".content_2": new Tournament.Views.Multilist({ games: games, tournteams: tournteams })
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
		}
	});
	Tournament.router = new Tournament.Router();// INITIALIZE ROUTER

	Tournament.Views.Item = Backbone.View.extend({
		template: "tournaments/item",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	Tournament.Views.List = Backbone.View.extend({
		template: "tournaments/list",
		initialize: function() {
			this.collection.on("reset", function() {
				if (Backbone.history.fragment == "tournaments") {this.render();}
			}, this);
		},
		cleanup: function() {
			this.collection.off(null, null, this);
		},
		className: "tournaments-wrapper",
		render: function(layout) {
			var view = layout(this);
			var filter_by = this.collection.name ? this.collection.name : "";
			//this.$el.empty();
			this.collection.each(function(tournament) {
				if (!filter_by || tournament.get("name").toLowerCase().indexOf(filter_by.toLowerCase()) != -1) {
					this.insertView("ul", new Tournament.Views.Item({ model: tournament}));
				}
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
			return view.render({ count: this.collection.length });
		}
	});
	Tournament.Views.Detail = Backbone.View.extend({
		template: "tournaments/detail",
		initialize: function() {
			this.model.on("change", this.render, this);
		},
		cleanup: function(){
			this.model.off(null, null, this);
		},
		render: function(layout) {
            var tournament = this.model.toJSON();
            // Create a human-readable date for this tournament
            tournament.start_date_string = "";
            if (tournament.start_date !== "") {
                var start_date = new Date(tournament.start_date);
                tournament.start_date_string = start_date.toLocaleDateString();
            }
            return layout(this).render(tournament);
		}
	});
	Tournament.Views.Multilist = Backbone.View.extend({
		template: "tournaments/multilist",
		initialize: function() {
			this.options.games.on("reset", this.render, this);
			this.options.tournteams.on("reset", this.render, this);
		},
		cleanup: function() {
			this.options.games.off(null, null, this);
			this.options.tourteams.off(null, null, this);
		},
		events: {
			"click .bstandings": "showStandings",
			"click .bgames": "showGames"
        /*
			"click .bpools": "showPools",
			"click .bbrackets": "showBrackets"
            */
		},
        showGames: function(ev){
			$(".lbrackets").hide();
			$(".lpools").hide();
			$(".lstandings").hide();
            $(".lgames").show();
            $("button.bstandings").removeClass("is_active");
            $("button.bgames").addClass("is_active");
        },
		showStandings: function(ev){
			$(".lbrackets").hide();
			$(".lpools").hide();
			$(".lgames").hide();
			$(".lstandings").show();
            $("button.bgames").removeClass("is_active");
            $("button.bstandings").addClass("is_active");
		},
        /* 
        // Don't show these yet. To enable showing pools and brackets, we 
        // need to return lists of pools and brackets instead of games, and then style these.
		showPools: function(ev){
			$(".lstandings").hide();
			$(".lbrackets").hide();
			$(".lgames").hide();
			$(".lpools").show();
            $(".list_children button").removeClass("is_active");
            $("button.bpools").addClass("is_active");
			//console.log("TODO: Show Pools");
		},
		showBrackets: function(ev){
			$(".lstandings").hide();
			$(".lpools").hide();
			$(".lgames").hide();
			$(".lbrackets").show();
            $(".list_children button").removeClass("is_active");
            $("button.bbrackets").addClass("is_active");
			//console.log("TODO: Show Brackets")
		},
        */
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var TournTeam = require("modules/tournteam");
			var Game = require("modules/game");
			this.setViews({
				".lstandings": new TournTeam.Views.TeamList( {collection: this.options.tournteams} ),
				".lgames": new Game.Views.List( {collection: this.options.games} )
                /*
				".lpools": new Game.Views.List( {collection: this.options.games} ),
				".lbrackets": new Game.Views.List( {collection: this.options.games} )
                */
			});
			return view.render().then(function(el) {
                /*
				$(".lpools").hide();
				$(".lbrackets").hide();
                */
				$(".lstandings").hide();
			});
		}
	});
	
	return Tournament;// Required, return the module for AMD compliance
});
