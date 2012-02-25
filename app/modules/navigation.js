define([
  "namespace",

  // Libs
  "use!backbone",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone, Game) {
	var app = namespace.app;
	var Navigation = namespace.module();
	
	Navigation.Views.Navbar = Backbone.View.extend({
    	template: "navbar/navbar",
    	//className: "navbar-wrapper",
    	href: "",
    	name: "",
	    render: function(layout) {
	    	var view = layout(this);
	    	return view.render({href: this.options.href, name: this.options.name});
	    },
	    initialize: function() {
    		this.bind("change", function() {
      			this.render();
    		}, this);
  		}
    });
    
	return Navigation;// Required, return the module for AMD compliance
});
