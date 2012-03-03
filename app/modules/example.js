define([
  "namespace",

  // Libs
  "use!backbone"

  // Modules

  // Plugins
],

function(namespace, Backbone) {
	/******************
	* MODULE TEMPLATE *
	*******************/
	// var app = namespace.app;
	// var Module = namespace.module(); //Returned object is a custom module object containing a nested Views object.
	// Team.Model = Backbone.Model.extend({ /* ... */ });
	// Team.Collection = Backbone.Collection.extend({ /* ... */ });
	// Team.Router = Backbone.Router.extend({ /* ... */ });
	// Team.router = new Team.Router(); //initialize this router.
	// Team.Views.Something = Backbone.View.extend({ /* ... */ }) or Backbone.LayoutManager.View.extend

  // Create a new module
  var Example = namespace.module();

  // Example extendings
  Example.Model = Backbone.Model.extend({ /* ... */ });
  Example.Collection = Backbone.Collection.extend({ /* ... */ });
  Example.Router = Backbone.Router.extend({ /* ... */ });

/*
 * With Backbone.LayoutManager, a View's default render: function(layout){return layout(this).render();}
 * We should override render for anything more complex like variable fields in the view or iterating a collection.
 * If the View's template expects any JSON, then a JSON object must be passed as a parameter to .render()/
 * The following is an example view with some defaults explained.
	Example.Views.AView = Backbone.View.extend({
		template: "path/to/template",//Must specify the path to the template.
		className: "some-class-name",//Each top-level View in our layout is always wrapped in a div. We can give it a class.
		tagName: "div",//By default inserts the contents of our templates into a div. Can use another type.
		serialize: function() {return this.model.toJSON();},//looked for by render() if no argument is passed.
		render: function(layout) {return layout(this).render();},//Default render method.
		//render: function(layout) {return layout(this).render(this.model.toJSON());},//Combines the previous two lines, i.e., doesn't need serialize.
		initialize: function() { //It is necessary to bind a model's change to re-render the view because the model is fetched asynchronously.
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		},
		events: { click: "clickAction"}, //Bind this view's click to clickAction
		clickAction: function(ev){ //some click handling logic},//Handle the click.
	})
 */
  // This will fetch the tutorial template and render it.
  Example.Views.Tutorial = Backbone.View.extend({
    template: "app/templates/example.html",

    render: function(done) {
      var view = this;

      // Fetch the template, render it to the View element and call done.
      namespace.fetchTemplate(this.template, function(tmpl) {
        view.el.innerHTML = tmpl();

        // If a done function is passed, call it with the element
        if (_.isFunction(done)) {
          done(view.el);
        }
      });
    }
  });

  // Required, return the module for AMD compliance
  return Example;

});
