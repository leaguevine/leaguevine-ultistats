/**
 * Backbone localStorage Adapter v1.0
 * https://github.com/jeromegn/Backbone.localStorage
 *
 * Adapted by Chadwick Boulay for Leaguevine Ultistats
 * https://github.com/leaguevine/leaguevine-ultistats
 */

(function(window) {
	var _, Backbone, exports;
	if ( typeof window === 'undefined' ) {
		_ = require( 'underscore' );
		Backbone = require( 'backbone' );
		exports = module.exports = Backbone;
	}
	else {
		var _ = window._;
		Backbone = window.Backbone;
		exports = window;
	}
	
	// Our Store is represented by a single JS object in *localStorage*. Create it
	// with a meaningful name, like the name you'd give a table.
	Backbone.LocalStore = function(name) {
		this.name = name;
		var store = localStorage.getItem(this.name);
		this.records = (store && store.split(",")) || [];
	}
	_.extend(Backbone.LocalStore.prototype, {

		// Save the current state of the **Store** to *localStorage*.
		save: function() {
			localStorage.setItem(this.name, this.records.join(","));
		},

		create: function(model) {
			if (!model.id) model.id = model.get('id');
			localStorage.setItem(this.name+"-"+model.id, JSON.stringify(model));
			this.records.push(model.id.toString());
			this.save();
			return model;
		},

		// Update a model by replacing its copy in `this.data`.
		update: function(model) {
			localStorage.setItem(this.name+"-"+model.id, JSON.stringify(model));
			if (!_.include(this.records, model.id.toString())) this.records.push(model.id.toString()); this.save();
			return model;
		},

		// Retrieve a model from `this.data` by id.
		find: function(model) {
			return JSON.parse(localStorage.getItem(this.name+"-"+model.id));
		},

		// Return the array of all models currently in storage.
		findAll: function() {
			return _.map(this.records, function(id){return JSON.parse(localStorage.getItem(this.name+"-"+id));}, this);
		},

		// Delete a model from `this.data`, returning it.
		destroy: function(model) {
			localStorage.removeItem(this.name+"-"+model.id);
			this.records = _.reject(this.records, function(record_id){return record_id == model.id.toString();});
			this.save();
			return model;
		}
	});
	
	Backbone.localSync = function(method, model, options, error) {
		// Backwards compatibility with Backbone <= 0.3.3
		if (typeof options == 'function') {
			options = {
				success: options,
				error: error
			};
		}
		var resp;
		var store = model.localStorage || model.collection.localStorage;
		switch (method) {
			case "read":    resp = model.id != undefined ? store.find(model) : store.findAll(); break;
			case "create":  resp = store.create(model);                            break;
			case "update":  resp = store.update(model);                            break;
			case "delete":  resp = store.destroy(model);                           break;
		}
		if (resp) {
			options.success(resp);
		} else {
			options.error("Record not found");
		}
	};
})(this);