#Leaguevine Ultistats
v0

###Current Status:
I am approaching version 0.1. There is not much here, but the major accomplishment is that I am finally thinking about Ultistats and the Leaguevine API instead of thinking about javascript and frameworks and plugins, etc. 

The app looks terrible and performs terribly. It looks terrible because I have yet to write any CSS. 
It performs terribly because every single tap communicates with the API. This should be a non-issue after v0.6 when the app will use local storage.

To run the app,
```
>node build server
```
Then navigate your browser to http://localhost:8000
The app will not work on any other URL:port unless I change the app's registration in the Leaguevine API.

The first time you use the app it will bring you to the Leaguevine site to get a token.
Thereafter it will load the default page, which is currently set to /#teams.

##Summary:
Leaguevine Ultistats (lvus) is a Web App targeting mobile devices for tracking gameplay statistics in the sport of Ultimate.
It is in the very early stages of development. Development will proceed in stages as follows:

1.  A simple read-only client with no user input. Requires constant communication with the Leaguevine API.
2.  Enable adding/editing teams/players and tournaments/games.
3.  Add the ability to track gameplay.
4.  Work on the navigation bar.
5.  Work on giving the app a clean and organized look.
6.  Replace Backbone.Sync with a WebSQL local storage that also communicates with the API. (some of this already exists in google wspl)
7.  Detect screen size and make the app work better with tablets, desktops, etc.
8.  More browser compatibility using html and css techniques used by h5bp.com/mobile. Also add the bookmark bubble.

Also in this directory you will be able to find some design documents, including

*  Screen wireframes (preliminary version available)
*  Model classes (available before v0.4 release)
*  Controller classes (available before v0.4 release)
*  State flow (available before v0.4 release)
*  data UML (available before v0.4 release)

##Frameworks/Libraries
This app is built atop the [Backbone.js framework](http://documentcloud.github.com/backbone/) which in turn depends on [Underscore.js](http://documentcloud.github.com/underscore/).
Modules are loaded [asynchronously](http://requirejs.org/docs/whyamd.html) using [Require.js](http://requirejs.org/docs/api.html).
Since Backbone and Underscore do not conform to the AMD specification, I am using [@tbranyen](http://twitter.com/tbranyen)'s [AMD version of these libraries](https://github.com/tbranyen/backbone-boilerplate/tree/amd).
Finally, laying out views on the page is assisted by tbranyen's [Backbone.LayoutManager](https://github.com/tbranyen/backbone.layoutmanager).

###Ultistats-specific notes
There are several ways to handle clicks/taps in a Backbone.js app
1.  HTML elements' .clicks are bound to a function AND
  	a.  The function handles all data manipulation and rendering but never calls router.navigate(href)
  	b.  The function handles some or no data manipulation and rendering then calls router.navigate(href).
2.  HTML elements are themselves links and when the link is tapped or clicked
  	a.  The linked URL is navigated to by the browser. This is the same as following a bookmark (or a link shared between friends)
  	b.  The linked URL is intercepted, suppressed, and instead the relative URL is passed to router.navigate(href)
  	
Since we want our pages to be bookmarkable, 1a is not an option because 1a never updates the address bar.
For 1b, 2a, and 2b, when the address bar URL is updated either by direct navigation (2a) or by router.navigate(href), the URL fragment is matched to a route (by a Router) and the function associated with the match is called.
  
Since we want to be able to follow bookmarks, we must at a minimum have routes that match any URLs we want to navigate to by bookmarks. These routes reside in each module's router.
To further complicate things, I can't seem to match routes such as lvus.com/teams/123 when navigating directly because, even though the Backbone instance still captures the URL request, it looks for all of the resources in lvus.com/teams/ instead of lvus.com/ . To avoid this problem I will turn off pushState.
  
Since we have route matching anyway, to minimize redundancy and to minimize page refreshes we will implement the following strategy:
1  Whenever we want the result of tap/click to render a page that is bookmarkable, let the tap/click be on a <a href="relative_URL">something</a> element. Navigating to this link will be intercepted, suppressed, and then the app will call router.navigate(href). Everything required to render the requested page will be performed by the matching route, but hopefully we can spare some fetching and rendering of things that are already present.
2  Whenever we want the result of a tap/click to not be bookmarkable (e.g. entering stats, sorting a table), then that element's .click will be bound to a function that does some data manipulation/rendering but does not call router.navigate(href)