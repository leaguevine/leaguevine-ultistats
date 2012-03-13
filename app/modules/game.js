define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
],
function(require, namespace, Backbone, Leaguevine, Navigation) {
	var app = namespace.app;
	var Game = namespace.module();
	
	Game.Model = Backbone.Model.extend({
		defaults: {
			id: "",
			team_1_score: "",
			team_2_score: "",
			start_time: "",
			season: {},
			tournament: {},
			team_1: {name: ""},
			team_2: {name: ""}
			//pool, swiss_round, bracket
		},
		urlRoot: Leaguevine.API.root + "games",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (gameevents)
			return _.clone(this.attributes);
		}
	});
	
	Game.Collection = Backbone.Collection.extend({
		model: Game.Model,
		comparator: function(game) {// Define how items in the collection will be sorted.
		  return game.get("start_time");
		},
		urlRoot: Leaguevine.API.root + "games",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += '/?'
			if ( models && models.length ) {
				url += 'game_ids=' + JSON.stringify(models.pluck('id')) + '&';
			}
			if (this.season_id) {
				url += 'season_id=' + this.season_id + '&';
			}
			if (this.tournament_id) {
				url += 'tournament_id=' + this.tournament_id + '&';
			}
			if (this.team_1_id || this.team_2_id) {
				url += 'team_ids=%5B';
				if (this.team_1_id){url += this.team_1_id;}
				if (this.team_1_id && this.team_2_id){url += ',';}
				if (this.team_2_id){url += this.team_2_id;}
				url += '%5D&';
			}
			return url.substr(0,url.length-1);
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.season_id) {this.season_id = options.season_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
				if (options.team_1_id) {this.team_1_id = options.team_1_id;}
				if (options.team_2_id) {this.team_2_id = options.team_2_id;}
    		}
		}
	});
	
	Game.Router = Backbone.Router.extend({
		routes : {
			"games": "listGames", //List all games.
			"games/:gameId": "showGame" //Show detail for one game.
		},
		listGames: function () {//AFAIK we don't have any routers taking us here.
			games = new Game.Collection([],{season_id: Leaguevine.API.season_id});
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newgame", name: "New"}));
			myLayout.view(".content", new Game.Views.List ({collection: app.games}));//pass the List view a collection of (fetched) games.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showGame: function (gameId) {
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			//Prepare the data.
			game = new Game.Model({id: gameId});
			game.fetch();
			
			//TODO: Get some game stats.
			
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#editgame/"+gameId, name: "Edit"}),
				".detail": new Game.Views.Detail( {model: game}),
				".list_children": new Game.Views.Multilist({model: game})//TODO: add stats					
			});
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		}
	});
	Game.router = new Game.Router();// INITIALIZE ROUTER
  	
	//
	// VIEWS
	//
	Game.Views.Item = Backbone.View.extend({
		template: "games/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
	Game.Views.List = Backbone.LayoutManager.View.extend({
		template: "games/list",
		className: "games-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.collection.each(function(game) {//for each game in the collection.
				view.insert("ul", new Game.Views.Item({//Inserts the game into the ul in the list template.
					model: game//pass each game to a Item view instance.
				}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});
	Game.Views.Detail = Backbone.LayoutManager.View.extend({  	
		template: "games/detail",
		render: function(layout) {
			return layout(this).render(this.model.toJSON());
		},
		initialize: function() {
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		}
	});
	Game.Views.Multilist = Backbone.View.extend({
		template: "games/multilist",
		events: {
			"click .bteam_stats": "showTeamStats",
			"click .bplayer_stats": "showPlayerStats",
			"click .btrack_game": "trackGame"
		},
		showTeamStats: function(ev){
			$('.lplayer_stats').hide();
			$('.lteam_stats').show();
			console.log("TODO: Show Team Stats")
		},
		showPlayerStats: function(ev){
			$('.lteam_stats').hide();
			$('.lplayer_stats').show();
			console.log("TODO: Show Player Stats")
		},
		trackGame: function(ev) {
			app.router.navigate("#track/"+this.model.get('id'), true);
		},
		render: function(layout) {
			var view = layout(this);
			/*this.setViews({
				".players_list": new Player.Views.List( {collection: this.options.players} ),
				".games_list": new Game.Views.List( {collection: this.options.games} )
			});*/
			return view.render().then(function(el) {
				$('.lplayer_stats').hide();
			});
		},
		initialize: function() {
			//this.options.stats.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Game;// Required, return the module for AMD compliance
});
