// Set the require.js configuration for your application.
require.config({
	// Initialize the application with the main application file
	deps: ["main"], //Will call main.js as soon as require() is defined.

	paths: { //Tell require.js where to find scripts
		// JavaScript folders
		libs: "../assets/js/libs",
		plugins: "../assets/js/plugins",

		// Libraries
		jquery: "../assets/js/libs/jquery",
		lodash: "../assets/js/libs/lodash",
		backbone: "../assets/js/libs/backbone",
	},

	shim: {
		
		backbone: {
			deps: ["lodash", "jquery"],
			exports: "Backbone"
		},
    
		"plugins/backbone.layoutmanager": {
			deps: ["backbone"]
		},

		"plugins/backbone.localStorage": {
			deps: ["backbone"]
		},
		
		"plugins/backbone-tastypie": {
			deps: ["backbone"]
		},
		
		"plugins/backbone-relational": {
			deps: ["backbone", "plugins/backbone-tastypie"]
		},
		
/*		"plugins/spinner": {
			deps: ["jquery"]
		},
*/
		
		"plugins/backbone.websqlajax": {
			deps: ["backbone"]
		}
	}
});