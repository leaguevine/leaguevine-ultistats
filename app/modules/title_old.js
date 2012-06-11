define([
  "namespace",

  // Libs
  "use!backbone",

  // Plugins
  "use!plugins/backbone.layoutmanager"
],
function(namespace, Backbone) {
    "use strict";
	var app = namespace.app;
	var Title = namespace.module();
	
	Title.Views.Titlebar = Backbone.View.extend({
        /* Usage:
         *      options:
         *          title - (required) The title of the page
         *          left_btn_href - the link the left button goes to
         *          right_btn_href - the link the right button goes to
         *          left_btn_txt - the text of the left button
         *          right_btn_txt - the text of the right button
         *          left_btn_class - any additional classes for the left button
         *          right_btn_class - any additional classes for the right button
         *                         
         *      Special notes on left_btn_class and right_btn_class attributes:
         *          "back" - The class "back" added as a left_btn_class makes the left button point left
         *          "add" - This class turns a button into a "+"
         */
    	template: "titlebar/titlebar",
	    render: function(layout) {
	    	var view = layout(this);

            // Set some defaults for the buttons. All button parameters are optional
            if (typeof this.options.left_btn_class == "undefined" && typeof this.options.left_btn_txt == "undefined") {this.options.left_btn_class = "disabled"}
            if (typeof this.options.left_btn_href == "undefined") {this.options.left_btn_href = ""}
            if (typeof this.options.left_btn_txt == "undefined") {this.options.left_btn_txt = ""}
            if (typeof this.options.right_btn_class == "undefined" && typeof this.options.right_btn_txt == "undefined") {this.options.right_btn_class = "disabled"}
            if (typeof this.options.right_btn_href == "undefined") {this.options.right_btn_href = ""}
            if (typeof this.options.right_btn_txt == "undefined") {this.options.right_btn_txt = ""}
	    	return view.render({href: "",
                                title: this.options.title,
                                left_btn_href: this.options.left_btn_href,
                                left_btn_txt: this.options.left_btn_txt,
                                left_btn_class: this.options.left_btn_class,
                                right_btn_href: this.options.right_btn_href,
                                right_btn_txt: this.options.right_btn_txt,
                                right_btn_class: this.options.right_btn_class,
                               });
	    },
	    initialize: function() {
    		this.bind("change", function() {
      			this.render();
    		}, this);
  		}
    });
    
	return Title;// Required, return the module for AMD compliance
});
