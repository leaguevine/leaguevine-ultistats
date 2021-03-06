#Leaguevine Ultistats
v0.5

###Current Status:
The app is in use by several people though it is still under heavy development.
The biggest problem is syncing the data between offline and online.
There are several solutions in development but none of them are production ready.
[1](https://github.com/pxlpl/backbone.offline)
[2](https://github.com/Ask11/backbone.offline)
And my own used in this project.

I will wait for the first two to develop a little while I try another route.

###Getting started locally - Method 1 - Apache
1.  Download this repo.
2.  Update your system's httpd.conf to point to the leaguevine-ultistats directory. To open httpd.conf you need to use sudo:
```
> sudo vi /etc/apache2/httpd.conf
```
You need to change the DocumentRoot setting in two places within this file. Here's an example:
```
DocumentRoot "/Users/username/Documents/leaguevine-ultistats"
<Directory "/Users/username/Documents/leaguevine-ultistats">
...
</Directory>
```
Next, you need to change the AllowOverride setting. To do this, make sure this line exists in the httpd.conf file:
```
AllowOverride All
```
3.  Start the apache server. Doing so will automatically use the .htaccess file that comes with this repository.
```
> sudo apachectl -k start
```
4.  Point your browser to http://localhost (if you're using vhosts, you might serve out of http://ultistats.localhost)

###Getting started locally - Method 2 - grunt-bbb
Please note that this won't work, at least not entirely. The problem is that pushState is enabled and that requires rewrites.
It is probably possible to modify grunt-bbb to enable rewrites. That's up to you.
Alternatively, you can disable pushState and then prepend all of the links in this app with #. Here are some basic instructions, that will at least get you close:

1.  Download this repo.
2.  Follow the [bbb](https://github.com/tbranyen/backbone-boilerplate) [instructions to install](https://github.com/tbranyen/backbone-boilerplate/wiki/Installation).
    * Install npm
    * Install [grunt-bbb](https://github.com/backbone-boilerplate/grunt-bbb)
3.  Open a terminal/console, change to the directory where you downloaded the repo
4.
```
>bbb server
```
5.  Navigate your browser to http://localhost:8000

##Summary
Leaguevine Ultistats (lvus) is a Web App targeting mobile devices for tracking gameplay statistics in the sport of Ultimate.
It is in the early stages of development.

##Build
The recommended way to host this app is to first run a javascript build to combine, minify, and gzip all the javascript files. This is located under the 'dist' directory. To create a build under the 'dist' directory, run the following command:
```
> bbb release
```

##Frameworks/Libraries
This app is built atop the [Backbone.js framework](http://documentcloud.github.com/backbone/) which in turn depends on [Underscore.js](http://documentcloud.github.com/underscore/).
Modules are loaded [asynchronously](http://requirejs.org/docs/whyamd.html) using [Require.js](http://requirejs.org/docs/api.html).
I am using [@tbranyen](http://twitter.com/tbranyen)'s [Backbone-boilerplate](https://github.com/tbranyen/backbone-boilerplate) which includes a plugin to allow backbone and underscore to work with Require.
Finally, laying out views on the page is assisted by tbranyen's [Backbone.LayoutManager](https://github.com/tbranyen/backbone.layoutmanager).
Some more backbone documentation can be found [here](https://github.com/addyosmani/backbone-fundamentals/).

###Connecting to the Leaguevine API
This app comes with some default settings to automatically connect to the Leaguevine API. These defaults assume you will be serving these files at http://localhost:8000/ and that you wish to use the API client that Chad created. To serve this app at a different URL or to use your own client, you can create a localSettings.js file that sits in assets/js/plugins/. Here is an example file:

    /* localSettings.js */
    var localSettings = {
        Leaguevine: {
            API: {
                client_id: "26a25288917682b6d3abcdbf433de3", //Client ID registered on the developer pages
                redirect_uri: "http://ultistats.localhost:8000/", //Redirect URI specified when registering
                token: "d54191ebb0", //Optionally pass a working token to bypass the entire oauth process
            }
        }
    }

Place this file in the directory assets/js/plugins/
