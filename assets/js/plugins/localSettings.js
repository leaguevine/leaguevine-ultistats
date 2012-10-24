(function($, _, Backbone) {
	Backbone.localSettings = {
        client_id: "62d916480768b01cb98250effb12c0", //Client ID registered on the developer pages
		redirect_uri: "http://ultistats.localhost/", //Redirect URI specified when registering
		//token: "b3abaadef8", //Optionally pass a working token to bypass the entire oauth process
		root: "http://api.playwithlv.com/v1/",
		base: "http://playwithlv.com/oauth2/authorize/?response_type=token&scope=universal",
		season_id: null,
		d_token: function() {//Modules will reference this dynamic token			
			if (!this.token) {
			    var stored_api = JSON.parse(localStorage.getItem("auth_object")); //Pull our token out of local storage if it exists.
			    _.extend(this,stored_api);
			}
			if (!this.token) {
		        this.login();
		        return false;
		    }
		    else {
		        return this.token;
		    }
		},
		is_logged_in: function() {//Returns true if the user is logged in and false if not
		if (!this.token) {
			var stored_api = JSON.parse(localStorage.getItem("auth_object"));
				_.extend(this, stored_api);
			}
		    return (this.token !== null && this.token !== undefined);
		},
		login: function() {//Redirects a user to the login screen
			localStorage.setItem("login_redirect", Backbone.history.fragment);
			window.location.href = this.base + "&client_id=" + this.client_id + "&redirect_uri=" + this.redirect_uri;
			//return false;
		},
		logout: function() {//Logs a user out by removing the locally stored token
		localStorage.removeItem("auth_object");
		    this.token = undefined;
		}
	}
})(window.$, window._, window.Backbone);