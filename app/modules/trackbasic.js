define([
	"require",
	"app",
	// Libs
	"backbone",
	// Modules
	"modules/leaguevine",
	"modules/navigation",
	"modules/game"
],
function(require, app, Backbone, Leaguevine) {
	
	var TrackBasic = app.module();
	
	TrackBasic.Router = Backbone.Router.extend({
		routes : {
			"basic/:gameId": "trackGame"
		},
		trackGame: function (gameId) {
            if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
                return;
            }
            
            //Load required modules.
			var Game = require("modules/game");
            var Navigation = require("modules/navigation");
            
			//Prepare the data.
			var game = new Game.Model({id: gameId});
			game.fetch();
			
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "/editgame/"+gameId, name: "Edit"}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "game", level: "show", model: game}),
				".content_1": new TrackBasic.Views.Main( {model: game})
			});
			myLayout.render();
		}
	});
	TrackBasic.router = new TrackBasic.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	TrackBasic.Views.Main = Backbone.View.extend({
		template: "trackbasic/main",
		initialize: function() {
			this.model.on("change", this.render, this);//RESET?
		},
		cleanup: function() {
			this.model.off(null, null, this);
		},
		render: function(layout) {
            var game = this.model.toJSON();
            if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			return layout(this).render(game);
		},
		events: {
			"click button": "changeScore"
       },
       changeScore: function(ev){
			var classlist = ev.srcElement.classList;
			var attr_name = classlist[0] + "_score";
			var og_score = this.model.get(attr_name);
			var score_modifier = classlist[1] == "increment" ? 1 : -1;
			this.model.set(attr_name, og_score + score_modifier);
			this.model.save();
       }
	});
	return TrackBasic;// Required, return the module for AMD compliance
});
