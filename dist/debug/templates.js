this['JST'] = this['JST'] || {};

this['JST']['app/templates/commit/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (!model.get("commit").message) { ;__p.push('\n<td><strong>', model.get("message") ,'</strong></td>\n<td></td>\n'); } else { ;__p.push('\n<td><a href="https://github.com/', user ,'/', repo ,'/commit/', model.get("sha") ,'" target="_blank">', model.get("sha") ,'</a></td>\n<td><strong>', model.get("commit").message ,'</strong></td>\n'); } ;__p.push('\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/main.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="navbar navbar-fixed-top">\n  <div class="navbar-inner">\n    <div class="container-fluid">\n      <a class="brand" href="#"> GitHub Organization Viewer</a>\n      <span class="navbar-text">Backbone Boilerplate/LayoutManager Example</span>\n\n      <ul class="nav pull-right">\n        <li>\n          <a href="https://github.com/tbranyen/github-viewer">GitHub\n            Source</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n\n<div class="container-fluid">\n  <div class="row-fluid users"></div>\n  <div class="row-fluid content">\n    <aside class="span3 repos"></aside>\n    <section class="span9 commits"></section>\n  </div>\n\n  <hr>\n\n  <footer>\n    <p><a href="http://twitter.com/tbranyen" target="_blank">@tbranyen</a> | MIT License</p>\n  </footer>\n</div>\n\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/repo/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href="#">', model.get("name") ,'</a>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/repo/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (count) { ;__p.push('\n<h4>Repos (', count ,')</h4>\n<hr>\n'); } else { ;__p.push('\n<h4>No repos found.</h4>\n'); } ;__p.push('\n\n<ul class="nav nav-pills nav-stacked"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/user/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="btn btn-small btn-info"><i class="icon-user icon-white"></i> ', model.get("login") ,'</button>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/user/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="container-fluid well">\n  <div class="row">\n    <form class="span3 adjust">\n      <strong class="label">Enter an organization name:</strong>\n\n      <div class="input-append">\n        <input type="text" class="search-query org ', collection.status ,'"\n        name="org" value="', collection.org || "bocoup" ,'"><button\n          class="btn">Search</button>\n      </div>\n    </form>\n\n    <div class="span9">\n      <strong class="label">Select a user:</strong>\n      <ul class="user-list clearfix unstyled"></ul>\n    </div>\n  </div>\n</div>\n');}return __p.join('');
}(data, _)};