define([
  "app",

  // Libs
  "backbone",

  // Plugins
  "plugins/backbone.layoutmanager"
],
function(app, Backbone) {
    
	var Title = app.module();
	
	Title.Views.Titlebar = Backbone.View.extend({
        /* Usage:
         *      options:
         * 			model_class - (required) One of 'team', 'game', 'tournament', 'player', 'setting'
         * 			level - One of 'list', 'show', 'edit'
         * 			model - The model. Required for levels 'show' and 'edit'
         * With these arguments we can construct
         * title, left_btn_class, left_btn_href, left_btn_txt, right_btn_class, right_btn_href, right_btn_txt
         * 
         * title is either the name of the group (Teams, Games, Players, Tournaments, Settings) or it is the name of the model being viewed.
         * left_btn_href: empty if we are at a top level (i.e. Teams list, etc), takes us back to the list if we are at the item, or takes us back to the item if we are editing the item
         * left_btn_txt: if list then "", if at item then group name, if at edit then item name
         * left_btn_class: always "back" unless disabled.
         * right_btn_href: if list then newX, if item then editX/model.id, if edit then disabled
         * right_btn_txt: if list then "" (+ button used), if item then "Edit", if edit then disabled
         * right_btn_class: if list then "add", if item then ?, if edit then disabled.
         */
        
    	template: "titlebar/titlebar",
	    render: function(layout) {
	    	var view = layout(this);
	    	
	    	var my_class = this.options.model_class || null;
	    	var my_level = this.options.level || null;
	    	
	    	var my_title; //Title is from the dict if list, else it is
	    	var list_titles = {"team": "Teams", "game": "Games", "tournament": "Tournaments", "player": "Players", "setting": "Settings"}; 
	    	if (my_level === "list"){my_title = list_titles[my_class];}
	    	else if (my_level === "edit"){my_title = this.model.isNew() ? "Create" : "Edit";}
	    	else if (my_level == "show"){
	    		if (my_class === "player"){
	    			var this_first = this.model.get("first_name") || "";
		    		var this_last = this.model.get("last_name") || "";
		    		my_title = this_first + " " + this_last;
	    		} else {my_title = this.model.get("name") || "";}
	    	} else {my_title = "";}
	    	
	    	var lbc, lbh, lbt, rbc, rbh, rbt;
	    	var list_hrefs = {"team": "#teams", "game": "#games", "tournament": "#tournaments", "player": "#players", "setting": "#settings"};
	    	if (my_level === "list"){
	    		//Left button does not exist for list level.
	    		lbc = "disabled";
	    		lbh = "";
	    		lbt = "";
	    		//Right button is new/add for list
	    		rbc = "add";
	    		rbh = "#new" + my_class;
	    		rbt = "";//Doesn't matter because it'll be a plus button.
	    	} else if (my_level === "show"){
	    		//Left button is back to the list if we are viewing an item.
	    		lbc = "back";
	    		lbh = list_hrefs[my_class];
	    		lbt = list_titles[my_class];
	    		//Right button is Edit if we are viewing an item.
	    		rbc = ""; //No class for the 'edit' button.
	    		rbh = "#edit" + my_class + "/" + this.model.id;
	    		rbt = "Edit";
    		} else if (my_level === "edit"){
	    		//Left button is 'cancel' if we are editing.
	    		lbc = "back";
	    		lbh = list_hrefs[my_class];
	    		if (!this.model.isNew()){
	    			lbh = lbh + "/" + this.model.id;
	    		}
	    		lbt = "Cancel";
	    		//Right button does not exist for edit level
	    		rbc = "disabled";
	    		rbh = "";
	    		rbt = "";
	    	}
	    	
	    	// Some hacks until these features are implemented.
	    	if (my_level === "show" && my_class === "player"){
	    		lbc = "disabled"; //We currently do not have a generic list of players.
	    		rbc = "disabled"; //We currently do not have a page to edit a player.
    		}
    		if (my_class === "tournament"){
    			rbc = "disabled"; //We currently do not have pages to create or edit a tournament.
    		}
    		if (my_level === "show" && my_class === "game"){
    			rbc = "disabled"; //We do not hav a way to edit games.
    			if (this.model.get("tournament_id")){
    				lbh = "#tournaments/" + this.model.get("tournament_id");
	    			lbt = this.model.get("tournament").name ? this.model.get("tournament").name : "Tournament";
    			} else {lbc = "disabled";}//We do not have a generic list of games.
    		}
	    	
	    	return view.render({href: "",
                                title: my_title,
                                left_btn_href: lbh,
                                left_btn_txt: lbt,
                                left_btn_class: lbc,
                                right_btn_href: rbh,
                                right_btn_txt: rbt,
                                right_btn_class: rbc,
                               });
	    },
	    initialize: function() {
	    	if (this.model){
	    		this.model.bind("change", function() {
	      			this.render();
	    		}, this);
	    	}
  		}
    });
    
	return Title;// Required, return the module for AMD compliance
});
