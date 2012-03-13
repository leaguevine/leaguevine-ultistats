define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/navigation",
  "modules/title",
  
  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone, Navigation, Title) {
	var app = namespace.app;
	var Game = namespace.module();
	
	Game.Model = Backbone.Model.extend({
		defaults: {
			id: "",
			team_1: {
				id: "",
				name: ""
			},
			team_1_score: "",
			team_2: {
				id: "",
				name: ""
			},
			team_2_score: "",
			tournament: {
				id: "",
				name: "",
			},
			start_time: "",
			leaguevine_url: "",
			events: []
		},
		url: function() {
				return app.api.root + "games/" + this.id + "/?access_token=" + app.api.d_token();
				//TODO: Need a URL for making a new game.
			}
	});
	
	Game.Collection = Backbone.Collection.extend({
		model: Game.Model,
		url: function() {
			var temp_url = app.api.root + "games/?";
			var url_options = "";
			if (this.tournament) {url_options = url_options + "&tournament_id=" + this.tournament.id;}
			if (this.team) {url_options = url_options + "&team_ids=%5B" + this.team.id + "%5D";}
			if (this.pool) {url_options = url_options + "&pool_id=" + this.pool.id}
			if (this.bracket) {url_options = url_options + "&bracket_id=" + this.bracket.id}
			url_options = url_options + "&access_token=" + app.api.d_token();
			return temp_url + url_options.substring(1);
		},
		parse: function(resp, xhr) {
		  if (resp.objects) {
			return resp.objects;
		  }
		  return this.models;
		},
		initialize: function(models, options) {
		  if (models) {
			this.models = models;
		  }
		  if (options) {
		  	if (options.tournament) {this.tournament = options.tournament;}
			if (options.team) {this.team = options.team;}
		  }
		},
		comparator: function(game) {// Define how items in the collection will be sorted.
		  return game.get("start_time");
		}
	});
	
	Game.Router = Backbone.Router.extend({
		routes : {
			"games": "listGames", //List all games.
			"games/:gameId": "showGame" //Show detail for one game.
		},
		listGames: function () {
			app.games = new Game.Collection();
			app.games.fetch();
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newgame", name: "New"}));
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Games"}));
			myLayout.view(".content", new Game.Views.List ({collection: app.games}));//pass the List view a collection of (fetched) games.
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showGame: function (gameId) {
			//Prepare the data.
			if (!app.games) {app.games = new Game.Collection();}//Will create an empty collection.
			if (!app.games.get(gameId)) {app.games.add( [{id: parseInt(gameId)}] );}//Insert this game into the collection.
			game = app.games.get(gameId);
			game.fetch({success: function (model, response) {
                    // After the game has been fetched, render the nav-bar so the back button says tournament
                    // if the game is part of a tournament
                    var myLayout = app.router.useLayout("div");
                    myLayout.view("div", new Game.Views.Titlebar({model: model}));
                    myLayout.render(function(el) {$(".titlebar").html(el)});
                }
            });
			//TODO: Get some game stats.
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#editgame/"+gameId, name: "Edit"}),
				".detail": new Game.Views.Detail( {model: game}),
				".list_children": new Game.Views.Multilist({model: game})//TODO: add stats					
			});
			myLayout.view(".titlebar", new Game.Views.Titlebar({model: game}));
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
	Game.Views.Titlebar = Backbone.View.extend({
        template: "layouts/div", //Use an empty template for rendering since it's just a wrapper around Title.Views.Titlebar
        render: function(layout) { //Render the title for the game depending on if it is in a tournament or not
            var view = layout(this);
            var tournamentId = this.model.get('tournament_id');
            var left_btn_href = "#games";
            var left_btn_txt = "Games";
            if (tournamentId != null) {
                //Set the back button to point to this game's tournament if it is part of a tournament
                left_btn_href = "#tournaments/" + tournamentId;
                left_btn_txt = "Tournament";
            }
            this.setViews(
                {"div": new Title.Views.Titlebar({
                    title: "Game", 
                    left_btn_href: left_btn_href, 
                    left_btn_class: "back", 
                    left_btn_txt: left_btn_txt
                })
            });
            return view.render(function(el) {});
        },
		initialize: function() {
    		this.bind("change", function() {
      			this.render();
    		}, this);
  		}
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
            game = this.model.toJSON();
            if (game.start_time != "" ){ //parse the start time and make it human-readable
                start_time = new Date(game.start_time);
                minutes = start_time.getMinutes();
                if (minutes < 10) {minutes = '0' + minutes;}
                game.start_time_string = start_time.getHours() + ':' + minutes + ' ' + start_time.toLocaleDateString();
            }
            else {
                game.start_time_string = "";
            }
			return layout(this).render(game);
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
		},
		showTeamStats: function(ev){
			$('.lplayer_stats').hide();
			$('.lteam_stats').show();
            $('.list_children button').removeClass('is_active');
            $('button.bteam_stats').addClass('is_active');
			console.log("TODO: Show Team Stats")
		},
		showPlayerStats: function(ev){
			$('.lteam_stats').hide();
			$('.lplayer_stats').show();
            $('.list_children button').removeClass('is_active');
            $('button.bplayer_stats').addClass('is_active');
			console.log("TODO: Show Player Stats")
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
