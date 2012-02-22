#Leaguevine Ultistats
v0

###Current Status:
I am approaching version 0.1. There is not much here, but the major accomplishment is that I am finally thinking about Ultistats and the Leaguevine API instead of thinking about javascript and frameworks and plugins, etc. 

The app looks terrible and performs terribly. It looks terrible because I have yet to write any CSS. 
It performs terribly because every single tap communicates with the API. This should be a non-issue after v0.6 when the app will use local storage.


###Getting started locally.
1.  Download this repo.
2.  Download and install [node.js](http://nodejs.org/)
3.  Open a terminal/console, change to the directory where you downloaded the repo
4.  
```
>node build server
```
5.  Navigate your browser to http://localhost:8000
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

1. HTML elements' .clicks are bound to a function AND
    1. the function handles all data manipulation and rendering but never calls router.navigate(href) OR
    2. the function handles some or no data manipulation and rendering then calls router.navigate(href).
2.  HTML elements are themselves links and when the link is tapped or clicked
    1. the linked URL is navigated to by the browser. This is the same as following a bookmark (or a link shared between friends) OR
    2. the linked URL is intercepted, suppressed, and instead the relative URL is passed to router.navigate(href)

Then, for 1.2, 2.1, and 2.2, a Router matches the URL to a function and the function performs some data manipulation and rendering.
    
1.1 is not an option for pages we want to be bookmarkable because 1.1 never updates the address bar. 2.1 is absolutely necessary.  
We could use 2.1 exclusively by making every touchable thing a hyperlink but this is not performant because the browser would refresh the entire page for every tap.  
Instead, to improve performance we will use 2.2 for navigation to any page that we want to be bookmarkable. This has the advantage of allowing 2.1 to work for these pages.
Finally, for interaction that should not be bookmarkable (e.g., entering stats), we will use 1.1