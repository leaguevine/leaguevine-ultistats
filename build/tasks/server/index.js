// ============================================================================
// TASKS
// ============================================================================

task.registerTask("server", "Run development server.", function(prop) {
 var props = ["server"];
  // If a prop was passed as the argument, use that sub-property of server.
  if (prop) { props.push(prop); }

  var options = config(props) || {};

  // Defaults set for server values
  var options = underscore.defaults(options, {
    favicon: "./favicon.ico",
    index: "./index.html",

    port: 8000,
    host: "127.0.0.1"
  });

  options.folders = options.folders || {};

  // Ensure folders have correct defaults
  options.folders = underscore.defaults(options.folders, {
    app: "./app",
    assets: "./assets",
    dist: "./dist"
  });

  options.files = options.files || {};

  // Ensure files have correct defaults
  options.files = underscore.defaults(options.files, {
    "app/config.js": "app/config.js"
  });

  // Run the server
  task.helper("server", options);

  // Fail task if errors were logged
  if (task.hadErrors()) { return false; }

  log.writeln("Listening on http://" + options.host + ":" + options.port);
});

// ============================================================================
// HELPERS
// ============================================================================
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

task.registerHelper("server", function(options) {
  // Require libraries
  var fs = require("fs");
  var express = require("express");
  var site = express.createServer();

  // Serve up the cache manifest
  site.get("/ultistats.appcache", function(req, res){
    res.header("Content-Type", "text/cache-manifest");
    res.sendfile('./ultistats.appcache');
  });

  // Map static folders
  Object.keys(options.folders).sort().reverse().forEach(function(key) {
    site.use("/" + key, express.static(options.folders[key]));
  });

  // Map static files
  if (typeof options.files == "object") {
    Object.keys(options.files).sort().reverse().forEach(function(key) {
      site.get("/" + key, function(req, res) {
        var filePath = options.files[key];
        if endsWith(filePath, '.js') {
          res.header("Content-Type", "text/javascript");
        }
        else if endsWith(filePath, '.css') {
          res.header("Content-Type", "text/css");
        }
        return res.sendfile(filePath);
      });
    });
  }

  // Serve favicon.ico
  site.use(express.favicon(options.favicon));

  // Ensure all routes go home, client side app..
  site.get("*", function(req, res) {
    fs.createReadStream(options.index).pipe(res);
  });

  // Actually listen
  site.listen(options.port, options.host);
});
