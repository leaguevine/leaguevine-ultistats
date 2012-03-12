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
		underscore: "../assets/js/libs/underscore",
		backbone: "../assets/js/libs/backbone",
	
		// 'use.js' for loading non-AMD
		use: "../assets/js/plugins/use" //https://github.com/tbranyen/use.js
	},

	use: { //Define configuration for each non-AMD script.
		//Module's require defines these with (e.g.) use!underscore
		underscore: {//If something use!underscore, it'll have access to _
			attach: "_"
		},
		
		backbone: {//If something use!backbone, it'll have access to Backbone
			deps: ["use!underscore", "jquery"],
			attach: function(_, $) {
				return Backbone;
			}
		},
    
		"plugins/backbone.layoutmanager": {//extends Backbone, probably will not be called.
			deps: ["use!backbone"]
		},

		"plugins/jquery.ba-throttle-debounce": {
			deps: ["jquery"]
		},
		
		"plugins/backbone-tastypie": {
			deps: ["use!backbone"]
		},
		
		"plugins/backbone-relational": {
			deps: ["use!backbone", "use!plugins/backbone-tastypie"]
		}
	}
});