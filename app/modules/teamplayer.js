define([
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/team",
  "modules/player"
],
function(namespace, Backbone, Team, Player) {
	var app = namespace.app;
	var TeamPlayer = namespace.module();
	
	//
	// MODEL
	//
	TeamPlayer.Model = Backbone.RelationalModel.extend({
		relations: [
			{
				key: 'team',
				relatedModel: Team.Model,
				type: Backbone.HasOne
			},
			{
				key: 'player',
				relatedModel: Player.Model,
				type: Backbone.HasOne
			}
		],
		defaults: {
			number: "",
		}
	});
	//
	// COLLECTION
	//
	TeamPlayer.Collection = Backbone.Collection.extend({
		model: TeamPlayer.Model
	});
	
	return TeamPlayer;
});
