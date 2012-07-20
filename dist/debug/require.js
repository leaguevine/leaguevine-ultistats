/**
 * almond 0.1.1 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                break;
                            }
                        }
                    }
                }

                foundMap = foundMap || starMap[nameSegment];

                if (foundMap) {
                    nameParts.splice(0, i, foundMap);
                    name = nameParts.join('/');
                    break;
                }
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

this['JST'] = this['JST'] || {};

this['JST']['app/templates/games/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="game_detail">\r\n    <div id="team1">\r\n        <div id="team1_name"><a href="/teams/', team_1.id ,'">', team_1.name ,'</a></div>\r\n        <div id="team1_score"><span>', team_1_score ,'</span></div>\r\n    </div>\r\n    <div id="team2">\r\n        <div id="team2_name"><a href="/teams/', team_2.id ,'">', team_2.name ,'</a></div>\r\n        <div id="team2_score"><span>', team_2_score ,'</span></div>\r\n    </div>\r\n    <div class="start_time">\r\n        <span>', start_time_string ,'</span>\r\n    </div>\r\n    <div class="game_tournament">\r\n        <span>'); if (tournament) { ;__p.push('', tournament.name ,''); } ;__p.push('</span>\r\n    </div>\r\n    <div>\r\n        <form action="/track/', id ,'">\r\n            <button class="button btrack_game">Take Stats</button>\r\n        </form>\r\n    </div>\r\n</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/edit.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="edit_area"></section>\r\n<section class="team_search_list"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/edit_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<form>\r\n    <label>Team 1:</label>\r\n    <h3 id="team1_txt"><span>', team_1.name ,'</span></h3>\r\n    <label>Team 2:</label>\r\n    <h3 id="team2_txt"><span>', team_2.name ,'</span></h3>\r\n    <label>Start Time:</label>\r\n    <input type="text" id="start_time" name="start_time" value="', start_time ,'" />\r\n    <button class="save">Save</button>\r\n    <button class="delete">Delete</button>\r\n</form>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/find.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="game_find_detail">\r\n    <form action="/teams">\r\n    <h2>Get started</h2>\r\n    <p>To get started, find or create your team.</p>\r\n        <button class="button">Find your team</button>\r\n    </form>\r\n    <form action="/tournaments">\r\n    <p>Or, search for your game by tournament</p>\r\n        <button class="button">Find your tournament</button>\r\n    </form>\r\n</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a class="game_list_item_link" href=\'/games/', id ,'\'>\r\n    <div class="game_list_team_name">'); if (team_1) { ;__p.push('', team_1.name ,''); } ;__p.push('</div>\r\n    <div class="game_list_icon_spacer">&nbsp</div>\r\n    <div class="game_list_team_score">', team_1_score ,'</div>\r\n    <div class="game_list_team_name">'); if (team_2) { ;__p.push('', team_2.name ,''); } ;__p.push('</div>\r\n    <div class="game_list_icon_spacer">&nbsp</div>\r\n    <div class="game_list_team_score">', team_2_score ,'</div>\r\n    <div class="game_list_start_time">', start_time_string ,'</div>\r\n</a>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="games-list obj-list"></ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\r\n    <table>\r\n        <tr>\r\n            <td>\r\n                <button class="button bplayer_stats is_active">Player Stats</button>\r\n            </td>\r\n            <td>\r\n                <button class="button bteam_stats">Team Stats</button>\r\n            </td>\r\n        </tr>\r\n    </table>\r\n</div>\r\n<div class="list lteam_stats"></div>\r\n<div class="list lplayer_stats"></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/div.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/main.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="navbar clearfix"></section>\r\n<section class="titlebar clearfix"></section>\r\n<section class="content_1 clearfix"></section>\r\n<section class="content_2 clearfix"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/nav_content.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="navbar clearfix"></section>\r\n<section class="titlebar clearfix"></section>\r\n<section class="content clearfix"></section>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/nav_detail_list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="navbar clearfix"></section>\r\n<section class="titlebar clearfix"></section>\r\n<section class="detail clearfix"></section>\r\n<section class="list_children clearfix"></section>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/tracked_game.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="track scoreboard"></section>\r\n<section class="track rotate_screen"></section>\r\n<section class="track main_section"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/leaguevine/more_items.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (num_items > 0) { ;__p.push('\r\n    <a id="more-items">\r\n        <div class="more-items-main-txt">Load ', num_items ,' More</div>\r\n        <div class="more-items-loading-txt">Loading...</div>\r\n    </a>\r\n'); } ;__p.push('\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/navigation/navbar.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="navbar-list">\r\n    <li>\r\n        <a href="', teams_href ,'" class="teams ', teams_class ,'">\r\n            Teams\r\n            <div>\r\n                <img '); if (teams_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/teams_list_white.png"'); } else { ;__p.push('src="/assets/img/icons/teams_list.png"'); } ;__p.push('>\r\n            </div>\r\n        </a>\r\n    </li>\r\n    <li>\r\n        <a href="', tournaments_href ,'" class="tournaments ', tournaments_class ,'">\r\n            Tournaments\r\n            <div>\r\n                <img '); if (tournaments_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/tournaments_icon_white.png"'); } else { ;__p.push('src="/assets/img/icons/tournaments_icon.png"'); } ;__p.push('>\r\n            </div>\r\n        </a>\r\n    </li>\r\n    <li>\r\n        <a href="', games_href ,'" class="games ', games_class ,'">\r\n            Games\r\n            <div>\r\n                <img '); if (games_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/games_icon_white.png"'); } else { ;__p.push('src="/assets/img/icons/games_icon.png"'); } ;__p.push('>\r\n            </div>\r\n        </a>\r\n    </li>\r\n    <li>\r\n        <a href="', settings_href ,'" class="settings ', settings_class ,'">\r\n            Settings\r\n            <div>\r\n                <img '); if (settings_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/settings_gear_white.png"'); } else { ;__p.push('src="/assets/img/icons/settings_gear.png"'); } ;__p.push('>\r\n            </div>\r\n        </a>\r\n    </li>\r\n</ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/navigation/searchable_list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="search_bar_wrapper">\r\n\t<input type="text" class="search_bar" id="object_search" name="search" placeholder="Search for a ', search_object_name ,'" />\r\n</div>\r\n<section class="object_list_area clearfix"></section>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/navigation/titlebar.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="title_body">\r\n    <h1 id="title_txt"><span>', title ,'</span></h1>\r\n    <div id="title_left_btn" class="btn ', left_btn_class ,'">\r\n        <div id="title_left_pointer"><span></span></div>\r\n        <a href="', left_btn_href ,'">\r\n            <span></span>\r\n            <p>', left_btn_txt ,'</p>\r\n        </a>\r\n    </div>\r\n    <div id="title_right_btn" class="btn ', right_btn_class ,'">\r\n        <a href="', right_btn_href ,'">\r\n            <span>&nbsp</span>\r\n            <p>', right_btn_txt ,'</p>\r\n        </a>\r\n    </div>\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<!--\r\n<ul>\r\n\t<li> DOB: ', birth_date ,'</li>\r\n\t<li> Height: ', height ,' cm</li>\r\n\t<li> Weight: ', weight ,' kg?</li>\r\n</ul>\r\n-->\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href=\'/players/', id ,'\'>\r\n    ', number ,' \r\n    ', first_name ,' \r\n    '); if (nickname) { ;__p.push('"', nickname ,'"'); } ;__p.push('\r\n    ', last_name ,'\r\n</a>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="players-list obj-list"></ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\r\n\t<button class="button bteams is_active">Teams</button>\r\n</div>\r\n<div class="list lteams"></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/playerstats/boxscore.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table id="player_per_game_stats_1" class="playerstats_list stats">\r\n    <tr class="table_name">\r\n        <td colspan=8 width="100%" >', team_1.name ,'</td>\r\n    </tr>\r\n    <tr class="column_headers">\r\n        <th width="40%" class="table_first_item">\r\n            PLAYER\r\n        </th>\r\n        <th width="12%">\r\n            COMP\r\n        </th>\r\n        <th width="8%">\r\n            PT\r\n        </th>\r\n        <th width="8%">\r\n            AST\r\n        </th>\r\n        <th width="8%">\r\n            Ds\r\n        </th>\r\n        <th width="8%">\r\n            TO\r\n        </th>\r\n        <th width="8%">\r\n            +/-\r\n        </th>\r\n        <th width="8%">\r\n            GLS\r\n        </th>\r\n    </th>\r\n</table>\r\n\r\n<table id="player_per_game_stats_2" class="playerstats_list stats">\r\n    <tr class="table_name">\r\n        <td colspan=8 width="100%" >', team_2.name ,'</td>\r\n    </tr>\r\n    <tr class="column_headers">\r\n        <th width="40%" class="table_first_item">\r\n            PLAYER\r\n        </th>\r\n        <th width="12%">\r\n            COMP\r\n        </th>\r\n        <th width="8%">\r\n            PT\r\n        </th>\r\n        <th width="8%">\r\n            AST\r\n        </th>\r\n        <th width="8%">\r\n            Ds\r\n        </th>\r\n        <th width="8%">\r\n            TO\r\n        </th>\r\n        <th width="8%">\r\n            +/-\r\n        </th>\r\n        <th width="8%">\r\n            GLS\r\n        </th>\r\n    </th>\r\n</table>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/playerstats/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table class="playerstats-list">\r\n    <tr>\r\n        <th width="60%">\r\n            Player\r\n        </th>\r\n        <th width="10%">\r\n            Goals\r\n        </th>\r\n        <th width="10%">\r\n            Assists\r\n        </th>\r\n        <th width="10%">\r\n            Ds\r\n        </th>\r\n        <th width="10%">\r\n            Turns\r\n        </th>\r\n    </th>\r\n</table>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/playerstats/per_game_stat_line.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<td class="table_first_item">\r\n    <a href="players/', player.id ,'">', player.first_name ,' '); if (player.nickname) { ;__p.push('"'); } ;__p.push('', player.nickname ,''); if (player.nickname) { ;__p.push('"'); } ;__p.push(' ', player.last_name ,'</a>\r\n</td>\r\n<td>\r\n    ', completed_passes_thrown ,'/', passes_thrown ,'\r\n</td>\r\n<td>\r\n    ', points_played ,'\r\n</td>\r\n<td>\r\n    ', goals_thrown ,'\r\n</td>\r\n<td>\r\n    ', ds ,'\r\n</td>\r\n<td>\r\n    ', turnovers ,'\r\n</td>\r\n<td>\r\n    ', plus_minus ,'\r\n</td>\r\n<td>\r\n    ', goals_caught ,'\r\n</td>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/settings/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (logged_in) { ;__p.push('\r\n<div id="logout_area">\r\n    <h2>You are logged in</h2>\r\n    <button id="logout" href="#">Log out</button>\r\n</div>\r\n'); } else { ;__p.push('\r\n<div id="logout_area">\r\n    <h2>Please log in</h2>\r\n    <button id="login" href="#">Log in</button>\r\n</div>\r\n'); } ;__p.push('\r\n<div id="battery_usage_area">\r\n    <h2>Set battery usage</h2>\r\n    <p>Sorry, this feature is not available at this time.</p>\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/settings/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="setting-list"></ul>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/settings/select.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<h2>', prompt ,'</h2><select></select>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/settings/toggleButton.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<h2>', btn.prompt ,'</h2><button>', btn.text ,'</button>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/player.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a class="team_player_list_link" href=\'players/', player.id ,'\'>\r\n    <span class="team_player_list_number">', number ,'</span>\r\n    <span class="team_player_list_name">\r\n        ', player.first_name ,' \r\n        '); if (player.nickname) { ;__p.push('"'); } ;__p.push('', player.nickname ,''); if (player.nickname) { ;__p.push('"'); } ;__p.push(' \r\n        ', player.last_name ,'\r\n    </span>\r\n</a>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/playerlist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="players-list obj-list"></ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/team.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href=\'teams/', team.id ,'\'>', team.name ,'</a>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/teamlist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="teams-list"></ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div>', info ,'</div>\r\n<div>\r\n\r\n    <!--\r\n    <form>\r\n        <button class="button bcreategame">Create a Game</button>\r\n    </form>\r\n    -->\r\n\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/edit.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<form>\r\n    <label>Name:</label>\r\n    <input type="text" id="name" name="name" value="', name ,'" required/>\r\n    <label>Info:</label>\r\n    <input type="text" id="info" name="info" value="', info ,'" />\r\n</form>\r\n<button class="save">Save</button>\r\n<button class="delete">Delete</button>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a class="teams_list_item_link">\r\n    <div class="teams_list_team_name">', name ,'</div>\r\n    <div class="teams_list_season_name">\r\n        ', season_name ,' ', league_name ,'\r\n    </div>\r\n</a>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="team-list obj-list"></ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\r\n    <table>\r\n        <tr>\r\n            <td>\r\n                <button class="button bgames is_active">Games</button>\r\n            </td>\r\n            <td>\r\n                <button class="button bplayers">Players</button>\r\n            </td>\r\n        </tr>\r\n    </table>\r\n</div>\r\n<div class="list lgames"></div>\r\n<div class="list lplayers"></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamstats/boxscore.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table id="team_per_game_stats" class="teamstats_list stats">\r\n    <tr class="table_name">\r\n        <td colspan=8 width="100%" >Team Stats</td>\r\n    </tr>\r\n    <tr class="column_headers">\r\n        <th width="40%" class="table_first_item">\r\n            TEAM\r\n        </th>\r\n        <th width="14%">\r\n            COMP\r\n        </th>\r\n        <th width="14%">\r\n            COMP%\r\n        </th>\r\n        <th width="8">\r\n            Ds\r\n        </th>\r\n        <th width="8%">\r\n            DRP\r\n        </th>\r\n        <th width="8%">\r\n            TA\r\n        </th>\r\n        <th width="8%">\r\n            TO\r\n        </th>\r\n    </th>\r\n</table>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamstats/per_game_stat_line.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<td class="table_first_item">\r\n    <a href="teams/', team.id ,'">', team.name ,'</a>\r\n</td>\r\n<td>\r\n    ', completed_passes_thrown ,'/', passes_thrown ,'\r\n</td>\r\n<td>\r\n    ', completion_percent ,'\r\n</td>\r\n<td>\r\n    ', ds ,'\r\n</td>\r\n<td>\r\n    ', drops ,'\r\n</td>\r\n<td>\r\n    ', throwaways ,'\r\n</td>\r\n<td>\r\n    ', turnovers ,'\r\n</td>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="tournament_start_date"><span>', start_date_string ,'</span></div>\r\n<div>', info ,'</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href=\'tournaments/', id ,'\'>', name ,'</a>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="tournament-list obj-list"></ul>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\r\n    <table>\r\n        <tr>\r\n            <td>\r\n                <button class="button bgames is_active">Games</button>\r\n            </td>\r\n            <td>\r\n                <button class="button bstandings">Standings</button>\r\n            </td>\r\n            <!--\r\n            <td>\r\n                <button class="button bpools">Pools</button>\r\n            </td>\r\n            <td>\r\n                <button class="button bbrackets">Brackets</button>\r\n            </td>\r\n            -->\r\n        </tr>\r\n    </table>\r\n</div>\r\n<div class="list lgames"></div>\r\n<div class="list lstandings"></div>\r\n<!--\r\n<div class="list lpools"></div>\r\n<div class="list lbrackets"></div>\r\n-->\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournteams/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table id="tournament_standings" class="tournteam-list">\r\n    <tr>\r\n        <th width="70%">\r\n            Team\r\n        </th>\r\n        <th width="15%">\r\n            Seed\r\n        </th>\r\n        <th width="15%">\r\n            Finish\r\n        </th>\r\n    </th>\r\n</table>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournteams/team.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<td>\r\n    <a href=\'teams/', team.id ,'\'>', team.name ,'</a>\r\n</td>\r\n<td>\r\n    ', seed ,'\r\n</td>\r\n<td>\r\n    ', final_standing ,'\r\n</td>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/action_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons main_action">\r\n    <div id="throw_prompt" class="action_prompt">\r\n        <div class="action_prompt_player">\r\n            ', player_string ,'\r\n        </div>\r\n        <div class="action_prompt_action">\r\n            ', action_string ,'\r\n        </div>\r\n    </div>\r\n    <button class="button completion">Complete Pass</button>\r\n\t<button class="button dropped_pass">Dropped pass</button>\r\n\t<button class="button defd_pass">D\'ed Pass</button>\r\n    <button class="button throwaway">\r\n        <span class="button_line_1">Untouched</span> \r\n        <span class="button_line_2">Throwaway</span>\r\n    </button>\r\n    <button class="button score">Score</button>\r\n</div>\r\n<div class="buttons alternate_action">\r\n    <div id="alternate_action_prompt" class="action_prompt">\r\n        <div class="action_prompt_action">What happened?</div>\r\n    </div>\r\n\t<button class="button unknown_turn">Unknown Turn</button>\r\n\t<button class="button stall">Stall</button>\r\n    <!-- Removed for simplicity for the first version \r\n        <button class="button foul">Foul/Violation</button>\r\n    -->\r\n\t<button class="button injury">Injury</button>\r\n\t<button class="button timeout">Timeout</button>\r\n\t<button class="button end_of_period">End of Period ', per_num ,'</button>\r\n</div>\r\n<div class="buttons extra_actions">\r\n    <button class="button misc">Misc</button>\r\n    <button class="button undo">Undo</button>\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/game_action.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="playbyplay"></div>\r\n<div class="player_area"></div>\r\n<div class="action_area"></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/playbyplay.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="last_action_area">\r\n    <div class="last_action_label">Previous Play:</div>\r\n    <div class="last_action">', playtext ,'</div>\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/player_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="player_prompt">\r\n    <div class="player_prompt_action">\r\n        ', player_prompt ,'\r\n    </div>\r\n</div>\r\n<div class="player_area_1"></div>\r\n<div class="player_area_2"></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/player_button.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="button player" id="', player.id ,'"><span class="player_name">', player.first_name ,' ', player.last_name ,'</span><span class="player_number">', number ,'</span></button>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/roster.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="track roster_wrapper">\r\n    <div class="roster_team_header">\r\n        <span class="roster_team_name">\r\n            ', team.name ,'\r\n        </span>\r\n    </div>\r\n    <div class="roster_onfield_sum">\r\n    </div>\r\n    <div class="roster_wrapper">\r\n        <div class="roster_area"></div>\r\n    </div>\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/rostersum.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<span class="roster_onfield_sum_value">', onfield_sum ,' players in</span>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/roster_item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="roster_player player" id="', player_id ,'">\r\n    <span class="player_name" id="', player_id ,'">', player.first_name ,' ', player.last_name ,'</span>\r\n    <span class="player_number" id="', player_id ,'">', number ,'</span>\r\n</button>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/rotate_button.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="button rotate">', next_screen ,'</button>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/scoreboard.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="score_area">\r\n    <div class="name team1">', game.team_1.name ,'</div>\r\n    <div class="score team1">', game.team_1_score ,'</div>\r\n    <div class="score team2">', game.team_2_score ,'</div>\r\n    <div class="name team2">', game.team_2.name ,'</div>\r\n</div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/teamplayer_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="player_buttons"></ul>\r\n<div class="offense_teamname"><p>', team.name ,'</p></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/ul.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul></ul>');}return __p.join('');
}(data, _)};

/*!
 * jQuery JavaScript Library v1.7.2
 * http://jquery.com/
 *
 * Copyright 2011, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 * Copyright 2011, The Dojo Foundation
 * Released under the MIT, BSD, and GPL Licenses.
 *
 * Date: Wed Mar 21 12:46:34 2012 -0700
 */
(function( window, undefined ) {

// Use the correct document accordingly with window argument (sandbox)
var document = window.document,
	navigator = window.navigator,
	location = window.location;
var jQuery = (function() {

// Define a local copy of jQuery
var jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$,

	// A central reference to the root jQuery(document)
	rootjQuery,

	// A simple way to check for HTML strings or ID strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	quickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

	// Check if a string has a non-whitespace character in it
	rnotwhite = /\S/,

	// Used for trimming whitespace
	trimLeft = /^\s+/,
	trimRight = /\s+$/,

	// Match a standalone tag
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>)?$/,

	// JSON RegExp
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,

	// Useragent RegExp
	rwebkit = /(webkit)[ \/]([\w.]+)/,
	ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
	rmsie = /(msie) ([\w.]+)/,
	rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/,

	// Matches dashed string for camelizing
	rdashAlpha = /-([a-z]|[0-9])/ig,
	rmsPrefix = /^-ms-/,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return ( letter + "" ).toUpperCase();
	},

	// Keep a UserAgent string for use with jQuery.browser
	userAgent = navigator.userAgent,

	// For matching the engine and version of the browser
	browserMatch,

	// The deferred used on DOM ready
	readyList,

	// The ready event handler
	DOMContentLoaded,

	// Save a reference to some core methods
	toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty,
	push = Array.prototype.push,
	slice = Array.prototype.slice,
	trim = String.prototype.trim,
	indexOf = Array.prototype.indexOf,

	// [[Class]] -> type pairs
	class2type = {};

jQuery.fn = jQuery.prototype = {
	constructor: jQuery,
	init: function( selector, context, rootjQuery ) {
		var match, elem, ret, doc;

		// Handle $(""), $(null), or $(undefined)
		if ( !selector ) {
			return this;
		}

		// Handle $(DOMElement)
		if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		}

		// The body element only exists once, optimize finding it
		if ( selector === "body" && !context && document.body ) {
			this.context = document;
			this[0] = document.body;
			this.selector = selector;
			this.length = 1;
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			// Are we dealing with HTML string or an ID?
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = quickExpr.exec( selector );
			}

			// Verify a match, and that no context was specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;
					doc = ( context ? context.ownerDocument || context : document );

					// If a single string is passed in and it's a single tag
					// just do a createElement and skip the rest
					ret = rsingleTag.exec( selector );

					if ( ret ) {
						if ( jQuery.isPlainObject( context ) ) {
							selector = [ document.createElement( ret[1] ) ];
							jQuery.fn.attr.call( selector, context, true );

						} else {
							selector = [ doc.createElement( ret[1] ) ];
						}

					} else {
						ret = jQuery.buildFragment( [ match[1] ], [ doc ] );
						selector = ( ret.cacheable ? jQuery.clone(ret.fragment) : ret.fragment ).childNodes;
					}

					return jQuery.merge( this, selector );

				// HANDLE: $("#id")
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	},

	// Start with an empty selector
	selector: "",

	// The current version of jQuery being used
	jquery: "1.7.2",

	// The default length of a jQuery object is 0
	length: 0,

	// The number of elements contained in the matched element set
	size: function() {
		return this.length;
	},

	toArray: function() {
		return slice.call( this, 0 );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems, name, selector ) {
		// Build a new jQuery matched element set
		var ret = this.constructor();

		if ( jQuery.isArray( elems ) ) {
			push.apply( ret, elems );

		} else {
			jQuery.merge( ret, elems );
		}

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		ret.context = this.context;

		if ( name === "find" ) {
			ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
		} else if ( name ) {
			ret.selector = this.selector + "." + name + "(" + selector + ")";
		}

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Attach the listeners
		jQuery.bindReady();

		// Add the callback
		readyList.add( fn );

		return this;
	},

	eq: function( i ) {
		i = +i;
		return i === -1 ?
			this.slice( i ) :
			this.slice( i, i + 1 );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ),
			"slice", slice.call(arguments).join(",") );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: [].sort,
	splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {
		// Either a released hold or an DOMready/load event and not yet ready
		if ( (wait === true && !--jQuery.readyWait) || (wait !== true && !jQuery.isReady) ) {
			// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
			if ( !document.body ) {
				return setTimeout( jQuery.ready, 1 );
			}

			// Remember that the DOM is ready
			jQuery.isReady = true;

			// If a normal DOM Ready event fired, decrement, and wait if need be
			if ( wait !== true && --jQuery.readyWait > 0 ) {
				return;
			}

			// If there are functions bound, to execute
			readyList.fireWith( document, [ jQuery ] );

			// Trigger any bound ready events
			if ( jQuery.fn.trigger ) {
				jQuery( document ).trigger( "ready" ).off( "ready" );
			}
		}
	},

	bindReady: function() {
		if ( readyList ) {
			return;
		}

		readyList = jQuery.Callbacks( "once memory" );

		// Catch cases where $(document).ready() is called after the
		// browser event has already occurred.
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			return setTimeout( jQuery.ready, 1 );
		}

		// Mozilla, Opera and webkit nightlies currently support this event
		if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", jQuery.ready, false );

		// If IE event model is used
		} else if ( document.attachEvent ) {
			// ensure firing before onload,
			// maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", DOMContentLoaded );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", jQuery.ready );

			// If IE and not a frame
			// continually check to see if the document is ready
			var toplevel = false;

			try {
				toplevel = window.frameElement == null;
			} catch(e) {}

			if ( document.documentElement.doScroll && toplevel ) {
				doScrollCheck();
			}
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		return obj == null ?
			String( obj ) :
			class2type[ toString.call(obj) ] || "object";
	},

	isPlainObject: function( obj ) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!hasOwn.call(obj, "constructor") &&
				!hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key;
		for ( key in obj ) {}

		return key === undefined || hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		for ( var name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	parseJSON: function( data ) {
		if ( typeof data !== "string" || !data ) {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = jQuery.trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		if ( typeof data !== "string" || !data ) {
			return null;
		}
		var xml, tmp;
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && rnotwhite.test( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
	},

	// args is for internal usage only
	each: function( object, callback, args ) {
		var name, i = 0,
			length = object.length,
			isObj = length === undefined || jQuery.isFunction( object );

		if ( args ) {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.apply( object[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( object[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
						break;
					}
				}
			}
		}

		return object;
	},

	// Use native String.trim function wherever possible
	trim: trim ?
		function( text ) {
			return text == null ?
				"" :
				trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				text.toString().replace( trimLeft, "" ).replace( trimRight, "" );
		},

	// results is for internal usage only
	makeArray: function( array, results ) {
		var ret = results || [];

		if ( array != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			var type = jQuery.type( array );

			if ( array.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( array ) ) {
				push.call( ret, array );
			} else {
				jQuery.merge( ret, array );
			}
		}

		return ret;
	},

	inArray: function( elem, array, i ) {
		var len;

		if ( array ) {
			if ( indexOf ) {
				return indexOf.call( array, elem, i );
			}

			len = array.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in array && array[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var i = first.length,
			j = 0;

		if ( typeof second.length === "number" ) {
			for ( var l = second.length; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var ret = [], retVal;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( var i = 0, length = elems.length; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value, key, ret = [],
			i = 0,
			length = elems.length,
			// jquery objects are treated as arrays
			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( key in elems ) {
				value = callback( elems[ key ], key, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return ret.concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		if ( typeof context === "string" ) {
			var tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		var args = slice.call( arguments, 2 ),
			proxy = function() {
				return fn.apply( context, args.concat( slice.call( arguments ) ) );
			};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || proxy.guid || jQuery.guid++;

		return proxy;
	},

	// Mutifunctional method to get and set values to a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
		var exec,
			bulk = key == null,
			i = 0,
			length = elems.length;

		// Sets many values
		if ( key && typeof key === "object" ) {
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
			}
			chainable = 1;

		// Sets one value
		} else if ( value !== undefined ) {
			// Optionally, function values get executed if exec is true
			exec = pass === undefined && jQuery.isFunction( value );

			if ( bulk ) {
				// Bulk operations only iterate when executing function values
				if ( exec ) {
					exec = fn;
					fn = function( elem, key, value ) {
						return exec.call( jQuery( elem ), value );
					};

				// Otherwise they run against the entire set
				} else {
					fn.call( elems, value );
					fn = null;
				}
			}

			if ( fn ) {
				for (; i < length; i++ ) {
					fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
				}
			}

			chainable = 1;
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	},

	// Use of jQuery.browser is frowned upon.
	// More details: http://docs.jquery.com/Utilities/jQuery.browser
	uaMatch: function( ua ) {
		ua = ua.toLowerCase();

		var match = rwebkit.exec( ua ) ||
			ropera.exec( ua ) ||
			rmsie.exec( ua ) ||
			ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) ||
			[];

		return { browser: match[1] || "", version: match[2] || "0" };
	},

	sub: function() {
		function jQuerySub( selector, context ) {
			return new jQuerySub.fn.init( selector, context );
		}
		jQuery.extend( true, jQuerySub, this );
		jQuerySub.superclass = this;
		jQuerySub.fn = jQuerySub.prototype = this();
		jQuerySub.fn.constructor = jQuerySub;
		jQuerySub.sub = this.sub;
		jQuerySub.fn.init = function init( selector, context ) {
			if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
				context = jQuerySub( context );
			}

			return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
		};
		jQuerySub.fn.init.prototype = jQuerySub.fn;
		var rootjQuerySub = jQuerySub(document);
		return jQuerySub;
	},

	browser: {}
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

browserMatch = jQuery.uaMatch( userAgent );
if ( browserMatch.browser ) {
	jQuery.browser[ browserMatch.browser ] = true;
	jQuery.browser.version = browserMatch.version;
}

// Deprecated, use jQuery.browser.webkit instead
if ( jQuery.browser.webkit ) {
	jQuery.browser.safari = true;
}

// IE doesn't match non-breaking spaces with \s
if ( rnotwhite.test( "\xA0" ) ) {
	trimLeft = /^[\s\xA0]+/;
	trimRight = /[\s\xA0]+$/;
}

// All jQuery objects should point back to these
rootjQuery = jQuery(document);

// Cleanup functions for the document ready method
if ( document.addEventListener ) {
	DOMContentLoaded = function() {
		document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
		jQuery.ready();
	};

} else if ( document.attachEvent ) {
	DOMContentLoaded = function() {
		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( document.readyState === "complete" ) {
			document.detachEvent( "onreadystatechange", DOMContentLoaded );
			jQuery.ready();
		}
	};
}

// The DOM ready check for Internet Explorer
function doScrollCheck() {
	if ( jQuery.isReady ) {
		return;
	}

	try {
		// If IE is used, use the trick by Diego Perini
		// http://javascript.nwbox.com/IEContentLoaded/
		document.documentElement.doScroll("left");
	} catch(e) {
		setTimeout( doScrollCheck, 1 );
		return;
	}

	// and execute any waiting functions
	jQuery.ready();
}

return jQuery;

})();


// String to Object flags format cache
var flagsCache = {};

// Convert String-formatted flags into Object-formatted ones and store in cache
function createFlags( flags ) {
	var object = flagsCache[ flags ] = {},
		i, length;
	flags = flags.split( /\s+/ );
	for ( i = 0, length = flags.length; i < length; i++ ) {
		object[ flags[i] ] = true;
	}
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	flags:	an optional list of space-separated flags that will change how
 *			the callback list behaves
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible flags:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( flags ) {

	// Convert flags from String-formatted to Object-formatted
	// (we check in cache first)
	flags = flags ? ( flagsCache[ flags ] || createFlags( flags ) ) : {};

	var // Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = [],
		// Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Add one or several callbacks to the list
		add = function( args ) {
			var i,
				length,
				elem,
				type,
				actual;
			for ( i = 0, length = args.length; i < length; i++ ) {
				elem = args[ i ];
				type = jQuery.type( elem );
				if ( type === "array" ) {
					// Inspect recursively
					add( elem );
				} else if ( type === "function" ) {
					// Add if not in unique mode and callback is not in
					if ( !flags.unique || !self.has( elem ) ) {
						list.push( elem );
					}
				}
			}
		},
		// Fire callbacks
		fire = function( context, args ) {
			args = args || [];
			memory = !flags.memory || [ context, args ];
			fired = true;
			firing = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( context, args ) === false && flags.stopOnFalse ) {
					memory = true; // Mark as halted
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( !flags.once ) {
					if ( stack && stack.length ) {
						memory = stack.shift();
						self.fireWith( memory[ 0 ], memory[ 1 ] );
					}
				} else if ( memory === true ) {
					self.disable();
				} else {
					list = [];
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					var length = list.length;
					add( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away, unless previous
					// firing was halted (stopOnFalse)
					} else if ( memory && memory !== true ) {
						firingStart = length;
						fire( memory[ 0 ], memory[ 1 ] );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					var args = arguments,
						argIndex = 0,
						argLength = args.length;
					for ( ; argIndex < argLength ; argIndex++ ) {
						for ( var i = 0; i < list.length; i++ ) {
							if ( args[ argIndex ] === list[ i ] ) {
								// Handle firingIndex and firingLength
								if ( firing ) {
									if ( i <= firingLength ) {
										firingLength--;
										if ( i <= firingIndex ) {
											firingIndex--;
										}
									}
								}
								// Remove the element
								list.splice( i--, 1 );
								// If we have some unicity property then
								// we only need to do this once
								if ( flags.unique ) {
									break;
								}
							}
						}
					}
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				if ( list ) {
					var i = 0,
						length = list.length;
					for ( ; i < length; i++ ) {
						if ( fn === list[ i ] ) {
							return true;
						}
					}
				}
				return false;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory || memory === true ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( stack ) {
					if ( firing ) {
						if ( !flags.once ) {
							stack.push( [ context, args ] );
						}
					} else if ( !( flags.once && memory ) ) {
						fire( context, args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};




var // Static reference to slice
	sliceDeferred = [].slice;

jQuery.extend({

	Deferred: function( func ) {
		var doneList = jQuery.Callbacks( "once memory" ),
			failList = jQuery.Callbacks( "once memory" ),
			progressList = jQuery.Callbacks( "memory" ),
			state = "pending",
			lists = {
				resolve: doneList,
				reject: failList,
				notify: progressList
			},
			promise = {
				done: doneList.add,
				fail: failList.add,
				progress: progressList.add,

				state: function() {
					return state;
				},

				// Deprecated
				isResolved: doneList.fired,
				isRejected: failList.fired,

				then: function( doneCallbacks, failCallbacks, progressCallbacks ) {
					deferred.done( doneCallbacks ).fail( failCallbacks ).progress( progressCallbacks );
					return this;
				},
				always: function() {
					deferred.done.apply( deferred, arguments ).fail.apply( deferred, arguments );
					return this;
				},
				pipe: function( fnDone, fnFail, fnProgress ) {
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( {
							done: [ fnDone, "resolve" ],
							fail: [ fnFail, "reject" ],
							progress: [ fnProgress, "notify" ]
						}, function( handler, data ) {
							var fn = data[ 0 ],
								action = data[ 1 ],
								returned;
							if ( jQuery.isFunction( fn ) ) {
								deferred[ handler ](function() {
									returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise().then( newDefer.resolve, newDefer.reject, newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								});
							} else {
								deferred[ handler ]( newDefer[ action ] );
							}
						});
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					if ( obj == null ) {
						obj = promise;
					} else {
						for ( var key in promise ) {
							obj[ key ] = promise[ key ];
						}
					}
					return obj;
				}
			},
			deferred = promise.promise({}),
			key;

		for ( key in lists ) {
			deferred[ key ] = lists[ key ].fire;
			deferred[ key + "With" ] = lists[ key ].fireWith;
		}

		// Handle state
		deferred.done( function() {
			state = "resolved";
		}, failList.disable, progressList.lock ).fail( function() {
			state = "rejected";
		}, doneList.disable, progressList.lock );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( firstParam ) {
		var args = sliceDeferred.call( arguments, 0 ),
			i = 0,
			length = args.length,
			pValues = new Array( length ),
			count = length,
			pCount = length,
			deferred = length <= 1 && firstParam && jQuery.isFunction( firstParam.promise ) ?
				firstParam :
				jQuery.Deferred(),
			promise = deferred.promise();
		function resolveFunc( i ) {
			return function( value ) {
				args[ i ] = arguments.length > 1 ? sliceDeferred.call( arguments, 0 ) : value;
				if ( !( --count ) ) {
					deferred.resolveWith( deferred, args );
				}
			};
		}
		function progressFunc( i ) {
			return function( value ) {
				pValues[ i ] = arguments.length > 1 ? sliceDeferred.call( arguments, 0 ) : value;
				deferred.notifyWith( promise, pValues );
			};
		}
		if ( length > 1 ) {
			for ( ; i < length; i++ ) {
				if ( args[ i ] && args[ i ].promise && jQuery.isFunction( args[ i ].promise ) ) {
					args[ i ].promise().then( resolveFunc(i), deferred.reject, progressFunc(i) );
				} else {
					--count;
				}
			}
			if ( !count ) {
				deferred.resolveWith( deferred, args );
			}
		} else if ( deferred !== firstParam ) {
			deferred.resolveWith( deferred, length ? [ firstParam ] : [] );
		}
		return promise;
	}
});




jQuery.support = (function() {

	var support,
		all,
		a,
		select,
		opt,
		input,
		fragment,
		tds,
		events,
		eventName,
		i,
		isSupported,
		div = document.createElement( "div" ),
		documentElement = document.documentElement;

	// Preliminary tests
	div.setAttribute("className", "t");
	div.innerHTML = "   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>";

	all = div.getElementsByTagName( "*" );
	a = div.getElementsByTagName( "a" )[ 0 ];

	// Can't get basic test support
	if ( !all || !all.length || !a ) {
		return {};
	}

	// First batch of supports tests
	select = document.createElement( "select" );
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName( "input" )[ 0 ];

	support = {
		// IE strips leading whitespace when .innerHTML is used
		leadingWhitespace: ( div.firstChild.nodeType === 3 ),

		// Make sure that tbody elements aren't automatically inserted
		// IE will insert them into empty tables
		tbody: !div.getElementsByTagName("tbody").length,

		// Make sure that link elements get serialized correctly by innerHTML
		// This requires a wrapper element in IE
		htmlSerialize: !!div.getElementsByTagName("link").length,

		// Get the style information from getAttribute
		// (IE uses .cssText instead)
		style: /top/.test( a.getAttribute("style") ),

		// Make sure that URLs aren't manipulated
		// (IE normalizes it by default)
		hrefNormalized: ( a.getAttribute("href") === "/a" ),

		// Make sure that element opacity exists
		// (IE uses filter instead)
		// Use a regex to work around a WebKit issue. See #5145
		opacity: /^0.55/.test( a.style.opacity ),

		// Verify style float existence
		// (IE uses styleFloat instead of cssFloat)
		cssFloat: !!a.style.cssFloat,

		// Make sure that if no value is specified for a checkbox
		// that it defaults to "on".
		// (WebKit defaults to "" instead)
		checkOn: ( input.value === "on" ),

		// Make sure that a selected-by-default option has a working selected property.
		// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
		optSelected: opt.selected,

		// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
		getSetAttribute: div.className !== "t",

		// Tests for enctype support on a form(#6743)
		enctype: !!document.createElement("form").enctype,

		// Makes sure cloning an html5 element does not cause problems
		// Where outerHTML is undefined, this still works
		html5Clone: document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>",

		// Will be defined later
		submitBubbles: true,
		changeBubbles: true,
		focusinBubbles: false,
		deleteExpando: true,
		noCloneEvent: true,
		inlineBlockNeedsLayout: false,
		shrinkWrapBlocks: false,
		reliableMarginRight: true,
		pixelMargin: true
	};

	// jQuery.boxModel DEPRECATED in 1.3, use jQuery.support.boxModel instead
	jQuery.boxModel = support.boxModel = (document.compatMode === "CSS1Compat");

	// Make sure checked status is properly cloned
	input.checked = true;
	support.noCloneChecked = input.cloneNode( true ).checked;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Test to see if it's possible to delete an expando from an element
	// Fails in Internet Explorer
	try {
		delete div.test;
	} catch( e ) {
		support.deleteExpando = false;
	}

	if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
		div.attachEvent( "onclick", function() {
			// Cloning a node shouldn't copy over any
			// bound event handlers (IE does this)
			support.noCloneEvent = false;
		});
		div.cloneNode( true ).fireEvent( "onclick" );
	}

	// Check if a radio maintains its value
	// after being appended to the DOM
	input = document.createElement("input");
	input.value = "t";
	input.setAttribute("type", "radio");
	support.radioValue = input.value === "t";

	input.setAttribute("checked", "checked");

	// #11217 - WebKit loses check when the name is after the checked attribute
	input.setAttribute( "name", "t" );

	div.appendChild( input );
	fragment = document.createDocumentFragment();
	fragment.appendChild( div.lastChild );

	// WebKit doesn't clone checked state correctly in fragments
	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	support.appendChecked = input.checked;

	fragment.removeChild( input );
	fragment.appendChild( div );

	// Technique from Juriy Zaytsev
	// http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
	// We only care about the case where non-standard event systems
	// are used, namely in IE. Short-circuiting here helps us to
	// avoid an eval call (in setAttribute) which can cause CSP
	// to go haywire. See: https://developer.mozilla.org/en/Security/CSP
	if ( div.attachEvent ) {
		for ( i in {
			submit: 1,
			change: 1,
			focusin: 1
		}) {
			eventName = "on" + i;
			isSupported = ( eventName in div );
			if ( !isSupported ) {
				div.setAttribute( eventName, "return;" );
				isSupported = ( typeof div[ eventName ] === "function" );
			}
			support[ i + "Bubbles" ] = isSupported;
		}
	}

	fragment.removeChild( div );

	// Null elements to avoid leaks in IE
	fragment = select = opt = div = input = null;

	// Run tests that need a body at doc ready
	jQuery(function() {
		var container, outer, inner, table, td, offsetSupport,
			marginDiv, conMarginTop, style, html, positionTopLeftWidthHeight,
			paddingMarginBorderVisibility, paddingMarginBorder,
			body = document.getElementsByTagName("body")[0];

		if ( !body ) {
			// Return for frameset docs that don't have a body
			return;
		}

		conMarginTop = 1;
		paddingMarginBorder = "padding:0;margin:0;border:";
		positionTopLeftWidthHeight = "position:absolute;top:0;left:0;width:1px;height:1px;";
		paddingMarginBorderVisibility = paddingMarginBorder + "0;visibility:hidden;";
		style = "style='" + positionTopLeftWidthHeight + paddingMarginBorder + "5px solid #000;";
		html = "<div " + style + "display:block;'><div style='" + paddingMarginBorder + "0;display:block;overflow:hidden;'></div></div>" +
			"<table " + style + "' cellpadding='0' cellspacing='0'>" +
			"<tr><td></td></tr></table>";

		container = document.createElement("div");
		container.style.cssText = paddingMarginBorderVisibility + "width:0;height:0;position:static;top:0;margin-top:" + conMarginTop + "px";
		body.insertBefore( container, body.firstChild );

		// Construct the test element
		div = document.createElement("div");
		container.appendChild( div );

		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		// (only IE 8 fails this test)
		div.innerHTML = "<table><tr><td style='" + paddingMarginBorder + "0;display:none'></td><td>t</td></tr></table>";
		tds = div.getElementsByTagName( "td" );
		isSupported = ( tds[ 0 ].offsetHeight === 0 );

		tds[ 0 ].style.display = "";
		tds[ 1 ].style.display = "none";

		// Check if empty table cells still have offsetWidth/Height
		// (IE <= 8 fail this test)
		support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

		// Check if div with explicit width and no margin-right incorrectly
		// gets computed margin-right based on width of container. For more
		// info see bug #3333
		// Fails in WebKit before Feb 2011 nightlies
		// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
		if ( window.getComputedStyle ) {
			div.innerHTML = "";
			marginDiv = document.createElement( "div" );
			marginDiv.style.width = "0";
			marginDiv.style.marginRight = "0";
			div.style.width = "2px";
			div.appendChild( marginDiv );
			support.reliableMarginRight =
				( parseInt( ( window.getComputedStyle( marginDiv, null ) || { marginRight: 0 } ).marginRight, 10 ) || 0 ) === 0;
		}

		if ( typeof div.style.zoom !== "undefined" ) {
			// Check if natively block-level elements act like inline-block
			// elements when setting their display to 'inline' and giving
			// them layout
			// (IE < 8 does this)
			div.innerHTML = "";
			div.style.width = div.style.padding = "1px";
			div.style.border = 0;
			div.style.overflow = "hidden";
			div.style.display = "inline";
			div.style.zoom = 1;
			support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

			// Check if elements with layout shrink-wrap their children
			// (IE 6 does this)
			div.style.display = "block";
			div.style.overflow = "visible";
			div.innerHTML = "<div style='width:5px;'></div>";
			support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );
		}

		div.style.cssText = positionTopLeftWidthHeight + paddingMarginBorderVisibility;
		div.innerHTML = html;

		outer = div.firstChild;
		inner = outer.firstChild;
		td = outer.nextSibling.firstChild.firstChild;

		offsetSupport = {
			doesNotAddBorder: ( inner.offsetTop !== 5 ),
			doesAddBorderForTableAndCells: ( td.offsetTop === 5 )
		};

		inner.style.position = "fixed";
		inner.style.top = "20px";

		// safari subtracts parent border width here which is 5px
		offsetSupport.fixedPosition = ( inner.offsetTop === 20 || inner.offsetTop === 15 );
		inner.style.position = inner.style.top = "";

		outer.style.overflow = "hidden";
		outer.style.position = "relative";

		offsetSupport.subtractsBorderForOverflowNotVisible = ( inner.offsetTop === -5 );
		offsetSupport.doesNotIncludeMarginInBodyOffset = ( body.offsetTop !== conMarginTop );

		if ( window.getComputedStyle ) {
			div.style.marginTop = "1%";
			support.pixelMargin = ( window.getComputedStyle( div, null ) || { marginTop: 0 } ).marginTop !== "1%";
		}

		if ( typeof container.style.zoom !== "undefined" ) {
			container.style.zoom = 1;
		}

		body.removeChild( container );
		marginDiv = div = container = null;

		jQuery.extend( support, offsetSupport );
	});

	return support;
})();




var rbrace = /^(?:\{.*\}|\[.*\])$/,
	rmultiDash = /([A-Z])/g;

jQuery.extend({
	cache: {},

	// Please use with caution
	uuid: 0,

	// Unique for each copy of jQuery on the page
	// Non-digits removed to match rinlinejQuery
	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
		"applet": true
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var privateCache, thisCache, ret,
			internalKey = jQuery.expando,
			getByName = typeof name === "string",

			// We have to handle DOM nodes and JS objects differently because IE6-7
			// can't GC object references properly across the DOM-JS boundary
			isNode = elem.nodeType,

			// Only DOM nodes need the global jQuery cache; JS object data is
			// attached directly to the object so GC can occur automatically
			cache = isNode ? jQuery.cache : elem,

			// Only defining an ID for JS objects if its cache already exists allows
			// the code to shortcut on the same path as a DOM node with no cache
			id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey,
			isEvents = name === "events";

		// Avoid doing any more work than we need to when trying to get data on an
		// object that has no data at all
		if ( (!id || !cache[id] || (!isEvents && !pvt && !cache[id].data)) && getByName && data === undefined ) {
			return;
		}

		if ( !id ) {
			// Only DOM nodes need a new unique ID for each element since their data
			// ends up in the global cache
			if ( isNode ) {
				elem[ internalKey ] = id = ++jQuery.uuid;
			} else {
				id = internalKey;
			}
		}

		if ( !cache[ id ] ) {
			cache[ id ] = {};

			// Avoids exposing jQuery metadata on plain JS objects when the object
			// is serialized using JSON.stringify
			if ( !isNode ) {
				cache[ id ].toJSON = jQuery.noop;
			}
		}

		// An object can be passed to jQuery.data instead of a key/value pair; this gets
		// shallow copied over onto the existing cache
		if ( typeof name === "object" || typeof name === "function" ) {
			if ( pvt ) {
				cache[ id ] = jQuery.extend( cache[ id ], name );
			} else {
				cache[ id ].data = jQuery.extend( cache[ id ].data, name );
			}
		}

		privateCache = thisCache = cache[ id ];

		// jQuery data() is stored in a separate object inside the object's internal data
		// cache in order to avoid key collisions between internal data and user-defined
		// data.
		if ( !pvt ) {
			if ( !thisCache.data ) {
				thisCache.data = {};
			}

			thisCache = thisCache.data;
		}

		if ( data !== undefined ) {
			thisCache[ jQuery.camelCase( name ) ] = data;
		}

		// Users should not attempt to inspect the internal events object using jQuery.data,
		// it is undocumented and subject to change. But does anyone listen? No.
		if ( isEvents && !thisCache[ name ] ) {
			return privateCache.events;
		}

		// Check for both converted-to-camel and non-converted data property names
		// If a data property was specified
		if ( getByName ) {

			// First Try to find as-is property data
			ret = thisCache[ name ];

			// Test for null|undefined property data
			if ( ret == null ) {

				// Try to find the camelCased property
				ret = thisCache[ jQuery.camelCase( name ) ];
			}
		} else {
			ret = thisCache;
		}

		return ret;
	},

	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, i, l,

			// Reference to internal data cache key
			internalKey = jQuery.expando,

			isNode = elem.nodeType,

			// See jQuery.data for more information
			cache = isNode ? jQuery.cache : elem,

			// See jQuery.data for more information
			id = isNode ? elem[ internalKey ] : internalKey;

		// If there is already no cache entry for this object, there is no
		// purpose in continuing
		if ( !cache[ id ] ) {
			return;
		}

		if ( name ) {

			thisCache = pvt ? cache[ id ] : cache[ id ].data;

			if ( thisCache ) {

				// Support array or space separated string names for data keys
				if ( !jQuery.isArray( name ) ) {

					// try the string as a key before any manipulation
					if ( name in thisCache ) {
						name = [ name ];
					} else {

						// split the camel cased version by spaces unless a key with the spaces exists
						name = jQuery.camelCase( name );
						if ( name in thisCache ) {
							name = [ name ];
						} else {
							name = name.split( " " );
						}
					}
				}

				for ( i = 0, l = name.length; i < l; i++ ) {
					delete thisCache[ name[i] ];
				}

				// If there is no data left in the cache, we want to continue
				// and let the cache object itself get destroyed
				if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
					return;
				}
			}
		}

		// See jQuery.data for more information
		if ( !pvt ) {
			delete cache[ id ].data;

			// Don't destroy the parent cache unless the internal data object
			// had been the only thing left in it
			if ( !isEmptyDataObject(cache[ id ]) ) {
				return;
			}
		}

		// Browsers that fail expando deletion also refuse to delete expandos on
		// the window, but it will allow it on all other JS objects; other browsers
		// don't care
		// Ensure that `cache` is not a window object #10080
		if ( jQuery.support.deleteExpando || !cache.setInterval ) {
			delete cache[ id ];
		} else {
			cache[ id ] = null;
		}

		// We destroyed the cache and need to eliminate the expando on the node to avoid
		// false lookups in the cache for entries that no longer exist
		if ( isNode ) {
			// IE does not allow us to delete expando properties from nodes,
			// nor does it have a removeAttribute function on Document nodes;
			// we must handle all of these cases
			if ( jQuery.support.deleteExpando ) {
				delete elem[ internalKey ];
			} else if ( elem.removeAttribute ) {
				elem.removeAttribute( internalKey );
			} else {
				elem[ internalKey ] = null;
			}
		}
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return jQuery.data( elem, name, data, true );
	},

	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		if ( elem.nodeName ) {
			var match = jQuery.noData[ elem.nodeName.toLowerCase() ];

			if ( match ) {
				return !(match === true || elem.getAttribute("classid") !== match);
			}
		}

		return true;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var parts, part, attr, name, l,
			elem = this[0],
			i = 0,
			data = null;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attr = elem.attributes;
					for ( l = attr.length; i < l; i++ ) {
						name = attr[i].name;

						if ( name.indexOf( "data-" ) === 0 ) {
							name = jQuery.camelCase( name.substring(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		parts = key.split( ".", 2 );
		parts[1] = parts[1] ? "." + parts[1] : "";
		part = parts[1] + "!";

		return jQuery.access( this, function( value ) {

			if ( value === undefined ) {
				data = this.triggerHandler( "getData" + part, [ parts[0] ] );

				// Try to fetch any internally stored data first
				if ( data === undefined && elem ) {
					data = jQuery.data( elem, key );
					data = dataAttr( elem, key, data );
				}

				return data === undefined && parts[1] ?
					this.data( parts[0] ) :
					data;
			}

			parts[1] = value;
			this.each(function() {
				var self = jQuery( this );

				self.triggerHandler( "setData" + part, parts );
				jQuery.data( this, key, value );
				self.triggerHandler( "changeData" + part, parts );
			});
		}, null, value, arguments.length > 1, null, false );
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
				data === "false" ? false :
				data === "null" ? null :
				jQuery.isNumeric( data ) ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	for ( var name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}




function handleQueueMarkDefer( elem, type, src ) {
	var deferDataKey = type + "defer",
		queueDataKey = type + "queue",
		markDataKey = type + "mark",
		defer = jQuery._data( elem, deferDataKey );
	if ( defer &&
		( src === "queue" || !jQuery._data(elem, queueDataKey) ) &&
		( src === "mark" || !jQuery._data(elem, markDataKey) ) ) {
		// Give room for hard-coded callbacks to fire first
		// and eventually mark/queue something else on the element
		setTimeout( function() {
			if ( !jQuery._data( elem, queueDataKey ) &&
				!jQuery._data( elem, markDataKey ) ) {
				jQuery.removeData( elem, deferDataKey, true );
				defer.fire();
			}
		}, 0 );
	}
}

jQuery.extend({

	_mark: function( elem, type ) {
		if ( elem ) {
			type = ( type || "fx" ) + "mark";
			jQuery._data( elem, type, (jQuery._data( elem, type ) || 0) + 1 );
		}
	},

	_unmark: function( force, elem, type ) {
		if ( force !== true ) {
			type = elem;
			elem = force;
			force = false;
		}
		if ( elem ) {
			type = type || "fx";
			var key = type + "mark",
				count = force ? 0 : ( (jQuery._data( elem, key ) || 1) - 1 );
			if ( count ) {
				jQuery._data( elem, key, count );
			} else {
				jQuery.removeData( elem, key, true );
				handleQueueMarkDefer( elem, type, "mark" );
			}
		}
	},

	queue: function( elem, type, data ) {
		var q;
		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			q = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !q || jQuery.isArray(data) ) {
					q = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					q.push( data );
				}
			}
			return q || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			fn = queue.shift(),
			hooks = {};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
		}

		if ( fn ) {
			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			jQuery._data( elem, type + ".run", hooks );
			fn.call( elem, function() {
				jQuery.dequeue( elem, type );
			}, hooks );
		}

		if ( !queue.length ) {
			jQuery.removeData( elem, type + "queue " + type + ".run", true );
			handleQueueMarkDefer( elem, type, "queue" );
		}
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, object ) {
		if ( typeof type !== "string" ) {
			object = type;
			type = undefined;
		}
		type = type || "fx";
		var defer = jQuery.Deferred(),
			elements = this,
			i = elements.length,
			count = 1,
			deferDataKey = type + "defer",
			queueDataKey = type + "queue",
			markDataKey = type + "mark",
			tmp;
		function resolve() {
			if ( !( --count ) ) {
				defer.resolveWith( elements, [ elements ] );
			}
		}
		while( i-- ) {
			if (( tmp = jQuery.data( elements[ i ], deferDataKey, undefined, true ) ||
					( jQuery.data( elements[ i ], queueDataKey, undefined, true ) ||
						jQuery.data( elements[ i ], markDataKey, undefined, true ) ) &&
					jQuery.data( elements[ i ], deferDataKey, jQuery.Callbacks( "once memory" ), true ) )) {
				count++;
				tmp.add( resolve );
			}
		}
		resolve();
		return defer.promise( object );
	}
});




var rclass = /[\n\t\r]/g,
	rspace = /\s+/,
	rreturn = /\r/g,
	rtype = /^(?:button|input)$/i,
	rfocusable = /^(?:button|input|object|select|textarea)$/i,
	rclickable = /^a(?:rea)?$/i,
	rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
	getSetAttribute = jQuery.support.getSetAttribute,
	nodeHook, boolHook, fixSpecified;

jQuery.fn.extend({
	attr: function( name, value ) {
		return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	},

	prop: function( name, value ) {
		return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	},

	addClass: function( value ) {
		var classNames, i, l, elem,
			setClass, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call(this, j, this.className) );
			});
		}

		if ( value && typeof value === "string" ) {
			classNames = value.split( rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 ) {
					if ( !elem.className && classNames.length === 1 ) {
						elem.className = value;

					} else {
						setClass = " " + elem.className + " ";

						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							if ( !~setClass.indexOf( " " + classNames[ c ] + " " ) ) {
								setClass += classNames[ c ] + " ";
							}
						}
						elem.className = jQuery.trim( setClass );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classNames, i, l, elem, className, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call(this, j, this.className) );
			});
		}

		if ( (value && typeof value === "string") || value === undefined ) {
			classNames = ( value || "" ).split( rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 && elem.className ) {
					if ( value ) {
						className = (" " + elem.className + " ").replace( rclass, " " );
						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							className = className.replace(" " + classNames[ c ] + " ", " ");
						}
						elem.className = jQuery.trim( className );

					} else {
						elem.className = "";
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isBool = typeof stateVal === "boolean";

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					state = stateVal,
					classNames = value.split( rspace );

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space seperated list
					state = isBool ? state : !self.hasClass( className );
					self[ state ? "addClass" : "removeClass" ]( className );
				}

			} else if ( type === "undefined" || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// toggle whole className
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	},

	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var self = jQuery(this), val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, self.val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map(val, function ( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// attributes.value is undefined in Blackberry 4.7 but
				// uses .value. See #6932
				var val = elem.attributes.value;
				return !val || val.specified ? elem.value : elem.text;
			}
		},
		select: {
			get: function( elem ) {
				var value, i, max, option,
					index = elem.selectedIndex,
					values = [],
					options = elem.options,
					one = elem.type === "select-one";

				// Nothing was selected
				if ( index < 0 ) {
					return null;
				}

				// Loop through all the selected options
				i = one ? index : 0;
				max = one ? index + 1 : options.length;
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Don't return options that are disabled or in a disabled optgroup
					if ( option.selected && (jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) &&
							(!option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" )) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				// Fixes Bug #2551 -- select.val() broken in IE after form.reset()
				if ( one && !values.length && options.length ) {
					return jQuery( options[ index ] ).val();
				}

				return values;
			},

			set: function( elem, value ) {
				var values = jQuery.makeArray( value );

				jQuery(elem).find("option").each(function() {
					this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
				});

				if ( !values.length ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	},

	attrFn: {
		val: true,
		css: true,
		html: true,
		text: true,
		data: true,
		width: true,
		height: true,
		offset: true
	},

	attr: function( elem, name, value, pass ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( pass && name in jQuery.attrFn ) {
			return jQuery( elem )[ name ]( value );
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( notxml ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] || ( rboolean.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;

			} else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, "" + value );
				return value;
			}

		} else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {

			ret = elem.getAttribute( name );

			// Non-existent attributes return null, we normalize to undefined
			return ret === null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var propName, attrNames, name, l, isBool,
			i = 0;

		if ( value && elem.nodeType === 1 ) {
			attrNames = value.toLowerCase().split( rspace );
			l = attrNames.length;

			for ( ; i < l; i++ ) {
				name = attrNames[ i ];

				if ( name ) {
					propName = jQuery.propFix[ name ] || name;
					isBool = rboolean.test( name );

					// See #9699 for explanation of this approach (setting first, then removal)
					// Do not do this for boolean attributes (see #10870)
					if ( !isBool ) {
						jQuery.attr( elem, name, "" );
					}
					elem.removeAttribute( getSetAttribute ? name : propName );

					// Set corresponding property to false for boolean attributes
					if ( isBool && propName in elem ) {
						elem[ propName ] = false;
					}
				}
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				// We can't allow the type property to be changed (since it causes problems in IE)
				if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
					jQuery.error( "type property can't be changed" );
				} else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to it's default in case type is set after value
					// This is for element creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		},
		// Use the value property for back compat
		// Use the nodeHook for button elements in IE6/7 (#1954)
		value: {
			get: function( elem, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.get( elem, name );
				}
				return name in elem ?
					elem.value :
					null;
			},
			set: function( elem, value, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.set( elem, value, name );
				}
				// Does not return so that setAttribute is also used
				elem.value = value;
			}
		}
	},

	propFix: {
		tabindex: "tabIndex",
		readonly: "readOnly",
		"for": "htmlFor",
		"class": "className",
		maxlength: "maxLength",
		cellspacing: "cellSpacing",
		cellpadding: "cellPadding",
		rowspan: "rowSpan",
		colspan: "colSpan",
		usemap: "useMap",
		frameborder: "frameBorder",
		contenteditable: "contentEditable"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				return ( elem[ name ] = value );
			}

		} else {
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
				return ret;

			} else {
				return elem[ name ];
			}
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				var attributeNode = elem.getAttributeNode("tabindex");

				return attributeNode && attributeNode.specified ?
					parseInt( attributeNode.value, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						undefined;
			}
		}
	}
});

// Add the tabIndex propHook to attrHooks for back-compat (different case is intentional)
jQuery.attrHooks.tabindex = jQuery.propHooks.tabIndex;

// Hook for boolean attributes
boolHook = {
	get: function( elem, name ) {
		// Align boolean attributes with corresponding properties
		// Fall back to attribute presence where some booleans are not supported
		var attrNode,
			property = jQuery.prop( elem, name );
		return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
			name.toLowerCase() :
			undefined;
	},
	set: function( elem, value, name ) {
		var propName;
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			// value is true since we know at this point it's type boolean and not false
			// Set boolean attributes to the same name and set the DOM property
			propName = jQuery.propFix[ name ] || name;
			if ( propName in elem ) {
				// Only set the IDL specifically if it already exists on the element
				elem[ propName ] = true;
			}

			elem.setAttribute( name, name.toLowerCase() );
		}
		return name;
	}
};

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	fixSpecified = {
		name: true,
		id: true,
		coords: true
	};

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret;
			ret = elem.getAttributeNode( name );
			return ret && ( fixSpecified[ name ] ? ret.nodeValue !== "" : ret.specified ) ?
				ret.nodeValue :
				undefined;
		},
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				ret = document.createAttribute( name );
				elem.setAttributeNode( ret );
			}
			return ( ret.nodeValue = value + "" );
		}
	};

	// Apply the nodeHook to tabindex
	jQuery.attrHooks.tabindex.set = nodeHook.set;

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		});
	});

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		get: nodeHook.get,
		set: function( elem, value, name ) {
			if ( value === "" ) {
				value = "false";
			}
			nodeHook.set( elem, value, name );
		}
	};
}


// Some attributes require a special call on IE
if ( !jQuery.support.hrefNormalized ) {
	jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			get: function( elem ) {
				var ret = elem.getAttribute( name, 2 );
				return ret === null ? undefined : ret;
			}
		});
	});
}

if ( !jQuery.support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Normalize to lowercase since IE uppercases css property names
			return elem.style.cssText.toLowerCase() || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = "" + value );
		}
	};
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
	jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	});
}

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
if ( !jQuery.support.checkOn ) {
	jQuery.each([ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			get: function( elem ) {
				// Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
				return elem.getAttribute("value") === null ? "on" : elem.value;
			}
		};
	});
}
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	});
});




var rformElems = /^(?:textarea|input|select)$/i,
	rtypenamespace = /^([^\.]*)?(?:\.(.+))?$/,
	rhoverHack = /(?:^|\s)hover(\.\S+)?\b/,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rquickIs = /^(\w*)(?:#([\w\-]+))?(?:\.([\w\-]+))?$/,
	quickParse = function( selector ) {
		var quick = rquickIs.exec( selector );
		if ( quick ) {
			//   0  1    2   3
			// [ _, tag, id, class ]
			quick[1] = ( quick[1] || "" ).toLowerCase();
			quick[3] = quick[3] && new RegExp( "(?:^|\\s)" + quick[3] + "(?:\\s|$)" );
		}
		return quick;
	},
	quickIs = function( elem, m ) {
		var attrs = elem.attributes || {};
		return (
			(!m[1] || elem.nodeName.toLowerCase() === m[1]) &&
			(!m[2] || (attrs.id || {}).value === m[2]) &&
			(!m[3] || m[3].test( (attrs[ "class" ] || {}).value ))
		);
	},
	hoverHack = function( events ) {
		return jQuery.event.special.hover ? events : events.replace( rhoverHack, "mouseenter$1 mouseleave$1" );
	};

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	add: function( elem, types, handler, data, selector ) {

		var elemData, eventHandle, events,
			t, tns, type, namespaces, handleObj,
			handleObjIn, quick, handlers, special;

		// Don't attach events to noData or text/comment nodes (allow plain objects tho)
		if ( elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler || !(elemData = jQuery._data( elem )) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		events = elemData.events;
		if ( !events ) {
			elemData.events = events = {};
		}
		eventHandle = elemData.handle;
		if ( !eventHandle ) {
			elemData.handle = eventHandle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		// jQuery(...).bind("mouseover mouseout", fn);
		types = jQuery.trim( hoverHack(types) ).split( " " );
		for ( t = 0; t < types.length; t++ ) {

			tns = rtypenamespace.exec( types[t] ) || [];
			type = tns[1];
			namespaces = ( tns[2] || "" ).split( "." ).sort();

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: tns[1],
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				quick: selector && quickParse( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			handlers = events[ type ];
			if ( !handlers ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	global: {},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var elemData = jQuery.hasData( elem ) && jQuery._data( elem ),
			t, tns, type, origType, namespaces, origCount,
			j, events, special, handle, eventType, handleObj;

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = jQuery.trim( hoverHack( types || "" ) ).split(" ");
		for ( t = 0; t < types.length; t++ ) {
			tns = rtypenamespace.exec( types[t] ) || [];
			type = origType = tns[1];
			namespaces = tns[2];

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector? special.delegateType : special.bindType ) || type;
			eventType = events[ type ] || [];
			origCount = eventType.length;
			namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.)?") + "(\\.|$)") : null;

			// Remove matching events
			for ( j = 0; j < eventType.length; j++ ) {
				handleObj = eventType[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					 ( !handler || handler.guid === handleObj.guid ) &&
					 ( !namespaces || namespaces.test( handleObj.namespace ) ) &&
					 ( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					eventType.splice( j--, 1 );

					if ( handleObj.selector ) {
						eventType.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( eventType.length === 0 && origCount !== eventType.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			handle = elemData.handle;
			if ( handle ) {
				handle.elem = null;
			}

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery.removeData( elem, [ "events", "handle" ], true );
		}
	},

	// Events that are safe to short-circuit if no handlers are attached.
	// Native DOM events should not be added, they may have inline handlers.
	customEvent: {
		"getData": true,
		"setData": true,
		"changeData": true
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		// Don't do events on text and comment nodes
		if ( elem && (elem.nodeType === 3 || elem.nodeType === 8) ) {
			return;
		}

		// Event object or event type
		var type = event.type || event,
			namespaces = [],
			cache, exclusive, i, cur, old, ontype, special, handle, eventPath, bubbleType;

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "!" ) >= 0 ) {
			// Exclusive events trigger only for the exact event (no namespaces)
			type = type.slice(0, -1);
			exclusive = true;
		}

		if ( type.indexOf( "." ) >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}

		if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
			// No jQuery handlers for this event type, and it can't have inline handlers
			return;
		}

		// Caller can pass in an Event, Object, or just an event type string
		event = typeof event === "object" ?
			// jQuery.Event object
			event[ jQuery.expando ] ? event :
			// Object literal
			new jQuery.Event( type, event ) :
			// Just the event type (string)
			new jQuery.Event( type );

		event.type = type;
		event.isTrigger = true;
		event.exclusive = exclusive;
		event.namespace = namespaces.join( "." );
		event.namespace_re = event.namespace? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.)?") + "(\\.|$)") : null;
		ontype = type.indexOf( ":" ) < 0 ? "on" + type : "";

		// Handle a global trigger
		if ( !elem ) {

			// TODO: Stop taunting the data cache; remove global events and always attach to document
			cache = jQuery.cache;
			for ( i in cache ) {
				if ( cache[ i ].events && cache[ i ].events[ type ] ) {
					jQuery.event.trigger( event, data, cache[ i ].handle.elem, true );
				}
			}
			return;
		}

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data != null ? jQuery.makeArray( data ) : [];
		data.unshift( event );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		eventPath = [[ elem, special.bindType || type ]];
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			cur = rfocusMorph.test( bubbleType + type ) ? elem : elem.parentNode;
			old = null;
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push([ cur, bubbleType ]);
				old = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( old && old === elem.ownerDocument ) {
				eventPath.push([ old.defaultView || old.parentWindow || window, bubbleType ]);
			}
		}

		// Fire handlers on the event path
		for ( i = 0; i < eventPath.length && !event.isPropagationStopped(); i++ ) {

			cur = eventPath[i][0];
			event.type = eventPath[i][1];

			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}
			// Note that this is a bare JS function and not a jQuery handler
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( elem.ownerDocument, data ) === false) &&
				!(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				// IE<9 dies on focus/blur to hidden element (#1486)
				if ( ontype && elem[ type ] && ((type !== "focus" && type !== "blur") || event.target.offsetWidth !== 0) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					old = elem[ ontype ];

					if ( old ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( old ) {
						elem[ ontype ] = old;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event || window.event );

		var handlers = ( (jQuery._data( this, "events" ) || {} )[ event.type ] || []),
			delegateCount = handlers.delegateCount,
			args = [].slice.call( arguments, 0 ),
			run_all = !event.exclusive && !event.namespace,
			special = jQuery.event.special[ event.type ] || {},
			handlerQueue = [],
			i, j, cur, jqcur, ret, selMatch, matched, matches, handleObj, sel, related;

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers that should run if there are delegated events
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && !(event.button && event.type === "click") ) {

			// Pregenerate a single jQuery object for reuse with .is()
			jqcur = jQuery(this);
			jqcur.context = this.ownerDocument || this;

			for ( cur = event.target; cur != this; cur = cur.parentNode || this ) {

				// Don't process events on disabled elements (#6911, #8165)
				if ( cur.disabled !== true ) {
					selMatch = {};
					matches = [];
					jqcur[0] = cur;
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];
						sel = handleObj.selector;

						if ( selMatch[ sel ] === undefined ) {
							selMatch[ sel ] = (
								handleObj.quick ? quickIs( cur, handleObj.quick ) : jqcur.is( sel )
							);
						}
						if ( selMatch[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, matches: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( handlers.length > delegateCount ) {
			handlerQueue.push({ elem: this, matches: handlers.slice( delegateCount ) });
		}

		// Run delegates first; they may want to stop propagation beneath us
		for ( i = 0; i < handlerQueue.length && !event.isPropagationStopped(); i++ ) {
			matched = handlerQueue[ i ];
			event.currentTarget = matched.elem;

			for ( j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped(); j++ ) {
				handleObj = matched.matches[ j ];

				// Triggered event must either 1) be non-exclusive and have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( run_all || (!event.namespace && !handleObj.namespace) || event.namespace_re && event.namespace_re.test( handleObj.namespace ) ) {

					event.data = handleObj.data;
					event.handleObj = handleObj;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						event.result = ret;
						if ( ret === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	// *** attrChange attrName relatedNode srcElement  are not normalized, non-W3C, deprecated, will be removed in 1.8 ***
	props: "attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop,
			originalEvent = event,
			fixHook = jQuery.event.fixHooks[ event.type ] || {},
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = jQuery.Event( originalEvent );

		for ( i = copy.length; i; ) {
			prop = copy[ --i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Target should not be a text node (#504, Safari)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// For mouse/key events; add metaKey if it's not there (#3368, IE6/7/8)
		if ( event.metaKey === undefined ) {
			event.metaKey = event.ctrlKey;
		}

		return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		ready: {
			// Make sure the ready event is setup
			setup: jQuery.bindReady
		},

		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},

		focus: {
			delegateType: "focusin"
		},
		blur: {
			delegateType: "focusout"
		},

		beforeunload: {
			setup: function( data, namespaces, eventHandle ) {
				// We only want to do this special case on windows
				if ( jQuery.isWindow( this ) ) {
					this.onbeforeunload = eventHandle;
				}
			},

			teardown: function( namespaces, eventHandle ) {
				if ( this.onbeforeunload === eventHandle ) {
					this.onbeforeunload = null;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{ type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

// Some plugins are using, but it's undocumented/deprecated and will be removed.
// The 1.7 special event interface should provide all the hooks needed now.
jQuery.event.handle = jQuery.event.dispatch;

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		if ( elem.detachEvent ) {
			elem.detachEvent( "on" + type, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
			src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

function returnFalse() {
	return false;
}
function returnTrue() {
	return true;
}

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	preventDefault: function() {
		this.isDefaultPrevented = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}

		// if preventDefault exists run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// otherwise set the returnValue property of the original event to false (IE)
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		this.isPropagationStopped = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}
		// if stopPropagation exists run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}
		// otherwise set the cancelBubble property of the original event to true (IE)
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	},
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj,
				selector = handleObj.selector,
				ret;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !form._submit_attached ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					form._submit_attached = true;
				}
			});
			// return undefined since we don't need an event listener
		},
		
		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
							jQuery.event.simulate( "change", this, event, true );
						}
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !elem._change_attached ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					elem._change_attached = true;
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler while someone wants focusin/focusout
		var attaches = 0,
			handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				if ( attaches++ === 0 ) {
					document.addEventListener( orig, handler, true );
				}
			},
			teardown: function() {
				if ( --attaches === 0 ) {
					document.removeEventListener( orig, handler, true );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) { // && selector != null
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			var handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( var type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	live: function( types, data, fn ) {
		jQuery( this.context ).on( types, this.selector, data, fn );
		return this;
	},
	die: function( types, fn ) {
		jQuery( this.context ).off( types, this.selector || "**", fn );
		return this;
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length == 1? this.off( selector, "**" ) : this.off( types, selector, fn );
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		if ( this[0] ) {
			return jQuery.event.trigger( type, data, this[0], true );
		}
	},

	toggle: function( fn ) {
		// Save reference to arguments for access in closure
		var args = arguments,
			guid = fn.guid || jQuery.guid++,
			i = 0,
			toggler = function( event ) {
				// Figure out which function to execute
				var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
				jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );

				// Make sure that clicks stop
				event.preventDefault();

				// and execute the function
				return args[ lastToggle ].apply( this, arguments ) || false;
			};

		// link all the functions, so any of them can unbind this click handler
		toggler.guid = guid;
		while ( i < args.length ) {
			args[ i++ ].guid = guid;
		}

		return this.click( toggler );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
});

jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		if ( fn == null ) {
			fn = data;
			data = null;
		}

		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};

	if ( jQuery.attrFn ) {
		jQuery.attrFn[ name ] = true;
	}

	if ( rkeyEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.keyHooks;
	}

	if ( rmouseEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.mouseHooks;
	}
});



/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2011, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	expando = "sizcache" + (Math.random() + '').replace('.', ''),
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true,
	rBackslash = /\\/g,
	rReturn = /\r\n/g,
	rNonWord = /\W/;

// Here we check if the JavaScript engine is using some sort of
// optimization where it does not always call our comparision
// function. If that is the case, discard the hasDuplicate value.
//   Thus far that includes Google Chrome.
[0, 0].sort(function() {
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function( selector, context, results, seed ) {
	results = results || [];
	context = context || document;

	var origContext = context;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var m, set, checkSet, extra, ret, cur, pop, i,
		prune = true,
		contextXML = Sizzle.isXML( context ),
		parts = [],
		soFar = selector;

	// Reset the position of the chunker regexp (start from head)
	do {
		chunker.exec( "" );
		m = chunker.exec( soFar );

		if ( m ) {
			soFar = m[3];

			parts.push( m[1] );

			if ( m[2] ) {
				extra = m[3];
				break;
			}
		}
	} while ( m );

	if ( parts.length > 1 && origPOS.exec( selector ) ) {

		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context, seed );

		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] ) {
					selector += parts.shift();
				}

				set = posProcess( selector, set, seed );
			}
		}

	} else {
		// Take a shortcut and set the context if the root selector is an ID
		// (but not if it'll be faster if the inner selector is an ID)
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {

			ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ?
				Sizzle.filter( ret.expr, ret.set )[0] :
				ret.set[0];
		}

		if ( context ) {
			ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );

			set = ret.expr ?
				Sizzle.filter( ret.expr, ret.set ) :
				ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray( set );

			} else {
				prune = false;
			}

			while ( parts.length ) {
				cur = parts.pop();
				pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}

		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		Sizzle.error( cur || selector );
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );

		} else if ( context && context.nodeType === 1 ) {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && Sizzle.contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}

		} else {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}

	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function( results ) {
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort( sortOrder );

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[ i - 1 ] ) {
					results.splice( i--, 1 );
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function( expr, set ) {
	return Sizzle( expr, null, null, set );
};

Sizzle.matchesSelector = function( node, expr ) {
	return Sizzle( expr, null, null, [node] ).length > 0;
};

Sizzle.find = function( expr, context, isXML ) {
	var set, i, len, match, type, left;

	if ( !expr ) {
		return [];
	}

	for ( i = 0, len = Expr.order.length; i < len; i++ ) {
		type = Expr.order[i];

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			left = match[1];
			match.splice( 1, 1 );

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace( rBackslash, "" );
				set = Expr.find[ type ]( match, context, isXML );

				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = typeof context.getElementsByTagName !== "undefined" ?
			context.getElementsByTagName( "*" ) :
			[];
	}

	return { set: set, expr: expr };
};

Sizzle.filter = function( expr, set, inplace, not ) {
	var match, anyFound,
		type, found, item, filter, left,
		i, pass,
		old = expr,
		result = [],
		curLoop = set,
		isXMLFilter = set && set[0] && Sizzle.isXML( set[0] );

	while ( expr && set.length ) {
		for ( type in Expr.filter ) {
			if ( (match = Expr.leftMatch[ type ].exec( expr )) != null && match[2] ) {
				filter = Expr.filter[ type ];
				left = match[1];

				anyFound = false;

				match.splice(1,1);

				if ( left.substr( left.length - 1 ) === "\\" ) {
					continue;
				}

				if ( curLoop === result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;

					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							pass = not ^ found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;

								} else {
									curLoop[i] = false;
								}

							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		// Improper expression
		if ( expr === old ) {
			if ( anyFound == null ) {
				Sizzle.error( expr );

			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Utility function for retreiving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
var getText = Sizzle.getText = function( elem ) {
    var i, node,
		nodeType = elem.nodeType,
		ret = "";

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent || innerText for elements
			if ( typeof elem.textContent === 'string' ) {
				return elem.textContent;
			} else if ( typeof elem.innerText === 'string' ) {
				// Replace IE's carriage returns
				return elem.innerText.replace( rReturn, '' );
			} else {
				// Traverse it's children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
	} else {

		// If no nodeType, this is expected to be an array
		for ( i = 0; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			if ( node.nodeType !== 8 ) {
				ret += getText( node );
			}
		}
	}
	return ret;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],

	match: {
		ID: /#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
	},

	leftMatch: {},

	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},

	attrHandle: {
		href: function( elem ) {
			return elem.getAttribute( "href" );
		},
		type: function( elem ) {
			return elem.getAttribute( "type" );
		}
	},

	relative: {
		"+": function(checkSet, part){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !rNonWord.test( part ),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag ) {
				part = part.toLowerCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},

		">": function( checkSet, part ) {
			var elem,
				isPartStr = typeof part === "string",
				i = 0,
				l = checkSet.length;

			if ( isPartStr && !rNonWord.test( part ) ) {
				part = part.toLowerCase();

				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
					}
				}

			} else {
				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},

		"": function(checkSet, part, isXML){
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "parentNode", part, doneName, checkSet, nodeCheck, isXML );
		},

		"~": function( checkSet, part, isXML ) {
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "previousSibling", part, doneName, checkSet, nodeCheck, isXML );
		}
	},

	find: {
		ID: function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		},

		NAME: function( match, context ) {
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [],
					results = context.getElementsByName( match[1] );

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},

		TAG: function( match, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( match[1] );
			}
		}
	},
	preFilter: {
		CLASS: function( match, curLoop, inplace, result, not, isXML ) {
			match = " " + match[1].replace( rBackslash, "" ) + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n\r]/g, " ").indexOf(match) >= 0) ) {
						if ( !inplace ) {
							result.push( elem );
						}

					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},

		ID: function( match ) {
			return match[1].replace( rBackslash, "" );
		},

		TAG: function( match, curLoop ) {
			return match[1].replace( rBackslash, "" ).toLowerCase();
		},

		CHILD: function( match ) {
			if ( match[1] === "nth" ) {
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				match[2] = match[2].replace(/^\+|\s*/g, '');

				// parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
				var test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec(
					match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				// calculate the numbers (first)n+(last) including if they are negative
				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}
			else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			// TODO: Move to normal caching system
			match[0] = done++;

			return match;
		},

		ATTR: function( match, curLoop, inplace, result, not, isXML ) {
			var name = match[1] = match[1].replace( rBackslash, "" );

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			// Handle if an un-quoted value was used
			match[4] = ( match[4] || match[5] || "" ).replace( rBackslash, "" );

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},

		PSEUDO: function( match, curLoop, inplace, result, not ) {
			if ( match[1] === "not" ) {
				// If we're dealing with a complex expression, or a simple one
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);

				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);

					if ( !inplace ) {
						result.push.apply( result, ret );
					}

					return false;
				}

			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},

		POS: function( match ) {
			match.unshift( true );

			return match;
		}
	},

	filters: {
		enabled: function( elem ) {
			return elem.disabled === false && elem.type !== "hidden";
		},

		disabled: function( elem ) {
			return elem.disabled === true;
		},

		checked: function( elem ) {
			return elem.checked === true;
		},

		selected: function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		parent: function( elem ) {
			return !!elem.firstChild;
		},

		empty: function( elem ) {
			return !elem.firstChild;
		},

		has: function( elem, i, match ) {
			return !!Sizzle( match[3], elem ).length;
		},

		header: function( elem ) {
			return (/h\d/i).test( elem.nodeName );
		},

		text: function( elem ) {
			var attr = elem.getAttribute( "type" ), type = elem.type;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" && "text" === type && ( attr === type || attr === null );
		},

		radio: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "radio" === elem.type;
		},

		checkbox: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "checkbox" === elem.type;
		},

		file: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "file" === elem.type;
		},

		password: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "password" === elem.type;
		},

		submit: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "submit" === elem.type;
		},

		image: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "image" === elem.type;
		},

		reset: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "reset" === elem.type;
		},

		button: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && "button" === elem.type || name === "button";
		},

		input: function( elem ) {
			return (/input|select|textarea|button/i).test( elem.nodeName );
		},

		focus: function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		}
	},
	setFilters: {
		first: function( elem, i ) {
			return i === 0;
		},

		last: function( elem, i, match, array ) {
			return i === array.length - 1;
		},

		even: function( elem, i ) {
			return i % 2 === 0;
		},

		odd: function( elem, i ) {
			return i % 2 === 1;
		},

		lt: function( elem, i, match ) {
			return i < match[3] - 0;
		},

		gt: function( elem, i, match ) {
			return i > match[3] - 0;
		},

		nth: function( elem, i, match ) {
			return match[3] - 0 === i;
		},

		eq: function( elem, i, match ) {
			return match[3] - 0 === i;
		}
	},
	filter: {
		PSEUDO: function( elem, match, i, array ) {
			var name = match[1],
				filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );

			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || getText([ elem ]) || "").indexOf(match[3]) >= 0;

			} else if ( name === "not" ) {
				var not = match[3];

				for ( var j = 0, l = not.length; j < l; j++ ) {
					if ( not[j] === elem ) {
						return false;
					}
				}

				return true;

			} else {
				Sizzle.error( name );
			}
		},

		CHILD: function( elem, match ) {
			var first, last,
				doneName, parent, cache,
				count, diff,
				type = match[1],
				node = elem;

			switch ( type ) {
				case "only":
				case "first":
					while ( (node = node.previousSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					if ( type === "first" ) {
						return true;
					}

					node = elem;

					/* falls through */
				case "last":
					while ( (node = node.nextSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					return true;

				case "nth":
					first = match[2];
					last = match[3];

					if ( first === 1 && last === 0 ) {
						return true;
					}

					doneName = match[0];
					parent = elem.parentNode;

					if ( parent && (parent[ expando ] !== doneName || !elem.nodeIndex) ) {
						count = 0;

						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}

						parent[ expando ] = doneName;
					}

					diff = elem.nodeIndex - last;

					if ( first === 0 ) {
						return diff === 0;

					} else {
						return ( diff % first === 0 && diff / first >= 0 );
					}
			}
		},

		ID: function( elem, match ) {
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},

		TAG: function( elem, match ) {
			return (match === "*" && elem.nodeType === 1) || !!elem.nodeName && elem.nodeName.toLowerCase() === match;
		},

		CLASS: function( elem, match ) {
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},

		ATTR: function( elem, match ) {
			var name = match[1],
				result = Sizzle.attr ?
					Sizzle.attr( elem, name ) :
					Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				!type && Sizzle.attr ?
				result != null :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value !== check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},

		POS: function( elem, match, i, array ) {
			var name = match[2],
				filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS,
	fescape = function(all, num){
		return "\\" + (num - 0 + 1);
	};

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + (/(?![^\[]*\])(?![^\(]*\))/.source) );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source.replace(/\\(\d+)/g, fescape) );
}
// Expose origPOS
// "global" as in regardless of relation to brackets/parens
Expr.match.globalPOS = origPOS;

var makeArray = function( array, results ) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

// Perform a simple check to determine if the browser is capable of
// converting a NodeList to an array using builtin methods.
// Also verifies that the returned array holds DOM nodes
// (which is not the case in the Blackberry browser)
try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 )[0].nodeType;

// Provide a fallback method if it does not work
} catch( e ) {
	makeArray = function( array, results ) {
		var i = 0,
			ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );

		} else {
			if ( typeof array.length === "number" ) {
				for ( var l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}

			} else {
				for ( ; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder, siblingCheck;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			return a.compareDocumentPosition ? -1 : 1;
		}

		return a.compareDocumentPosition(b) & 4 ? -1 : 1;
	};

} else {
	sortOrder = function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

	siblingCheck = function( a, b, ret ) {
		if ( a === b ) {
			return ret;
		}

		var cur = a.nextSibling;

		while ( cur ) {
			if ( cur === b ) {
				return -1;
			}

			cur = cur.nextSibling;
		}

		return 1;
	};
}

// Check to see if the browser returns elements by name when
// querying by getElementById (and provide a workaround)
(function(){
	// We're going to inject a fake input element with a specified name
	var form = document.createElement("div"),
		id = "script" + (new Date()).getTime(),
		root = document.documentElement;

	form.innerHTML = "<a name='" + id + "'/>";

	// Inject it into the root element, check its status, and remove it quickly
	root.insertBefore( form, root.firstChild );

	// The workaround has to do additional checks after a getElementById
	// Which slows things down for other browsers (hence the branching)
	if ( document.getElementById( id ) ) {
		Expr.find.ID = function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);

				return m ?
					m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ?
						[m] :
						undefined :
					[];
			}
		};

		Expr.filter.ID = function( elem, match ) {
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");

			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );

	// release memory in IE
	root = form = null;
})();

(function(){
	// Check to see if the browser returns only elements
	// when doing getElementsByTagName("*")

	// Create a fake element
	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	// Make sure no comments are found
	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function( match, context ) {
			var results = context.getElementsByTagName( match[1] );

			// Filter out possible comments
			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	// Check to see if an attribute returns normalized href attributes
	div.innerHTML = "<a href='#'></a>";

	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {

		Expr.attrHandle.href = function( elem ) {
			return elem.getAttribute( "href", 2 );
		};
	}

	// release memory in IE
	div = null;
})();

if ( document.querySelectorAll ) {
	(function(){
		var oldSizzle = Sizzle,
			div = document.createElement("div"),
			id = "__sizzle__";

		div.innerHTML = "<p class='TEST'></p>";

		// Safari can't handle uppercase or unicode characters when
		// in quirks mode.
		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
			return;
		}

		Sizzle = function( query, context, extra, seed ) {
			context = context || document;

			// Only use querySelectorAll on non-XML documents
			// (ID selectors don't work in non-HTML documents)
			if ( !seed && !Sizzle.isXML(context) ) {
				// See if we find a selector to speed up
				var match = /^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec( query );

				if ( match && (context.nodeType === 1 || context.nodeType === 9) ) {
					// Speed-up: Sizzle("TAG")
					if ( match[1] ) {
						return makeArray( context.getElementsByTagName( query ), extra );

					// Speed-up: Sizzle(".CLASS")
					} else if ( match[2] && Expr.find.CLASS && context.getElementsByClassName ) {
						return makeArray( context.getElementsByClassName( match[2] ), extra );
					}
				}

				if ( context.nodeType === 9 ) {
					// Speed-up: Sizzle("body")
					// The body element only exists once, optimize finding it
					if ( query === "body" && context.body ) {
						return makeArray( [ context.body ], extra );

					// Speed-up: Sizzle("#ID")
					} else if ( match && match[3] ) {
						var elem = context.getElementById( match[3] );

						// Check parentNode to catch when Blackberry 4.6 returns
						// nodes that are no longer in the document #6963
						if ( elem && elem.parentNode ) {
							// Handle the case where IE and Opera return items
							// by name instead of ID
							if ( elem.id === match[3] ) {
								return makeArray( [ elem ], extra );
							}

						} else {
							return makeArray( [], extra );
						}
					}

					try {
						return makeArray( context.querySelectorAll(query), extra );
					} catch(qsaError) {}

				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					var oldContext = context,
						old = context.getAttribute( "id" ),
						nid = old || id,
						hasParent = context.parentNode,
						relativeHierarchySelector = /^\s*[+~]/.test( query );

					if ( !old ) {
						context.setAttribute( "id", nid );
					} else {
						nid = nid.replace( /'/g, "\\$&" );
					}
					if ( relativeHierarchySelector && hasParent ) {
						context = context.parentNode;
					}

					try {
						if ( !relativeHierarchySelector || hasParent ) {
							return makeArray( context.querySelectorAll( "[id='" + nid + "'] " + query ), extra );
						}

					} catch(pseudoError) {
					} finally {
						if ( !old ) {
							oldContext.removeAttribute( "id" );
						}
					}
				}
			}

			return oldSizzle(query, context, extra, seed);
		};

		for ( var prop in oldSizzle ) {
			Sizzle[ prop ] = oldSizzle[ prop ];
		}

		// release memory in IE
		div = null;
	})();
}

(function(){
	var html = document.documentElement,
		matches = html.matchesSelector || html.mozMatchesSelector || html.webkitMatchesSelector || html.msMatchesSelector;

	if ( matches ) {
		// Check to see if it's possible to do matchesSelector
		// on a disconnected node (IE 9 fails this)
		var disconnectedMatch = !matches.call( document.createElement( "div" ), "div" ),
			pseudoWorks = false;

		try {
			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( document.documentElement, "[test!='']:sizzle" );

		} catch( pseudoError ) {
			pseudoWorks = true;
		}

		Sizzle.matchesSelector = function( node, expr ) {
			// Make sure that attribute selectors are quoted
			expr = expr.replace(/\=\s*([^'"\]]*)\s*\]/g, "='$1']");

			if ( !Sizzle.isXML( node ) ) {
				try {
					if ( pseudoWorks || !Expr.match.PSEUDO.test( expr ) && !/!=/.test( expr ) ) {
						var ret = matches.call( node, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || !disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9, so check for that
								node.document && node.document.nodeType !== 11 ) {
							return ret;
						}
					}
				} catch(e) {}
			}

			return Sizzle(expr, null, null, [node]).length > 0;
		};
	}
})();

(function(){
	var div = document.createElement("div");

	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	// Opera can't find a second classname (in 9.6)
	// Also, make sure that getElementsByClassName actually exists
	if ( !div.getElementsByClassName || div.getElementsByClassName("e").length === 0 ) {
		return;
	}

	// Safari caches class attributes, doesn't catch changes (in 3.2)
	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 ) {
		return;
	}

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function( match, context, isXML ) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	// release memory in IE
	div = null;
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem[ expando ] = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName.toLowerCase() === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem[ expando ] = doneName;
						elem.sizset = i;
					}

					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

if ( document.documentElement.contains ) {
	Sizzle.contains = function( a, b ) {
		return a !== b && (a.contains ? a.contains(b) : true);
	};

} else if ( document.documentElement.compareDocumentPosition ) {
	Sizzle.contains = function( a, b ) {
		return !!(a.compareDocumentPosition(b) & 16);
	};

} else {
	Sizzle.contains = function() {
		return false;
	};
}

Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

var posProcess = function( selector, context, seed ) {
	var match,
		tmpSet = [],
		later = "",
		root = context.nodeType ? [context] : context;

	// Position selectors must be done after the filter
	// And so must :not(positional) so we move all PSEUDOs to the end
	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet, seed );
	}

	return Sizzle.filter( later, tmpSet );
};

// EXPOSE
// Override sizzle attribute retrieval
Sizzle.attr = jQuery.attr;
Sizzle.selectors.attrMap = {};
jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.filters;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})();


var runtil = /Until$/,
	rparentsprev = /^(?:parents|prevUntil|prevAll)/,
	// Note: This RegExp should be improved, or likely pulled from Sizzle
	rmultiselector = /,/,
	isSimple = /^.[^:#\[\.,]*$/,
	slice = Array.prototype.slice,
	POS = jQuery.expr.match.globalPOS,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend({
	find: function( selector ) {
		var self = this,
			i, l;

		if ( typeof selector !== "string" ) {
			return jQuery( selector ).filter(function() {
				for ( i = 0, l = self.length; i < l; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			});
		}

		var ret = this.pushStack( "", "find", selector ),
			length, n, r;

		for ( i = 0, l = this.length; i < l; i++ ) {
			length = ret.length;
			jQuery.find( selector, this[i], ret );

			if ( i > 0 ) {
				// Make sure that the results are unique
				for ( n = length; n < ret.length; n++ ) {
					for ( r = 0; r < length; r++ ) {
						if ( ret[r] === ret[n] ) {
							ret.splice(n--, 1);
							break;
						}
					}
				}
			}
		}

		return ret;
	},

	has: function( target ) {
		var targets = jQuery( target );
		return this.filter(function() {
			for ( var i = 0, l = targets.length; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector, false), "not", selector);
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector, true), "filter", selector );
	},

	is: function( selector ) {
		return !!selector && (
			typeof selector === "string" ?
				// If this is a positional selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				POS.test( selector ) ?
					jQuery( selector, this.context ).index( this[0] ) >= 0 :
					jQuery.filter( selector, this ).length > 0 :
				this.filter( selector ).length > 0 );
	},

	closest: function( selectors, context ) {
		var ret = [], i, l, cur = this[0];

		// Array (deprecated as of jQuery 1.7)
		if ( jQuery.isArray( selectors ) ) {
			var level = 1;

			while ( cur && cur.ownerDocument && cur !== context ) {
				for ( i = 0; i < selectors.length; i++ ) {

					if ( jQuery( cur ).is( selectors[ i ] ) ) {
						ret.push({ selector: selectors[ i ], elem: cur, level: level });
					}
				}

				cur = cur.parentNode;
				level++;
			}

			return ret;
		}

		// String
		var pos = POS.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( i = 0, l = this.length; i < l; i++ ) {
			cur = this[i];

			while ( cur ) {
				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
					ret.push( cur );
					break;

				} else {
					cur = cur.parentNode;
					if ( !cur || !cur.ownerDocument || cur === context || cur.nodeType === 11 ) {
						break;
					}
				}
			}
		}

		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

		return this.pushStack( ret, "closest", selectors );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},

	andSelf: function() {
		return this.add( this.prevObject );
	}
});

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return jQuery.nth( elem, 2, "nextSibling" );
	},
	prev: function( elem ) {
		return jQuery.nth( elem, 2, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.makeArray( elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( !runtil.test( name ) ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		if ( (this.length > 1 || rmultiselector.test( selector )) && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}

		return this.pushStack( ret, name, slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
	filter: function( expr, elems, not ) {
		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ?
			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
			jQuery.find.matches(expr, elems);
	},

	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	nth: function( cur, result, dir, elem ) {
		result = result || 1;
		var num = 0;

		for ( ; cur; cur = cur[dir] ) {
			if ( cur.nodeType === 1 && ++num === result ) {
				break;
			}
		}

		return cur;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) {
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) {
		var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}

	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}




function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
	safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:\d+|null)"/g,
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style)/i,
	rnocache = /<(?:script|object|embed|option|style)/i,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /\/(java|ecma)script/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)/,
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		area: [ 1, "<map>", "</map>" ],
		_default: [ 0, "", "" ]
	},
	safeFragment = createSafeFragment( document );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// IE can't serialize <link> and <script> tags normally
if ( !jQuery.support.htmlSerialize ) {
	wrapMap._default = [ 1, "div<div>", "</div>" ];
}

jQuery.fn.extend({
	text: function( value ) {
		return jQuery.access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	},

	append: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 ) {
				this.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 ) {
				this.insertBefore( elem, this.firstChild );
			}
		});
	},

	before: function() {
		if ( this[0] && this[0].parentNode ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this );
			});
		} else if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			set.push.apply( set, this.toArray() );
			return this.pushStack( set, "before", arguments );
		}
	},

	after: function() {
		if ( this[0] && this[0].parentNode ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			});
		} else if ( arguments.length ) {
			var set = this.pushStack( this, "after", arguments );
			set.push.apply( set, jQuery.clean(arguments) );
			return set;
		}
	},

	// keepData is for internal use only--do not document
	remove: function( selector, keepData ) {
		for ( var i = 0, elem; (elem = this[i]) != null; i++ ) {
			if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
				if ( !keepData && elem.nodeType === 1 ) {
					jQuery.cleanData( elem.getElementsByTagName("*") );
					jQuery.cleanData( [ elem ] );
				}

				if ( elem.parentNode ) {
					elem.parentNode.removeChild( elem );
				}
			}
		}

		return this;
	},

	empty: function() {
		for ( var i = 0, elem; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( elem.getElementsByTagName("*") );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function () {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return jQuery.access( this, function( value ) {
			var elem = this[0] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					null;
			}


			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( elem.getElementsByTagName( "*" ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function( value ) {
		if ( this[0] && this[0].parentNode ) {
			// Make sure that the elements are removed from the DOM before they are inserted
			// this can help fix replacing a parent with child elements
			if ( jQuery.isFunction( value ) ) {
				return this.each(function(i) {
					var self = jQuery(this), old = self.html();
					self.replaceWith( value.call( this, i, old ) );
				});
			}

			if ( typeof value !== "string" ) {
				value = jQuery( value ).detach();
			}

			return this.each(function() {
				var next = this.nextSibling,
					parent = this.parentNode;

				jQuery( this ).remove();

				if ( next ) {
					jQuery(next).before( value );
				} else {
					jQuery(parent).append( value );
				}
			});
		} else {
			return this.length ?
				this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
				this;
		}
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, table, callback ) {
		var results, first, fragment, parent,
			value = args[0],
			scripts = [];

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( !jQuery.support.checkClone && arguments.length === 3 && typeof value === "string" && rchecked.test( value ) ) {
			return this.each(function() {
				jQuery(this).domManip( args, table, callback, true );
			});
		}

		if ( jQuery.isFunction(value) ) {
			return this.each(function(i) {
				var self = jQuery(this);
				args[0] = value.call(this, i, table ? self.html() : undefined);
				self.domManip( args, table, callback );
			});
		}

		if ( this[0] ) {
			parent = value && value.parentNode;

			// If we're in a fragment, just use that instead of building a new one
			if ( jQuery.support.parentNode && parent && parent.nodeType === 11 && parent.childNodes.length === this.length ) {
				results = { fragment: parent };

			} else {
				results = jQuery.buildFragment( args, this, scripts );
			}

			fragment = results.fragment;

			if ( fragment.childNodes.length === 1 ) {
				first = fragment = fragment.firstChild;
			} else {
				first = fragment.firstChild;
			}

			if ( first ) {
				table = table && jQuery.nodeName( first, "tr" );

				for ( var i = 0, l = this.length, lastIndex = l - 1; i < l; i++ ) {
					callback.call(
						table ?
							root(this[i], first) :
							this[i],
						// Make sure that we do not leak memory by inadvertently discarding
						// the original fragment (which might have attached data) instead of
						// using it; in addition, use the original fragment object for the last
						// item instead of first because it can end up being emptied incorrectly
						// in certain situations (Bug #8070).
						// Fragments from the fragment cache must always be cloned and never used
						// in place.
						results.cacheable || ( l > 1 && i < lastIndex ) ?
							jQuery.clone( fragment, true, true ) :
							fragment
					);
				}
			}

			if ( scripts.length ) {
				jQuery.each( scripts, function( i, elem ) {
					if ( elem.src ) {
						jQuery.ajax({
							type: "GET",
							global: false,
							url: elem.src,
							async: false,
							dataType: "script"
						});
					} else {
						jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "/*$0*/" ) );
					}

					if ( elem.parentNode ) {
						elem.parentNode.removeChild( elem );
					}
				});
			}
		}

		return this;
	}
});

function root( elem, cur ) {
	return jQuery.nodeName(elem, "table") ?
		(elem.getElementsByTagName("tbody")[0] ||
		elem.appendChild(elem.ownerDocument.createElement("tbody"))) :
		elem;
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function cloneFixAttributes( src, dest ) {
	var nodeName;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	// clearAttributes removes the attributes, which we don't want,
	// but also removes the attachEvent events, which we *do* want
	if ( dest.clearAttributes ) {
		dest.clearAttributes();
	}

	// mergeAttributes, in contrast, only merges back on the
	// original attributes, not the events
	if ( dest.mergeAttributes ) {
		dest.mergeAttributes( src );
	}

	nodeName = dest.nodeName.toLowerCase();

	// IE6-8 fail to clone children inside object elements that use
	// the proprietary classid attribute value (rather than the type
	// attribute) to identify the type of content to display
	if ( nodeName === "object" ) {
		dest.outerHTML = src.outerHTML;

	} else if ( nodeName === "input" && (src.type === "checkbox" || src.type === "radio") ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set
		if ( src.checked ) {
			dest.defaultChecked = dest.checked = src.checked;
		}

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;

	// IE blanks contents when cloning scripts
	} else if ( nodeName === "script" && dest.text !== src.text ) {
		dest.text = src.text;
	}

	// Event data gets referenced instead of copied if the expando
	// gets copied too
	dest.removeAttribute( jQuery.expando );

	// Clear flags for bubbling special change/submit events, they must
	// be reattached when the newly cloned events are first activated
	dest.removeAttribute( "_submit_attached" );
	dest.removeAttribute( "_change_attached" );
}

jQuery.buildFragment = function( args, nodes, scripts ) {
	var fragment, cacheable, cacheresults, doc,
	first = args[ 0 ];

	// nodes may contain either an explicit document object,
	// a jQuery collection or context object.
	// If nodes[0] contains a valid object to assign to doc
	if ( nodes && nodes[0] ) {
		doc = nodes[0].ownerDocument || nodes[0];
	}

	// Ensure that an attr object doesn't incorrectly stand in as a document object
	// Chrome and Firefox seem to allow this to occur and will throw exception
	// Fixes #8950
	if ( !doc.createDocumentFragment ) {
		doc = document;
	}

	// Only cache "small" (1/2 KB) HTML strings that are associated with the main document
	// Cloning options loses the selected state, so don't cache them
	// IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
	// Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
	// Lastly, IE6,7,8 will not correctly reuse cached fragments that were created from unknown elems #10501
	if ( args.length === 1 && typeof first === "string" && first.length < 512 && doc === document &&
		first.charAt(0) === "<" && !rnocache.test( first ) &&
		(jQuery.support.checkClone || !rchecked.test( first )) &&
		(jQuery.support.html5Clone || !rnoshimcache.test( first )) ) {

		cacheable = true;

		cacheresults = jQuery.fragments[ first ];
		if ( cacheresults && cacheresults !== 1 ) {
			fragment = cacheresults;
		}
	}

	if ( !fragment ) {
		fragment = doc.createDocumentFragment();
		jQuery.clean( args, doc, fragment, scripts );
	}

	if ( cacheable ) {
		jQuery.fragments[ first ] = cacheresults ? fragment : 1;
	}

	return { fragment: fragment, cacheable: cacheable };
};

jQuery.fragments = {};

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var ret = [],
			insert = jQuery( selector ),
			parent = this.length === 1 && this[0].parentNode;

		if ( parent && parent.nodeType === 11 && parent.childNodes.length === 1 && insert.length === 1 ) {
			insert[ original ]( this[0] );
			return this;

		} else {
			for ( var i = 0, l = insert.length; i < l; i++ ) {
				var elems = ( i > 0 ? this.clone(true) : this ).get();
				jQuery( insert[i] )[ original ]( elems );
				ret = ret.concat( elems );
			}

			return this.pushStack( ret, name, insert.selector );
		}
	};
});

function getAll( elem ) {
	if ( typeof elem.getElementsByTagName !== "undefined" ) {
		return elem.getElementsByTagName( "*" );

	} else if ( typeof elem.querySelectorAll !== "undefined" ) {
		return elem.querySelectorAll( "*" );

	} else {
		return [];
	}
}

// Used in clean, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( elem.type === "checkbox" || elem.type === "radio" ) {
		elem.defaultChecked = elem.checked;
	}
}
// Finds all inputs and passes them to fixDefaultChecked
function findInputs( elem ) {
	var nodeName = ( elem.nodeName || "" ).toLowerCase();
	if ( nodeName === "input" ) {
		fixDefaultChecked( elem );
	// Skip scripts, get other children
	} else if ( nodeName !== "script" && typeof elem.getElementsByTagName !== "undefined" ) {
		jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
	}
}

// Derived From: http://www.iecss.com/shimprove/javascript/shimprove.1-0-1.js
function shimCloneNode( elem ) {
	var div = document.createElement( "div" );
	safeFragment.appendChild( div );

	div.innerHTML = elem.outerHTML;
	return div.firstChild;
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var srcElements,
			destElements,
			i,
			// IE<=8 does not properly clone detached, unknown element nodes
			clone = jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ?
				elem.cloneNode( true ) :
				shimCloneNode( elem );

		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
			// IE copies events bound via attachEvent when using cloneNode.
			// Calling detachEvent on the clone will also remove the events
			// from the original. In order to get around this, we use some
			// proprietary methods to clear the events. Thanks to MooTools
			// guys for this hotness.

			cloneFixAttributes( elem, clone );

			// Using Sizzle here is crazy slow, so we use getElementsByTagName instead
			srcElements = getAll( elem );
			destElements = getAll( clone );

			// Weird iteration because IE will replace the length property
			// with an element if you are cloning the body and one of the
			// elements on the page has a name or id of "length"
			for ( i = 0; srcElements[i]; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					cloneFixAttributes( srcElements[i], destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			cloneCopyEvent( elem, clone );

			if ( deepDataAndEvents ) {
				srcElements = getAll( elem );
				destElements = getAll( clone );

				for ( i = 0; srcElements[i]; ++i ) {
					cloneCopyEvent( srcElements[i], destElements[i] );
				}
			}
		}

		srcElements = destElements = null;

		// Return the cloned set
		return clone;
	},

	clean: function( elems, context, fragment, scripts ) {
		var checkScriptType, script, j,
				ret = [];

		context = context || document;

		// !context.createElement fails in IE with an error but returns typeof 'object'
		if ( typeof context.createElement === "undefined" ) {
			context = context.ownerDocument || context[0] && context[0].ownerDocument || document;
		}

		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
			if ( typeof elem === "number" ) {
				elem += "";
			}

			if ( !elem ) {
				continue;
			}

			// Convert html string into DOM nodes
			if ( typeof elem === "string" ) {
				if ( !rhtml.test( elem ) ) {
					elem = context.createTextNode( elem );
				} else {
					// Fix "XHTML"-style tags in all browsers
					elem = elem.replace(rxhtmlTag, "<$1></$2>");

					// Trim whitespace, otherwise indexOf won't work as expected
					var tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase(),
						wrap = wrapMap[ tag ] || wrapMap._default,
						depth = wrap[0],
						div = context.createElement("div"),
						safeChildNodes = safeFragment.childNodes,
						remove;

					// Append wrapper element to unknown element safe doc fragment
					if ( context === document ) {
						// Use the fragment we've already created for this document
						safeFragment.appendChild( div );
					} else {
						// Use a fragment created with the owner document
						createSafeFragment( context ).appendChild( div );
					}

					// Go to html and back, then peel off extra wrappers
					div.innerHTML = wrap[1] + elem + wrap[2];

					// Move to the right depth
					while ( depth-- ) {
						div = div.lastChild;
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !jQuery.support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						var hasBody = rtbody.test(elem),
							tbody = tag === "table" && !hasBody ?
								div.firstChild && div.firstChild.childNodes :

								// String was a bare <thead> or <tfoot>
								wrap[1] === "<table>" && !hasBody ?
									div.childNodes :
									[];

						for ( j = tbody.length - 1; j >= 0 ; --j ) {
							if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
								tbody[ j ].parentNode.removeChild( tbody[ j ] );
							}
						}
					}

					// IE completely kills leading whitespace when innerHTML is used
					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
					}

					elem = div.childNodes;

					// Clear elements from DocumentFragment (safeFragment or otherwise)
					// to avoid hoarding elements. Fixes #11356
					if ( div ) {
						div.parentNode.removeChild( div );

						// Guard against -1 index exceptions in FF3.6
						if ( safeChildNodes.length > 0 ) {
							remove = safeChildNodes[ safeChildNodes.length - 1 ];

							if ( remove && remove.parentNode ) {
								remove.parentNode.removeChild( remove );
							}
						}
					}
				}
			}

			// Resets defaultChecked for any radios and checkboxes
			// about to be appended to the DOM in IE 6/7 (#8060)
			var len;
			if ( !jQuery.support.appendChecked ) {
				if ( elem[0] && typeof (len = elem.length) === "number" ) {
					for ( j = 0; j < len; j++ ) {
						findInputs( elem[j] );
					}
				} else {
					findInputs( elem );
				}
			}

			if ( elem.nodeType ) {
				ret.push( elem );
			} else {
				ret = jQuery.merge( ret, elem );
			}
		}

		if ( fragment ) {
			checkScriptType = function( elem ) {
				return !elem.type || rscriptType.test( elem.type );
			};
			for ( i = 0; ret[i]; i++ ) {
				script = ret[i];
				if ( scripts && jQuery.nodeName( script, "script" ) && (!script.type || rscriptType.test( script.type )) ) {
					scripts.push( script.parentNode ? script.parentNode.removeChild( script ) : script );

				} else {
					if ( script.nodeType === 1 ) {
						var jsTags = jQuery.grep( script.getElementsByTagName( "script" ), checkScriptType );

						ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
					}
					fragment.appendChild( script );
				}
			}
		}

		return ret;
	},

	cleanData: function( elems ) {
		var data, id,
			cache = jQuery.cache,
			special = jQuery.event.special,
			deleteExpando = jQuery.support.deleteExpando;

		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
			if ( elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()] ) {
				continue;
			}

			id = elem[ jQuery.expando ];

			if ( id ) {
				data = cache[ id ];

				if ( data && data.events ) {
					for ( var type in data.events ) {
						if ( special[ type ] ) {
							jQuery.event.remove( elem, type );

						// This is a shortcut to avoid jQuery.event.remove's overhead
						} else {
							jQuery.removeEvent( elem, type, data.handle );
						}
					}

					// Null the DOM reference to avoid IE6/7/8 leak (#7054)
					if ( data.handle ) {
						data.handle.elem = null;
					}
				}

				if ( deleteExpando ) {
					delete elem[ jQuery.expando ];

				} else if ( elem.removeAttribute ) {
					elem.removeAttribute( jQuery.expando );
				}

				delete cache[ id ];
			}
		}
	}
});




var ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity=([^)]*)/,
	// fixed for IE9, see #8346
	rupper = /([A-Z]|^ms)/g,
	rnum = /^[\-+]?(?:\d*\.)?\d+$/i,
	rnumnonpx = /^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,
	rrelNum = /^([\-+])=([\-+.\de]+)/,
	rmargin = /^margin/,

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },

	// order is important!
	cssExpand = [ "Top", "Right", "Bottom", "Left" ],

	curCSS,

	getComputedStyle,
	currentStyle;

jQuery.fn.css = function( name, value ) {
	return jQuery.access( this, function( elem, name, value ) {
		return value !== undefined ?
			jQuery.style( elem, name, value ) :
			jQuery.css( elem, name );
	}, name, value, arguments.length > 1 );
};

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;

				} else {
					return elem.style.opacity;
				}
			}
		}
	},

	// Exclude the following css properties to add px
	cssNumber: {
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, origName = jQuery.camelCase( name ),
			style = elem.style, hooks = jQuery.cssHooks[ origName ];

		name = jQuery.cssProps[ origName ] || origName;

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( +( ret[1] + 1) * +ret[2] ) + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value )) !== undefined ) {
				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
				// Fixes bug #5509
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra ) {
		var ret, hooks;

		// Make sure that we're working with the right name
		name = jQuery.camelCase( name );
		hooks = jQuery.cssHooks[ name ];
		name = jQuery.cssProps[ name ] || name;

		// cssFloat needs a special treatment
		if ( name === "cssFloat" ) {
			name = "float";
		}

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks && (ret = hooks.get( elem, true, extra )) !== undefined ) {
			return ret;

		// Otherwise, if a way to get the computed value exists, use that
		} else if ( curCSS ) {
			return curCSS( elem, name );
		}
	},

	// A method for quickly swapping in/out CSS properties to get correct calculations
	swap: function( elem, options, callback ) {
		var old = {},
			ret, name;

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.call( elem );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	}
});

// DEPRECATED in 1.3, Use jQuery.css() instead
jQuery.curCSS = jQuery.css;

if ( document.defaultView && document.defaultView.getComputedStyle ) {
	getComputedStyle = function( elem, name ) {
		var ret, defaultView, computedStyle, width,
			style = elem.style;

		name = name.replace( rupper, "-$1" ).toLowerCase();

		if ( (defaultView = elem.ownerDocument.defaultView) &&
				(computedStyle = defaultView.getComputedStyle( elem, null )) ) {

			ret = computedStyle.getPropertyValue( name );
			if ( ret === "" && !jQuery.contains( elem.ownerDocument.documentElement, elem ) ) {
				ret = jQuery.style( elem, name );
			}
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// WebKit uses "computed value (percentage if specified)" instead of "used value" for margins
		// which is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( !jQuery.support.pixelMargin && computedStyle && rmargin.test( name ) && rnumnonpx.test( ret ) ) {
			width = style.width;
			style.width = ret;
			ret = computedStyle.width;
			style.width = width;
		}

		return ret;
	};
}

if ( document.documentElement.currentStyle ) {
	currentStyle = function( elem, name ) {
		var left, rsLeft, uncomputed,
			ret = elem.currentStyle && elem.currentStyle[ name ],
			style = elem.style;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && (uncomputed = style[ name ]) ) {
			ret = uncomputed;
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		if ( rnumnonpx.test( ret ) ) {

			// Remember the original values
			left = style.left;
			rsLeft = elem.runtimeStyle && elem.runtimeStyle.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				elem.runtimeStyle.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				elem.runtimeStyle.left = rsLeft;
			}
		}

		return ret === "" ? "auto" : ret;
	};
}

curCSS = getComputedStyle || currentStyle;

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property
	var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		i = name === "width" ? 1 : 0,
		len = 4;

	if ( val > 0 ) {
		if ( extra !== "border" ) {
			for ( ; i < len; i += 2 ) {
				if ( !extra ) {
					val -= parseFloat( jQuery.css( elem, "padding" + cssExpand[ i ] ) ) || 0;
				}
				if ( extra === "margin" ) {
					val += parseFloat( jQuery.css( elem, extra + cssExpand[ i ] ) ) || 0;
				} else {
					val -= parseFloat( jQuery.css( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
				}
			}
		}

		return val + "px";
	}

	// Fall back to computed then uncomputed css if necessary
	val = curCSS( elem, name );
	if ( val < 0 || val == null ) {
		val = elem.style[ name ];
	}

	// Computed unit is not pixels. Stop here and return.
	if ( rnumnonpx.test(val) ) {
		return val;
	}

	// Normalize "", auto, and prepare for extra
	val = parseFloat( val ) || 0;

	// Add padding, border, margin
	if ( extra ) {
		for ( ; i < len; i += 2 ) {
			val += parseFloat( jQuery.css( elem, "padding" + cssExpand[ i ] ) ) || 0;
			if ( extra !== "padding" ) {
				val += parseFloat( jQuery.css( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
			if ( extra === "margin" ) {
				val += parseFloat( jQuery.css( elem, extra + cssExpand[ i ]) ) || 0;
			}
		}
	}

	return val + "px";
}

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				if ( elem.offsetWidth !== 0 ) {
					return getWidthOrHeight( elem, name, extra );
				} else {
					return jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					});
				}
			}
		},

		set: function( elem, value ) {
			return rnum.test( value ) ?
				value + "px" :
				value;
		}
	};
});

if ( !jQuery.support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( parseFloat( RegExp.$1 ) / 100 ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			if ( value >= 1 && jQuery.trim( filter.replace( ralpha, "" ) ) === "" ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there there is no filter style applied in a css rule, we are done
				if ( currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

jQuery(function() {
	// This hook cannot be added until DOM ready because the support test
	// for it is not run until after DOM ready
	if ( !jQuery.support.reliableMarginRight ) {
		jQuery.cssHooks.marginRight = {
			get: function( elem, computed ) {
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// Work around by temporarily setting element display to inline-block
				return jQuery.swap( elem, { "display": "inline-block" }, function() {
					if ( computed ) {
						return curCSS( elem, "margin-right" );
					} else {
						return elem.style.marginRight;
					}
				});
			}
		};
	}
});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.hidden = function( elem ) {
		var width = elem.offsetWidth,
			height = elem.offsetHeight;

		return ( width === 0 && height === 0 ) || (!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || jQuery.css( elem, "display" )) === "none");
	};

	jQuery.expr.filters.visible = function( elem ) {
		return !jQuery.expr.filters.hidden( elem );
	};
}

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {

	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i,

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ],
				expanded = {};

			for ( i = 0; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};
});




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rhash = /#.*$/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rquery = /\?/,
	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	rselectTextarea = /^(?:select|textarea)/i,
	rspacesAjax = /\s+/,
	rts = /([?&])_=[^&]*/,
	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Document location
	ajaxLocation,

	// Document location segments
	ajaxLocParts,

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		if ( jQuery.isFunction( func ) ) {
			var dataTypes = dataTypeExpression.toLowerCase().split( rspacesAjax ),
				i = 0,
				length = dataTypes.length,
				dataType,
				list,
				placeBefore;

			// For each dataType in the dataTypeExpression
			for ( ; i < length; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 ) || "*";
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( func );
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
		dataType /* internal */, inspected /* internal */ ) {

	dataType = dataType || options.dataTypes[ 0 ];
	inspected = inspected || {};

	inspected[ dataType ] = true;

	var list = structure[ dataType ],
		i = 0,
		length = list ? list.length : 0,
		executeOnly = ( structure === prefilters ),
		selection;

	for ( ; i < length && ( executeOnly || !selection ); i++ ) {
		selection = list[ i ]( options, originalOptions, jqXHR );
		// If we got redirected to another dataType
		// we try there if executing only and not done already
		if ( typeof selection === "string" ) {
			if ( !executeOnly || inspected[ selection ] ) {
				selection = undefined;
			} else {
				options.dataTypes.unshift( selection );
				selection = inspectPrefiltersOrTransports(
						structure, options, originalOptions, jqXHR, selection, inspected );
			}
		}
	}
	// If we're only executing or nothing was selected
	// we try the catchall dataType if not done already
	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
		selection = inspectPrefiltersOrTransports(
				structure, options, originalOptions, jqXHR, "*", inspected );
	}
	// unnecessary when only executing (prefilters)
	// but it'll be ignored by the caller in that case
	return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};
	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}
}

jQuery.fn.extend({
	load: function( url, params, callback ) {
		if ( typeof url !== "string" && _load ) {
			return _load.apply( this, arguments );

		// Don't do a request if no elements are being requested
		} else if ( !this.length ) {
			return this;
		}

		var off = url.indexOf( " " );
		if ( off >= 0 ) {
			var selector = url.slice( off, url.length );
			url = url.slice( 0, off );
		}

		// Default to a GET request
		var type = "GET";

		// If the second parameter was provided
		if ( params ) {
			// If it's a function
			if ( jQuery.isFunction( params ) ) {
				// We assume that it's the callback
				callback = params;
				params = undefined;

			// Otherwise, build a param string
			} else if ( typeof params === "object" ) {
				params = jQuery.param( params, jQuery.ajaxSettings.traditional );
				type = "POST";
			}
		}

		var self = this;

		// Request the remote document
		jQuery.ajax({
			url: url,
			type: type,
			dataType: "html",
			data: params,
			// Complete callback (responseText is used internally)
			complete: function( jqXHR, status, responseText ) {
				// Store the response as specified by the jqXHR object
				responseText = jqXHR.responseText;
				// If successful, inject the HTML into all the matched elements
				if ( jqXHR.isResolved() ) {
					// #4825: Get the actual response in case
					// a dataFilter is present in ajaxSettings
					jqXHR.done(function( r ) {
						responseText = r;
					});
					// See if a selector was specified
					self.html( selector ?
						// Create a dummy div to hold the results
						jQuery("<div>")
							// inject the contents of the document in, removing the scripts
							// to avoid any 'Permission Denied' errors in IE
							.append(responseText.replace(rscript, ""))

							// Locate the specified elements
							.find(selector) :

						// If not, just inject the full result
						responseText );
				}

				if ( callback ) {
					self.each( callback, [ responseText, status, jqXHR ] );
				}
			}
		});

		return this;
	},

	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},

	serializeArray: function() {
		return this.map(function(){
			return this.elements ? jQuery.makeArray( this.elements ) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				( this.checked || rselectTextarea.test( this.nodeName ) ||
					rinput.test( this.type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val, i ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
	jQuery.fn[ o ] = function( f ){
		return this.on( o, f );
	};
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			type: method,
			url: url,
			data: data,
			success: callback,
			dataType: type
		});
	};
});

jQuery.extend({

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		if ( settings ) {
			// Building a settings object
			ajaxExtend( target, jQuery.ajaxSettings );
		} else {
			// Extending ajaxSettings
			settings = target;
			target = jQuery.ajaxSettings;
		}
		ajaxExtend( target, settings );
		return target;
	},

	ajaxSettings: {
		url: ajaxLocation,
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		type: "GET",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		processData: true,
		async: true,
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		traditional: false,
		headers: {},
		*/

		accepts: {
			xml: "application/xml, text/xml",
			html: "text/html",
			text: "text/plain",
			json: "application/json, text/javascript",
			"*": allTypes
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText"
		},

		// List of data converters
		// 1) key format is "source_type destination_type" (a single space in-between)
		// 2) the catchall symbol "*" can be used for source_type
		converters: {

			// Convert anything to text
			"* text": window.String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			context: true,
			url: true
		}
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events
			// It's the callbackContext if one was provided in the options
			// and if it's a DOM node or a jQuery collection
			globalEventContext = callbackContext !== s &&
				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
						jQuery( callbackContext ) : jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// ifModified key
			ifModifiedKey,
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// Response headers
			responseHeadersString,
			responseHeaders,
			// transport
			transport,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// The jqXHR state
			state = 0,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Fake xhr
			jqXHR = {

				readyState: 0,

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( !state ) {
						var lname = name.toLowerCase();
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match === undefined ? null : match;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					statusText = statusText || "abort";
					if ( transport ) {
						transport.abort( statusText );
					}
					done( 0, statusText );
					return this;
				}
			};

		// Callback for when everything is done
		// It is defined here because jslint complains if it is declared
		// at the end of the function (which would be more logical and readable)
		function done( status, nativeStatusText, responses, headers ) {

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			var isSuccess,
				success,
				error,
				statusText = nativeStatusText,
				response = responses ? ajaxHandleResponses( s, jqXHR, responses ) : undefined,
				lastModified,
				etag;

			// If successful, handle type chaining
			if ( status >= 200 && status < 300 || status === 304 ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {

					if ( ( lastModified = jqXHR.getResponseHeader( "Last-Modified" ) ) ) {
						jQuery.lastModified[ ifModifiedKey ] = lastModified;
					}
					if ( ( etag = jqXHR.getResponseHeader( "Etag" ) ) ) {
						jQuery.etag[ ifModifiedKey ] = etag;
					}
				}

				// If not modified
				if ( status === 304 ) {

					statusText = "notmodified";
					isSuccess = true;

				// If we have data
				} else {

					try {
						success = ajaxConvert( s, response );
						statusText = "success";
						isSuccess = true;
					} catch(e) {
						// We have a parsererror
						statusText = "parsererror";
						error = e;
					}
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( !statusText || status ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = "" + ( nativeStatusText || statusText );

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
						[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		// Attach deferreds
		deferred.promise( jqXHR );
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;
		jqXHR.complete = completeDeferred.add;

		// Status-dependent callbacks
		jqXHR.statusCode = function( map ) {
			if ( map ) {
				var tmp;
				if ( state < 2 ) {
					for ( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
					}
				} else {
					tmp = map[ jqXHR.status ];
					jqXHR.then( tmp, tmp );
				}
			}
			return this;
		};

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// We also use the url parameter if available
		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( rspacesAjax );

		// Determine if a cross-domain request is in order
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return false;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Get ifModifiedKey before adding the anti-cache parameter
			ifModifiedKey = s.url;

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts, "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			ifModifiedKey = ifModifiedKey || s.url;
			if ( jQuery.lastModified[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
			}
			if ( jQuery.etag[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
			}
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
				// Abort if not done already
				jqXHR.abort();
				return false;

		}

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;
			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout( function(){
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch (e) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		return jqXHR;
	},

	// Serialize an array of form elements or a set of
	// key/values into a query string
	param: function( a, traditional ) {
		var s = [],
			add = function( key, value ) {
				// If value is a function, invoke it and return its value
				value = jQuery.isFunction( value ) ? value() : value;
				s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
			};

		// Set traditional to true for jQuery <= 1.3.2 behavior.
		if ( traditional === undefined ) {
			traditional = jQuery.ajaxSettings.traditional;
		}

		// If an array was passed in, assume that it is an array of form elements.
		if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
			// Serialize the form elements
			jQuery.each( a, function() {
				add( this.name, this.value );
			});

		} else {
			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for ( var prefix in a ) {
				buildParams( prefix, a[ prefix ], traditional, add );
			}
		}

		// Return the resulting serialization
		return s.join( "&" ).replace( r20, "+" );
	}
});

function buildParams( prefix, obj, traditional, add ) {
	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// If array item is non-scalar (array or object), encode its
				// numeric index to resolve deserialization ambiguity issues.
				// Note that rack (as of 1.0.0) can't currently deserialize
				// nested arrays properly, and attempting to do so may cause
				// a server error. Possible fixes are to modify rack's
				// deserialization algorithm or to provide an option or flag
				// to force array serialization to be shallow.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( var name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// This is still on the jQuery object... for now
// Want to move this to jQuery.ajax some day
jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {}

});

/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var contents = s.contents,
		dataTypes = s.dataTypes,
		responseFields = s.responseFields,
		ct,
		type,
		finalDataType,
		firstDataType;

	// Fill responseXXX fields
	for ( type in responseFields ) {
		if ( type in responses ) {
			jqXHR[ responseFields[type] ] = responses[ type ];
		}
	}

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

	// Apply the dataFilter if provided
	if ( s.dataFilter ) {
		response = s.dataFilter( response, s.dataType );
	}

	var dataTypes = s.dataTypes,
		converters = {},
		i,
		key,
		length = dataTypes.length,
		tmp,
		// Current and previous dataTypes
		current = dataTypes[ 0 ],
		prev,
		// Conversion expression
		conversion,
		// Conversion function
		conv,
		// Conversion functions (transitive conversion)
		conv1,
		conv2;

	// For each dataType in the chain
	for ( i = 1; i < length; i++ ) {

		// Create converters map
		// with lowercased keys
		if ( i === 1 ) {
			for ( key in s.converters ) {
				if ( typeof key === "string" ) {
					converters[ key.toLowerCase() ] = s.converters[ key ];
				}
			}
		}

		// Get the dataTypes
		prev = current;
		current = dataTypes[ i ];

		// If current is auto dataType, update it to prev
		if ( current === "*" ) {
			current = prev;
		// If no auto and dataTypes are actually different
		} else if ( prev !== "*" && prev !== current ) {

			// Get the converter
			conversion = prev + " " + current;
			conv = converters[ conversion ] || converters[ "* " + current ];

			// If there is no direct converter, search transitively
			if ( !conv ) {
				conv2 = undefined;
				for ( conv1 in converters ) {
					tmp = conv1.split( " " );
					if ( tmp[ 0 ] === prev || tmp[ 0 ] === "*" ) {
						conv2 = converters[ tmp[1] + " " + current ];
						if ( conv2 ) {
							conv1 = converters[ conv1 ];
							if ( conv1 === true ) {
								conv = conv2;
							} else if ( conv2 === true ) {
								conv = conv1;
							}
							break;
						}
					}
				}
			}
			// If we found no converter, dispatch an error
			if ( !( conv || conv2 ) ) {
				jQuery.error( "No conversion from " + conversion.replace(" "," to ") );
			}
			// If found converter is not an equivalence
			if ( conv !== true ) {
				// Convert with 1 or 2 converters accordingly
				response = conv ? conv( response ) : conv2( conv1(response) );
			}
		}
	}
	return response;
}




var jsc = jQuery.now(),
	jsre = /(\=)\?(&|$)|\?\?/i;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		return jQuery.expando + "_" + ( jsc++ );
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var inspectData = ( typeof s.data === "string" ) && /^application\/x\-www\-form\-urlencoded/.test( s.contentType );

	if ( s.dataTypes[ 0 ] === "jsonp" ||
		s.jsonp !== false && ( jsre.test( s.url ) ||
				inspectData && jsre.test( s.data ) ) ) {

		var responseContainer,
			jsonpCallback = s.jsonpCallback =
				jQuery.isFunction( s.jsonpCallback ) ? s.jsonpCallback() : s.jsonpCallback,
			previous = window[ jsonpCallback ],
			url = s.url,
			data = s.data,
			replace = "$1" + jsonpCallback + "$2";

		if ( s.jsonp !== false ) {
			url = url.replace( jsre, replace );
			if ( s.url === url ) {
				if ( inspectData ) {
					data = data.replace( jsre, replace );
				}
				if ( s.data === data ) {
					// Add callback manually
					url += (/\?/.test( url ) ? "&" : "?") + s.jsonp + "=" + jsonpCallback;
				}
			}
		}

		s.url = url;
		s.data = data;

		// Install callback
		window[ jsonpCallback ] = function( response ) {
			responseContainer = [ response ];
		};

		// Clean-up function
		jqXHR.always(function() {
			// Set callback back to previous value
			window[ jsonpCallback ] = previous;
			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( previous ) ) {
				window[ jsonpCallback ]( responseContainer[ 0 ] );
			}
		});

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( jsonpCallback + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Delegate to script
		return "script";
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /javascript|ecmascript/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement( "script" );

				script.async = "async";

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( head && script.parentNode ) {
							head.removeChild( script );
						}

						// Dereference the script
						script = undefined;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};
				// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
				// This arises when a base node is used (#2709 and #4378).
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( 0, 1 );
				}
			}
		};
	}
});




var // #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject ? function() {
		// Abort all pending requests
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( 0, 1 );
		}
	} : false,
	xhrId = 0,
	xhrCallbacks;

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
(function( xhr ) {
	jQuery.extend( jQuery.support, {
		ajax: !!xhr,
		cors: !!xhr && ( "withCredentials" in xhr )
	});
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var xhr = s.xhr(),
						handle,
						i;

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( _ ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {

						var status,
							statusText,
							responseHeaders,
							responses,
							xml;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occured
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();
									responses = {};
									xml = xhr.responseXML;

									// Construct response list
									if ( xml && xml.documentElement /* #4958 */ ) {
										responses.xml = xml;
									}

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									try {
										responses.text = xhr.responseText;
									} catch( _ ) {
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					// if we're in sync mode or it's in cache
					// and has been retrieved directly (IE6 & IE7)
					// we need to manually fire the callback
					if ( !s.async || xhr.readyState === 4 ) {
						callback();
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback(0,1);
					}
				}
			};
		}
	});
}




var elemdisplay = {},
	iframe, iframeDoc,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = /^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,
	timerId,
	fxAttrs = [
		// height animations
		[ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
		// width animations
		[ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ],
		// opacity animations
		[ "opacity" ]
	],
	fxNow;

jQuery.fn.extend({
	show: function( speed, easing, callback ) {
		var elem, display;

		if ( speed || speed === 0 ) {
			return this.animate( genFx("show", 3), speed, easing, callback );

		} else {
			for ( var i = 0, j = this.length; i < j; i++ ) {
				elem = this[ i ];

				if ( elem.style ) {
					display = elem.style.display;

					// Reset the inline display of this element to learn if it is
					// being hidden by cascaded rules or not
					if ( !jQuery._data(elem, "olddisplay") && display === "none" ) {
						display = elem.style.display = "";
					}

					// Set elements which have been overridden with display: none
					// in a stylesheet to whatever the default browser style is
					// for such an element
					if ( (display === "" && jQuery.css(elem, "display") === "none") ||
						!jQuery.contains( elem.ownerDocument.documentElement, elem ) ) {
						jQuery._data( elem, "olddisplay", defaultDisplay(elem.nodeName) );
					}
				}
			}

			// Set the display of most of the elements in a second loop
			// to avoid the constant reflow
			for ( i = 0; i < j; i++ ) {
				elem = this[ i ];

				if ( elem.style ) {
					display = elem.style.display;

					if ( display === "" || display === "none" ) {
						elem.style.display = jQuery._data( elem, "olddisplay" ) || "";
					}
				}
			}

			return this;
		}
	},

	hide: function( speed, easing, callback ) {
		if ( speed || speed === 0 ) {
			return this.animate( genFx("hide", 3), speed, easing, callback);

		} else {
			var elem, display,
				i = 0,
				j = this.length;

			for ( ; i < j; i++ ) {
				elem = this[i];
				if ( elem.style ) {
					display = jQuery.css( elem, "display" );

					if ( display !== "none" && !jQuery._data( elem, "olddisplay" ) ) {
						jQuery._data( elem, "olddisplay", display );
					}
				}
			}

			// Set the display of the elements in a second loop
			// to avoid the constant reflow
			for ( i = 0; i < j; i++ ) {
				if ( this[i].style ) {
					this[i].style.display = "none";
				}
			}

			return this;
		}
	},

	// Save the old toggle function
	_toggle: jQuery.fn.toggle,

	toggle: function( fn, fn2, callback ) {
		var bool = typeof fn === "boolean";

		if ( jQuery.isFunction(fn) && jQuery.isFunction(fn2) ) {
			this._toggle.apply( this, arguments );

		} else if ( fn == null || bool ) {
			this.each(function() {
				var state = bool ? fn : jQuery(this).is(":hidden");
				jQuery(this)[ state ? "show" : "hide" ]();
			});

		} else {
			this.animate(genFx("toggle", 3), fn, fn2, callback);
		}

		return this;
	},

	fadeTo: function( speed, to, easing, callback ) {
		return this.filter(":hidden").css("opacity", 0).show().end()
					.animate({opacity: to}, speed, easing, callback);
	},

	animate: function( prop, speed, easing, callback ) {
		var optall = jQuery.speed( speed, easing, callback );

		if ( jQuery.isEmptyObject( prop ) ) {
			return this.each( optall.complete, [ false ] );
		}

		// Do not change referenced properties as per-property easing will be lost
		prop = jQuery.extend( {}, prop );

		function doAnimation() {
			// XXX 'this' does not always have a nodeName when running the
			// test suite

			if ( optall.queue === false ) {
				jQuery._mark( this );
			}

			var opt = jQuery.extend( {}, optall ),
				isElement = this.nodeType === 1,
				hidden = isElement && jQuery(this).is(":hidden"),
				name, val, p, e, hooks, replace,
				parts, start, end, unit,
				method;

			// will store per property easing and be used to determine when an animation is complete
			opt.animatedProperties = {};

			// first pass over propertys to expand / normalize
			for ( p in prop ) {
				name = jQuery.camelCase( p );
				if ( p !== name ) {
					prop[ name ] = prop[ p ];
					delete prop[ p ];
				}

				if ( ( hooks = jQuery.cssHooks[ name ] ) && "expand" in hooks ) {
					replace = hooks.expand( prop[ name ] );
					delete prop[ name ];

					// not quite $.extend, this wont overwrite keys already present.
					// also - reusing 'p' from above because we have the correct "name"
					for ( p in replace ) {
						if ( ! ( p in prop ) ) {
							prop[ p ] = replace[ p ];
						}
					}
				}
			}

			for ( name in prop ) {
				val = prop[ name ];
				// easing resolution: per property > opt.specialEasing > opt.easing > 'swing' (default)
				if ( jQuery.isArray( val ) ) {
					opt.animatedProperties[ name ] = val[ 1 ];
					val = prop[ name ] = val[ 0 ];
				} else {
					opt.animatedProperties[ name ] = opt.specialEasing && opt.specialEasing[ name ] || opt.easing || 'swing';
				}

				if ( val === "hide" && hidden || val === "show" && !hidden ) {
					return opt.complete.call( this );
				}

				if ( isElement && ( name === "height" || name === "width" ) ) {
					// Make sure that nothing sneaks out
					// Record all 3 overflow attributes because IE does not
					// change the overflow attribute when overflowX and
					// overflowY are set to the same value
					opt.overflow = [ this.style.overflow, this.style.overflowX, this.style.overflowY ];

					// Set display property to inline-block for height/width
					// animations on inline elements that are having width/height animated
					if ( jQuery.css( this, "display" ) === "inline" &&
							jQuery.css( this, "float" ) === "none" ) {

						// inline-level elements accept inline-block;
						// block-level elements need to be inline with layout
						if ( !jQuery.support.inlineBlockNeedsLayout || defaultDisplay( this.nodeName ) === "inline" ) {
							this.style.display = "inline-block";

						} else {
							this.style.zoom = 1;
						}
					}
				}
			}

			if ( opt.overflow != null ) {
				this.style.overflow = "hidden";
			}

			for ( p in prop ) {
				e = new jQuery.fx( this, opt, p );
				val = prop[ p ];

				if ( rfxtypes.test( val ) ) {

					// Tracks whether to show or hide based on private
					// data attached to the element
					method = jQuery._data( this, "toggle" + p ) || ( val === "toggle" ? hidden ? "show" : "hide" : 0 );
					if ( method ) {
						jQuery._data( this, "toggle" + p, method === "show" ? "hide" : "show" );
						e[ method ]();
					} else {
						e[ val ]();
					}

				} else {
					parts = rfxnum.exec( val );
					start = e.cur();

					if ( parts ) {
						end = parseFloat( parts[2] );
						unit = parts[3] || ( jQuery.cssNumber[ p ] ? "" : "px" );

						// We need to compute starting value
						if ( unit !== "px" ) {
							jQuery.style( this, p, (end || 1) + unit);
							start = ( (end || 1) / e.cur() ) * start;
							jQuery.style( this, p, start + unit);
						}

						// If a +=/-= token was provided, we're doing a relative animation
						if ( parts[1] ) {
							end = ( (parts[ 1 ] === "-=" ? -1 : 1) * end ) + start;
						}

						e.custom( start, end, unit );

					} else {
						e.custom( start, val, "" );
					}
				}
			}

			// For JS strict compliance
			return true;
		}

		return optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},

	stop: function( type, clearQueue, gotoEnd ) {
		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var index,
				hadTimers = false,
				timers = jQuery.timers,
				data = jQuery._data( this );

			// clear marker counters if we know they won't be
			if ( !gotoEnd ) {
				jQuery._unmark( true, this );
			}

			function stopQueue( elem, data, index ) {
				var hooks = data[ index ];
				jQuery.removeData( elem, index, true );
				hooks.stop( gotoEnd );
			}

			if ( type == null ) {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && index.indexOf(".run") === index.length - 4 ) {
						stopQueue( this, data, index );
					}
				}
			} else if ( data[ index = type + ".run" ] && data[ index ].stop ){
				stopQueue( this, data, index );
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					if ( gotoEnd ) {

						// force the next step to be the last
						timers[ index ]( true );
					} else {
						timers[ index ].saveState();
					}
					hadTimers = true;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( !( gotoEnd && hadTimers ) ) {
				jQuery.dequeue( this, type );
			}
		});
	}

});

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout( clearFxNow, 0 );
	return ( fxNow = jQuery.now() );
}

function clearFxNow() {
	fxNow = undefined;
}

// Generate parameters to create a standard animation
function genFx( type, num ) {
	var obj = {};

	jQuery.each( fxAttrs.concat.apply([], fxAttrs.slice( 0, num )), function() {
		obj[ this ] = type;
	});

	return obj;
}

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx( "show", 1 ),
	slideUp: genFx( "hide", 1 ),
	slideToggle: genFx( "toggle", 1 ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.extend({
	speed: function( speed, easing, fn ) {
		var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
			complete: fn || !fn && easing ||
				jQuery.isFunction( speed ) && speed,
			duration: speed,
			easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
		};

		opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
			opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

		// normalize opt.queue - true/undefined/null -> "fx"
		if ( opt.queue == null || opt.queue === true ) {
			opt.queue = "fx";
		}

		// Queueing
		opt.old = opt.complete;

		opt.complete = function( noUnmark ) {
			if ( jQuery.isFunction( opt.old ) ) {
				opt.old.call( this );
			}

			if ( opt.queue ) {
				jQuery.dequeue( this, opt.queue );
			} else if ( noUnmark !== false ) {
				jQuery._unmark( this );
			}
		};

		return opt;
	},

	easing: {
		linear: function( p ) {
			return p;
		},
		swing: function( p ) {
			return ( -Math.cos( p*Math.PI ) / 2 ) + 0.5;
		}
	},

	timers: [],

	fx: function( elem, options, prop ) {
		this.options = options;
		this.elem = elem;
		this.prop = prop;

		options.orig = options.orig || {};
	}

});

jQuery.fx.prototype = {
	// Simple function for setting a style value
	update: function() {
		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		( jQuery.fx.step[ this.prop ] || jQuery.fx.step._default )( this );
	},

	// Get the current size
	cur: function() {
		if ( this.elem[ this.prop ] != null && (!this.elem.style || this.elem.style[ this.prop ] == null) ) {
			return this.elem[ this.prop ];
		}

		var parsed,
			r = jQuery.css( this.elem, this.prop );
		// Empty strings, null, undefined and "auto" are converted to 0,
		// complex values such as "rotate(1rad)" are returned as is,
		// simple values such as "10px" are parsed to Float.
		return isNaN( parsed = parseFloat( r ) ) ? !r || r === "auto" ? 0 : r : parsed;
	},

	// Start an animation from one number to another
	custom: function( from, to, unit ) {
		var self = this,
			fx = jQuery.fx;

		this.startTime = fxNow || createFxNow();
		this.end = to;
		this.now = this.start = from;
		this.pos = this.state = 0;
		this.unit = unit || this.unit || ( jQuery.cssNumber[ this.prop ] ? "" : "px" );

		function t( gotoEnd ) {
			return self.step( gotoEnd );
		}

		t.queue = this.options.queue;
		t.elem = this.elem;
		t.saveState = function() {
			if ( jQuery._data( self.elem, "fxshow" + self.prop ) === undefined ) {
				if ( self.options.hide ) {
					jQuery._data( self.elem, "fxshow" + self.prop, self.start );
				} else if ( self.options.show ) {
					jQuery._data( self.elem, "fxshow" + self.prop, self.end );
				}
			}
		};

		if ( t() && jQuery.timers.push(t) && !timerId ) {
			timerId = setInterval( fx.tick, fx.interval );
		}
	},

	// Simple 'show' function
	show: function() {
		var dataShow = jQuery._data( this.elem, "fxshow" + this.prop );

		// Remember where we started, so that we can go back to it later
		this.options.orig[ this.prop ] = dataShow || jQuery.style( this.elem, this.prop );
		this.options.show = true;

		// Begin the animation
		// Make sure that we start at a small width/height to avoid any flash of content
		if ( dataShow !== undefined ) {
			// This show is picking up where a previous hide or show left off
			this.custom( this.cur(), dataShow );
		} else {
			this.custom( this.prop === "width" || this.prop === "height" ? 1 : 0, this.cur() );
		}

		// Start by showing the element
		jQuery( this.elem ).show();
	},

	// Simple 'hide' function
	hide: function() {
		// Remember where we started, so that we can go back to it later
		this.options.orig[ this.prop ] = jQuery._data( this.elem, "fxshow" + this.prop ) || jQuery.style( this.elem, this.prop );
		this.options.hide = true;

		// Begin the animation
		this.custom( this.cur(), 0 );
	},

	// Each step of an animation
	step: function( gotoEnd ) {
		var p, n, complete,
			t = fxNow || createFxNow(),
			done = true,
			elem = this.elem,
			options = this.options;

		if ( gotoEnd || t >= options.duration + this.startTime ) {
			this.now = this.end;
			this.pos = this.state = 1;
			this.update();

			options.animatedProperties[ this.prop ] = true;

			for ( p in options.animatedProperties ) {
				if ( options.animatedProperties[ p ] !== true ) {
					done = false;
				}
			}

			if ( done ) {
				// Reset the overflow
				if ( options.overflow != null && !jQuery.support.shrinkWrapBlocks ) {

					jQuery.each( [ "", "X", "Y" ], function( index, value ) {
						elem.style[ "overflow" + value ] = options.overflow[ index ];
					});
				}

				// Hide the element if the "hide" operation was done
				if ( options.hide ) {
					jQuery( elem ).hide();
				}

				// Reset the properties, if the item has been hidden or shown
				if ( options.hide || options.show ) {
					for ( p in options.animatedProperties ) {
						jQuery.style( elem, p, options.orig[ p ] );
						jQuery.removeData( elem, "fxshow" + p, true );
						// Toggle data is no longer needed
						jQuery.removeData( elem, "toggle" + p, true );
					}
				}

				// Execute the complete function
				// in the event that the complete function throws an exception
				// we must ensure it won't be called twice. #5684

				complete = options.complete;
				if ( complete ) {

					options.complete = false;
					complete.call( elem );
				}
			}

			return false;

		} else {
			// classical easing cannot be used with an Infinity duration
			if ( options.duration == Infinity ) {
				this.now = t;
			} else {
				n = t - this.startTime;
				this.state = n / options.duration;

				// Perform the easing function, defaults to swing
				this.pos = jQuery.easing[ options.animatedProperties[this.prop] ]( this.state, n, 0, 1, options.duration );
				this.now = this.start + ( (this.end - this.start) * this.pos );
			}
			// Perform the next step of the animation
			this.update();
		}

		return true;
	}
};

jQuery.extend( jQuery.fx, {
	tick: function() {
		var timer,
			timers = jQuery.timers,
			i = 0;

		for ( ; i < timers.length; i++ ) {
			timer = timers[ i ];
			// Checks the timer has not already been removed
			if ( !timer() && timers[ i ] === timer ) {
				timers.splice( i--, 1 );
			}
		}

		if ( !timers.length ) {
			jQuery.fx.stop();
		}
	},

	interval: 13,

	stop: function() {
		clearInterval( timerId );
		timerId = null;
	},

	speeds: {
		slow: 600,
		fast: 200,
		// Default speed
		_default: 400
	},

	step: {
		opacity: function( fx ) {
			jQuery.style( fx.elem, "opacity", fx.now );
		},

		_default: function( fx ) {
			if ( fx.elem.style && fx.elem.style[ fx.prop ] != null ) {
				fx.elem.style[ fx.prop ] = fx.now + fx.unit;
			} else {
				fx.elem[ fx.prop ] = fx.now;
			}
		}
	}
});

// Ensure props that can't be negative don't go there on undershoot easing
jQuery.each( fxAttrs.concat.apply( [], fxAttrs ), function( i, prop ) {
	// exclude marginTop, marginLeft, marginBottom and marginRight from this list
	if ( prop.indexOf( "margin" ) ) {
		jQuery.fx.step[ prop ] = function( fx ) {
			jQuery.style( fx.elem, prop, Math.max(0, fx.now) + fx.unit );
		};
	}
});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}

// Try to restore the default display value of an element
function defaultDisplay( nodeName ) {

	if ( !elemdisplay[ nodeName ] ) {

		var body = document.body,
			elem = jQuery( "<" + nodeName + ">" ).appendTo( body ),
			display = elem.css( "display" );
		elem.remove();

		// If the simple way fails,
		// get element's real default display by attaching it to a temp iframe
		if ( display === "none" || display === "" ) {
			// No iframe to use yet, so create it
			if ( !iframe ) {
				iframe = document.createElement( "iframe" );
				iframe.frameBorder = iframe.width = iframe.height = 0;
			}

			body.appendChild( iframe );

			// Create a cacheable copy of the iframe document on first call.
			// IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
			// document to it; WebKit & Firefox won't allow reusing the iframe document.
			if ( !iframeDoc || !iframe.createElement ) {
				iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
				iframeDoc.write( ( jQuery.support.boxModel ? "<!doctype html>" : "" ) + "<html><body>" );
				iframeDoc.close();
			}

			elem = iframeDoc.createElement( nodeName );

			iframeDoc.body.appendChild( elem );

			display = jQuery.css( elem, "display" );
			body.removeChild( iframe );
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return elemdisplay[ nodeName ];
}




var getOffset,
	rtable = /^t(?:able|d|h)$/i,
	rroot = /^(?:body|html)$/i;

if ( "getBoundingClientRect" in document.documentElement ) {
	getOffset = function( elem, doc, docElem, box ) {
		try {
			box = elem.getBoundingClientRect();
		} catch(e) {}

		// Make sure we're not dealing with a disconnected DOM node
		if ( !box || !jQuery.contains( docElem, elem ) ) {
			return box ? { top: box.top, left: box.left } : { top: 0, left: 0 };
		}

		var body = doc.body,
			win = getWindow( doc ),
			clientTop  = docElem.clientTop  || body.clientTop  || 0,
			clientLeft = docElem.clientLeft || body.clientLeft || 0,
			scrollTop  = win.pageYOffset || jQuery.support.boxModel && docElem.scrollTop  || body.scrollTop,
			scrollLeft = win.pageXOffset || jQuery.support.boxModel && docElem.scrollLeft || body.scrollLeft,
			top  = box.top  + scrollTop  - clientTop,
			left = box.left + scrollLeft - clientLeft;

		return { top: top, left: left };
	};

} else {
	getOffset = function( elem, doc, docElem ) {
		var computedStyle,
			offsetParent = elem.offsetParent,
			prevOffsetParent = elem,
			body = doc.body,
			defaultView = doc.defaultView,
			prevComputedStyle = defaultView ? defaultView.getComputedStyle( elem, null ) : elem.currentStyle,
			top = elem.offsetTop,
			left = elem.offsetLeft;

		while ( (elem = elem.parentNode) && elem !== body && elem !== docElem ) {
			if ( jQuery.support.fixedPosition && prevComputedStyle.position === "fixed" ) {
				break;
			}

			computedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle;
			top  -= elem.scrollTop;
			left -= elem.scrollLeft;

			if ( elem === offsetParent ) {
				top  += elem.offsetTop;
				left += elem.offsetLeft;

				if ( jQuery.support.doesNotAddBorder && !(jQuery.support.doesAddBorderForTableAndCells && rtable.test(elem.nodeName)) ) {
					top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
					left += parseFloat( computedStyle.borderLeftWidth ) || 0;
				}

				prevOffsetParent = offsetParent;
				offsetParent = elem.offsetParent;
			}

			if ( jQuery.support.subtractsBorderForOverflowNotVisible && computedStyle.overflow !== "visible" ) {
				top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
				left += parseFloat( computedStyle.borderLeftWidth ) || 0;
			}

			prevComputedStyle = computedStyle;
		}

		if ( prevComputedStyle.position === "relative" || prevComputedStyle.position === "static" ) {
			top  += body.offsetTop;
			left += body.offsetLeft;
		}

		if ( jQuery.support.fixedPosition && prevComputedStyle.position === "fixed" ) {
			top  += Math.max( docElem.scrollTop, body.scrollTop );
			left += Math.max( docElem.scrollLeft, body.scrollLeft );
		}

		return { top: top, left: left };
	};
}

jQuery.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				jQuery.offset.setOffset( this, options, i );
			});
	}

	var elem = this[0],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return null;
	}

	if ( elem === doc.body ) {
		return jQuery.offset.bodyOffset( elem );
	}

	return getOffset( elem, doc, doc.documentElement );
};

jQuery.offset = {

	bodyOffset: function( body ) {
		var top = body.offsetTop,
			left = body.offsetLeft;

		if ( jQuery.support.doesNotIncludeMarginInBodyOffset ) {
			top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
			left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
		}

		return { top: top, left: left };
	},

	setOffset: function( elem, options, i ) {
		var position = jQuery.css( elem, "position" );

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = jQuery( elem ),
			curOffset = curElem.offset(),
			curCSSTop = jQuery.css( elem, "top" ),
			curCSSLeft = jQuery.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


jQuery.fn.extend({

	position: function() {
		if ( !this[0] ) {
			return null;
		}

		var elem = this[0],

		// Get *real* offsetParent
		offsetParent = this.offsetParent(),

		// Get correct offsets
		offset       = this.offset(),
		parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

		// Subtract element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
		offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

		// Add offsetParent borders
		parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
		parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

		// Subtract the two offsets
		return {
			top:  offset.top  - parentOffset.top,
			left: offset.left - parentOffset.left
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || document.body;
			while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent;
		});
	}
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return jQuery.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					jQuery.support.boxModel && win.document.documentElement[ method ] ||
						win.document.body[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					 top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}




// Create width, height, innerHeight, innerWidth, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	var clientProp = "client" + name,
		scrollProp = "scroll" + name,
		offsetProp = "offset" + name;

	// innerHeight and innerWidth
	jQuery.fn[ "inner" + name ] = function() {
		var elem = this[0];
		return elem ?
			elem.style ?
			parseFloat( jQuery.css( elem, type, "padding" ) ) :
			this[ type ]() :
			null;
	};

	// outerHeight and outerWidth
	jQuery.fn[ "outer" + name ] = function( margin ) {
		var elem = this[0];
		return elem ?
			elem.style ?
			parseFloat( jQuery.css( elem, type, margin ? "margin" : "border" ) ) :
			this[ type ]() :
			null;
	};

	jQuery.fn[ type ] = function( value ) {
		return jQuery.access( this, function( elem, type, value ) {
			var doc, docElemProp, orig, ret;

			if ( jQuery.isWindow( elem ) ) {
				// 3rd condition allows Nokia support, as it supports the docElem prop but not CSS1Compat
				doc = elem.document;
				docElemProp = doc.documentElement[ clientProp ];
				return jQuery.support.boxModel && docElemProp ||
					doc.body && doc.body[ clientProp ] || docElemProp;
			}

			// Get document width or height
			if ( elem.nodeType === 9 ) {
				// Either scroll[Width/Height] or offset[Width/Height], whichever is greater
				doc = elem.documentElement;

				// when a window > document, IE6 reports a offset[Width/Height] > client[Width/Height]
				// so we can't use max, as it'll choose the incorrect offset[Width/Height]
				// instead we use the correct client[Width/Height]
				// support:IE6
				if ( doc[ clientProp ] >= doc[ scrollProp ] ) {
					return doc[ clientProp ];
				}

				return Math.max(
					elem.body[ scrollProp ], doc[ scrollProp ],
					elem.body[ offsetProp ], doc[ offsetProp ]
				);
			}

			// Get width or height on the element
			if ( value === undefined ) {
				orig = jQuery.css( elem, type );
				ret = parseFloat( orig );
				return jQuery.isNumeric( ret ) ? ret : orig;
			}

			// Set the width or height on the element
			jQuery( elem ).css( type, value );
		}, type, value, arguments.length, null );
	};
});




// Expose jQuery to the global object
window.jQuery = window.$ = jQuery;

// Expose jQuery as an AMD module, but only for AMD loaders that
// understand the issues with loading multiple versions of jQuery
// in a page that all might call define(). The loader will indicate
// they have special allowances for multiple jQuery versions by
// specifying define.amd.jQuery = true. Register as a named module,
// since jQuery can be concatenated with other files that may use define,
// but not use a proper concatenation script that understands anonymous
// AMD modules. A named AMD is safest and most robust way to register.
// Lowercase jquery is used because AMD module names are derived from
// file names, and jQuery is normally delivered in a lowercase file name.
// Do this after creating the global so that if an AMD module wants to call
// noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
	define( "jquery", [], function () { return jQuery; } );
}



})( window );

/*!
 * Lo-Dash v0.2.2 <http://lodash.com>
 * Copyright 2012 John-David Dalton <http://allyoucanleet.com/>
 * Based on Underscore.js 1.3.3, copyright 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
 * <http://documentcloud.github.com/underscore>
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window, undefined) {
  

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports &&
    (typeof global == 'object' && global && global == global.global && (window = global), exports);

  /** Used to escape characters in templates */
  var escapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /**
   * Detect the JScript [[DontEnum]] bug:
   * In IE < 9 an objects own properties, shadowing non-enumerable ones, are
   * made non-enumerable as well.
   */
  var hasDontEnumBug = !{ 'valueOf': 0 }.propertyIsEnumerable('valueOf');

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to restore the original `_` reference in `noConflict` */
  var oldDash = window._;

  /** Used to detect if a method is native */
  var reNative = RegExp('^' + ({}.valueOf + '')
    .replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&')
    .replace(/valueOf|for [^\]]+/g, '.+?') + '$');

  /** Used to match tokens in template text */
  var reToken = /__token__(\d+)/g;

  /** Used to match unescaped characters in template text */
  var reUnescaped = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to fix the JScript [[DontEnum]] bug */
  var shadowed = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to replace template delimiters */
  var token = '__token__';

  /** Used to store tokenized template text snippets */
  var tokenized = [];

  /** Object#toString result shortcuts */
  var arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Native prototype shortcuts */
  var ArrayProto = Array.prototype,
      ObjectProto = Object.prototype;

  /** Native method shortcuts */
  var concat = ArrayProto.concat,
      hasOwnProperty = ObjectProto.hasOwnProperty,
      push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjectProto.toString;

  /* Used if `Function#bind` exists and is inferred to be fast (i.e. all but V8) */
  var nativeBind = reNative.test(nativeBind = slice.bind) &&
    /\n|Opera/.test(nativeBind + toString.call(window.opera)) && nativeBind;

  /* Native method shortcuts for methods with the same name as other `lodash` methods */
  var nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
      nativeIsFinite = window.isFinite,
      nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys;

  /** Timer shortcuts */
  var clearTimeout = window.clearTimeout,
      setTimeout = window.setTimeout;

  /*--------------------------------------------------------------------------*/

  /**
   * The `lodash` function.
   *
   * @name _
   * @constructor
   * @param {Mixed} value The value to wrap in a `LoDash` instance.
   * @returns {Object} Returns a `LoDash` instance.
   */
  function lodash(value) {
    // allow invoking `lodash` without the `new` operator
    return new LoDash(value);
  }

  /**
   * Creates a `LoDash` instance that wraps a value to allow chaining.
   *
   * @private
   * @constructor
   * @param {Mixed} value The value to wrap.
   */
  function LoDash(value) {
    // exit early if already wrapped
    if (value && value._wrapped) {
      return value;
    }
    this._wrapped = value;
  }

  /**
   * By default, Lo-Dash uses ERB-style template delimiters, change the
   * following template settings to use alternative delimiters.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  lodash.templateSettings = {

    /**
     * Used to detect `data` property values to be HTML-escaped.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'escape': /<%-([\s\S]+?)%>/g,

    /**
     * Used to detect code to be evaluated.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'evaluate': /<%([\s\S]+?)%>/g,

    /**
     * Used to detect `data` property values to inject.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'interpolate': /<%=([\s\S]+?)%>/g,

    /**
     * Used to reference the data object in the template text.
     *
     * @static
     * @memberOf _.templateSettings
     * @type String
     */
    'variable': 'obj'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The template used to create iterator functions.
   *
   * @private
   * @param {Obect} data The data object used to populate the text.
   * @returns {String} Returns the interpolated text.
   */
  var iteratorTemplate = template(
    // assign the `result` variable an initial value
    'var index, result<% if (init) { %> = <%= init %><% } %>;\n' +
    // add code to exit early or do so if the first argument is falsey
    '<%= exit %>;\n' +
    // add code after the exit snippet but before the iteration branches
    '<%= top %>;\n' +

    // the following branch is for iterating arrays and array-like objects
    '<% if (arrayBranch) { %>' +
    'var length = <%= firstArg %>.length; index = -1;' +
    '  <% if (objectBranch) { %>\nif (length === +length) {<% } %>\n' +
    '  <%= arrayBranch.beforeLoop %>;\n' +
    '  while (<%= arrayBranch.loopExp %>) {\n' +
    '    <%= arrayBranch.inLoop %>;\n' +
    '  }' +
    '  <% if (objectBranch) { %>\n}\n<% }' +
    '}' +

    // the following branch is for iterating an object's own/inherited properties
    'if (objectBranch) {' +
    '  if (arrayBranch) { %>else {\n<% }' +
    '  if (!hasDontEnumBug) { %>  var skipProto = typeof <%= iteratedObject %> == \'function\';\n<% } %>' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  for (<%= objectBranch.loopExp %>) {' +
    '  \n<%' +
    '  if (hasDontEnumBug) {' +
    '    if (useHas) { %>    if (<%= hasExp %>) {\n  <% } %>' +
    '    <%= objectBranch.inLoop %>;<%' +
    '    if (useHas) { %>\n    }<% }' +
    '  }' +
    '  else {' +
    '  %>' +

    // Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
    // (if the prototype or a property on the prototype has been set)
    // incorrectly sets a function's `prototype` property [[Enumerable]]
    // value to `true`. Because of this Lo-Dash standardizes on skipping
    // the the `prototype` property of functions regardless of its
    // [[Enumerable]] value.
    '    if (!(skipProto && index == \'prototype\')<% if (useHas) { %> && <%= hasExp %><% } %>) {\n' +
    '      <%= objectBranch.inLoop %>;\n' +
    '    }' +
    '  <% } %>\n' +
    '  }' +

    // Because IE < 9 can't set the `[[Enumerable]]` attribute of an
    // existing property and the `constructor` property of a prototype
    // defaults to non-enumerable, Lo-Dash skips the `constructor`
    // property when it infers it's iterating over a `prototype` object.
    '  <% if (hasDontEnumBug) { %>\n' +
    '  var ctor = <%= iteratedObject %>.constructor;\n' +
    '  <% for (var k = 0; k < 7; k++) { %>\n' +
    '  index = \'<%= shadowed[k] %>\';\n' +
    '  if (<%' +
    '      if (shadowed[k] == \'constructor\') {' +
    '        %>!(ctor && ctor.prototype === <%= iteratedObject %>) && <%' +
    '      } %><%= hasExp %>) {\n' +
    '    <%= objectBranch.inLoop %>;\n' +
    '  }<%' +
    '     }' +
    '   }' +
    '   if (arrayBranch) { %>\n}<% }' +
    '} %>\n' +

    // add code to the bottom of the iteration function
    '<%= bottom %>;\n' +
    // finally, return the `result`
    'return result'
  );

  /**
   * Reusable iterator options shared by
   * `every`, `filter`, `find`, `forEach`,`groupBy`, `map`, `reject`, and `some`.
   */
  var baseIteratorOptions = {
    'args': 'collection, callback, thisArg',
    'init': 'collection',
    'top':
      'if (!callback) {\n' +
      '  callback = identity\n' +
      '}\n' +
      'else if (thisArg) {\n' +
      '  callback = bind(callback, thisArg)\n' +
      '}',
    'inLoop': 'callback(collection[index], index, collection)'
  };

  /** Reusable iterator options for `every` and `some` */
  var everyIteratorOptions = {
    'init': 'true',
    'inLoop': 'if (!callback(collection[index], index, collection)) return !result'
  };

  /** Reusable iterator options for `defaults` and `extend` */
  var extendIteratorOptions = {
    'args': 'object',
    'init': 'object',
    'top':
      'for (var source, sourceIndex = 1, length = arguments.length; sourceIndex < length; sourceIndex++) {\n' +
      '  source = arguments[sourceIndex];\n' +
      (hasDontEnumBug ? '  if (source) {' : ''),
    'loopExp': 'index in source',
    'useHas': false,
    'inLoop': 'object[index] = source[index]',
    'bottom': (hasDontEnumBug ? '  }\n' : '') + '}'
  };

  /** Reusable iterator options for `filter`  and `reject` */
  var filterIteratorOptions = {
    'init': '[]',
    'inLoop': 'callback(collection[index], index, collection) && result.push(collection[index])'
  };

  /** Reusable iterator options for `find`  and `forEach` */
  var forEachIteratorOptions = {
    'top': 'if (thisArg) callback = bind(callback, thisArg)'
  };

  /** Reusable iterator options for `map`, `pluck`, and `values` */
  var mapIteratorOptions = {
    'init': '',
    'exit': 'if (!collection) return []',
    'beforeLoop': {
      'array':  'result = Array(length)',
      'object': 'result = []'
    },
    'inLoop': {
      'array':  'result[index] = callback(collection[index], index, collection)',
      'object': 'result.push(callback(collection[index], index, collection))'
    }
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Creates compiled iteration functions. The iteration function will be created
   * to iterate over only objects if the first argument of `options.args` is
   * "object" or `options.inLoop.array` is falsey.
   *
   * @private
   * @param {Object} [options1, options2, ...] The compile options objects.
   *
   *  args - A string of comma separated arguments the iteration function will
   *   accept.
   *
   *  init - A string to specify the initial value of the `result` variable.
   *
   *  exit - A string of code to use in place of the default exit-early check
   *   of `if (!arguments[0]) return result`.
   *
   *  top - A string of code to execute after the exit-early check but before
   *   the iteration branches.
   *
   *  beforeLoop - A string or object containing an "array" or "object" property
   *   of code to execute before the array or object loops.
   *
   *  loopExp - A string or object containing an "array" or "object" property
   *   of code to execute as the array or object loop expression.
   *
   *  useHas - A boolean to specify whether or not to use `hasOwnProperty` checks
   *   in the object loop.
   *
   *  inLoop - A string or object containing an "array" or "object" property
   *   of code to execute in the array or object loops.
   *
   *  bottom - A string of code to execute after the iteration branches but
   *   before the `result` is returned.
   *
   * @returns {Function} Returns the compiled function.
   */
  function createIterator() {
    var object,
        prop,
        value,
        index = -1,
        length = arguments.length;

    // merge options into a template data object
    var data = {
      'bottom': '',
      'exit': '',
      'init': '',
      'top': '',
      'arrayBranch': { 'beforeLoop': '', 'loopExp': '++index < length' },
      'objectBranch': { 'beforeLoop': '' }
    };

    while (++index < length) {
      object = arguments[index];
      for (prop in object) {
        value = (value = object[prop]) == null ? '' : value;
        // keep this regexp explicit for the build pre-process
        if (/beforeLoop|loopExp|inLoop/.test(prop)) {
          if (typeof value == 'string') {
            value = { 'array': value, 'object': value };
          }
          data.arrayBranch[prop] = value.array;
          data.objectBranch[prop] = value.object;
        } else {
          data[prop] = value;
        }
      }
    }
    // set additional template data values
    var args = data.args,
        arrayBranch = data.arrayBranch,
        objectBranch = data.objectBranch,
        firstArg = /^[^,]+/.exec(args)[0],
        loopExp = objectBranch.loopExp,
        iteratedObject = /\S+$/.exec(loopExp || firstArg)[0];

    data.firstArg = firstArg;
    data.hasDontEnumBug = hasDontEnumBug;
    data.hasExp = 'hasOwnProperty.call(' + iteratedObject + ', index)';
    data.iteratedObject = iteratedObject;
    data.shadowed = shadowed;
    data.useHas = data.useHas !== false;

    if (!data.exit) {
      data.exit = 'if (!' + firstArg + ') return result';
    }
    if (firstArg == 'object' || !arrayBranch.inLoop) {
      data.arrayBranch = null;
    }
    if (!loopExp) {
      objectBranch.loopExp = 'index in ' + iteratedObject;
    }
    // create the function factory
    var factory = Function(
        'arrayClass, bind, funcClass, hasOwnProperty, identity, objectTypes, ' +
        'stringClass, toString, undefined',
      ' return function(' + args + ') {\n' + iteratorTemplate(data) + '\n}'
    );
    // return the compiled function
    return factory(
      arrayClass, bind, funcClass, hasOwnProperty, identity, objectTypes,
      stringClass, toString
    );
  }

  /**
   * Used by `template()` to replace tokens with their corresponding code snippets.
   *
   * @private
   * @param {String} match The matched token.
   * @param {String} index The `tokenized` index of the code snippet.
   * @returns {String} Returns the code snippet.
   */
  function detokenize(match, index) {
    return tokenized[index];
  }

  /**
   * Used by `template()` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeChar(match) {
    return '\\' + escapes[match];
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * Used by `template()` to replace "escape" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeEscape(match, value) {
    var index = tokenized.length;
    tokenized[index] = "'+\n((__t = (" + value + ")) == null ? '' : _.escape(__t)) +\n'";
    return token + index;
  }

  /**
   * Used by `template()` to replace "interpolate" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeInterpolate(match, value) {
    var index = tokenized.length;
    tokenized[index] = "'+\n((__t = (" + value + ")) == null ? '' : __t) +\n'";
    return token + index;
  }

  /**
   * Used by `template()` to replace "evaluate" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeEvaluate(match, value) {
    var index = tokenized.length;
    tokenized[index] = "';\n" + value + ";\n__p += '";
    return token + index;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Checks if a given `target` value is present in a `collection` using strict
   * equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @alias include
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Mixed} target The value to check for.
   * @returns {Boolean} Returns `true` if `target` value is found, else `false`.
   * @example
   *
   * _.contains([1, 2, 3], 3);
   * // => true
   */
  var contains = createIterator({
    'args': 'collection, target',
    'init': 'false',
    'inLoop': 'if (collection[index] === target) return true'
  });

  /**
   * Checks if the `callback` returns a truthy value for **all** elements of a
   * `collection`. The `callback` is invoked with 3 arguments; for arrays they
   * are (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias all
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Boolean} Returns `true` if all values pass the callback check, else `false`.
   * @example
   *
   * _.every([true, 1, null, 'yes'], Boolean);
   * // => false
   */
  var every = createIterator(baseIteratorOptions, everyIteratorOptions);

  /**
   * Examines each value in a `collection`, returning an array of all values the
   * `callback` returns truthy for. The `callback` is invoked with 3 arguments;
   * for arrays they are (value, index, array) and for objects they are
   * (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias select
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values that passed callback check.
   * @example
   *
   * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [2, 4, 6]
   */
  var filter = createIterator(baseIteratorOptions, filterIteratorOptions);

  /**
   * Examines each value in a `collection`, returning the first one the `callback`
   * returns truthy for. The function returns as soon as it finds an acceptable
   * value, and does not iterate over the entire `collection`. The `callback` is
   * invoked with 3 arguments; for arrays they are (value, index, array) and for
   * objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias detect
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the value that passed the callback check, else `undefined`.
   * @example
   *
   * var even = _.find([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => 2
   */
  var find = createIterator(baseIteratorOptions, forEachIteratorOptions, {
    'init': '',
    'inLoop': 'if (callback(collection[index], index, collection)) return collection[index]'
  });

  /**
   * Iterates over a `collection`, executing the `callback` for each value in the
   * `collection`. The `callback` is bound to the `thisArg` value, if one is passed.
   * The `callback` is invoked with 3 arguments; for arrays they are
   * (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array|Object} Returns the `collection`.
   * @example
   *
   * _.forEach({ 'one': 1, 'two': 2, 'three': 3}, function(num) { alert(num); });
   * // => alerts each number in turn
   *
   * _([1, 2, 3]).forEach(function(num) { alert(num); }).join(',');
   * // => alerts each number in turn and returns '1,2,3'
   */
  var forEach = createIterator(baseIteratorOptions, forEachIteratorOptions);

  /**
   * Produces a new array of values by mapping each value in the `collection`
   * through a transformation `callback`. The `callback` is bound to the `thisArg`
   * value, if one is passed. The `callback` is invoked with 3 arguments; for
   * arrays they are (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias collect
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values returned by the callback.
   * @example
   *
   * _.map([1, 2, 3], function(num) { return num * 3; });
   * // => [3, 6, 9]
   *
   * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
   * // => [3, 6, 9]
   */
  var map = createIterator(baseIteratorOptions, mapIteratorOptions);

  /**
   * Retrieves the value of a specified property from all values in a `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {String} property The property to pluck.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.pluck(stooges, 'name');
   * // => ['moe', 'larry', 'curly']
   */
  var pluck = createIterator(mapIteratorOptions, {
    'args': 'collection, property',
    'inLoop': {
      'array':  'result[index] = collection[index][property]',
      'object': 'result.push(collection[index][property])'
    }
  });

  /**
   * Boils down a `collection` to a single value. The initial state of the
   * reduction is `accumulator` and each successive step of it should be returned
   * by the `callback`. The `callback` is bound to the `thisArg` value, if one is
   * passed. The `callback` is invoked with 4 arguments; for arrays they are
   * (accumulator, value, index, array) and for objects they are
   * (accumulator, value, key, object).
   *
   * @static
   * @memberOf _
   * @alias foldl, inject
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var sum = _.reduce([1, 2, 3], function(memo, num) { return memo + num; });
   * // => 6
   */
  var reduce = createIterator({
    'args': 'collection, callback, accumulator, thisArg',
    'init': 'accumulator',
    'top':
      'var noaccum = arguments.length < 3;\n' +
      'if (thisArg) callback = bind(callback, thisArg)',
    'beforeLoop': {
      'array': 'if (noaccum) result = collection[++index]'
    },
    'inLoop': {
      'array':
        'result = callback(result, collection[index], index, collection)',
      'object':
        'result = noaccum\n' +
        '  ? (noaccum = false, collection[index])\n' +
        '  : callback(result, collection[index], index, collection)'
    }
  });

  /**
   * The right-associative version of `_.reduce`. The `callback` is bound to the
   * `thisArg` value, if one is passed. The `callback` is invoked with 4 arguments;
   * for arrays they are (accumulator, value, index, array) and for objects they
   * are (accumulator, value, key, object).
   *
   * @static
   * @memberOf _
   * @alias foldr
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var list = [[0, 1], [2, 3], [4, 5]];
   * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
   * // => [4, 5, 2, 3, 0, 1]
   */
  function reduceRight(collection, callback, accumulator, thisArg) {
    if (!collection) {
      return accumulator;
    }

    var length = collection.length,
        noaccum = arguments.length < 3;

    if(thisArg) {
      callback = bind(callback, thisArg);
    }
    if (length === +length) {
      if (length && noaccum) {
        accumulator = collection[--length];
      }
      while (length--) {
        accumulator = callback(accumulator, collection[length], length, collection);
      }
      return accumulator;
    }

    var prop,
        props = keys(collection);

    length = props.length;
    if (length && noaccum) {
      accumulator = collection[props[--length]];
    }
    while (length--) {
      prop = props[length];
      accumulator = callback(accumulator, collection[prop], prop, collection);
    }
    return accumulator;
  }

  /**
   * The opposite of `_.filter`, this method returns the values of a `collection`
   * that `callback` does **not** return truthy for. The `callback` is invoked
   * with 3 arguments; for arrays they are (value, index, array) and for objects
   * they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values that did **not** pass the callback check.
   * @example
   *
   * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [1, 3, 5]
   */
  var reject = createIterator(baseIteratorOptions, filterIteratorOptions, {
    'inLoop': '!' + filterIteratorOptions.inLoop
  });

  /**
   * Checks if the `callback` returns a truthy value for **any** element of a
   * `collection`. The function returns as soon as it finds passing value, and
   * does not iterate over the entire `collection`. The `callback` is invoked
   * with 3 arguments; for arrays they are (value, index, array) and for objects
   * they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias any
   * @category Collections
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Boolean} Returns `true` if any value passes the callback check, else `false`.
   * @example
   *
   * _.some([null, 0, 'yes', false]);
   * // => true
   */
  var some = createIterator(baseIteratorOptions, everyIteratorOptions, {
    'init': 'false',
    'inLoop': everyIteratorOptions.inLoop.replace('!', '')
  });

  /**
   * Converts the `collection`, into an array. Useful for converting the
   * `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object} collection The collection to convert.
   * @returns {Array} Returns the new converted array.
   * @example
   *
   * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
   * // => [2, 3, 4]
   */
  function toArray(collection) {
    if (!collection) {
      return [];
    }
    if (toString.call(collection.toArray) == funcClass) {
      return collection.toArray();
    }
    var length = collection.length;
    if (length === +length) {
      return slice.call(collection);
    }
    return values(collection);
  }

  /**
   * Produces an array of enumerable own property values of the `collection`.
   *
   * @static
   * @memberOf _
   * @alias methods
   * @category Collections
   * @param {Array|Object} collection The collection to inspect.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * _.values({ 'one': 1, 'two': 2, 'three': 3 });
   * // => [1, 2, 3]
   */
  var values = createIterator(mapIteratorOptions, {
    'args': 'collection',
    'inLoop': {
      'array':  'result[index] = collection[index]',
      'object': 'result.push(collection[index])'
    }
  });

  /*--------------------------------------------------------------------------*/

  /**
   * Produces a new array with all falsey values of `array` removed. The values
   * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    var index = -1,
        length = array.length,
        result = [];

    while (++index < length) {
      if (array[index]) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Produces a new array of `array` values not present in the other arrays
   * using strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Array} [array1, array2, ...] Arrays to check.
   * @returns {Array} Returns a new array of `array` values not present in the
   *  other arrays.
   * @example
   *
   * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
   * // => [1, 3, 4]
   */
  function difference(array) {
    var index = -1,
        length = array.length,
        result = [],
        flattened = concat.apply(result, slice.call(arguments, 1));

    while (++index < length) {
      if (indexOf(flattened, array[index]) < 0) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Gets the first value of the `array`. Pass `n` to return the first `n` values
   * of the `array`.
   *
   * @static
   * @memberOf _
   * @alias head, take
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the first value or an array of the first `n` values
   *  of the `array`.
   * @example
   *
   * _.first([5, 4, 3, 2, 1]);
   * // => 5
   */
  function first(array, n, guard) {
    return (n == undefined || guard) ? array[0] : slice.call(array, 0, n);
  }

  /**
   * Flattens a nested array (the nesting can be to any depth). If `shallow` is
   * truthy, `array` will only be flattened a single level.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @param {Boolean} shallow A flag to indicate only flattening a single level.
   * @returns {Array} Returns a new flattened array.
   * @example
   *
   * _.flatten([1, [2], [3, [[4]]]]);
   * // => [1, 2, 3, 4];
   *
   * _.flatten([1, [2], [3, [[4]]]], true);
   * // => [1, 2, 3, [[4]]];
   */
  function flatten(array, shallow) {
    var value,
        index = -1,
        length = array.length,
        result = [];

    while (++index < length) {
      value = array[index];
      if (isArray(value)) {
        push.apply(result, shallow ? value : flatten(value));
      } else {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Splits a `collection` into sets, grouped by the result of running each value
   * through `callback`. The `callback` is invoked with 3 arguments;
   * (value, index, array). The `callback` argument may also be the name of a
   * property to group by.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function|String} callback The function called per iteration or
   *  property name to group by.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns an object of grouped values.
   * @example
   *
   * _.groupBy([1.3, 2.1, 2.4], function(num) { return Math.floor(num); });
   * // => { '1': [1.3], '2': [2.1, 2.4] }
   *
   * _.groupBy([1.3, 2.1, 2.4], function(num) { return this.floor(num); }, Math);
   * // => { '1': [1.3], '2': [2.1, 2.4] }
   *
   * _.groupBy(['one', 'two', 'three'], 'length');
   * // => { '3': ['one', 'two'], '5': ['three'] }
   */
  function groupBy(array, callback, thisArg) {
    var prop,
        value,
        index = -1,
        isFunc = toString.call(callback) == funcClass,
        length = array.length,
        result = {};

    if (isFunc && thisArg) {
      callback = bind(callback, thisArg);
    }
    while (++index < length) {
      value = array[index];
      prop = isFunc ? callback(value, index, array) : value[callback];
      (hasOwnProperty.call(result, prop) ? result[prop] : result[prop] = []).push(value);
    }
    return result
  }

  /**
   * Produces a new sorted array, ranked in ascending order by the results of
   * running each value of a `collection` through `callback`. The `callback` is
   * invoked with 3 arguments; for arrays they are (value, index, array) and for
   * objects they are (value, key, object). The `callback` argument may also be
   * the name of a property to sort by (e.g. 'length').
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function|String} callback The function called per iteration or
   *  property name to sort by.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of sorted values.
   * @example
   *
   * _.sortBy([1, 2, 3, 4, 5, 6], function(num) { return Math.sin(num); });
   * // => [5, 4, 6, 3, 1, 2]
   *
   * _.sortBy([1, 2, 3, 4, 5, 6], function(num) { return this.sin(num); }, Math);
   * // => [5, 4, 6, 3, 1, 2]
   */
  function sortBy(array, callback, thisArg) {
    if (toString.call(callback) != funcClass) {
      var prop = callback;
      callback = function(array) { return array[prop]; };
    } else if (thisArg) {
      callback = bind(callback, thisArg);
    }
    return pluck(map(array, function(value, index) {
      return {
        'criteria': callback(value, index, array),
        'value': value
      };
    }).sort(function(left, right) {
      var a = left.criteria,
          b = right.criteria;

      if (a === undefined) {
        return 1;
      }
      if (b === undefined) {
        return -1;
      }
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  }

  /**
   * Gets the index at which the first occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`. If the `array` is already
   * sorted, passing `true` for `isSorted` will run a faster binary search.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.indexOf([1, 2, 3], 2);
   * // => 1
   */
  function indexOf(array, value, isSorted) {
    var index, length;
    if (!array) {
      return -1;
    }
    if (isSorted) {
      index = sortedIndex(array, value);
      return array[index] === value ? index : -1;
    }
    for (index = 0, length = array.length; index < length; index++) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Gets all but the last value of the `array`. Pass `n` to exclude the last `n`
   * values from the result.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the last value or `n` values of the `array`.
   * @example
   *
   * _.initial([5, 4, 3, 2, 1]);
   * // => [5, 4, 3, 2]
   */
  function initial(array, n, guard) {
    return slice.call(array, 0, -((n == undefined || guard) ? 1 : n));
  }

  /**
   * Computes the intersection of all the passed-in arrays.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in **all** of the arrays.
   * @example
   *
   * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2]
   */
  function intersection(array) {
    var value,
        index = -1,
        length = array.length,
        others = slice.call(arguments, 1),
        result = [];

    while (++index < length) {
      value = array[index];
      if (indexOf(result, value) < 0 &&
          every(others, function(other) { return indexOf(other, value) > -1; })) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Calls the method named by `methodName` for each value of the `collection`.
   * Additional arguments will be passed to each invoked method.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {String} methodName The name of the method to invoke.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
   * @returns {Array} Returns a new array of values returned from each invoked method.
   * @example
   *
   * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
   * // => [[1, 5, 7], [1, 2, 3]]
   */
  function invoke(array, methodName) {
    var args = slice.call(arguments, 2),
        index = -1,
        length = array.length,
        isFunc = toString.call(methodName) == funcClass,
        result = [];

    while (++index < length) {
      result[index] = (isFunc ? methodName : array[index][methodName]).apply(array[index], args);
    }
    return result;
  }

  /**
   * Gets the last value of the `array`. Pass `n` to return the lasy `n` values
   * of the `array`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the last value or `n` values of the `array`.
   * @example
   *
   * _.last([5, 4, 3, 2, 1]);
   * // => 1
   */
  function last(array, n, guard) {
    var length = array.length;
    return (n == undefined || guard) ? array[length - 1] : slice.call(array, -n || length);
  }

  /**
   * Gets the index at which the last occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 4
   */
  function lastIndexOf(array, value) {
    if (!array) {
      return -1;
    }
    var index = array.length;
    while (index--) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Retrieves the maximum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is invoked with 3
   * arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the maximum value.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.max(stooges, function(stooge) { return stooge.age; });
   * // => { 'name': 'curly', 'age': 60 };
   */
  function max(array, callback, thisArg) {
    var current,
        computed = -Infinity,
        index = -1,
        length = array.length,
        result = computed;

    if (!callback) {
      while (++index < length) {
        if (array[index] > result) {
          result = array[index];
        }
      }
      return result;
    }
    if (thisArg) {
      callback = bind(callback, thisArg);
    }
    while (++index < length) {
      current = callback(array[index], index, array);
      if (current > computed) {
        computed = current;
        result = array[index];
      }
    }
    return result;
  }

  /**
   * Retrieves the minimum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is invoked with 3
   * arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the minimum value.
   * @example
   *
   * _.min([10, 5, 100, 2, 1000]);
   * // => 2
   */
  function min(array, callback, thisArg) {
    var current,
        computed = Infinity,
        index = -1,
        length = array.length,
        result = computed;

    if (!callback) {
      while (++index < length) {
        if (array[index] < result) {
          result = array[index];
        }
      }
      return result;
    }
    if (thisArg) {
      callback = bind(callback, thisArg);
    }
    while (++index < length) {
      current = callback(array[index], index, array);
      if (current < computed) {
        computed = current;
        result = array[index];
      }
    }
    return result;
  }

  /**
   * Creates an array of numbers (positive and/or negative) progressing from
   * `start` up to but not including `stop`. This method is a port of Python's
   * `range()` function. See http://docs.python.org/library/functions.html#range.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Number} [start=0] The start of the range.
   * @param {Number} end The end of the range.
   * @param {Number} [step=1] The value to increment or descrement by.
   * @returns {Array} Returns a new range array.
   * @example
   *
   * _.range(10);
   * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
   *
   * _.range(1, 11);
   * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   *
   * _.range(0, 30, 5);
   * // => [0, 5, 10, 15, 20, 25]
   *
   * _.range(0, -10, -1);
   * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
   *
   * _.range(0);
   * // => []
   */
  function range(start, end, step) {
    step || (step = 1);
    if (arguments.length < 2) {
      end = start || 0;
      start = 0;
    }

    var index = -1,
        length = Math.max(Math.ceil((end - start) / step), 0),
        result = Array(length);

    while (++index < length) {
      result[index] = start;
      start += step;
    }
    return result;
  }

  /**
   * The opposite of `_.initial`, this method gets all but the first value of
   * the `array`. Pass `n` to exclude the first `n` values from the result.
   *
   * @static
   * @memberOf _
   * @alias tail
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the first value or `n` values of the `array`.
   * @example
   *
   * _.rest([5, 4, 3, 2, 1]);
   * // => [4, 3, 2, 1]
   */
  function rest(array, n, guard) {
    return slice.call(array, (n == undefined || guard) ? 1 : n);
  }

  /**
   * Produces a new array of shuffled `array` values, using a version of the
   * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to shuffle.
   * @returns {Array} Returns a new shuffled array.
   * @example
   *
   * _.shuffle([1, 2, 3, 4, 5, 6]);
   * // => [4, 1, 6, 3, 5, 2]
   */
  function shuffle(array) {
    var rand,
        index = -1,
        length = array.length,
        result = Array(length);

    while (++index < length) {
      rand = Math.floor(Math.random() * (index + 1));
      result[index] = result[rand];
      result[rand] = array[index];
    }
    return result;
  }

  /**
   * Uses a binary search to determine the smallest  index at which the `value`
   * should be inserted into the `collection` in order to maintain the sort order
   * of the `collection`. If `callback` is passed, it will be executed for each
   * value in the `collection` to compute their sort ranking. The `callback` is
   * invoked with 1 argument; (value).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Mixed} value The value to evaluate.
   * @param {Function} [callback] The function called per iteration.
   * @returns {Number} Returns the index at which the value should be inserted
   *  into the collection.
   * @example
   *
   * _.sortedIndex([10, 20, 30, 40, 50], 35);
   * // => 3
   */
  function sortedIndex(array, value, callback) {
    var mid,
        low = 0,
        high = array.length;

    if (callback) {
      value = callback(value);
    }
    while (low < high) {
      mid = (low + high) >> 1;
      if ((callback ? callback(array[mid]) : array[mid]) < value) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  /**
   * Computes the union of the passed-in arrays.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in one or more of the arrays.
   * @example
   *
   * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2, 3, 101, 10]
   */
  function union() {
    var index = -1,
        result = [],
        flattened = concat.apply(result, arguments),
        length = flattened.length;

    while (++index < length) {
      if (indexOf(result, flattened[index]) < 0) {
        result.push(flattened[index]);
      }
    }
    return result;
  }

  /**
   * Produces a duplicate-value-free version of the `array` using strict equality
   * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
   * for `isSorted` will run a faster algorithm. If `callback` is passed,
   * each value of `array` is passed through a transformation `callback` before
   * uniqueness is computed. The `callback` is invoked with 3 arguments;
   * (value, index, array).
   *
   * @static
   * @memberOf _
   * @alias unique
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
   * @param {Function} [callback] A
   * @returns {Array} Returns a duplicate-value-free array.
   * @example
   *
   * _.uniq([1, 2, 1, 3, 1, 4]);
   * // => [1, 2, 3, 4]
   */
  function uniq(array, isSorted, callback) {
    var computed,
        index = -1,
        length = array.length,
        result = [],
        seen = [];

    while (++index < length) {
      computed = callback ? callback(array[index]) : array[index];
      if (isSorted
            ? !index || seen[seen.length - 1] !== computed
            : indexOf(seen, computed) < 0
          ) {
        seen.push(computed);
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Produces a new array with all occurrences of the passed values removed using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to filter.
   * @param {Mixed} [value1, value2, ...] Values to remove.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
   * // => [2, 3, 4]
   */
  function without(array) {
    var excluded = slice.call(arguments, 1),
        index = -1,
        length = array.length,
        result = [];

    while (++index < length) {
      if (indexOf(excluded, array[index]) < 0) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Merges together the values of each of the arrays with the value at the
   * corresponding position. Useful for separate data sources that are coordinated
   * through matching array indexes. For a matrix of nested arrays, `_.zip.apply(...)`
   * can transpose the matrix in a similar fashion.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of merged arrays.
   * @example
   *
   * _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
   * // => [['moe', 30, true], ['larry', 40, false], ['curly', 50, false]]
   */
  function zip() {
    var index = -1,
        length = max(pluck(arguments, 'length')),
        result = Array(length);

    while (++index < length) {
      result[index] = pluck(arguments, index);
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new function that is restricted to executing only after it is
   * called `n` times.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Number} n The number of times the function must be called before
   * it is executed.
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var renderNotes = _.after(notes.length, render);
   * _.forEach(notes, function(note) {
   *   note.asyncSave({ 'success': renderNotes });
   * });
   * // renderNotes is run once, after all notes have saved.
   */
  function after(n, func) {
    if (n < 1) {
      return func();
    }
    return function() {
      if (--n < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  /**
   * Creates a new function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and prepends any additional `bind` arguments to those
   * passed to the bound function. Lazy defined methods may be bound by passing
   * the object they are bound to as `func` and the method name as `thisArg`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function|Object} func The function to bind or the object the method belongs to.
   * @param @param {Mixed} [thisArg] The `this` binding of `func` or the method name.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * // basic bind
   * var func = function(greeting) { return greeting + ': ' + this.name; };
   * func = _.bind(func, { 'name': 'moe' }, 'hi');
   * func();
   * // => 'hi: moe'
   *
   * // lazy bind
   * var object = {
   *   'name': 'moe',
   *   'greet': function(greeting) {
   *     return greeting + ': ' + this.name;
   *   }
   * };
   *
   * var func = _.bind(object, 'greet', 'hi');
   * func();
   * // => 'hi: moe'
   *
   * object.greet = function(greeting) {
   *   return greeting + ' ' + this.name + '!';
   * };
   *
   * func();
   * // => 'hi moe!'
   */
  function bind(func, thisArg) {
    var methodName,
        isFunc = toString.call(func) == funcClass;

    // juggle arguments
    if (!isFunc) {
      methodName = thisArg;
      thisArg = func;
    }
    // use if `Function#bind` is faster
    else if (nativeBind) {
      return nativeBind.call.apply(nativeBind, arguments);
    }

    var partialArgs = slice.call(arguments, 2);

    function bound() {
      // `Function#bind` spec
      // http://es5.github.com/#x15.3.4.5
      var args = arguments,
          thisBinding = thisArg;

      if (!isFunc) {
        func = thisArg[methodName];
      }
      if (partialArgs.length) {
        args = args.length
          ? concat.apply(partialArgs, args)
          : partialArgs;
      }
      if (this instanceof bound) {
        // get `func` instance if `bound` is invoked in a `new` expression
        noop.prototype = func.prototype;
        thisBinding = new noop;

        // mimic the constructor's `return` behavior
        // http://es5.github.com/#x13.2.2
        var result = func.apply(thisBinding, args);
        return objectTypes[typeof result] && result !== null
          ? result
          : thisBinding
      }
      return func.apply(thisBinding, args);
    }

    return bound;
  }

  /**
   * Binds methods on the `object` to the object, overwriting the non-bound method.
   * If no method names are provided, all the function properties of the `object`
   * will be bound.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Object} object The object to bind and assign the bound methods to.
   * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * var buttonView = {
   *  'label': 'lodash',
   *  'onClick': function() { alert('clicked: ' + this.label); },
   *  'onHover': function() { console.log('hovering: ' + this.label); }
   * };
   *
   * _.bindAll(buttonView);
   * jQuery('#lodash_button').on('click', buttonView.onClick);
   * // => When the button is clicked, `this.label` will have the correct value
   */
  function bindAll(object) {
    var funcs = arguments,
        index = 1;

    if (funcs.length == 1) {
      index = 0;
      funcs = functions(object);
    }
    for (var length = funcs.length; index < length; index++) {
      object[funcs[index]] = bind(object[funcs[index]], object);
    }
    return object;
  }

  /**
   * Creates a new function that is the composition of the passed functions,
   * where each function consumes the return value of the function that follows.
   * In math terms, composing thefunctions `f()`, `g()`, and `h()` produces `f(g(h()))`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} [func1, func2, ...] Functions to compose.
   * @returns {Function} Returns the new composed function.
   * @example
   *
   * var greet = function(name) { return 'hi: ' + name; };
   * var exclaim = function(statement) { return statement + '!'; };
   * var welcome = _.compose(exclaim, greet);
   * welcome('moe');
   * // => 'hi: moe!'
   */
  function compose() {
    var funcs = arguments;
    return function() {
      var args = arguments,
          length = funcs.length;

      while (length--) {
        args = [funcs[length].apply(this, args)];
      }
      return args[0];
    };
  }

  /**
   * Creates a new function that will delay the execution of `func` until after
   * `wait` milliseconds have elapsed since the last time it was invoked. Pass
   * `true` for `immediate` to cause debounce to invoke `func` on the leading,
   * instead of the trailing, edge of the `wait` timeout. Subsequent calls to
   * the debounced function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to debounce.
   * @param {Number} wait The number of milliseconds to delay.
   * @param {Boolean} immediate A flag to indicate execution is on the leading
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * var lazyLayout = _.debounce(calculateLayout, 300);
   * jQuery(window).on('resize', lazyLayout);
   */
  function debounce(func, wait, immediate) {
    var args,
        result,
        thisArg,
        timeoutId;

    function delayed() {
      timeoutId = undefined;
      if (!immediate) {
        func.apply(thisArg, args);
      }
    }

    return function() {
      var isImmediate = immediate && !timeoutId;
      args = arguments;
      thisArg = this;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(delayed, wait);

      if (isImmediate) {
        result = func.apply(thisArg, args);
      }
      return result;
    };
  }

  /**
   * Executes the `func` function after `wait` milliseconds. Additional arguments
   * are passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to delay.
   * @param {Number} wait The number of milliseconds to delay execution.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * var log = _.bind(console.log, console);
   * _.delay(log, 1000, 'logged later');
   * // => 'logged later' (Appears after one second.)
   */
  function delay(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function() { return func.apply(undefined, args); }, wait);
  }

  /**
   * Defers executing the `func` function until the current call stack has cleared.
   * Additional arguments are passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to defer.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * _.defer(function() { alert('deferred'); });
   * // Returns from the function before the alert runs.
   */
  function defer(func) {
    var args = slice.call(arguments, 1);
    return setTimeout(function() { return func.apply(undefined, args); }, 1);
  }

  /**
   * Creates a new function that memoizes the result of `func`. If `resolver` is
   * passed, it will be used to determine the cache key for storing the result
   * based on the arguments passed to the memoized function. By default, the first
   * argument passed to the memoized function is used as the cache key.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] A function used to resolve the cache key.
   * @returns {Function} Returns the new memoizing function.
   * @example
   *
   * var fibonacci = _.memoize(function(n) {
   *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
   * });
   */
  function memoize(func, resolver) {
    var cache = {};
    return function() {
      var prop = resolver ? resolver.apply(this, arguments) : arguments[0];
      return hasOwnProperty.call(cache, prop)
        ? cache[prop]
        : (cache[prop] = func.apply(this, arguments));
    };
  }

  /**
   * Creates a new function that is restricted to one execution. Repeat calls to
   * the function will return the value of the first call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var initialize = _.once(createApplication);
   * initialize();
   * initialize();
   * // Application is only created once.
   */
  function once(func) {
    var result,
        ran = false;

    return function() {
      if (ran) {
        return result;
      }
      ran = true;
      result = func.apply(this, arguments);
      return result;
    };
  }

  /**
   * Creates a new function that, when called, invokes `func` with any additional
   * `partial` arguments prepended to those passed to the partially applied
   * function. This method is similar `bind`, except it does **not** alter the
   * `this` binding.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to partially apply arguments to.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new partially applied function.
   * @example
   *
   * var greet = function(greeting, name) { return greeting + ': ' + name; };
   * var hi = _.partial(greet, 'hi');
   * hi('moe');
   * // => 'hi: moe'
   */
  function partial(func) {
    var args = slice.call(arguments, 1),
        argsLength = args.length;

    return function() {
      var result,
          others = arguments;

      if (others.length) {
        args.length = argsLength;
        push.apply(args, others);
      }
      result = args.length == 1 ? func.call(this, args[0]) : func.apply(this, args);
      args.length = argsLength;
      return result;
    };
  }

  /**
   * Creates a new function that, when executed, will only call the `func`
   * function at most once per every `wait` milliseconds. If the throttled function
   * is invoked more than once, `func` will also be called on the trailing edge
   * of the `wait` timeout. Subsequent calls to the throttled function will
   * return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to throttle.
   * @param {Number} wait The number of milliseconds to throttle executions to.
   * @returns {Function} Returns the new throttled function.
   * @example
   *
   * var throttled = _.throttle(updatePosition, 100);
   * jQuery(window).on('scroll', throttled);
   */
  function throttle(func, wait) {
    var args,
        result,
        thisArg,
        timeoutId,
        lastCalled = 0;

    function trailingCall() {
      lastCalled = new Date;
      timeoutId = undefined;
      func.apply(thisArg, args);
    }

    return function() {
      var now = new Date,
          remain = wait - (now - lastCalled);

      args = arguments;
      thisArg = this;

      if (remain <= 0) {
        lastCalled = now;
        result = func.apply(thisArg, args);
      }
      else if (!timeoutId) {
        timeoutId = setTimeout(trailingCall, remain);
      }
      return result;
    };
  }

  /**
   * Create a new function that passes the `func` function to the `wrapper`
   * function as its first argument. Additional arguments are appended to those
   * passed to the `wrapper` function.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to wrap.
   * @param {Function} wrapper The wrapper function.
   * @param {Mixed} [arg1, arg2, ...] Arguments to append to those passed to the wrapper.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var hello = function(name) { return 'hello: ' + name; };
   * hello = _.wrap(hello, function(func) {
   *   return 'before, ' + func('moe') + ', after';
   * });
   * hello();
   * // => 'before, hello: moe, after'
   */
  function wrap(func, wrapper) {
    return function() {
      var args = [func];
      if (arguments.length) {
        push.apply(args, arguments);
      }
      return wrapper.apply(this, args);
    };
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a shallow clone of the `value`. Any nested objects or arrays will be
   * assigned by reference and not cloned.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to clone.
   * @returns {Mixed} Returns the cloned `value`.
   * @example
   *
   * _.clone({ 'name': 'moe' });
   * // => { 'name': 'moe' };
   */
  function clone(value) {
    return objectTypes[typeof value] && value !== null
      ? (isArray(value) ? value.slice() : extend({}, value))
      : value;
  }

  /**
   * Assigns missing properties in `object` with default values from the defaults
   * objects. As soon as a property is set, additional defaults of the same
   * property will be ignored.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to populate.
   * @param {Object} [defaults1, defaults2, ...] The defaults objects to apply to `object`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * var iceCream = { 'flavor': 'chocolate' };
   * _.defaults(iceCream, { 'flavor': 'vanilla', 'sprinkles': 'lots' });
   * // => { 'flavor': 'chocolate', 'sprinkles': 'lots' }
   */
  var defaults = createIterator(extendIteratorOptions, {
    'inLoop': 'if (object[index] == undefined)' + extendIteratorOptions.inLoop
  });

  /**
   * Copies enumerable properties from the source objects to the `destination` object.
   * Subsequent sources will overwrite propery assignments of previous sources.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * _.extend({ 'name': 'moe' }, { 'age': 40 });
   * // => { 'name': 'moe', 'age': 40 }
   */
  var extend = createIterator(extendIteratorOptions);

  /**
   * Produces a sorted array of the properties, own and inherited, of `object`
   * that have function values.
   *
   * @static
   * @memberOf _
   * @alias methods
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names that have function values.
   * @example
   *
   * _.functions(_);
   * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
   */
  var functions = createIterator({
    'args': 'object',
    'init': '[]',
    'useHas': false,
    'inLoop': 'if (toString.call(object[index]) == funcClass) result.push(index)',
    'bottom': 'result.sort()'
  });

  /**
   * Checks if the specified object `property` exists and is a direct property,
   * instead of an inherited property.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to check.
   * @param {String} property The property to check for.
   * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
   * @example
   *
   * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
   * // => true
   */
  function has(object, property) {
    return hasOwnProperty.call(object, property);
  }

  /**
   * Checks if a `value` is an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
   * @example
   *
   * (function() { return _.isArguments(arguments); })(1, 2, 3);
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = function(value) {
    return toString.call(value) == '[object Arguments]';
  };
  // fallback for browser like IE<9 which detect `arguments` as `[object Object]`
  if (!isArguments(arguments)) {
    isArguments = function(value) {
      return !!(value && hasOwnProperty.call(value, 'callee'));
    };
  }

  /**
   * Checks if a `value` is an array.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an array, else `false`.
   * @example
   *
   * (function() { return _.isArray(arguments); })();
   * // => false
   *
   * _.isArray([1, 2, 3]);
   * // => true
   */
  var isArray = nativeIsArray || function(value) {
    return toString.call(value) == arrayClass;
  };

  /**
   * Checks if a `value` is a boolean (`true` or `false`) value.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a boolean value, else `false`.
   * @example
   *
   * _.isBoolean(null);
   * // => false
   */
  function isBoolean(value) {
    return value === true || value === false || toString.call(value) == boolClass;
  }

  /**
   * Checks if a `value` is a date.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a date, else `false`.
   * @example
   *
   * _.isDate(new Date);
   * // => true
   */
  function isDate(value) {
    return toString.call(value) == dateClass;
  }

  /**
   * Checks if a `value` is a DOM element.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a DOM element, else `false`.
   * @example
   *
   * _.isElement(document.body);
   * // => true
   */
  function isElement(value) {
    return !!(value && value.nodeType == 1);
  }

  /**
   * Checks if a `value` is empty. Arrays or strings with a length of `0` and
   * objects with no enumerable own properties are considered "empty".
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Boolean} Returns `true` if the `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({});
   * // => true
   */
  var isEmpty = createIterator({
    'args': 'value',
    'init': 'true',
    'top':
      'var className = toString.call(value);\n' +
      'if (className == arrayClass || className == stringClass) return !value.length',
    'inLoop': {
      'object': 'return false'
    }
  });

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent to each other.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} a The value to compare.
   * @param {Mixed} b The other value to compare.
   * @param {Array} [stack] Internally used to keep track of "seen" objects to
   *  avoid circular references.
   * @returns {Boolean} Returns `true` if the values are equvalent, else `false`.
   * @example
   *
   * var moe = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   * var clone = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   *
   * moe == clone;
   * // => false
   *
   * _.isEqual(moe, clone);
   * // => true
   */
  function isEqual(a, b, stack) {
    stack || (stack = []);

    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }
    // a strict comparison is necessary because `null == undefined`
    if (a == undefined || b == undefined) {
      return a === b;
    }
    // unwrap any wrapped objects
    if (a._chain) {
      a = a._wrapped;
    }
    if (b._chain) {
      b = b._wrapped;
    }
    // invoke a custom `isEqual` method if one is provided
    if (a.isEqual && toString.call(a.isEqual) == funcClass) {
      return a.isEqual(b);
    }
    if (b.isEqual && toString.call(b.isEqual) == funcClass) {
      return b.isEqual(a);
    }
    // compare [[Class]] names
    var className = toString.call(a);
    if (className != toString.call(b)) {
      return false;
    }
    switch (className) {
      // strings, numbers, dates, and booleans are compared by value
      case stringClass:
        // primitives and their corresponding object instances are equivalent;
        // thus, `'5'` is quivalent to `new String('5')`
        return a == String(b);

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return a != +a
          ? b != +b
          // but treat `+0` vs. `-0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case boolClass:
      case dateClass:
        // coerce dates and booleans to numeric values, dates to milliseconds and booleans to 1 or 0;
        // treat invalid dates coerced to `NaN` as not equal
        return +a == +b;

      // regexps are compared by their source and flags
      case regexpClass:
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') {
      return false;
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) {
        return true;
      }
    }

    var index = -1,
        result = true,
        size = 0;

    // add the first collection to the stack of traversed objects
    stack.push(a);

    // recursively compare objects and arrays
    if (className == arrayClass) {
      // compare array lengths to determine if a deep comparison is necessary
      size = a.length;
      result = size == b.length;

      if (result) {
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          if (!(result = isEqual(a[size], b[size], stack))) {
            break;
          }
        }
      }
    } else {
      // objects with different constructors are not equivalent
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) {
        return false;
      }
      // deep compare objects.
      for (var prop in a) {
        if (hasOwnProperty.call(a, prop)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          if (!(result = hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stack))) {
            break;
          }
        }
      }
      // ensure both objects have the same number of properties
      if (result) {
        for (prop in b) {
          if (hasOwnProperty.call(b, prop) && !(size--)) break;
        }
        result = !size;
      }
      // handle JScript [[DontEnum]] bug
      if (result && hasDontEnumBug) {
        while (++index < 7) {
          prop = shadowed[index];
          if (hasOwnProperty.call(a, prop)) {
            if (!(result = hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stack))) {
              break;
            }
          }
        }
      }
    }
    // remove the first collection from the stack of traversed objects
    stack.pop();
    return result;
  }

  /**
   * Checks if a `value` is a finite number.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a finite number, else `false`.
   * @example
   *
   * _.isFinite(-101);
   * // => true
   *
   * _.isFinite('10');
   * // => false
   *
   * _.isFinite(Infinity);
   * // => false
   */
  function isFinite(value) {
    return nativeIsFinite(value) && toString.call(value) == numberClass;
  }

  /**
   * Checks if a `value` is a function.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(''.concat);
   * // => true
   */
  function isFunction(value) {
    return toString.call(value) == funcClass;
  }

  /**
   * Checks if a `value` is the language type of Object.
   * (e.g. arrays, functions, objects, regexps, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.com/#x8
    return objectTypes[typeof value] && value !== null;
  }

  /**
   * Checks if a `value` is `NaN`.
   * Note: this is not the same as native `isNaN`, which will return true for
   * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `NaN`, else `false`.
   * @example
   *
   * _.isNaN(NaN);
   * // => true
   *
   * _.isNaN(new Number(NaN));
   * // => true
   *
   * isNaN(undefined);
   * // => true
   *
   * _.isNaN(undefined);
   * // => false
   */
  function isNaN(value) {
    // `NaN` as a primitive is the only value that is not equal to itself
    // (perform the [[Class]] check first to avoid errors with some host objects in IE)
    return toString.call(value) == numberClass && value != +value
  }

  /**
   * Checks if a `value` is `null`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `null`, else `false`.
   * @example
   *
   * _.isNull(null);
   * // => true
   *
   * _.isNull(undefined);
   * // => false
   */
  function isNull(value) {
    return value === null;
  }

  /**
   * Checks if a `value` is a number.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a number, else `false`.
   * @example
   *
   * _.isNumber(8.4 * 5;
   * // => true
   */
  function isNumber(value) {
    return toString.call(value) == numberClass;
  }

  /**
   * Checks if a `value` is a regular expression.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a regular expression, else `false`.
   * @example
   *
   * _.isRegExp(/moe/);
   * // => true
   */
  function isRegExp(value) {
    return toString.call(value) == regexpClass;
  }

  /**
   * Checks if a `value` is a string.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a string, else `false`.
   * @example
   *
   * _.isString('moe');
   * // => true
   */
  function isString(value) {
    return toString.call(value) == stringClass;
  }

  /**
   * Checks if a `value` is `undefined`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `undefined`, else `false`.
   * @example
   *
   * _.isUndefined(void 0);
   * // => true
   */
  function isUndefined(value) {
    return value === undefined;
  }

  /**
   * Produces an array of the `object`'s enumerable own property names.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   * @example
   *
   * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
   * // => ['one', 'two', 'three']
   */
  var keys = nativeKeys || createIterator({
    'args': 'object',
    'exit': 'if (!objectTypes[typeof object] || object === null) throw TypeError()',
    'init': '[]',
    'inLoop': 'result.push(index)'
  });

  /**
   * Creates an object composed of the specified properties. Property names may
   * be specified as individual arguments or as arrays of property names.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to pluck.
   * @param {Object} [prop1, prop2, ...] The properties to pick.
   * @returns {Object} Returns an object composed of the picked properties.
   * @example
   *
   * _.pick({ 'name': 'moe', 'age': 40, 'userid': 'moe1' }, 'name', 'age');
   * // => { 'name': 'moe', 'age': 40 }
   */
  function pick(object) {
    var prop,
        index = 0,
        props = concat.apply(ArrayProto, arguments),
        length = props.length,
        result = {};

    // start `index` at `1` to skip `object`
    while (++index < length) {
      prop = props[index];
      if (prop in object) {
        result[prop] = object[prop];
      }
    }
    return result;
  }

  /**
   * Gets the size of a `value` by returning `value.length` if `value` is a
   * string or array, or the number of own enumerable properties if `value` is
   * an object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Number} Returns `value.length` if `value` is a string or array,
   *  or the number of own enumerable properties if `value` is an object.
   * @example
   *
   * _.size([1, 2]);
   * // => 2
   *
   * _.size({ 'one': 1, 'two': 2, 'three': 3 });
   * // => 3
   *
   * _.size('curly');
   * // => 5
   */
  function size(value) {
    var className = toString.call(value);
    return className == arrayClass || className == stringClass
      ? value.length
      : keys(value).length;
  }

  /**
   * Invokes `interceptor` with the `value` as the first argument, and then returns
   * `value`. The primary purpose of this method is to "tap into" a method chain,
   * in order to performoperations on intermediate results within the chain.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to pass to `callback`.
   * @param {Function} interceptor The function to invoke.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * _.chain([1,2,3,200])
   *  .filter(function(num) { return num % 2 == 0; })
   *  .tap(alert)
   *  .map(function(num) { return num * num })
   *  .value();
   * // => // [2, 200] (alerted)
   * // => [4, 40000]
   */
  function tap(value, interceptor) {
    interceptor(value);
    return value;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Escapes a string for insertion into HTML, replacing `&`, `<`, `"`, `'`,
   * and `/` characters.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} string The string to escape.
   * @returns {String} Returns the escaped string.
   * @example
   *
   * _.escape('Curly, Larry & Moe');
   * // => "Curly, Larry &amp; Moe"
   */
  function escape(string) {
    // the `>` character doesn't require escaping in HTML and has no special
    // meaning unless it's part of a tag or an unquoted attribute value
    // http://mathiasbynens.be/notes/ambiguous-ampersands (semi-related fun fact)
    return (string + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * This function returns the first argument passed to it.
   * Note: It is used throughout Lo-Dash as a default callback.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Mixed} value Any value.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * var moe = { 'name': 'moe' };
   * moe === _.identity(moe);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Adds functions properties of `object` to the `lodash` function and chainable
   * wrapper.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object of function properties to add to `lodash`.
   * @example
   *
   * _.mixin({
   *   'capitalize': function(string) {
   *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
   *   }
   * });
   *
   * _.capitalize('curly');
   * // => 'Curly'
   *
   * _('larry').capitalize();
   * // => 'Larry'
   */
  function mixin(object) {
    forEach(functions(object), function(methodName) {
      var func = lodash[methodName] = object[methodName];

      LoDash.prototype[methodName] = function() {
        var args = [this._wrapped];
        if (arguments.length) {
          push.apply(args, arguments);
        }
        var result = args.length == 1 ? func.call(lodash, args[0]) : func.apply(lodash, args);
        if (this._chain) {
          result = new LoDash(result);
          result._chain = true;
        }
        return result;
      };
    });
  }

  /**
   * Reverts the '_' variable to its previous value and returns a reference to
   * the `lodash` function.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @returns {Function} Returns the `lodash` function.
   * @example
   *
   * var lodash = _.noConflict();
   */
  function noConflict() {
    window._ = oldDash;
    return this;
  }

  /**
   * Resolves the value of `property` on `object`. If the property is a function
   * it will be invoked and its result returned, else the property value is returned.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object to inspect.
   * @param {String} property The property to get the result of.
   * @returns {Mixed} Returns the resolved.
   * @example
   *
   * var object = {
   *   'cheese': 'crumpets',
   *   'stuff': function() {
   *     return 'nonsense';
   *   }
   * };
   *
   * _.result(object, 'cheese');
   * // => 'crumpets'
   *
   * _.result(object, 'stuff');
   * // => 'nonsense'
   */
  function result(object, property) {
    if (!object) {
      return null;
    }
    var value = object[property];
    return toString.call(value) == funcClass ? object[property]() : value;
  }

  /**
   * A JavaScript micro-templating method, similar to John Resig's implementation.
   * Lo-Dash templating handles arbitrary delimiters, preserves whitespace, and
   * correctly escapes quotes within interpolated code.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} text The template text.
   * @param {Obect} data The data object used to populate the text.
   * @param {Object} options The options object.
   * @returns {Function|String} Returns a compiled function when no `data` object
   *  is given, else it returns the interpolated text.
   * @example
   *
   * // using compiled template
   * var compiled = _.template('hello: <%= name %>');
   * compiled({ 'name': 'moe' });
   * // => 'hello: moe'
   *
   * var list = '% _.forEach(people, function(name) { %> <li><%= name %></li> <% }); %>';
   * _.template(list, { 'people': ['moe', 'curly', 'larry'] });
   * // => '<li>moe</li><li>curly</li><li>larry</li>'
   *
   * var template = _.template('<b><%- value %></b>');
   * template({ 'value': '<script>' });
   * // => '<b>&lt;script&gt;</b>'
   *
   * // using `print`
   * var compiled = _.template('<% print("Hello " + epithet); %>');
   * compiled({ 'epithet': 'stooge' });
   * // => 'Hello stooge.'
   *
   * // using custom template settings
   * _.templateSettings = {
   *   'interpolate': /\{\{(.+?)\}\}/g
   * };
   *
   * var template = _.template('Hello {{ name }}!');
   * template({ 'name': 'Mustache' });
   * // => 'Hello Mustache!'
   *
   *
   * // using the `variable` option
   * _.template('<%= data.hasWith %>', { 'hasWith': 'no' }, { 'variable': 'data' });
   * // => 'no'
   *
   * // using the `source` property
   * <script>
   *   JST.project = <%= _.template(jstText).source %>;
   * </script>
   */
  function template(text, data, options) {
    options || (options = {});

    var result,
        defaults = lodash.templateSettings,
        escapeDelimiter = options.escape,
        evaluateDelimiter = options.evaluate,
        interpolateDelimiter = options.interpolate,
        variable = options.variable;

    // use template defaults if no option is provided
    if (escapeDelimiter == null) {
      escapeDelimiter = defaults.escape;
    }
    if (evaluateDelimiter == null) {
      evaluateDelimiter = defaults.evaluate;
    }
    if (interpolateDelimiter == null) {
      interpolateDelimiter = defaults.interpolate;
    }

    // tokenize delimiters to avoid escaping them
    if (escapeDelimiter) {
      text = text.replace(escapeDelimiter, tokenizeEscape);
    }
    if (interpolateDelimiter) {
      text = text.replace(interpolateDelimiter, tokenizeInterpolate);
    }
    if (evaluateDelimiter) {
      text = text.replace(evaluateDelimiter, tokenizeEvaluate);
    }

    // escape characters that cannot be included in string literals and
    // detokenize delimiter code snippets
    text = "__p='" + text.replace(reUnescaped, escapeChar).replace(reToken, detokenize) + "';\n";

    // clear stored code snippets
    tokenized.length = 0;

    // if `options.variable` is not specified, add `data` to the top of the scope chain
    if (!variable) {
      variable = defaults.variable;
      text = 'with (' + variable + ' || {}) {\n' + text + '\n}\n';
    }

    text = 'function(' + variable + ') {\n' +
      'var __p, __t, __j = Array.prototype.join;\n' +
      'function print() { __p += __j.call(arguments, \'\') }\n' +
      text +
      'return __p\n}';

    result = Function('_', 'return ' + text)(lodash);

    if (data) {
      return result(data);
    }
    // provide the compiled function's source via its `toString()` method, in
    // supported environments, or the `source` property as a convenience for
    // build time precompilation
    result.source = text;
    return result;
  }

  /**
   * Executes the `callback` function `n` times. The `callback` is invoked with
   * 1 argument; (index).
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Number} n The number of times to execute the callback.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @example
   *
   * _.times(3, function() { genie.grantWish(); });
   */
  function times(n, callback, thisArg) {
    if (thisArg) {
      callback = bind(callback, thisArg);
    }
    for (var index = 0; index < n; index++) {
      callback(index);
    }
  }

  /**
   * Generates a unique id. If `prefix` is passed, the id will be appended to it.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} [prefix] The value to prefix the id with.
   * @returns {Number|String} Returns a numeric id if no prefix is passed, else
   *  a string id may be returned.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   */
  function uniqueId(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Wraps the value in a `lodash` chainable object.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to wrap.
   * @returns {Object} Returns the `lodash` chainable object.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * var youngest = _.chain(stooges)
   *     .sortBy(function(stooge) { return stooge.age; })
   *     .map(function(stooge) { return stooge.name + ' is ' + stooge.age; })
   *     .first()
   *     .value();
   * // => 'moe is 40'
   */
  function chain(value) {
    value = new LoDash(value);
    value._chain = true;
    return value;
  }

  /**
   * Extracts the value from a wrapped chainable object.
   *
   * @name chain
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapped object.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperChain() {
    this._chain = true;
    return this;
  }

  /**
   * Extracts the value from a wrapped chainable object.
   *
   * @name value
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapped object.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return this._wrapped;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type String
   */
  lodash.VERSION = '0.2.2';

  // assign static methods
  lodash.after = after;
  lodash.bind = bind;
  lodash.bindAll = bindAll;
  lodash.chain = chain;
  lodash.clone = clone;
  lodash.compact = compact;
  lodash.compose = compose;
  lodash.contains = contains;
  lodash.debounce = debounce;
  lodash.defaults = defaults;
  lodash.defer = defer;
  lodash.delay = delay;
  lodash.difference = difference;
  lodash.escape = escape;
  lodash.every = every;
  lodash.extend = extend;
  lodash.filter = filter;
  lodash.find = find;
  lodash.first = first;
  lodash.flatten = flatten;
  lodash.forEach = forEach;
  lodash.functions = functions;
  lodash.groupBy = groupBy;
  lodash.has = has;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.initial = initial;
  lodash.intersection = intersection;
  lodash.invoke = invoke;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isBoolean = isBoolean;
  lodash.isDate = isDate;
  lodash.isElement = isElement;
  lodash.isEmpty = isEmpty;
  lodash.isEqual = isEqual;
  lodash.isFinite = isFinite;
  lodash.isFunction = isFunction;
  lodash.isNaN = isNaN;
  lodash.isNull = isNull;
  lodash.isNumber = isNumber;
  lodash.isObject = isObject;
  lodash.isRegExp = isRegExp;
  lodash.isString = isString;
  lodash.isUndefined = isUndefined;
  lodash.keys = keys;
  lodash.last = last;
  lodash.lastIndexOf = lastIndexOf;
  lodash.map = map;
  lodash.max = max;
  lodash.memoize = memoize;
  lodash.min = min;
  lodash.mixin = mixin;
  lodash.noConflict = noConflict;
  lodash.once = once;
  lodash.partial = partial;
  lodash.pick = pick;
  lodash.pluck = pluck;
  lodash.range = range;
  lodash.reduce = reduce;
  lodash.reduceRight = reduceRight;
  lodash.reject = reject;
  lodash.rest = rest;
  lodash.result = result;
  lodash.shuffle = shuffle;
  lodash.size = size;
  lodash.some = some;
  lodash.sortBy = sortBy;
  lodash.sortedIndex = sortedIndex;
  lodash.tap = tap;
  lodash.template = template;
  lodash.throttle = throttle;
  lodash.times = times;
  lodash.toArray = toArray;
  lodash.union = union;
  lodash.uniq = uniq;
  lodash.uniqueId = uniqueId;
  lodash.values = values;
  lodash.without = without;
  lodash.wrap = wrap;
  lodash.zip = zip;

  // assign aliases
  lodash.all = every;
  lodash.any = some;
  lodash.collect = map;
  lodash.detect = find;
  lodash.each = forEach;
  lodash.foldl = reduce;
  lodash.foldr = reduceRight;
  lodash.head = first;
  lodash.include = contains;
  lodash.inject = reduce;
  lodash.methods = functions;
  lodash.select = filter;
  lodash.tail = rest;
  lodash.take = first;
  lodash.unique = uniq;

  // add pseudo privates used and removed during the build process
  lodash._createIterator = createIterator;
  lodash._iteratorTemplate = iteratorTemplate;

  /*--------------------------------------------------------------------------*/

  // assign private `LoDash` constructor's prototype
  LoDash.prototype = lodash.prototype;

  // add all static functions to `LoDash.prototype`
  mixin(lodash);

  // add `LoDash.prototype.chain` after calling `mixin()` to avoid overwriting
  // it with the wrapped `lodash.chain`
  LoDash.prototype.chain = wrapperChain;
  LoDash.prototype.value = wrapperValue;

  // add all mutator Array functions to the wrapper.
  forEach(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
    var func = ArrayProto[methodName];

    LoDash.prototype[methodName] = function() {
      var value = this._wrapped;
      if (arguments.length) {
        func.apply(value, arguments);
      } else {
        func.call(value);
      }
      // IE compatibility mode and IE < 9 have buggy Array `shift()` and `splice()`
      // functions that fail to remove the last element, `value[0]`, of
      // array-like-objects even though the `length` property is set to `0`.
      // The `shift()` method is buggy in IE 8 compatibility mode, while `splice()`
      // is buggy regardless of mode in IE < 9 and buggy in compatibility mode in IE 9.
      if (value.length === 0) {
        delete value[0];
      }
      if (this._chain) {
        value = new LoDash(value);
        value._chain = true;
      }
      return value;
    };
  });

  // add all accessor Array functions to the wrapper.
  forEach(['concat', 'join', 'slice'], function(methodName) {
    var func = ArrayProto[methodName];

    LoDash.prototype[methodName] = function() {
      var value = this._wrapped,
          result = arguments.length ? func.apply(value, arguments) : func.call(value);

      if (this._chain) {
        result = new LoDash(result);
        result._chain = true;
      }
      return result;
    };
  });

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = lodash;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define('lodash',[],function() {
      return lodash;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports) {
    // in Node.js or RingoJS v0.8.0+
    if (typeof module == 'object' && module && module.exports == freeExports) {
      (module.exports = lodash)._ = lodash;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = lodash;
    }
  }
  else {
    // in a browser or Rhino
    window._ = lodash;
  }
}(this));

//     Backbone.js 0.9.2

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `global`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to slice/splice.
  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  var $ = root.jQuery || root.Zepto || root.ender;

  // Set the JavaScript library that will be used for DOM manipulation and
  // Ajax calls (a.k.a. the `$` variable). By default Backbone will use: jQuery,
  // Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
  // alternate JavaScript library (or a mock library for testing your views
  // outside of a browser).
  Backbone.setDomLibrary = function(lib) {
    $ = lib;
  };

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {tail: tail, next: list ? list.next : node};
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if ((callback && cb !== callback) || (context && ctx !== context)) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    }

  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    attributes || (attributes = {});
    if (options && options.parse) attributes = this.parse(attributes);
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    if (options && options.collection) this.collection = options.collection;
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, {silent: true});
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      var html;
      if (html = this._escapedAttributes[attr]) return html;
      var val = this.get(attr);
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, value, options) {
      var attrs, attr, val;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      // Extract attributes and options.
      options || (options = {});
      if (!attrs) return this;
      if (attrs instanceof Model) attrs = attrs.attributes;
      if (options.unset) for (attr in attrs) attrs[attr] = void 0;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var changes = options.changes = {};
      var now = this.attributes;
      var escaped = this._escapedAttributes;
      var prev = this._previousAttributes || {};

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {
          delete escaped[attr];
          (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete now[attr] : now[attr] = val;

        // If the new and previous value differ, record the change.  If not,
        // then remove changes for this attribute.
        if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
          this.changed[attr] = val;
          if (!options.silent) this._pending[attr] = true;
        } else {
          delete this.changed[attr];
          delete this._pending[attr];
        }
      }

      // Fire the `"change"` events.
      if (!options.silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      (options || (options = {})).unset = true;
      return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      (options || (options = {})).unset = true;
      return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp, xhr), options)) return false;
        if (success) success(model, resp);
      };
      options.error = Backbone.wrapError(options.error, model, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, value, options) {
      var attrs, current;

      // Handle both `("key", value)` and `({key: value})` -style calls.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (!this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var serverAttrs = model.parse(resp, xhr);
        if (options.wait) {
          delete options.wait;
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (!model.set(serverAttrs, options)) return false;
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      // Finish configuring and sending the Ajax request.
      options.error = Backbone.wrapError(options.error, model, options);
      var method = this.isNew() ? 'create' : 'update';
      var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
      if (options.wait) this.set(current, silentOptions);
      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var triggerDestroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      if (this.isNew()) {
        triggerDestroy();
        return false;
      }

      options.success = function(resp) {
        if (options.wait) triggerDestroy();
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      options.error = Backbone.wrapError(options.error, model, options);
      var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
      if (!options.wait) triggerDestroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, xhr) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      options || (options = {});
      var changing = this._changing;
      this._changing = true;

      // Silent changes become pending changes.
      for (var attr in this._silent) this._pending[attr] = true;

      // Silent changes are triggered.
      var changes = _.extend({}, options.changes, this._silent);
      this._silent = {};
      for (var attr in changes) {
        this.trigger('change:' + attr, this, this.get(attr), options);
      }
      if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
      while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.trigger('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
          if (this._pending[attr] || this._silent[attr]) continue;
          delete this.changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!arguments.length) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (!arguments.length || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function() {
      return !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (options.silent || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) {
        options.error(this, error, options);
      } else {
        this.trigger('error', this, error, options);
      }
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, {silent: true, parse: options.parse});
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, index, length, model, cid, id, cids = {}, ids = {}, dups = [];
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];

      // Begin by turning bare objects into model references, and preventing
      // invalid models or duplicate models from being added.
      for (i = 0, length = models.length; i < length; i++) {
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }
        cid = model.cid;
        id = model.id;
        if (cids[cid] || this._byCid[cid] || ((id != null) && (ids[id] || this._byId[id]))) {
          dups.push(i);
          continue;
        }
        cids[cid] = ids[id] = model;
      }

      // Remove duplicates.
      i = dups.length;
      while (i--) {
        models.splice(dups[i], 1);
      }

      // Listen to added models' events, and index models for lookup by
      // `id` and by `cid`.
      for (i = 0, length = models.length; i < length; i++) {
        (model = models[i]).on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // Insert models into the collection, re-sorting if needed, and triggering
      // `add` events unless silenced.
      this.length += length;
      index = options.at != null ? options.at : this.models.length;
      splice.apply(this.models, [index, 0].concat(models));
      if (this.comparator) this.sort({silent: true});
      if (options.silent) return this;
      for (i = 0, length = this.models.length; i < length; i++) {
        if (!cids[(model = this.models[i]).cid]) continue;
        options.index = i;
        model.trigger('add', model, this, options);
      }
      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.getByCid(models[i]) || this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, options);
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Get a model from the set by id.
    get: function(id) {
      if (id == null) return void 0;
      return this._byId[id.id != null ? id.id : id];
    },

    // Get a model from the set by client id.
    getByCid: function(cid) {
      return cid && this._byCid[cid.cid || cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      options || (options = {});
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(this.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.map(this.models, function(model){ return model.get(attr); });
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      models  || (models = []);
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var coll = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) coll.add(model, options);
      var success = options.success;
      options.success = function(nextModel, resp, xhr) {
        if (options.wait) coll.add(nextModel, options);
        if (success) {
          success(nextModel, resp);
        } else {
          nextModel.trigger('sync', model, resp, options);
        }
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, xhr) {
      return resp;
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function () {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function(options) {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(model, options) {
      options || (options = {});
      if (!(model instanceof Model)) {
        var attrs = model;
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(model.attributes, options)) model = false;
      } else if (!model.collection) {
        model.collection = this;
      }
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this == model.collection) {
        delete model.collection;
      }
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Backbone.Router
  // -------------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      Backbone.history || (Backbone.history = new History);
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var routes = [];
      for (var route in this.routes) {
        routes.unshift([route, this.routes[route]]);
      }
      for (var i = 0, l = routes.length; i < l; i++) {
        this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning leading hashes and slashes .
  var routeStripper = /^[#\/]/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(windowOverride) {
      var loc = windowOverride ? windowOverride.location : window.location;
      var match = loc.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = this.getHash();
        }
      }
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
      if (current == this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      var frag = (fragment || '').replace(routeStripper, '');
      if (this.fragment == frag) return;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;
        window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this.fragment = frag;
        this._updateHash(window.location, frag, options.replace);
        if (this.iframe && (frag != this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
          // When replace is true, we don't want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, frag, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        window.location.assign(this.options.root + fragment);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
      } else {
        location.hash = fragment;
      }
    }
  });

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view from the DOM. Note that the view isn't present in the
    // DOM by default, so calling this method may be a no-op.
    remove: function() {
      this.$el.remove();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = (element instanceof $) ? element : $(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = getValue(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, this.options, options);
      for (var i = 0, l = viewOptions.length; i < l; i++) {
        var attr = viewOptions[i];
        if (options[attr]) this[attr] = options[attr];
      }
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = getValue(this, 'attributes') || {};
        if (this.id) attrs.id = this.id;
        if (this.className) attrs['class'] = this.className;
        this.setElement(this.make(this.tagName, attrs), false);
      } else {
        this.setElement(this.el, false);
      }
    }

  });

  // The self-propagating extend function that Backbone classes use.
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  // Set up inheritance for the model, collection, and view.
  Model.extend = Collection.extend = Router.extend = View.extend = extend;

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return $.ajax(_.extend(params, options));
  };

  // Wrap an optional error callback with a fallback error event.
  Backbone.wrapError = function(onError, originalModel, options) {
    return function(model, resp) {
      resp = model === originalModel ? resp : model;
      if (onError) {
        onError(originalModel, resp, options);
      } else {
        originalModel.trigger('error', originalModel, resp, options);
      }
    };
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);

define("backbone", ["lodash","jquery"], (function (global) {
    return function () {
        return global.Backbone;
    }
}(this)));

/*!
 * backbone.layoutmanager.js v0.5.2
 * Copyright 2012, Tim Branyen (@tbranyen)
 * backbone.layoutmanager.js may be freely distributed under the MIT license.
 */
(function(window) {



// Alias the libraries from the global object.
var Backbone = window.Backbone;
var _ = window._;
var $ = window.$;

// Store a references to original View functions.
var _configure = Backbone.View.prototype._configure;
var render = Backbone.View.prototype.render;

// A LayoutManager is simply a Backbone.View with some sugar.
var LayoutManager = Backbone.View.extend({
  // This named function allows for significantly easier debugging.
  constructor: function Layout(options) {
    options = options || {};

    // Apply the default render scheme.
    this._render = function(manage) {
      return manage(this).render();
    };

    // Ensure the View is setup correctly.
    LayoutManager.setupView(this, options);

    // Set the prefix for a layout.
    if (options.paths) {
      this._prefix = options.paths.layout || "";
    }

    // Have Backbone set up the rest of this View.
    Backbone.View.call(this, options);
  },

  // Shorthand to root.view function with append flag.
  insertView: function(selector, view) {
    if (view) {
      return this.setView(selector, view, true);
    }

    // Omitting a selector will place the View directly into the parent.
    return this.setView(selector, true);
  },

  // Works like insertView, except allows you to bulk insert via setViews.
  insertViews: function(views) {
    // Ensure each view is wrapped in an array.
    _.each(views, function(view, selector) {
      views[selector] = [].concat(view);
    });

    return this.setViews(views);
  },

  // Will return a single view that matches the filter function.
  getView: function(fn) {
    return this.getViews(fn).first().value();
  },

  // Provide a filter function to get a flattened array of all the subviews.
  // If the filter function is omitted it will return all subviews.
  getViews: function(fn) {
    // Flatten all views.
    var views = _.chain(this.views).map(function(view) {
      return [].concat(view);
    }, this).flatten().value();

    // Return a wrapped function to allow for easier chaining.
    return _.chain(_.filter(views, fn ? fn : _.identity));
  },

  // This takes in a partial name and view instance and assigns them to
  // the internal collection of views.  If a view is not a LayoutManager
  // instance, then mix in the LayoutManager prototype.  This ensures
  // all Views can be used successfully.
  //
  // Must definitely wrap any render method passed in or defaults to a
  // typical render function `return layout(this).render()`.
  setView: function(name, view, append) {
    var partials, options;
    var root = this;

    // If no name was passed, use an empty string and shift all arguments.
    if (!_.isString(name)) {
      append = view;
      view = name;
      name = "";
    }

    // If the parent View's object, doesn't exist... create it.
    this.views = this.views || {};

    // Ensure remove is called when swapping View's.
    if (!append && this.views[name]) {
      this.views[name].remove();
    }

    // Instance overrides take precedence, fallback to prototype options.
    options = view._options();

    // Set up the View.
    LayoutManager.setupView(view, options);

    // If no render override was specified assign the default; if the render
    // is the fake function inserted, ensure that is updated as well.
    if (view.render.__fake__) {
      view._render = function(manage) {
        return manage(this).render();
      };
    }

    // Custom template render function.
    view.render = function(done) {
      var viewDeferred = options.deferred();
      
      // Break this callback out so that its not duplicated inside the 
      // following safety try/catch.
      function renderCallback() {
        // Only refresh the view if its not a list item, otherwise it would
        // cause duplicates.
        if (!view.__manager__.hasRendered) {
          // Only if the partial was successful.
          if (options.partial(root.el, name, view.el, append)) {
            // Set the internal rendered flag, since the View has finished
            // rendering.
            view.__manager__.hasRendered = true;
          }

          // Ensure DOM events are properly bound.
          view.delegateEvents();
        }

        // Resolve the View's render handler deferred.
        view.__manager__.handler.resolveWith(view, [view.el]);

        // When a view has been resolved, ensure that it is correctly updated
        // and that any done callbacks are triggered.
        viewDeferred.resolveWith(view, [view.el]);

        // Only call the done function if a callback was provided.
        if (_.isFunction(done)) {
          done.call(view, view.el);
        }
      }

      // Call the original render method.
      LayoutManager.prototype.render.call(view).then(renderCallback);

      return viewDeferred.promise();
    };

    // Append View's get managed inside the render callback.
    if (!append) {
      view.__manager__.isManaged = true;
    }

    // Set the prefix for a layout.
    if (!view._prefix && options.paths) {
      view._prefix = options.paths.template || "";
    }

    // Special logic for appending items. List items are represented as an
    // array.
    if (append) {
      // Start with an array if none exists.
      partials = this.views[name] = this.views[name] || [];
      
      if (!_.isArray(this.views[name])) {
        // Ensure this.views[name] is an array.
        partials = this.views[name] = [this.views[name]];
      }

      // Add the view to the list of partials.
      partials.push(view);

      return view;
    }

    // Assign to main views object and return for chainability.
    return this.views[name] = view;
  },

  // Allows the setting of multiple views instead of a single view.
  setViews: function(views) {
    // Iterate over all the views and use the View's view method to assign.
    _.each(views, function(view, name) {
      // If the view is an array put all views into insert mode.
      if (_.isArray(view)) {
        return _.each(view, function(view) {
          this.insertView(name, view);
        }, this);
      }

      // Assign each view using the view function.
      this.setView(name, view);
    }, this);

    // Allow for chaining
    return this;
  },

  // By default this should find all nested views and render them into
  // the this.el and call done once all of them have successfully been
  // resolved.
  //
  // This function returns a promise that can be chained to determine
  // once all subviews and main view have been rendered into the view.el.
  render: function(done) {
    var root = this;
    var options = this._options();
    var viewDeferred = options.deferred();

    // Ensure duplicate renders don't override.
    if (root.__manager__.renderDeferred) {
      return root.__manager__.renderDeferred;
    }

    // Remove all the View's not marked for retention before rendering.
    _.each(this.views, function(view, selector) {
      // We only care about list items.
      if (!_.isArray(view)) {
        return;
      }

      // For every view in the array, remove the View and it's children.
      _.each(_.clone(view), function(subView, i) {
        // Look on the instance.
        var keep = subView.keep;

        // Fall back to the options object if it exists.
        if (!_.isBoolean(keep) && subView.options) {
          keep = subView.options.keep;
        }

        // Ensure keep: true is set for any View that has already rendered.
        if (subView.__manager__.hasRendered && !keep) {
          // Ensure the view is removed from the DOM.
          subView.remove();

          // Remove from the array.
          view.splice(i, 1);
        }
      });
    }, this);

    // Wait until this View has rendered before dealing with nested Views.
    this._render(LayoutManager._viewRender).fetch.then(function() {
      // Disable the ability for any new sub-views to be added.
      root.__manager__.renderDeferred = viewDeferred;

      // Create a list of promises to wait on until rendering is done. Since
      // this method will run on all children as well, its sufficient for a
      // full hierarchical. 
      var promises = _.map(root.views, function(view) {
        // Hoist deferred var, used later on...
        var def;

        // Ensure views are rendered in sequence
        function seqRender(views, done) {
          // Once all views have been rendered invoke the sequence render
          // callback.
          if (!views.length) {
            return done();
          }

          // Get each view in order, grab the first one off the stack.
          var view = views.shift();

          // This View is now managed by LayoutManager *toot*.
          view.__manager__.isManaged = true;

          // Render the View and once complete call the next view.
          view.render(function() {
            // Invoke the recursive sequence render function with the
            // remaining views.
            seqRender(views, done);
          });
        }

        // If rendering a list out, ensure they happen in a serial order.
        if (_.isArray(view)) {
          // A singular deferred that represents all the items.
          def = options.deferred();

          seqRender(_.clone(view), function() {
            def.resolve();
          });

          return def.promise();
        }

        // This View is now managed by LayoutManager.
        view.__manager__.isManaged = true;

        // Only return the fetch deferred, resolve the main deferred after
        // the element has been attached to it's parent.
        return view.render();
      });

      // Once all subViews have been rendered, resolve this View's deferred.
      options.when(promises).then(function() {
        viewDeferred.resolveWith(root, [root.el]);
      });
    });

    // Return a promise that resolves once all immediate subViews have
    // rendered.
    return viewDeferred.then(function() {
      // Only call the done function if a callback was provided.
      if (_.isFunction(done)) {
        done.call(root, root.el);
      }

      // Remove the rendered deferred.
      delete root.__manager__.renderDeferred;
    }).promise();
  },

  // Ensure the cleanup function is called whenever remove is called.
  remove: function() {
    LayoutManager.cleanViews(this);

    // Call the original remove function.
    return this._remove.apply(this, arguments);
  },

  // Merge instance and global options.
  _options: function() {
    // Instance overrides take precedence, fallback to prototype options.
    return _.extend({}, LayoutManager.prototype.options, this.options);
  }
},
{
  // Clearable cache.
  _cache: {},

  // Creates a deferred and returns a function to call when finished.
  _makeAsync: function(options, done) {
    var handler = options.deferred();

    // Used to handle asynchronous renders.
    handler.async = function() {
      handler._isAsync = true;

      return done;
    };

    return handler;
  },

  // This gets passed to all _render methods.
  _viewRender: function(root) {
    var url, contents, handler;
    var options = root._options();

    // Once the template is successfully fetched, use its contents to
    // proceed.  Context argument is first, since it is bound for
    // partial application reasons.
    function done(context, contents) {
      // Ensure the cache is up-to-date.
      LayoutManager.cache(url, contents);

      // Render the View into the el property.
      if (contents) {
        options.html(root.el, options.render(contents, context));
      }

      // Resolve only the fetch (used internally) deferred with the View
      // element.
      handler.fetch.resolveWith(root, [root.el]);
    }

    return {
      // This render function is what gets called inside of the View render,
      // when manage(this).render is called.  Returns a promise that can be
      // used to know when the element has been rendered into its parent.
      render: function(context) {
        var template = root.template || options.template;

        if (root.serialize) {
          options.serialize = root.serialize;
        }

        // Seek out serialize method and use that object.
        if (!context && _.isFunction(options.serialize)) {
          context = options.serialize.call(root);
        // If serialize is an object, just use that.
        } else if (!context && _.isObject(options.serialize)) {
          context = options.serialize;
        }

        // Create an asynchronous handler.
        handler = LayoutManager._makeAsync(options, _.bind(done, root,
          context));

        // Make a new deferred purely for the fetch function.
        handler.fetch = options.deferred();

        // Assign the handler internally to be resolved once its inside the
        // parent element.
        root.__manager__.handler = handler;

        // Set the url to the prefix + the view's template property.
        if (_.isString(template)) {
          url = root._prefix + template;
        }

        // Check if contents are already cached.
        if (contents = LayoutManager.cache(url)) {
          done(context, contents, url);

          return handler;
        }

        // Fetch layout and template contents.
        if (_.isString(template)) {
          contents = options.fetch.call(handler, root._prefix + template);
        // If its not a string just pass the object/function/whatever.
        } else if (template != null) {
          contents = options.fetch.call(handler, template);
        }

        // If the function was synchronous, continue execution.
        if (!handler._isAsync) {
          done(context, contents);
        }

        return handler;
      }
    };
  },

  // Accept either a single view or an array of views to clean of all DOM
  // events internal model and collection references and all Backbone.Events.
  cleanViews: function(views) {
    // Clear out all existing views.
    _.each([].concat(views), function(view) {
      // Remove all custom events attached to this View.
      view.unbind();

      // Ensure all nested views are cleaned as well.
      if (view.views) {
        _.each(view.views, function(view) {
          LayoutManager.cleanViews(view);
        });
      }

      // If a custom cleanup method was provided on the view, call it after
      // the initial cleanup is done
      if (_.isFunction(view.cleanup)) {
        view.cleanup.call(view);
      }
    });
  },

  // Cache templates into LayoutManager._cache.
  cache: function(path, contents) {
    // If template path is found in the cache, return the contents.
    if (path in this._cache) {
      return this._cache[path];
    // Ensure path and contents aren't undefined.
    } else if (path != null && contents != null) {
      return this._cache[path] = contents;
    }

    // If template is not in the cache, return undefined.
  },

  // This static method allows for global configuration of LayoutManager.
  configure: function(opts) {
    _.extend(LayoutManager.prototype.options, opts);
  },

  // Configure a View to work with the LayoutManager plugin.
  setupView: function(view, options) {
    var proto = Backbone.LayoutManager.prototype;
    var keys = _.keys(LayoutManager.prototype.options);

    // Extend the options with the prototype and passed options.
    options = view.options = _.defaults(options || {}, proto.options);

    // Ensure necessary properties are set.
    _.defaults(view, {
      // Ensure a view always has a views object.
      views: {},

      // Internal state object used to store whether or not a View has been
      // taken over by layout manager and if it has been rendered into the DOM.
      __manager__: {}
    });

    // Pick out the specific properties that can be dynamically added at
    // runtime and ensure they are available on the view object.
    _.extend(options, _.pick(this, keys));

    // By default the original Remove function is the Backbone.View one.
    view._remove = Backbone.View.prototype.remove;

    // Reset the render function.
    view.options.render = LayoutManager.prototype.options.render;

    // If the user provided their own remove override, use that instead of the
    // default.
    if (view.remove !== proto.remove) {
      view._remove = view.remove;
      view.remove = proto.remove;
    }
    
    // Default the prefix to an empty string.
    view._prefix = "";

    // Set the internal views.
    if (options.views) {
      view.setViews(options.views);
    }

    // Ensure the template is mapped over.
    if (view.template) {
      options.template = view.template;
    }
  },

  // Completely remove all subViews.
  removeView: function(root, append) {
    // Can be used static or as a method.
    if (!_.isObject(root)) {
      root = root || this;
      append = root;
    }

    // Iterate over all of the view's subViews.
    _.each(root.views, function(views) {
      // If the append flag is set, only prune arrays.
      if (append && !_.isArray(views)) {
        return;
      }

      // Clear out all existing views.
      _.each([].concat(views), function(view) {
        // Remove the View completely.
        view.remove();

        // Ensure all nested views are cleaned as well.
        view.getViews().each(function(view) {
          LayoutManager.removeView(view, append);
        });
      });
    });
  }
});

// Ensure all Views always have access to get/set/insert(View/Views).
_.each(["get", "set", "insert"], function(method) {
  var backboneProto = Backbone.View.prototype;
  var layoutProto = LayoutManager.prototype;

  // Attach the singular form.
  backboneProto[method + "View"] = layoutProto[method + "View"];

  // Attach the plural form.
  backboneProto[method + "Views"] = layoutProto[method + "Views"];
});

_.extend(Backbone.View.prototype, {
  // Add the ability to remove all Views.
  removeView: LayoutManager.removeView,

  // Add options into the prototype.
  _options: LayoutManager.prototype._options,

  // Override _configure to provide extra functionality that is necessary in
  // order for the render function reference to be bound during initialize.
  _configure: function() {
    var retVal = _configure.apply(this, arguments);
    var renderPlaceholder;

    // Only update the render method for non-Layouts, which need them.
    if (!this.__manager__) {
      // Ensure the proper setup is made.
      this._render = this.options.render || this.render;

      // Ensure render functions work as expected.
      renderPlaceholder = this.render = function() {
        if (this.render !== renderPlaceholder) {
          return this.render.apply(this, arguments);
        }

        // Call the render method.
        return this._render.apply(this, arguments);
      };

      // Mark this function as fake for later checking and overriding in the
      // setView function.
      if (this._render === render) {
        this.render.__fake__ = true;
      }
    }

    return retVal;
  }
});

// Convenience assignment to make creating Layout's slightly shorter.
Backbone.Layout = Backbone.LayoutManager = LayoutManager;

// Default configuration options; designed to be overriden.
LayoutManager.prototype.options = {

  // Layout and template properties can be assigned here to prefix
  // template/layout names.
  paths: {},

  // Can be used to supply a different deferred implementation.
  deferred: function() {
    return $.Deferred();
  },

  // Fetch is passed a path and is expected to return template contents as a
  // function or string.
  fetch: function(path) {
    return _.template($(path).html());
  },

  // This is really the only way you will want to partially apply a view into
  // a layout.  Its entirely possible you'll want to do it differently, so
  // this method is available to change.
  partial: function(root, name, el, append) {
    // If no selector is specified, assume the parent should be added to.
    var $root = name ? $(root).find(name) : $(root);

    // If no root found, return false.
    if (!$root.length) {
      return false;
    }

    // Use the append method if append argument is true.
    this[append ? "append" : "html"]($root, el);

    // If successfully added, return true.
    return true;
  },

  // Override this with a custom HTML method, passed a root element and an
  // element to replace the innerHTML with.
  html: function(root, el) {
    $(root).html(el);
  },

  // Very similar to HTML except this one will appendChild.
  append: function(root, el) {
    $(root).append(el);
  },

  // Return a deferred for when all promises resolve/reject.
  when: function(promises) {
    return $.when.apply(null, promises);
  },

  // By default, render using underscore's templating.
  render: function(template, context) {
    return template(context);
  }

};

})(this);
define("plugins/backbone.layoutmanager", ["backbone"], (function (global) {
    return function () {
        return global.Backbone.LayoutManager;
    }
}(this)));

/**
 * Backbone-tastypie.js 0.1
 * (c) 2011 Paul Uithol
 * 
 * Backbone-tastypie may be freely distributed under the MIT license.
 * Add or override Backbone.js functionality, for compatibility with django-tastypie.
 */
(function( undefined ) {
	// Backbone.noConflict support. Save local copy of Backbone object.
	var Backbone = window.Backbone;
	Backbone.Tastypie = {
		doGetOnEmptyPostResponse: true,
		doGetOnEmptyPutResponse: false,
	};

	/**
	 * Override Backbone's sync function, to do a GET upon receiving a HTTP CREATED.
	 * This requires 2 requests to do a create, so you may want to use some other method in production.
	 * Modified from http://joshbohde.com/blog/backbonejs-and-django
	 */
	Backbone.oldSync = Backbone.sync;
	Backbone.sync = function( method, model, options ) {

		if (method === 'create' || method === 'update' || method == 'delete'){
			options.headers = _.extend({
				'Authorization': 'bearer ' + Backbone.API.d_token()
			}, options.headers);
		}

		if ( ( method === 'create' && Backbone.Tastypie.doGetOnEmptyPostResponse ) ||
			( method === 'update' && Backbone.Tastypie.doGetOnEmptyPutResponse ) ) {
			var dfd = new $.Deferred();
			
			// Set up 'success' handling
			dfd.done( options.success );
			options.success = function( resp, status, xhr ) {
				// If create is successful but doesn't return a response, fire an extra GET.
				// Otherwise, resolve the deferred (which triggers the original 'success' callbacks).
				if ( !resp && ( xhr.status === 201 || xhr.status === 202 || xhr.status === 204 ) ) { // 201 CREATED, 202 ACCEPTED or 204 NO CONTENT; response null or empty.
					var location = xhr.getResponseHeader( 'Location' ) || model.id;
					return $.ajax( {
						   url: location,
						   success: dfd.resolve,
						   error: dfd.reject
						});
				}
				else {
					return dfd.resolveWith( options.context || options, [ resp, status, xhr ] );
				}
			};
			
			// Set up 'error' handling
			dfd.fail( options.error );
			options.error = function( xhr, status, resp ) {
				dfd.rejectWith( options.context || options, [ xhr, status, resp ] );
			};
			
			// Make the request, make it accessibly by assigning it to the 'request' property on the deferred
			dfd.request = Backbone.oldSync( method, model, options );
			return dfd;
		}
		
		return Backbone.oldSync( method, model, options );
	};

	//Backbone.Model.prototype.idAttribute = 'resource_uri';
	
	Backbone.Model.prototype.url = function() {
		// Use the id if possible
		var url = this.attributes && this.get("resource_uri");
		
		// If there's no idAttribute, use the 'urlRoot'. Fallback to try to have the collection construct a url.
		// Explicitly add the 'id' attribute if the model has one.
		if ( !url ) {
			url = this.urlRoot;
			url = url || this.collection && ( _.isFunction( this.collection.url ) ? this.collection.url() : this.collection.url );

			if ( url && _.has(this,"id") && this.id != undefined) {
				url = addSlash( url ) + this.id;
			}
		}

		url = url && addSlash( url );
		
		return url || null;
	};
	
	/**
	 * Return the first entry in 'data.objects' if it exists and is an array, or else just plain 'data'.
	 */
	Backbone.Model.prototype.parse = function( data ) {
		return data && data.objects && ( _.isArray( data.objects ) ? data.objects[ 0 ] : data.objects ) || data;
	};
	
	/**
	 * Return 'data.objects' if it exists.
	 * If present, the 'data.meta' object is assigned to the 'collection.meta' var.
	 */
	Backbone.Collection.prototype.parse = function( resp, xhr ) {
		if ( resp && resp.meta ) {
			this.meta = resp.meta;
		}
		
		return resp.objects || resp;
	};
	
	Backbone.Collection.prototype.url = function( models ) {
		var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
		url = url && addSlash( url );
		
		// Build a url to retrieve a set of models. This assume the last part of each model's idAttribute
		// (set to 'resource_uri') contains the model's id.
		if ( models && models.length ) {
			var ids = _.map( models, function( model ) {
					var parts = _.compact( model.id.split( '/' ) );
					return parts[ parts.length - 1 ];
				});
			url += 'set/' + ids.join( ';' ) + '/';
		}
		
		return url || null;
	};

	var addSlash = function( str ) {
		return str + ( ( str.length > 0 && str.charAt( str.length - 1 ) === '/' ) ? '' : '/' );
	}
})();

define("plugins/backbone-tastypie", ["backbone"], function(){});

/* localSettings.js */

var localSettings = {
    Leaguevine: {
        API: {
            client_id: "9f30036f95850b185ccbfd66ab54fb", //Client ID registered on the developer pages
            redirect_uri: "http://ultistats.localhost/", //Redirect URI specified when registering
            token: "b3abaadef8", //Optionally pass a working token to bypass the entire oauth process
        }
    }
}
;
define("plugins/localSettings", function(){});

$(function () {
   $("#page_loading_area").ajaxStart(function() {
	   // Anytime any ajax request (system wide) starts, start the spinner
	   $(this).show();
   });
   $("#page_loading_area").ajaxStop(function() {
	   // Any time any ajax request ends, end the spinner
	   $(this).hide();
   });
	setTimeout(function () {
	  window.scrollTo(0, 1);
	}, 1000);
});
define("plugins/spinner", ["jquery"], function(){});

define('app',[
  // Libs
  "jquery",
  "lodash",
  "backbone",
  
  // Plugins
  "plugins/backbone.layoutmanager",
  "plugins/backbone-tastypie",
  "plugins/localSettings",
  "plugins/spinner"
],

function($, _, Backbone) {
  // Localize or create a new JavaScript Template object.
  var JST = window.JST = window.JST || {};
  
	Backbone.LayoutManager.configure({
	
		paths: {
			layout: "app/templates/layouts/",
			template: "app/templates/"
		},
		
		fetch: function(path) {
			path = path + ".html";
			
			if (!JST[path]) {
				$.ajax({ url: "/" + path, async: false }).then(function(contents) {
					JST[path] = _.template(contents);
				});
			} 

			return JST[path];
		},
		
		render: function(template, context) {
			return template(context);
		}
	
	});//end Backbone.LayoutManager.configure

	return {
		// Create a custom object with a nested Views object
		module: function(additionalProps) {
			return _.extend({ Views: {} }, additionalProps);
		},
		
		// Keep active application instances namespaced under an app object.
		app: _.extend({}, Backbone.Events)
	};
});
define('modules/leaguevine',[
  "app",

  // Libs
  "backbone"

  // Modules

  // Plugins
],

function(app, Backbone) {
	/*
	* This module defines the API properties.
	*/

	// Create a new module
	var Leaguevine = app.module();

	Leaguevine.Utils = {};
	Leaguevine.Utils.concat_collections = function(c1, c2) {
        //Concatenates collections c1 and c2, making sure we remove any duplicate entries from c2 before appending
        
        var models = _.reject(c2.models, function(model) {
            return c1.pluck("id").indexOf(model.get("id")) != -1;
        });
        //The models var consists of new results only.
        //So we union the two collections to create our more comprehensive collection.
        //Union does not trigger anything, so we do the union via a .reset
        //.reset also makes sure the instances in our collection are Backbone.Models and not simple JS objects.
        c1.reset(_.union(c1.models, models));
   };

	Leaguevine.Router = Backbone.Router.extend({
		
		routes: {
			"access_:hash": "token_received",
            "error_description:hash": "login_error"
		},
		
		token_received: function(hash) {//route matched by oauth/:hash
			hash = hash.split("&"); //break the URL hash into its segments.
			_.each(hash, function(element){ //For each segment...
				var pair = element.split("="); //Get the key and value.
				var temp_obj = {};
				temp_obj[pair[0]]=pair[1]; //Put the key and value into a temp object.
				_.extend(app.api,temp_obj); //Extend/overwrite our app.api with the key/value of the temp object.
			});

			//After token is received, navigate to the href that was saved earlier
			localStorage.setItem("auth_object", JSON.stringify(app.api));
            //window.location.href = "#" + localStorage.getItem("login_redirect");
            window.location.href = localStorage.getItem("login_redirect");
            return false;
		},
        login_error: function(hash) {
            Backbone.history.navigate("settings", true); //Redirect to the settings page where there is a prompt to log in again
         }

	});
    Leaguevine.router = new Leaguevine.Router();// INITIALIZE ROUTER

    Leaguevine.Views.MoreItems = Backbone.View.extend({
		template: "leaguevine/more_items",
            events: {
                click: "fetch_more_items"
            },
		tagName: "li",
        initialize: function() {
            this.collection = this.options.collection;
        },
        serialize: function() {
            // Determine how many items will be fetched with the next call and return this context so we can display it
            var context = {};
            if (this.collection.meta && this.collection.meta.next) {
                var limit = this.collection.meta.limit;
                if (limit + this.collection.length > this.collection.meta.total_count) {
                    // If we are almost at the end of the list of items
                    context.num_items = this.collection.meta.total_count - this.collection.length; 
                } else {
                    context.num_items = this.collection.meta.limit;
                }
            } else {
                context.num_items = 0;
            }
            return context;
       },
        fetch_more_items: function() {
            $('.more-items-main-txt').hide();
            $('.more-items-loading-txt').show(); //Display a loading message
            var old_collection = this.collection;
            var new_collection = $.extend({},this.collection); //Make a clone of the collection that we can modify safely
            var next_url = this.collection.meta.next;
            new_collection.url = function() {return next_url;}; //Set the URL to fetch the next x number of items
            new_collection.fetch({
                success: function(collection, response) {
                    //Combine these results with the existing items in the list
                    Leaguevine.Utils.concat_collections(old_collection, collection);
                }
            });
        }
    });

	Leaguevine.API = {	
        root: "http://api.playwithlv.com/v1/",
        base: "http://playwithlv.com/oauth2/authorize/?response_type=token&scope=universal",
        client_id: "9f30036f95850b185ccbfd66ab54fb",
        redirect_uri: "http://ultistats.localhost/",
        season_id: 20041,
        d_token: function() {//Modules will reference this dynamic token			
            if (!this.token) {
                var stored_api = JSON.parse(localStorage.getItem("auth_object")); //Pull our token out of local storage if it exists.
                _.extend(this,stored_api);
            }
            if (!this.token) {
                return this.login();
            }
            else {
                return this.token;
            }
        },
        is_logged_in: function() {//Returns true if the user is logged in and false if not
			if (!this.token) {
				var stored_api = JSON.parse(localStorage.getItem("auth_object"));
				_extend(this, stored_api);
			}
            return (this.token !== null);
        },
        login: function() {//Redirects a user to the login screen
            localStorage.setItem("login_redirect", Backbone.history.fragment);
            window.location.href = this.base + "&client_id=" + this.client_id + "&redirect_uri=" + this.redirect_uri;
            return false;
        },
        logout: function() {//Logs a user out by removing the locally stored token
            localStorage.removeItem("auth_object");
            this.token = undefined;
        }
    };

    if (typeof localSettings != "undefined" && 
        typeof localSettings.Leaguevine != "undefined" && 
        typeof localSettings.Leaguevine.API != "undefined") {
        _.extend(Leaguevine.API, localSettings.Leaguevine.API);
    }
    
    Backbone.API = Leaguevine.API;
		
	return Leaguevine;
});

define('modules/navigation',[
  "app",

  // Libs
  "backbone",

  // Plugins
  "plugins/backbone.layoutmanager"
],
function(app, Backbone, Game) {
    
	var Navigation = app.module();

    //Initialize the URLs for the navigation buttons
    //We remember the last page viewed within each sub-navigation so subsequent clicks on that
    //navigation button take the user to the most recently viewed page instead of the top menu
    app.navigation = {
        tournaments_href: "/tournaments",
        teams_href: "/teams",
        games_href: "/games",
        settings_href: "/settings"
    };
	
	Navigation.Views.Navbar = Backbone.View.extend({
		template: "navigation/navbar",
		//className: "navbar-wrapper",
		//href: "",
		//name: "",
		currently_viewed: "",
		render: function(layout) {
			var view = layout(this);
			// Initialize the classes for the currently viewed navigation button
            var tournaments_class = "";
            var teams_class = "";
            var games_class = "";
            var settings_class = "";
            var currently_viewed = "currently_viewed";
            var fragment = Backbone.history.fragment;
            if (fragment.indexOf("tournament") != -1) { // If the current URL is a tournament URL
                tournaments_class = currently_viewed;
                app.navigation.tournaments_href = fragment;
            } 
            else if (fragment.indexOf("team") != -1) { // If the current URL is a team URL
                teams_class = currently_viewed;
                app.navigation.teams_href = fragment;
            } 
            else if (fragment.indexOf("games") != -1) {
                games_class = currently_viewed;
                app.navigation.games_href = fragment;
            }
            else if (fragment.indexOf("settings") != -1) {
                settings_class = currently_viewed;
                app.navigation.settings_href = fragment;
            }
        
			return view.render({
                //href: this.options.href, 
                //name: this.options.name, 
                tournaments_class: tournaments_class,
                teams_class: teams_class,
                games_class: games_class,
                settings_class: settings_class,
                tournaments_href: app.navigation.tournaments_href,
                teams_href: app.navigation.teams_href,
                games_href: app.navigation.games_href,
                settings_href: app.navigation.settings_href
            });
		},
		initialize: function() {
			this.bind("change", function() {
				this.render();
			}, this);
		}
	});
    
    Navigation.Views.Titlebar = Backbone.View.extend({
        /* Usage:
         *      options:
         *			model_class - (required) One of 'team', 'game', 'tournament', 'player', 'setting'
         *			level - One of 'list', 'show', 'edit'
         *			model - The model. Required for levels 'show' and 'edit'
         * With these arguments we can construct
         * title, left_btn_class, left_btn_href, left_btn_txt, right_btn_class, right_btn_href, right_btn_txt
         * 
         * title is either the name of the group (Teams, Games, Players, Tournaments, Settings) or it is the name of the model being viewed.
         * left_btn_href: empty if we are at a top level (i.e. Teams list, etc), takes us back to the list if we are at the item, or takes us back to the item if we are editing the item
         * left_btn_txt: if list then "", if at item then group name, if at edit then item name
         * left_btn_class: always "back" unless disabled.
         * right_btn_href: if list then newX, if item then editX/model.id, if edit then disabled
         * right_btn_txt: if list then "" (+ button used), if item then "Edit", if edit then disabled
         * right_btn_class: if list then "add", if item then ?, if edit then disabled.
         */
        
		template: "navigation/titlebar",
		render: function(layout) {
			var view = layout(this);
			var my_class = this.options.model_class || null;
			var my_level = this.options.level || null;
			var my_title; //Title is from the dict if list, else it is
			var list_titles = {"team": "Teams", "game": "Games", "tournament": "Tournaments", "player": "Players", "setting": "Settings"}; 
			if (my_level === "list"){my_title = list_titles[my_class];}
			else if (my_level === "edit"){my_title = this.model.isNew() ? "Create" : "Edit";}
			else if (my_level == "show"){
				if (my_class === "player"){
					var this_first = this.model.get("first_name") || "";
					var this_last = this.model.get("last_name") || "";
					my_title = this_first + " " + this_last;
				} else {my_title = this.model.get("name") || "";}
			} else {my_title = "";}

			var lbc, lbh, lbt, rbc, rbh, rbt;
			//var list_hrefs = {"team": "#teams", "game": "#games", "tournament": "#tournaments", "player": "#players", "setting": "#settings"};
			var list_hrefs = {"team": "/teams", "game": "/games", "tournament": "/tournaments", "player": "/players", "setting": "/settings"};
			if (my_level === "list"){
				//Left button does not exist for list level.
				lbc = "disabled";
				lbh = "";
				lbt = "";
				//Right button is new/add for list
				rbc = "add";
				rbh = "/new" + my_class;
				rbt = "";//Doesn't matter because it'll be a plus button.
			} else if (my_level === "show"){
				//Left button is back to the list if we are viewing an item.
				lbc = "back";
				lbh = list_hrefs[my_class];
				lbt = list_titles[my_class];
				//Right button is Edit if we are viewing an item.
				rbc = ""; //No class for the 'edit' button.
				rbh = "/edit" + my_class + "/" + this.model.id;
				rbt = "Edit";
			} else if (my_level === "edit"){
				//Left button is 'cancel' if we are editing.
				lbc = "back";
				lbh = list_hrefs[my_class];
				if (!this.model.isNew()){
					lbh = lbh + "/" + this.model.id;
				}
				lbt = "Cancel";
				//Right button does not exist for edit level
				rbc = "disabled";
				rbh = "";
				rbt = "";
			}

			// Some hacks until these features are implemented.
			if (my_level === "show" && my_class === "player"){
				lbc = "disabled"; //We currently do not have a generic list of players.
				rbc = "disabled"; //We currently do not have a page to edit a player.
			}
			if (my_class === "tournament"){
				rbc = "disabled"; //We currently do not have pages to create or edit a tournament.
			}
			if (my_level === "show" && my_class === "game"){
				rbc = "disabled"; //We do not hav a way to edit games.
			if (this.model.get("tournament_id")){
				lbh = "/tournaments/" + this.model.get("tournament_id");
				lbt = this.model.get("tournament").name ? this.model.get("tournament").name : "Tournament";
			} else {lbc = "disabled";}//We do not have a generic list of games.
			}

			return view.render({href: "",
				title: my_title,
				left_btn_href: lbh,
				left_btn_txt: lbt,
				left_btn_class: lbc,
				right_btn_href: rbh,
				right_btn_txt: rbt,
				right_btn_class: rbc
			});
		},
		initialize: function() {
			if (this.model){
				this.model.bind("change", function() {
					this.render();
				}, this);
			}
		}
	});

    Navigation.Views.SearchableList = Backbone.View.extend({
		/*Usage:
		*	required arguments:
		*		collection - Collection of models
		*			CollectionClass - the Collection class (e.g. Team.Collection)
		*			ViewsListClass - the Views.List class (e.g. Team.Views.List)
		*			search_object_name - type of object being searched
		*			tap_method (optional)
		*			Xright_btn_href - link for right button
		*			Xright_btn_txt - text of right button
		*			Xright_btn_class - additional class for right button
		*	e.g.	myLayout.view(".content", new Search.Views.SearchableList({
		*			collection: teams, CollectionClass: Team.Collection, 
		*				ViewsListClass: Team.Views.List, right_btn_class: "",
		*				right_btn_txt: "Create", right_btn_href: "#newteam", 
		*				search_object_name: "team"}));
		*			At least for the case of Team and Tournament, a lot of these
		*			passed variables can be guessed from the module alone.
		*	e.g.	myLayout.view(".content", new Search.Views.SearchableList({
		*				collection: teams, Module: Team }))
		*			Then we have Module.Collection, Module.Views.List,
		*			and there must be a way to get a lower-case string from the module
		*			name to make #newmodule and "module"
		*			I don't know if simplifying the input arguments breaks any other 
		*			modules that might use searchable list so I will hold off on 
		*			this for now.
		*/
		concat_collections: function(c1, c2) {
			var models = _.reject(c2.models, function(model) {
				return c1.pluck("id").indexOf(model.get("id")) != -1;
			});
			c1.reset(_.union(c1.models, models));
		},
		template: "navigation/searchable_list",
		events: {
			"keyup #object_search": "filterObjects"
		},
		//search_results: _.extend({}, Backbone.Events),
		filterObjects: function(ev) {
			var search_string = ev.currentTarget.value;
			this.collection.name = search_string;
			//When we fetch a collection, upon its return the collection "reset" is triggered.
			//However, we cannot fetch our original collection because this will cause (error-generating) duplicates.
			//Thus we make a new collection then merge new results.
			this.search_results.reset();
			this.search_results.name = search_string;
			this.search_results.fetch(); //When the fetch returns it will cause this.search_results to merge with this.collection  
			this.collection.trigger("reset");//Trigger a reset immediately so the already-present data are curated immediately.
		},
		render: function(manage) {
			//var temp_collection = {};
			//Leaguevine.Utils.concat_collections(this.collection, this.search_results);
			this.setView(".object_list_area", new this.options.ViewsListClass({collection: this.collection, tap_method: this.options.tap_method}));
            return manage(this).render({
                search_object_name: this.options.search_object_name
                /*right_btn_class: this.options.right_btn_class,
                right_btn_txt: this.options.right_btn_txt,
                right_btn_href: this.options.right_btn_href,*/
            })/*.then(function(el) {
                $(".object_list_area").html(el);
                //This should only be necessary for views that have no template, no setViews, or other view setting mechanism
                //In this case it is probably causing a (slow) double-render
            })*/;
        },
		initialize: function() {
			this.search_results = new this.options.CollectionClass();
			this.search_results.bind("reset", function() {
				this.concat_collections(this.collection, this.search_results);
				//Leaguevine.Utils.concat_collections(this.collection, this.search_results);
			}, this);
			/*We could bind to reset here to re-render this whole thing.
			Instead we bind to reset in the module's .Views.List
			
			It is not necessary to take this.options and set them as higher level
			variables because we are assuming that we are always passing in these
			"required" arguments. If we make these arguments optional, to the point
			that this view might be insantiated with 0 options, AND we check for the
			presence of this.options.var_name somewhere else, then we will need to
			reassign these below variables and instead check for the presence of this.var_name
			
            this.CollectionClass = this.options.CollectionClass;
            this.ViewsListClass = this.options.ViewsListClass;
            this.search_object_name = this.options.search_object_name;
            this.right_btn_class = this.options.right_btn_class;
            this.right_btn_txt = this.options.right_btn_txt;
            this.right_btn_href = this.options.right_btn_href;
            */
        }
    });
    
	return Navigation;// Required, return the module for AMD compliance
});

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
        safe_get: function(name) { // Fetches an item from local storage and returns an empty object if it doesn't exist
            var obj = localStorage.getItem(name);
            if (!obj) {
                return '{}';
            }
            return obj;
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
			return JSON.parse(this.safe_get(this.name+"-"+model.id));
		},

		// Return the array of all models currently in storage.
		findAll: function() {
			return _.map(this.records, function(id){return JSON.parse(this.safe_get(this.name+"-"+id));}, this);
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

define("plugins/backbone.localStorage", ["backbone"], function(){});

define('modules/settings',[
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/navigation",
  
  "plugins/backbone.localStorage"
],
function(require, app, Backbone, Navigation) {
    
	var Settings = app.module();
	
	Settings.MySettings = [
		{
			"order": 1,
			"name": "Online Status",
			"type": "Toggle Button",
			"value": function() {return app.api.is_logged_in();},
			//"value": false,
			"toggle_prompt_ft": ["Logged Out (click to login)","Logged In (click to logout)"]
		},
		{
			"order": 2,
			"name": "Sort players by:",
			"type": "Select",
			"value": "full name",
			"option_list":["jersey","full name","first name","nick name","last name"]
		},
		{
			"order": 3,
			"name": "Battery Usage",
			"type": "Scale",
			"value": 0
		}
	];
	
	Settings.Model = Backbone.Model.extend({
		sync: Backbone.localSync,
		idAttribute: "name",
		localStorage: new Backbone.LocalStore("settings"),
		defaults: {
			"order": -1,
			"name": "Setting Name",
			"type": "Widget Type",
			"value": true,
			"list_items":[],
			"toggle_prompt_ft":[]
		},
		toggle: function(){//Method used by toggle buttons
			//Hack for login
			if (this.get("name") == "Online Status"){
				if (this.get("value")()){app.api.logout();}
				else {app.api.login();}
			} else {
				this.set("value",!this.get("value"));
				this.save();
			}
		}
	});
	
	Settings.Collection = Backbone.Collection.extend({
		model: Settings.Model,
		sync: Backbone.localSync,
		localStorage: new Backbone.LocalStore("settings"),
		comparator: function(setting) {// Define how items in the collection will be sorted.
			return setting.get("order");
		}
	});
	
	Settings.Router = Backbone.Router.extend({
		routes : {
			"settings": "showSettings" 
		},
		showSettings: function () {
			var settings = new Settings.Collection(Settings.MySettings);
			_.each(settings.models, function(setting){
				setting.fetch();
			});
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "setting", level: "list"}),
				".content_1": new Settings.Views.List({collection: settings})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
        }
    });
	Settings.router = new Settings.Router();// INITIALIZE ROUTER

	Settings.Views.List = Backbone.View.extend({
		template: "settings/list",
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
		render: function(layout){
			var view = layout(this);
			_.each(this.collection.models, function(setting){
				switch (setting.get("type")){
				case "Toggle Button":
					this.insertView("ul", new Settings.Views.ToggleButton({model: setting}));
					break;
				case "Select":
					this.insertView("ul", new Settings.Views.Select({model: setting}));
					break;
				case "Scale":
					break; 
				}
			}, this);
			return view.render();
		}
	});

	Settings.Views.ToggleButton = Backbone.View.extend({
		template: "settings/toggleButton",
		tagName: "li",
		render: function(layout) {
			var value = _.isFunction(this.model.get("value")) ? this.model.get("value")() : this.model.get("value");
			var prompt_ix = value ? 1 : 0;
			var btn = {"prompt": this.model.get("name"), "text": this.model.get("toggle_prompt_ft")[prompt_ix]};
			return layout(this).render({"btn": btn});
		},
        events: {
            "click button": "toggle"
        },
        toggle: function() {
			this.model.toggle();
			this.render();
		}
	});
	
	Settings.Views.Select = Backbone.View.extend({
		template: "settings/select",
		tagName: "li",
		render: function(layout) {
			var view = layout(this);
			/*_.each(this.model.get("option_list"), function(option_item){
				view.insert("select", new Settings.Views.SelectOption({option_text: option_item}));
			});*/
			return view.render({prompt: this.model.get("name")}).then(function(){
				var opt_html = "";
				_.each(this.model.get("option_list"), function(option_item){
					opt_html += '<option value="' + option_item + '">' + option_item + '</option>';
				});
				this.$el.children()[1].innerHTML = opt_html;
				this.$el.children()[1].value = this.model.get("value");
			});
		},
		events: {
			"change": "select_changed"
		},
		select_changed: function(ev){
			this.model.set("value",ev.target.value);
			this.model.save();
		}
	});
});

/**
 * Backbone WebSQL Adapter + AJAX Syncing v0.0
 */

(function(window) {
	
	var S4 = function (){
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	var guid = function() {
		return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	};
	var is_online = function () {
		if (navigator && navigator.onLine !== undefined) {
			return navigator.onLine;
		}
		try {
			var request = new XMLHttpRequest();
			request.open('GET', '/', false);
			request.send(null);
			return (request.status === 200);
		}
		catch(e) {
			return false;
		}
	};
	
	// Define the sync first. Then below define the store(s).
	// ====== [ Backbone.sync WebSQL implementation ] ======
	
	Backbone.WebSQLAjaxSync = function (method, model, options) {
		if (!model.store && !(model.collection && model.collection.store)){
			console.log("websqlajax sync specified but no store specified.");
		}
		
		var store = model.store || model.collection.store, success, error;
		
		//The following gets called whenever the initial db request returns.
		var success = function (tx, res) {
			
			if (!model.id){model.id=model.get("local_id");}
			
			//res.rows is empty for anything except find or findall, I think.
			var len = res.rows.length,result=[], i, this_res;
			if (len > 0) {
				result = [];
				//Process each row from the SQL result and build an array of results.
				for (i=0;i<len;i++) {
					this_res = _.extend(JSON.parse(res.rows.item(i).value),res.rows.item(i));
					//.replace(/-/g, "/")
					var tc = res.rows.item(i).time_created;
					var tlu = res.rows.item(i).time_last_updated;
					this_res.time_created = new Date(_.isString(tc) ? tc.replace(/-/g, "/") : tc).toISOString();
					this_res.time_last_updated = new Date(_.isString(tlu) ? tlu.replace(/-/g, "/") : tlu).toISOString();
					delete this_res.value;
					result.push(this_res);
				}
			}
			//If the fetch/etc request came from a model, then the callback expects an object, not an array.
			if (!model.models && result.length==1) {result=result[0];}
			
			//Return the result of the initial WebSQL request to the app as quickly as possible by passing it as an argument to options.success
			//(options.success is the callback generated by Model (or Collection) .fetch)
			$.when(options.success(result)).then(
				//Only after the app has been updated should we then enqueue the Backbone.sync
				//Actually the queued up callback will do a little work on the model first before sending out the ajax sync request.
				Backbone.ajaxQueue.prequeue(method,model,options)
			);
		};
		
		var error = function (tx,error) {
			console.error("sql error");
			console.error(error);
			console.error(tx);
			options.error(error);//TODO: Does this work if there is more than 1 error callback?
		};
		
		//Before we send the SQL statement and the above callbacks, we need to clean up the model.
		//The model's .id might be a local_id if it was created locally, we need to make sure it exists only as model.get("local_id")
		if (!model.models && model.id && !model.has("local_id") && _.isString(model.id) && model.id.indexOf("local_id") ==0){model.set("local_id",model.id);}
		if (model.id && model.id==model.get("local_id")) {model.unset(model.idAttribute, {silent: true});}
		
		//Send out the SQL request.
		switch(method) {
			case "read":
				((model.id || model.get("local_id")) ? store.find(model,success,error) : store.findAll(model, success, error));
				break;
			case "create":
				model.set("time_created",new Date().toISOString());
  				model.set("time_last_updated",new Date().toISOString());
				store.create(model,success,error);
				break;
			case "update":
				store.update(model,success,error);
				break;
			case "delete":
				store.destroy(model,success,error);
				break;
			default:
				//console.log(method);
		}
	};
	
	var db = openDatabase("ultistats", "", "Leaguevine-ultistats db", 1024*1024*5);//5th parameter can be create callback.
	// ====== [ Default WebSQLStore ] ======
	// Use this store if you do not need a more specific store (see below).
	// Specify the store in the model definition.
	// store: new WebSQLStore(db, "model_name")
	Backbone.WebSQLStore = function (tableName, initSuccessCallback, initErrorCallback) {
		var success, error;
		this.tableName = tableName;
		this.db = db;
		success = function (tx,res) {
			if(initSuccessCallback) initSuccessCallback();
		};
		error = function (tx,error) {
			console.log("Error while create table",error);
			if (initErrorCallback) initErrorCallback();
		};
		db.transaction (function(tx) {
			//local_id will be used until object is created in API
			//and local_id will later be used to look up the real id for associations.
			tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableName + 
				" (id INTEGER UNIQUE, local_id UNIQUE, value, time_created INTEGER, time_last_updated INTEGER)",[],success, error);
		});
	};

	_.extend(Backbone.WebSQLStore.prototype,{
		//model.id will have been stripped if model.id is the same as local_id
		create: function (model,success,error) {
			//Create might be called either by the API return or by the app making a new model.
			var local_id = guid();
			local_id = "local_id_" + local_id;
			model.set("local_id",local_id);
			
			var stmnt = "INSERT INTO " + this.tableName + " (";
			var parms = [];
			
			if (model.id){
				stmnt += "id, ";
			}
			stmnt += "local_id, value, time_created, time_last_updated) VALUES (";
			
			if (model.id){
				stmnt += "?, ";
				parms.push(model.id);
			}
			stmnt += "?, ?";
			parms.push(model.get("local_id"));
			//Clean id, local_id, time_created, and time_last_updated from the stringified version of the model, as those will be stored in separate columns.
			var value = model.toJSON();
			delete value.id;
			delete value.local_id;
			delete value.time_created;
			delete value.time_last_updated;
			value = JSON.stringify(value);
			parms.push(value);
			
			if (model.get("time_created")){
				stmnt += ", ?";
				parms.push(Date.parse(model.get("time_created")));
			} else {stmnt += ", datetime('now')";}
			
			if (model.get("time_last_updated")){
				stmnt += ", ?";
				parms.push(Date.parse(model.get("time_last_updated")));
			} else {stmnt += ", datetime('now')";}
			stmnt += ")"
			
			if (!model.id){model.id=local_id;}
			//console.log(model.id);
			this._executeSql(stmnt,parms, success, error);
		},
	
		destroy: function (model, success, error) {
			//console.log("sql destroy");
			var stmnt = "DELETE FROM "+this.tableName+" WHERE local_id=?";
			var parms = [model.get("local_id")];
			if (model.id) {
				stmnt += " OR id=?";
				parms.push(model.id);
			}
			this._executeSql(stmnt,parms,success, error);
		},
	
		find: function (model, success, error) {
			//console.log("sql find");
			//model will have been stripped of id if it matches local_id
			//There may be times when we have id but not local_id?
			var stmnt = "SELECT COALESCE(id, local_id) AS id, local_id, value, time_created, time_last_updated FROM "+this.tableName+" WHERE local_id=?";
			var parms = [model.get("local_id")];
			if (model.id) {
				stmnt += " OR id=?";
				parms.push(model.id);
			}
			this._executeSql(stmnt, parms, success, error);
		},
	
		findAll: function (model, success,error) {
			//console.log("sql findAll");
			//TODO: Handle the case when model has search criteria. This should be done in the model-specific store.
			this._executeSql("SELECT COALESCE(id, local_id) as id, local_id, value, time_created, time_last_updated FROM "+this.tableName,[], success, error);
			//this._executeSql("SELECT id, value FROM "+this.tableName,[], success, error);			
		},
	
		update: function (model, success, error) {
			//console.log("sql update")
			//Clean id, local_id, time_created, and time_last_updated from the stringified version of the model, as those will be stored in separate columns.
			var value = model.toJSON();
			delete value.id;
			delete value.local_id;
			delete value.time_created;
			delete value.time_last_updated;
			value = JSON.stringify(value);
			
			//Build the statement and parms
			//this._executeSql("UPDATE "+this.tableName+" SET value=? WHERE id=?",[JSON.stringify(model.toJSON()),model.id], success, error);
			var stmnt = "UPDATE " + this.tableName + " SET value=?, time_last_updated=datetime('now')";
			var parms = [value]
			if (model.id) {
				stmnt += ", id=?";
				parms.push(model.id);
			}
			stmnt += " WHERE local_id=?";
			parms.push(model.get("local_id"));
			if (model.id) {
				stmnt += " OR id=?";
				parms.push(model.id);
			}
			this._executeSql(stmnt,parms, success, error);
		},
	
		_save: function (model, success, error) {
			//console.log("sql _save");
			var id = (model.id || model.attributes.id);
			this.db.transaction(function(tx) {
				tx.executeSql("");
			});
		},
	
		_executeSql: function (SQL, params, successCallback, errorCallback) {
			var success = function(tx,result) {
				//console.log(SQL + " - finished");
				if(successCallback) successCallback(tx,result);
			};
			var error = function(tx,error) {
				console.log(SQL + " - error: " + error);
				if(errorCallback) errorCallback(tx,error);
			};
			this.db.transaction(function(tx) {
				tx.executeSql(SQL, params, success, error);
			});
		}
	});
	
	// TODO: Create model-specific stores for improved performance.
	
	/*
	 * https://github.com/maccman/spine/blob/master/lib/ajax.js
	 * 
	 */
	Backbone.ajaxQueue = {
		requests: [],
		enabled: true,
		pending: false,
		disable: function(callback) {
			if (this.enabled) {
				this.enabled = false;
				try {
					return callback();
				} catch (e) {
					throw e;
				} finally {
					this.enabled = true;
				}
			} else {
				return callback();
			}
		},
		requestNext: function() {
			var next;
			next = this.requests.shift();
			if (next) {
				return this.request(next);
			} else {
				return this.pending = false;
			}
		},
		request: function(callback) {
			var _this = this;
			//if (is_online()) {
				return (callback()).then(function() {
					return _this.requestNext();
				});
			//} else {
				//this.requests.unshift(callback);
				//return setTimeout(this.requestNext(),10000);
			//}
		},
		queue: function(callback) {
			if (!this.enabled) {
				return;
			}
			if (this.pending) {
				this.requests.push(callback);
			} else {
				this.pending = true;
				this.request(callback);
			}
			return callback;
		},
		prequeue: function(method, model, options){
			//TODO: model may or may not be alive in the app. If not, and it was persisted as JSON, 
 			//then it won't be a model class so .set etc might not work.
 			//Is it possible to save the class name to the queue so that we can create a new model/collection on queue access?
	 			
 			//Process associations. e.g., make sure that team.season_id is a real id and not a local_id.
 			if ((method=="create" || method=="update") && model.associations!==undefined && _.isObject(model.associations)){
 				var assoc = model.associations;
 				_.each(_.keys(assoc), function(this_key){
 					var table_name = assoc[this_key];
 					if (_.isString(model.get(this_key)) && model.get(this_key).indexOf("local_id")==0){
 						//The associated object has a local_id for id. We need to check table_name for its updated id.
 						var store = new Backbone.WebSQLStore(table_name);
 						//var stmnt = "SELECT COALESCE(id, local_id) AS id FROM "+table_name+" WHERE local_id="+model.get(this_key);
 						var stmnt = "SELECT COALESCE(id, local_id) AS id FROM "+table_name+" WHERE id="+model.get(this_key);
 						store._executeSql(stmnt,[], function(tx,result) {
 							if (result.rows.length>0){
 								//console.log("new id set");
 								model.set(this_key,result.rows.item(0).id);
 							}
						});
					}
 				});
 			}
 			
 			//Remove any local_id from the model before syncing with remote.
	      	if (model.id && (model.id==model.get("local_id") || ("" + model.id).indexOf("local_id")==0)) {model.unset(model.idAttribute, {silent: true});}
			//Describe the success callback when the API call returns.
	      	//TODO: Handle errors.
	      	options.success = function(resp, status, xhr){
	      		//TODO: Handle delete.
	      		//Replace the success callback.
	      		//merge attributes, set last_updated, and save merged version in local db
	      		remote_objs = model.parse(resp,xhr);
	      		//remote_objs might be an array or a single object. Make it always an array.
	      		if (remote_objs && !(remote_objs instanceof Array)){
	      			model.id=remote_objs.id;//Useful for create method's return
	      			remote_objs = [remote_objs];
      			}
      			
      			//iterate through remote_objs. How many remote_objs do we get for methods that aren't fetch?
      			var was_added = false; //used below to make sure we trigger 'reset' if any models have been added.
      			var matched_model;
      			_.each(remote_objs, function(remote_obj){//for each result from API
      				//Do we have a local model with a matching id?
      				if (matched_model = model.models ? model.get(remote_obj.id) : (model.id==remote_obj.id && model)) {
      					//Assume remote is newer unless we have proof otherwise.
      					var local_is_newer = false;
      					//Compare the dates, if remote_obj has dates.
      					if (remote_obj.time_created || remote_obj.time_last_updated){
      						var local_created = new Date(matched_model.get("time_created"));
      						var local_updated = new Date(matched_model.get("time_last_updated"));
      						var remote_created = new Date(remote_obj.time_created);
      						var remote_updated = new Date(remote_obj.time_last_updated);
      						local_is_newer = Math.max.apply(null,[local_created,local_updated]) > Math.max.apply(null,[remote_created,remote_updated]);
      					}
      					if (local_is_newer) {
      						console.log("TODO: merge matched_model onto remote_obj");
      						//Don't merge id.
      					}
      					matched_model.set(remote_obj);
	      				model.store.update(matched_model);
      				} else {//We do not have a local model with matching id then create into the store
      					if (model.models) {
		      				var new_model = model._prepareModel(remote_obj, {});
		      				new_model.set("time_created", new Date().toISOString());
		      				new_model.set("time_last_updated", new Date().toISOString());
		      				//add to the collection.
		      				if (model.models.length>0 && !was_added) {
		      					model.add(remote_obj);
		      				}
		      				else {
		      					model.add(remote_obj,{silent: true});
		      					was_added = true;
		      				}
		      				
		      			} else {
		      				//Under what circumstances would a single model do a fetch, and then get a response from the API that did not match?
		      				console.log("you should never see this text");
		      				new_model = model.clone();
		      				new_model.clear({silent: true});
		      				new_model.set(remote_obj);
		      			}
		      			model.store.create(new_model,false,false);
	      			}
	      		});
		        model.trigger("reset");
	      		//else {model.set(remote_model);}
      		};
      		this.queue(function(){return Backbone.sync(method, model, options);});
		}
	};
	
})(this);
define("plugins/backbone.websqlajax", ["backbone"], function(){});

define('modules/season',[
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  
  "plugins/backbone.websqlajax"
	
],
function(app, Backbone, Leaguevine) {
	
	var Season = app.module();
	
	Season.Model = Backbone.Model.extend({
		defaults: {
			name: "",
			start_date: "",
			end_date: "",
			teams: {}//one-to-many
		},
		urlRoot: Leaguevine.API.root + "seasons",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			var temp = _.clone(this.attributes);
			//delete temp.teams;
			return temp;
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("season")
	});
	
	Season.Collection = Backbone.Collection.extend({
		model: Season.Model,
		urlRoot: Leaguevine.API.root + "seasons"
	});
	
	return Season;// Required, return the module for AMD compliance
});

define('modules/teamplayer',[
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine"
],
function(require, app, Backbone, Leaguevine) {
    
	var TeamPlayer = app.module();
	
	//
	// MODEL
	//
	TeamPlayer.Model = Backbone.Model.extend({
		defaults: {
			number: null,
			team_id: null,
			team: {},
			player_id: null,
			player: {last_name: "", first_name: ""}
		},
		urlRoot: Leaguevine.API.root + "team_players",
		//TODO: override URL to /team_players/team_id/player_id/
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
		},
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored
			var tp = _.clone(this.attributes);
			//delete tp.team;
			//delete tp.player;
			return tp;
		},
		associations: {
			"team_id": "team",
			"player_id": "player"
		}
	});
	//
	// COLLECTION
	//
	TeamPlayer.Collection = Backbone.Collection.extend({
		model: TeamPlayer.Model,
		urlRoot: Leaguevine.API.root + "team_players",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if (this.team_id) {
				url += "team_ids=%5B" + this.team_id + "%5D&";
			} else if (this.models && this.models.length) {
				url += "team_ids=%5B" + this.models[0].get("team").id + "%5D&";
			}
			//If we already have a list of players, 
			if (this.player_id) {url += "player_ids=%5B" + this.player_id + "%5D&";}
			else if (this.models && this.models.length) {
				url += "player_ids=%5B";
				_.each(this.models, function(tp) {
					url = url + tp.get("player").id + ",";
				});
				url = url.substr(0,url.length-1) + "%5D&";
			}
            url += "limit=50&"; //Make sure we grab all of the players. Omitting this defaults to 20 players
            url += "fields=%5Bnumber%2Cplayer%2Cplayer_id%2Cteam%2Cteam_id%2Ctime_created%2Ctime_last_updated%5D&";
			return url.substr(0,url.length-1);
		},
		comparator: function(teamplayer) {// Define how items in the collection will be sorted.
			//Build an object containing different string representations.
			var temp_player = teamplayer.get("player");
			var this_obj = {"number": teamplayer.get("number")};
			if (_.isFunction(temp_player.get)) {//If this is a proper model.
				_.extend(this_obj,{
					"first_name": temp_player.get("first_name").toLowerCase(),
					"last_name": temp_player.get("last_name").toLowerCase(),
					"nick_name": temp_player.get("nickname").toLowerCase(),
					"full_name": temp_player.get("last_name").toLowerCase() + temp_player.get("first_name").toLowerCase()[0]
				});
			} else {//If this is a JSON object.
				_.extend(this_obj,{
					"first_name": temp_player.first_name.toLowerCase(),
					"last_name": temp_player.last_name.toLowerCase(),
					"nick_name": temp_player.nickname.toLowerCase(),
					"full_name": temp_player.last_name.toLowerCase() + temp_player.first_name.toLowerCase()[0]
				});
			}
			var sort_setting = JSON.parse(localStorage.getItem("settings-Sort players by:"));
			if (sort_setting){
				if (sort_setting.value == "nick name"){return this_obj.nick_name;}
				else if (sort_setting.value == "jersey"){return this_obj.number;}
				else if (sort_setting.value == "last name"){return this_obj.last_name;}
			}
			return this_obj.full_name;
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			/*var _this = this;
			if (this.team_id){resp = _.filter(resp, function(obj){
				return obj.team_id == _this.team_id;
			});}
			if (this.player_id){resp = _.filter(resp, function(obj){
				return obj.player_id == _this.player_id;
			});}*/
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.team_id) {this.team_id = options.team_id;}
				if (options.player_id) {this.player_id = options.player_id;}
			}
		}
	});
	
	TeamPlayer.Views.Player = Backbone.View.extend({
		template: "teamplayers/player",
		tagName: "li",
		serialize: function() {return _.clone(this.model.attributes);}
	});
	TeamPlayer.Views.PlayerList = Backbone.View.extend({
		template: "teamplayers/playerlist",
		className: "players-wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(teamplayer) {
				this.insertView("ul", new TeamPlayer.Views.Player({
					model: teamplayer
				}));
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	
	TeamPlayer.Views.Team = Backbone.View.extend({
		template: "teamplayers/team",
		tagName: "li",
		serialize: function() {return _.clone(this.model.attributes);}
	});
	TeamPlayer.Views.TeamList = Backbone.View.extend({
		template: "teamplayers/playerlist",
		className: "teams-wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(teamplayer) {
				this.insertView("ul", new TeamPlayer.Views.Team({
					model: teamplayer
				}));
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	
	return TeamPlayer;
});

define('modules/player',[
	"require",
  "app",

  // Libs
  "backbone",
  
  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/teamplayer",
  
  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine, Navigation) {
    
	var Player = app.module();
	
	//
	// MODEL
	//
	Player.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			//id: "", //Needed for template
			age: "",
			birth_date: "",
			first_name: "",
			height: "",
			last_name: "",
			nickname: "",
			weight: "",
			teamplayers: {}//used to get to teams that this player belongs to.
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("player"),
		urlRoot: Leaguevine.API.root + "players",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			var player = _.clone(this.attributes);
			//delete player.teamplayers;
			return player;
		}
	});
  
	//
	// COLLECTION
	//
	Player.Collection = Backbone.Collection.extend({
		model: Player.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("player"),
		comparator: function(player) {// Define how items in the collection will be sorted.
			return player.get("last_name").toLowerCase();
		},
		urlRoot: Leaguevine.API.root + "players",
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				this.season_id = options.season_id;
			}
		}
	});
  
	//
	// ROUTER
	//
	Player.Router = Backbone.Router.extend({
		// Create a router to map faux-URLs to actions.
		// Faux-URLs come from Backbone.history.navigate or hashes in a URL from a followed link.
		routes : {
			"players": "listPlayers", //List all players.
			"players/:playerId": "showPlayer" //Show detail for one player.
		},
		listPlayers: function () {//Route for all players.
			// Prepare the data.
			app.players = new Player.Collection();
			app.players.fetch();
			
			var myLayout = app.router.useLayout("main");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar());
            myLayout.view(".titlebar", new Navigation.Views.Titlebar({model_class: "player", level: "list"}));
			myLayout.view(".content_1", new Player.Views.List ({collection: app.players}));//pass the List view a collection of (fetched) players.
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		showPlayer: function (playerId) {
			//Prepare the data.
			var player = new Player.Model({id: playerId});

			player.fetch();
			
			var TeamPlayer = require("modules/teamplayer");
			var teamplayers = new TeamPlayer.Collection([],{player_id: playerId});
			teamplayers.fetch();
			//player.set("teamplayers", teamplayers);
			
			//TODO: Get some player stats and add them to Multilist
			var myLayout = app.router.useLayout("main");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "/editplayer/"+playerId, name: "Edit"}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "player", level: "show", model: player}),
				".content_1": new Player.Views.Detail( {model: player}),
				".content_2": new Player.Views.Multilist({ teamplayers: teamplayers})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
		}
	});
	Player.router = new Player.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Player.Views.Item = Backbone.View.extend({
		template: "players/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {
            var player = this.model.toJSON();
            player.number = ''; //Set the player's number to be blank because numbers are specific to a player's team
            return player;
        } //render looks for this to manipulate model before passing to the template.
	});
	Player.Views.List = Backbone.View.extend({
		template: "players/list",
		className: "players-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			// view.cleanup();
			this.collection.each(function(player) {//for each player in the collection.
				this.insertView("ul", new Player.Views.Item({//Inserts the player into the ul in the list template.
					model: player//pass each player to a Item view instance.
				}));
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	Player.Views.Detail = Backbone.View.extend({
		template: "players/detail",
		//We were passed a model on creation, so we have this.model
		render: function(layout) {
			// The model has not yet been filled by the fetch process if it was fetched just now
			// We need to update the view once the data have changed.
			return layout(this).render(this.model.toJSON());//toJSON OK here.
		},
		initialize: function() {
			this.model.bind("change", function() {
				this.render();
			}, this);
		}
	});
	Player.Views.Multilist = Backbone.View.extend({
		template: "players/multilist",
		events: {
			"click .bteams": "showTeams"
		},
		showTeams: function(ev){
			$(".lteams").show();
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var TeamPlayer = require("modules/teamplayer");
			this.setViews({
				".lteams": new TeamPlayer.Views.TeamList( {collection: this.options.teamplayers} )
			});
			return view.render();
		},
		initialize: function() {
			this.options.teamplayers.bind("reset", function() {this.render();}, this);
		}
	});
	return Player;// Required, return the module for AMD compliance
});

define('modules/team',[
  "app",

  // Libs
  "backbone",
  
  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/teamplayer",
  "modules/game",
  
  "plugins/backbone.websqlajax"	
],

function(app, Backbone, Leaguevine, Navigation) {

	var Team = app.module();
	
	//
	// MODEL
	//
	Team.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			//id: "",//id is used as href in template so we need default.
			name: "",
			info: "",
			season: {},
			season_id: null,
			teamplayers: [],
			games: []
		},
		urlRoot: Leaguevine.API.root + "teams",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			var temp = _.clone(this.attributes);
			//delete temp.teamplayers;
			//delete temp.games;
			//delete temp.season;
			return temp;
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("team"),
		associations: {"season_id": "season"}
	});
  
	//
	// COLLECTION
	//
	Team.Collection = Backbone.Collection.extend({
		model: Team.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("team"),
		urlRoot: Leaguevine.API.root + "teams",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if ( models && models.length ) {
				url += "&team_ids=" + JSON.stringify(models.pluck("id"));
			}
            if (this.name) {
                url += "&name=" + this.name;
            }
			if (this.season_id) {
				url += "&season_id=" + this.season_id;
			}
			url += "&limit=30";
            url += "&order_by=%5Bname,-season_id%5D";
            url += "&fields=%5Bid%2Cinfo%2Cname%2Cseason_id%2Cseason%2Cshort_name%2Ctime_created%2Ctime_last_updated%5D";
			return url;
		},
		//TODO: I should override parse if I want to filter team's returned from DB. e.g. this would be useful for
		//filtering results shown on the "Teams" page if a season is already set. Setting the season in "Settings" comes first.
		comparator: function(team) {// Define how items in the collection will be sorted.
			if (team.season && team.season.name) {return team.get("name").toLowerCase() + team.season.name.toLowerCase();}
            else {return team.get("name").toLowerCase();}
		},
		initialize: function(models, options) {
			if (options) {
				//When a collection/model is instantiated with a second argument
				//then that argument is passed in as options
				//However, some other functions check for the existence of certain options
				//but the parameter "options" itself might not exist, so the check results in an undefined error
				//i.e. this.options.var_name gives an error if this.options does not exist.
				//So instead we set our options to be higher-level parameters here and 
				//then check for the existence of these higher-level parameters.
				//i.e. this.var_name returns undefined but does not return an error if this model/collection was not instantiated with these options.
				//Note that this might also be true for views though thus far we seem to always instantiate them with their required options.
				this.season_id = options.season_id;
				this.name = options.name;
			}
		}
	});
	
	//
	// ROUTER
	//
	Team.Router = Backbone.Router.extend({
		// Create a router to map faux-URLs to actions.
		// Faux-URLs come from Backbone.history.navigate or hashes in a URL from a followed link.
		routes : {
			"teams": "listTeams", //List all teams.
			"teams/:teamId": "showTeam", //Show detail for one team.
			"newteam": "editTeam",
			"editteam/:teamId": "editTeam"
		},
		listTeams: function () {//Route for all teams.
			// Prepare the data.
			var teams = new Team.Collection([],{season_id: Leaguevine.API.season_id});
			//var teams = new Team.Collection();//No defaults?
			teams.fetch();

			//var Search = require("modules/search"); If that module is an argument to this module's function then it does not need to be required again.
			// Prepare the layout/view(s)
			var myLayout = app.router.useLayout("main");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "team", level: "list"}),
				".content_1": new Navigation.Views.SearchableList({
					collection: teams, 
					CollectionClass: Team.Collection, 
					ViewsListClass: Team.Views.List, 
					//right_btn_class: "", right_btn_txt: "Create", right_btn_href: "#newteam",
					search_object_name: "team"
				})
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		showTeam: function (teamId) {
			//Prepare the data.
			var team = new Team.Model({id: teamId});
			
            team.fetch();

			var TeamPlayer = require("modules/teamplayer");
			var teamplayers = new TeamPlayer.Collection([],{team_id: team.id});
			teamplayers.fetch();
			//team.set("teamplayers", teamplayers);
			
			var Game = require("modules/game");
			var games = new Game.Collection([],{team_1_id: team.id});
			games.fetch();
			//team.set("games", games);
			
			var myLayout = app.router.useLayout("main");// Get the layout. Has .navbar, .detail, .list_children
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "team", level: "show", model: team}),
				".content_1": new Team.Views.Detail( {model: team}),
				".content_2": new Team.Views.Multilist({ teamplayers: teamplayers, games: games})
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		editTeam: function (teamId) {
			if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
                return;
            }
			//If we have teamId, then we are editing. If not, then we are creating a new team.
			var team = new Team.Model();
			if (teamId) { //make the edit team page
				team.id=teamId;
                team.fetch(); //Fetch this team instance
			}
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "team", level: "edit", model: team}),
				".content_1": new Team.Views.Edit({model: team})
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
		}
	});
	Team.router = new Team.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Team.Views.List = Backbone.View.extend({
		template: "teams/list",
		className: "teams-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var filter_by = this.collection.name ? this.collection.name : "";
			var tap_method = this.options.tap_method;
			this.collection.each(function(team) {//for each team in the collection.
				//Do collection filtering here
				if (!filter_by || team.get("name").toLowerCase().indexOf(filter_by.toLowerCase()) != -1) {
					this.insertView("ul", new Team.Views.Item({//Inserts the team into the ul in the list template.
						model: team, //pass each team to a Item view instance.
                        tap_method: tap_method //passing on tap_method from caller
					}));
				}
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() { 
                //if (Backbone.history.fragment == "teams") {  //Comment out for now, so that Team.Views.List can be used with Game.Views.Edit
                    this.render();
                //}
            }, this);
		}
	});
	Team.Views.Item = Backbone.View.extend({
		template: "teams/item",
        events: {
            "click": "team_tap_method"
        },
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul by the list's render function.
		serialize: function() {
            // Add a couple attributes to the team for displaying
            var team = _.clone(this.model.attributes);
            team.season_name = "";
            team.league_name = "";
            if (team.season !== null && _.has(team.season,"name")) {
                team.season_name = team.season.name;
                team.league_name = team.season.league.name;
            }
			return team;
		}, //render looks for this to manipulate model before passing to the template.
        initialize: function() {
            if (this.options.tap_method) {
                this.team_tap_method = this.options.tap_method;
            }
            else {
                this.team_tap_method = function() {
                    Backbone.history.navigate("teams/"+this.model.get("id"), true);
                };
            }
        }
	});
	Team.Views.Detail = Backbone.View.extend({
		//We were passed a model on creation by Team.Router.showTeam(), so we have this.model
		template: "teams/detail",
                events: {
                    "click .bcreategame": "createGame"
                },
                createGame: function(ev) {
                    Backbone.history.navigate("newgame/"+this.model.get("id"), true);
                },
		serialize: function() {
			return _.clone(this.model.attributes);
		},
		initialize: function() {this.model.bind("change", function() {this.render();}, this);}
	});
	Team.Views.Multilist = Backbone.View.extend({
		template: "teams/multilist",
		events: {
			"click .bplayers": "showPlayers",
			"click .bgames": "showGames"
		},
		showPlayers: function(ev){
			$(".lgames").hide();
			$(".lplayers").show();
            $(".list_children button").removeClass("is_active");
            $("button.bplayers").addClass("is_active");
		},
		showGames: function(ev){
			$(".lplayers").hide();
			$(".lgames").show();
            $(".list_children button").removeClass("is_active");
            $("button.bgames").addClass("is_active");
		},
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			this.setViews({
				".lgames": new Game.Views.List( {collection: this.options.games} ),
				".lplayers": new TeamPlayer.Views.PlayerList( {collection: this.options.teamplayers} )
			});
			return view.render().then(function(el) {
				//I'd rather the render function only do this once, instead of everytime the data are reset
				//But it might turn out to be a non-issue.
				$(".lplayers").hide();
			});
		},
		initialize: function() {
			this.options.teamplayers.bind("reset", function() {this.render();}, this);
			this.options.games.bind("reset", function() {this.render();}, this);
		}
	});
	Team.Views.Edit = Backbone.View.extend({
		initialize: function() {
			this.model.on("reset", function() {this.render();}, this);
		},
		template: "teams/edit",
		render: function(layout) {
            return layout(this).render(this.model.toJSON());
        },
		//initialize: function() {this.model.bind("reset", function() {this.render();}, this);},
		events: {
			"click button.save": "saveModel",
			"click button.delete": "deleteModel"
		},
		saveModel: function(ev){
			this.model.save(
				{
					name:$("#name").val(),
					info:$("#info").val()
				},
				{
                    success: function(model, status, xhr) {
                        Backbone.history.navigate("teams/"+model.get("id"), true); //Redirect to the team detail page
                    },
                    error: function() {
                        //TODO: Handle the error by giving the user a message

                        // For now, just redirect
                        Backbone.history.navigate("teams", true);
                    }
				}
			);
            return false; //Disable the regular form submission
		},
		deleteModel: function(ev) {
			this.model.destroy(
				{
                    success: function() {
                        Backbone.history.navigate("teams", true);
                    },
                    error: function() {
                        //TODO: Handle the error by giving the user a message

                        // For now, just redirect
                        Backbone.history.navigate("teams", true);
                    }
				}
			);
            return false; //Disable the regular form submission
		}
	});
	return Team;// Required, return the module for AMD compliance
});

define('modules/stats',[
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine"
],

function(require, app, Backbone, Leaguevine) {
    
	var Stats = app.module();

	Stats.BaseModel = Backbone.Model.extend({
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			return _.clone(this.attributes);
		}
    });

	return Stats;
});
define('modules/player_per_game_stats',[
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/stats"
],

function(require, app, Backbone, Leaguevine) {
	
	var PlayerPerGameStats = app.module();
	
	//
	// MODEL
	//
	PlayerPerGameStats.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
            game: {id: ""},
            //league: {},
            //player: {id: ""},
            player: {},
            //season: {},
            //team: {id: ""},
            //team: {},
            //tournament: {},
            player_id: "",
            callahans: "",
            completed_passes_thrown: "",
            completion_percent: "",
            defense_plus_minus: "",
            drops: "",
            ds: "",
            goals_caught: "",//*
            goals_thrown: "",//*
            incomplete_passes_thrown: "",
            offense_plus_minus: "",
            passes_caught: "",
            passes_thrown: "",
            picked_up_disc: "",
            plus_minus: "",
            points_played: "",
            pulls: "",
            throwaways: "",
            turnovers: ""
		},
        idAttribute: "player_id", // The unique identifier in a collection is a player. A player who is on both
                                  // teams in the same game could cause problems here.
		urlRoot: Leaguevine.API.root + "stats/ultimate/player_stats_per_game",
		
		toJSON: function(){
			var ppgs = _.clone(this.attributes);
			//delete ppgs.game;
			//delete ppgs.player;
			return ppgs;
		}
	});

	//
	// COLLECTION
	//
	PlayerPerGameStats.Collection = Backbone.Collection.extend({
		model: PlayerPerGameStats.Model,
		urlRoot: Leaguevine.API.root + "stats/ultimate/player_stats_per_game",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
            if (this.game_ids) {
                url += "game_ids=%5B" + this.game_ids + "%5D&";
            }
            if (this.player_ids) {
                url += "player_ids%5B" + this.player_ids + "%5D&";
            }
			url += "limit=30&";
            url += "order_by=%5B-points_played,-goals_caught,-goals_thrown%5D";
            url += "&fields=%5Bplayer%2Cplayer_id%2Ccallahans%2Ccompleted_passes_thrown%2Ccompletion_percent%2Cdefense_plus_minus";
            url += "%2Cdrops%2Cds%2Cgoals_caught%2Cgoals_thrown%2Cincomplete_passes_thrown%2Coffense_plus_minus%2Cpasses_caught";
            url += "%2Cpasses_thrown%2Cpicked_up_disc%2Cplus_minus%2Cpoints_played%2Cpulls%2Cthrowaways%2Cturnovers%2Cteam_id%5D";
			return url;
		},
		comparator: function(stat_line) {// Define how items in the collection will be sorted.
            return 1-stat_line.get("points_played");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				this.game_ids = options.game_ids;
				this.player_ids = options.player_ids;
			}
		}
	});

	//
	// VIEWS
	//
	PlayerPerGameStats.Views.PlayerStats = Backbone.View.extend({
		template: "playerstats/per_game_stat_line",
		tagName: "tr",
		serialize: function() {
			var ppgs = this.model.toJSON();
			ppgs.player = _.isFunction(this.model.get("player").get) ? this.model.get("player").toJSON() : this.model.get("player");
			return ppgs;
		}
	});
    PlayerPerGameStats.Views.BoxScore = Backbone.View.extend({
        /* Usage:
         *     required arguments:
         *          collection - A collection of player stat lines
         *          game - The game object you are rendering a box score for
         */
		template: "playerstats/boxscore",
		className: "playerstats-boxscore-wrapper",
        serialize: function() {//I think serialize is ignored if render is provided.
			var game = this.options.game.toJSON();
			if (this.options.game.get("team_1") !== null){
				game.team_1 = _.isFunction(this.options.game.get("team_1").get) ? this.options.game.get("team_1").toJSON() : this.options.game.get("team_1");
			}
			if (this.options.game.get("team_1") !== null){
				game.team_2 = _.isFunction(this.options.game.get("team_2").get) ? this.options.game.get("team_2").toJSON() : this.options.game.get("team_2");
			}
			if (this.options.game.get("tournament") !== null){
				game.tournament = _.isFunction(this.options.game.get("tournament").get) ? this.options.game.get("tournament").toJSON() : this.options.game.get("tournament");
			}
			return game;
		},
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			// view.cleanup();
            var team_1_id = this.options.game.get("team_1_id");
            var team_2_id = this.options.game.get("team_2_id");
			this.collection.each(function(playerstats) {
                // Render a single line of stats for a player
                stat_line = new PlayerPerGameStats.Views.PlayerStats({model: playerstats});

                // Check which team's boxscore the stat line should be appended to
                if (playerstats.get("team_id") == team_1_id) {
                    this.insertView("table#player_per_game_stats_1", stat_line);
                }
                else if (playerstats.get("team_id") == team_2_id) {
                    this.insertView("table#player_per_game_stats_2", stat_line);
                }
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
    PlayerPerGameStats.Views.PlayerStatsList = Backbone.View.extend({
		template: "playerstats/list",
		className: "stats_list_wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(playerstats) {
				this.insertView("table", new PlayerPerGameStats.Views.PlayerStats({
					model: playerstats
				}));
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});

    return PlayerPerGameStats;
});

define('modules/team_per_game_stats',[
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/stats"
],

function(require, app, Backbone, Leaguevine, Stats) {
	
	var TeamPerGameStats = app.module();
	
	//
	// MODEL
	//
	TeamPerGameStats.Model = Stats.BaseModel.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
            //game: {id: ""},
            //game: {},
            //league: {},
            //season: {},
            //team: {id: ""},
            team: {},
            //tournament: {},
            team_id: "",
            callahans: "",
            completed_passes_thrown: "",
            completion_percent: "",
            drops: "",
            ds: "",
            goals_caught: "",
            goals_thrown: "",
            losses: "",
            incomplete_passes_thrown: "",
            //offense_plus_minus: "",//not in API
            opponent_callahans: "",
            opponent_completed_passes_thrown: "",
            opponent_drops: "",
            opponent_ds: "",
            opponent_passes_thrown: "",
            opponent_throwaways: "",
            opponent_turnovers: "",
            passes_caught: "",
            passes_thrown: "",
            points_allowed: "",
            points_scored: "",
            pulls: "",
            throwaways: "",
            timeouts: "",
            turnovers: "",
            wins: ""
        },
        idAttribute: "team_id", // The unique identifier in a collection is a team. 
        urlRoot: Leaguevine.API.root + "stats/ultimate/team_stats_per_game",
		toJSON: function() {
			obj = _.clone(this.attributes);
            comp_percent_float = parseFloat(obj.completion_percent); //Convert to float
            obj.completion_percent = String(Math.round(comp_percent_float*10)/10); //Round to 1 decimal point
            //delete obj.team;
            return obj;
		},
		associations: {
			"team_id": "team"
		}
    });
    
	//
	// COLLECTION
	//
	TeamPerGameStats.Collection = Backbone.Collection.extend({
		model: TeamPerGameStats.Model,
		urlRoot: Leaguevine.API.root + "stats/ultimate/team_stats_per_game",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
            if (this.team_ids) {
                url += "team_ids=[" + this.team_ids + "]&";
            }
            if (this.game_ids) {
                url += "game_ids=[" + this.game_ids + "]&";
            }
			url += "limit=30&";
            url += "order_by=[-game_id]";
            //[team_id,callahans,completed_passes_thrown,completion_percent,drops,ds,goals_caught,goals_thrown,losses,incomplete_passes_thrown,opponent_callahans,opponent_completed_passes_thrown,opponent_drops,opponent_ds,opponent_passes_thrown,opponent_throwaways,opponent_turnovers,passes_caught,passes_thrown,points_allowed,points_scored,pulls,throwaways,timeouts,turnovers,wins]
            url += "&fields=%5Bteam%2Cteam_id%2Ccallahans%2Ccompleted_passes_thrown%2Ccompletion_percent%2Cdrops%2Cds%2Cgoals_caught%2Cgoals_thrown%2Closses%2Cincomplete_passes_thrown%2Copponent_callahans%2Copponent_completed_passes_thrown%2Copponent_drops%2Copponent_ds%2Copponent_passes_thrown%2Copponent_throwaways%2Copponent_turnovers%2Cpasses_caught%2Cpasses_thrown%2Cpoints_allowed%2Cpoints_scored%2Cpulls%2Cthrowaways%2Ctimeouts%2Cturnovers%2Cwins%5D";
			return url;
		},
		comparator: function(stat_line) {// Define how items in the collection will be sorted.
            return stat_line.get("game_id");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				this.team_ids = options.team_ids;
				this.game_ids = options.game_ids;
			}
		}
	});

	//
	// VIEWS
	//
	TeamPerGameStats.Views.TeamStats = Backbone.View.extend({
		template: "teamstats/per_game_stat_line",
		tagName: "tr",
		serialize: function() {
			var tpgs = this.model.toJSON();
			tpgs.team = _.isFunction(this.model.get("team").get) ? this.model.get("team").toJSON() : this.model.get("team");
			return tpgs;
		}
	});
    TeamPerGameStats.Views.BoxScore = Backbone.View.extend({
        /* Usage:
         *     required arguments:
         *          collection - A collection of team stat lines
         */
		template: "teamstats/boxscore",
		className: "stats-boxscore-wrapper",
		render: function(layout) {
			var view = layout(this);
			// call .cleanup() on all child views, and remove all appended views
			// view.cleanup();
			this.collection.each(function(teamstats) {
                // Render a single line of stats for a team
                stat_line = new TeamPerGameStats.Views.TeamStats({model: teamstats});
                this.insertView("table#team_per_game_stats", stat_line);
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});

    return TeamPerGameStats;
});

define('modules/game',[
  "require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/team",
  "modules/player_per_game_stats",
  "modules/team_per_game_stats",
  
  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine, Navigation, Team, PlayerPerGameStats, TeamPerGameStats) {
	
	var Game = app.module();
	
	Game.Model = Backbone.Model.extend({
		defaults: {
			//id: "",
			season_id: undefined,
			//season: {},
			tournament_id: null,
			tournament: {},
			team_1_id: null,
			team_1_score: null,
			team_1: {name: ""},
			team_2_id: null,
			team_2_score: null,
			team_2: {name: ""},
			start_time: ""
			//pool, swiss_round, bracket
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("game"),
		associations: {
			"tournament_id": "tournament",
			"team_1_id": "team",
			"team_2_id": "team"
		},
		urlRoot: Leaguevine.API.root + "games",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (gameevents)
			var game = _.clone(this.attributes);

            // Add a formatted start time 
            // TODO: Put this function in namespace?
            game.start_time_string = "";
            if (game.start_time !== "" ){ //parse the start time and make it human-readable
                var arr = game.start_time.split(/[\- :T]/);
                var start_time_utc = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4]); //Parse the ISOformat start time
                var tz_minutes_offset = new Date().getTimezoneOffset();//The offset in minutes from GMT/UTC
                var start_time = new Date(start_time_utc.getTime() + (tz_minutes_offset * 60 * 1000)); //Start time using user's system clock
                var minutes = start_time.getMinutes();
                if (minutes < 10) {minutes = "0" + minutes;} //Make the minutes field two digits
                game.start_time_string = start_time.getHours() + ":" + minutes + " " + start_time.toLocaleDateString();
            }
            
            game.team_1 = _.isFunction(this.get("team_1").get) ? this.get("team_1").toJSON() : this.get("team_1");
            game.team_2 = _.isFunction(this.get("team_2").get) ? this.get("team_2").toJSON() : this.get("team_2");
            game.tournament = (this.get("tournament")!==null && _.isFunction(this.get("tournament").get)) ? this.get("tournament").toJSON() : this.get("tournament");
            
            //delete game.tournament;
            //delete game.team_1;
            //delete game.team_2;

            return game;
		}
	});
	
	Game.Collection = Backbone.Collection.extend({
		model: Game.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("game"),
		comparator: function(game) {// Define how items in the collection will be sorted.
			return game.get("start_time");
		},
		urlRoot: Leaguevine.API.root + "games",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if ( models && models.length ) {
				url += "game_ids=" + JSON.stringify(models.pluck("id")) + "&";
			}
			if (this.season_id) {
				url += "season_id=" + this.season_id + "&";
			}
			if (this.tournament_id) {
				url += "tournament_id=" + this.tournament_id + "&";
			}
			if (this.team_1_id || this.team_2_id) {
				url += "team_ids=%5B";
				if (this.team_1_id){url += this.team_1_id;}
				if (this.team_1_id && this.team_2_id){url += ",";}
				if (this.team_2_id){url += this.team_2_id;}
				url += "%5D&";
			}
			//Can't specify fields until tournament_id works.
			//url += "fields=%5Bid%2Cseason_id%2Cteam_1_id%2Cteam_1_score%2Cteam_1%2Cteam_2_id%2Cteam_2_score%2Cteam_2%2Cstart_time%2Ctime_created%2C%20time_last_updated%5D&";
			return url.substr(0,url.length-1);
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			var _this = this;
			//If we have criteria to filter by, reject resp objects that do not meet the criteria.
			if (this.team_1_id){resp = _.filter(resp, function(obj){
				return obj.team_1_id == _this.team_1_id || obj.team_2_id == _this.team_1_id;
			});}
			if (this.team_2_id){resp = _.filter(resp, function(obj){
				return obj.team_2_id == _this.team_2_id || obj.team_1_id == _this.team_2_id;
			});}
			if (this.tournament_id){resp = _.filter(resp, function(obj){
				return obj.tournament_id == _this.tournament_id;
			});}
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.season_id) {this.season_id = options.season_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
				if (options.team_1_id) {this.team_1_id = options.team_1_id;}
				if (options.team_2_id) {this.team_2_id = options.team_2_id;}
			}
		}
	});
	
	Game.Router = Backbone.Router.extend({
		routes : {
			"games": "findGames", //List all games.
			"games/:gameId": "showGame", //Show detail for one game.
            "newgame/:teamId": "editGame"
     //                   "editgame/:gameId": "editGame"
		},
		findGames: function () {
			var myLayout = app.router.useLayout("main");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "game", level: "list"}),
				".content_1": new Game.Views.Find()
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
		showGame: function (gameId) {
			//Prepare the data.
			var game = new Game.Model({id: gameId});
			
			game.fetch();

            var playerstats = new PlayerPerGameStats.Collection([],{game_ids: [gameId]});
            playerstats.fetch();

            var teamstats = new TeamPerGameStats.Collection([],{game_ids: [gameId]});
            teamstats.fetch();
			
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "/editgame/"+gameId, name: "Edit"}),
				".titlebar": new Navigation.Views.Titlebar({model_class: "game", level: "show", model: game}),
				".content_1": new Game.Views.Detail( {model: game}),
				".content_2": new Game.Views.Multilist({
                    model: game, 
                    playerstats: playerstats,
                    teamstats: teamstats
                })
			});
			//myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
			myLayout.render();
		},
        editGame: function(teamId, gameId) {
			if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
                return;
            }
            
            var myLayout = app.router.useLayout("main");

            /*if (gameId) { //edit existing game

            }
            else*/ if (teamId) { //create new game
				var Team = require("modules/team");
				var this_team = new Team.Model({id: teamId});
				this_team.fetch();
				var placeholder_team = new Team.Model({name: "Select opponent from list below:"});
				var this_game = new Game.Model({team_1_id: teamId, team_1: this_team, team_2: placeholder_team});
				//this_game.fetch(); Game is not persisted yet so it cannot be fetched.
                var teams = new Team.Collection([],{season_id: Leaguevine.API.season_id});
                teams.fetch();
                myLayout.setView(".titlebar", new Navigation.Views.Titlebar({model_class: "game", level: "edit", model: this_game}));
                myLayout.setView(".content_1", new Game.Views.Edit({model: this_game, teams: teams}));
            }
            myLayout.setView(".navbar", new Navigation.Views.Navbar({}));
            //myLayout.render(function(el) {$("#main").html(el);});
            myLayout.render();
        }
	});
	Game.router = new Game.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Game.Views.Item = Backbone.View.extend({
		template: "games/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {
			var game = this.model.toJSON();
			if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			return game;
		} //render looks for this to manipulate model before passing to the template.
	});
    Game.Views.Find = Backbone.View.extend({
        template: "games/find"
    });
	Game.Views.List = Backbone.View.extend({
		template: "games/list",
		className: "games-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(game) {//for each game in the collection.
				this.insertView("ul", new Game.Views.Item({//Inserts the game into the ul in the list template.
					model: game//pass each game to a Item view instance.
				}));
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	Game.Views.Detail = Backbone.View.extend({
		template: "games/detail",
		render: function(layout) {
            var game = this.model.toJSON();
            if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			if (this.model.get("tournament") !== null){
				game.tournament = _.isFunction(this.model.get("tournament").get) ? this.model.get("tournament").toJSON() : this.model.get("tournament");
			} else {game.tournament = {name: ""};}
			return layout(this).render(game);
		},
		initialize: function() {
			this.model.bind("change", function() {
				this.render();
			}, this);
		},
        checkPermission: function() {
            // If the user is not logged in, redirect to login and disable the page transition
            /*if (!app.api.is_logged_in()) {
                app.api.login();
                return false;
            }*/
           return app.api.d_token();
         },
		events: {
			"click button.btrack_game": "checkPermission"
        }
	});
	Game.Views.Multilist = Backbone.View.extend({
		template: "games/multilist",
		events: {
			"click button.bteam_stats": "showTeamStats",
			"click button.bplayer_stats": "showPlayerStats"
		},
		showTeamStats: function(ev){
			$(".lplayer_stats").hide();
			$(".lteam_stats").show();
            $(".list_children button").removeClass("is_active");
            $("button.bteam_stats").addClass("is_active");
		},
		showPlayerStats: function(ev){
			$(".lteam_stats").hide();
			$(".lplayer_stats").show();
            $(".list_children button").removeClass("is_active");
            $("button.bplayer_stats").addClass("is_active");
		},
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".lplayer_stats": new PlayerPerGameStats.Views.BoxScore( {collection: this.options.playerstats, game: this.model } ),
				".lteam_stats": new TeamPerGameStats.Views.BoxScore( {collection: this.options.teamstats} )
			});
			return view.render();
        },
		initialize: function() {
			this.model.bind("reset", function() {
				this.render();
			}, this);
		}
	});
	
    Game.Views.Edit = Backbone.View.extend({
        template: "games/edit",
        render: function(layout) {
            var view = layout(this);
            var edit_view = this;
            var Team = require("modules/team");
            this.setViews({
				".edit_area": new Game.Views.EditArea({model: this.model}),
                ".team_search_list": new Navigation.Views.SearchableList({
					collection: this.options.teams, CollectionClass: Team.Collection, ViewsListClass: Team.Views.List, right_btn_class: "",
                    right_btn_txt: "Create", right_btn_href: "/newteam", search_object_name: "team",
                    tap_method: function() {
						edit_view.model.set("team_2",this.model);//check the context here.
                    }
                })
            });
            return view.render();
        }
    });
	Game.Views.EditArea = Backbone.View.extend({
		initialize: function() {
			//We need to re-render whenever the game's team_1 or team_2 changes.
			this.model.get("team_1").bind("change", function() {this.render();},this);
			this.model.get("team_2").bind("change", function() {this.render();},this);
			this.model.bind("change", function() {this.render();}, this);
			
		},
		template: "games/edit_area",
		events: {
			"click .save": "saveGame",
			"click .delete": "deleteGame"
		},
		saveGame: function(ev) {
			this.model.save(
				{
					start_time: $("#start_time").val()
				},
				{
                    success: function(model, status, xhr) {
                        Backbone.history.navigate("games/"+model.get("id"), true);
                    },
                    error: function() {
                        Backbone.history.navigate("teams", true);
                    }
				}
			);
		},
		deleteGame: function(ev) {},
		serialize: function() {
			var game = this.model.toJSON();
			if (this.model.get("team_1") !== null){
				game.team_1 = _.isFunction(this.model.get("team_1").get) ? this.model.get("team_1").toJSON() : this.model.get("team_1");
			}
			if (this.model.get("team_1") !== null){
				game.team_2 = _.isFunction(this.model.get("team_2").get) ? this.model.get("team_2").toJSON() : this.model.get("team_2");
			}
			return game;
		}
	});
	return Game;// Required, return the module for AMD compliance
});

define('modules/tournament',[
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/tournteam",
  "modules/game",
  
  "plugins/backbone.websqlajax"
],
function(require, app, Backbone, Leaguevine, Navigation) {
    
	var Tournament = app.module();
	
	Tournament.Model = Backbone.Model.extend({
		defaults: {
			name: "",
			start_date: "",
			end_date: "",
			info: "",
			//season: {},
			tournteams: {},
			games: {}
		},
		urlRoot: Leaguevine.API.root + "tournaments",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		//If a tournament is saved to the API does it care about the teams and games?
		toJSON: function() {//get rid of tournteams
			return _.clone(this.attributes);
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("tournament")
	});
	
	Tournament.Collection = Backbone.Collection.extend({
		model: Tournament.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("tournament"),
		urlRoot: Leaguevine.API.root + "tournaments",
        url: function(models) {
            var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
            url += "/?"; 
            if ( models && models.length ) {
                url += "tournament_ids=" + JSON.stringify(models.pluck("id")) + "&";
            }
            if (this.name) {
                url += "name=" + this.name + "&";
            }           
            if (this.season_id) {
                url += "season_id=" + this.season_id + "&";
            }
            url += "limit=30&";
            url += "order_by=%5Bname,-season_id%5D&";
            url += "fields=%5Bid%2Cseason_id%2Cname%2Cstart_date%2Cend_date%2Cinfo%2Ctime_created%2C%20time_last_updated%5D&";
            return url;
        },
		comparator: function(tournament) {
			return tournament.get("name").toLowerCase();
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				this.season_id = options.season_id;
				this.name = options.name;
			}
		}
	});
	
	Tournament.Router = Backbone.Router.extend({
		routes : {
			"tournaments": "listTournaments", //List all tournaments.
			"tournaments/:tournamentId": "showTournament" //Show detail for one tournament.
		},
		listTournaments: function () {
			// Prepare the data.
			var tournaments = new Tournament.Collection([],{season_id: Leaguevine.API.season_id});
			tournaments.fetch();

			//var Search = require("modules/search"); //If that module is an argument to this module's function then it does not need to be required again.
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "tournament", level: "list"}),
				".content_1": new Navigation.Views.SearchableList({collection: tournaments, CollectionClass: Tournament.Collection, ViewsListClass: Tournament.Views.List, search_object_name: "tournament"})
			});
			//myLayout.view(".navbar", new Navigation.Views.Navbar({href: "#newtournament", name: "New"}));
			//myLayout.view(".content", new Tournament.Views.List ({collection: tournaments}));
			//myLayout.view(".content", new Search.Views.SearchableList({collection: tournaments, CollectionClass: Tournament.Collection, ViewsListClass: Tournament.Views.List,
            //                right_btn_class: "", right_btn_txt: "Create", right_btn_href: "#newtournament", search_object_name: "tournament"}));
            //myLayout.render(function(el) {$("#main").html(el);});
            myLayout.render();
		},
		showTournament: function (tournamentId) {
            var tournament = new Tournament.Model({id: tournamentId});
            tournament.fetch();

			var TournTeam = require("modules/tournteam");
			var tournteams = new TournTeam.Collection([],{tournament_id: tournament.get("id")});
			tournteams.fetch();
			
			var Game = require("modules/game");
			var games = new Game.Collection([],{tournament_id: tournament.get("id")});
			games.fetch();
			
			var myLayout = app.router.useLayout("main");
			myLayout.setViews({
				//".navbar": new Navigation.Views.Navbar({href: "#edittournament/"+tournamentId, name: "Edit"}),
				".navbar": new Navigation.Views.Navbar(),
				".titlebar": new Navigation.Views.Titlebar({model_class: "tournament", level: "show", model: tournament}),
				".content_1": new Tournament.Views.Detail( {model: tournament}),
				".content_2": new Tournament.Views.Multilist({ games: games, tournteams: tournteams })
			});
			//myLayout.render(function(el) {$("#main").html(el);});
			myLayout.render();
		}
	});
	Tournament.router = new Tournament.Router();// INITIALIZE ROUTER

	Tournament.Views.Item = Backbone.View.extend({
		template: "tournaments/item",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	Tournament.Views.List = Backbone.View.extend({
		template: "tournaments/list",
		className: "tournaments-wrapper",
		render: function(layout) {
			var view = layout(this);
			var filter_by = this.collection.name ? this.collection.name : "";
			//this.$el.empty();
			this.collection.each(function(tournament) {
				if (!filter_by || tournament.get("name").toLowerCase().indexOf(filter_by.toLowerCase()) != -1) {
					this.insertView("ul", new Tournament.Views.Item({ model: tournament}));
				}
			}, this);
            //Add a button at the end of the list that creates more items
            this.insertView("ul", new Leaguevine.Views.MoreItems({collection: this.collection}));
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
                if (Backbone.history.fragment == "tournaments") {
                    this.render();
                }
			}, this);
		}
	});
	Tournament.Views.Detail = Backbone.View.extend({
		template: "tournaments/detail",
		render: function(layout) {
            var tournament = this.model.toJSON();
            // Create a human-readable date for this tournament
            tournament.start_date_string = "";
            if (tournament.start_date !== "") {
                var start_date = new Date(tournament.start_date);
                tournament.start_date_string = start_date.toLocaleDateString();
            }
            return layout(this).render(tournament);
		},
		initialize: function() {
			this.model.bind("change", function() {
				this.render();
			}, this);
		}
	});
	Tournament.Views.Multilist = Backbone.View.extend({
		template: "tournaments/multilist",
		events: {
			"click .bstandings": "showStandings",
			"click .bgames": "showGames"
        /*
			"click .bpools": "showPools",
			"click .bbrackets": "showBrackets"
            */
		},
        showGames: function(ev){
			$(".lbrackets").hide();
			$(".lpools").hide();
			$(".lstandings").hide();
            $(".lgames").show();
            $(".list_children button").removeClass("is_active");
            $("button.bgames").addClass("is_active");
        },
		showStandings: function(ev){
			$(".lbrackets").hide();
			$(".lpools").hide();
			$(".lgames").hide();
			$(".lstandings").show();
            $(".list_children button").removeClass("is_active");
            $("button.bstandings").addClass("is_active");
			//console.log("TODO: Show Standings");
		},
        /* 
        // Don't show these yet. To enable showing pools and brackets, we 
        // need to return lists of pools and brackets instead of games, and then style these.
		showPools: function(ev){
			$(".lstandings").hide();
			$(".lbrackets").hide();
			$(".lgames").hide();
			$(".lpools").show();
            $(".list_children button").removeClass("is_active");
            $("button.bpools").addClass("is_active");
			//console.log("TODO: Show Pools");
		},
		showBrackets: function(ev){
			$(".lstandings").hide();
			$(".lpools").hide();
			$(".lgames").hide();
			$(".lbrackets").show();
            $(".list_children button").removeClass("is_active");
            $("button.bbrackets").addClass("is_active");
			//console.log("TODO: Show Brackets")
		},
        */
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			var TournTeam = require("modules/tournteam");
			var Game = require("modules/game");
			this.setViews({
				".lstandings": new TournTeam.Views.TeamList( {collection: this.options.tournteams} ),
				".lgames": new Game.Views.List( {collection: this.options.games} )
                /*
				".lpools": new Game.Views.List( {collection: this.options.games} ),
				".lbrackets": new Game.Views.List( {collection: this.options.games} )
                */
			});
			return view.render().then(function(el) {
                /*
				$(".lpools").hide();
				$(".lbrackets").hide();
                */
				$(".lstandings").hide();
			});
		},
		initialize: function() {
			this.options.games.bind("reset", function() {this.render();}, this);
			this.options.tournteams.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Tournament;// Required, return the module for AMD compliance
});

define('modules/tournteam',[
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  "modules/tournament",
  "modules/team"
],
function(require, app, Backbone, Leaguevine) {
	
	var TournTeam = app.module();
	TournTeam.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			final_standing: "",
			seed: "",
			tournament_id: null,
			tournament: {},
			team_id: null,
			team: {}
		},
		urlRoot: Leaguevine.API.root + "tournament_teams",
		url: function(models) {
			var url = this.urlRoot;
			if (this.tournament) {url+=this.tournament.id;}
			url+="/";
			if (this.team) {url+=this.team.id;}
			url+="/";
			return url;
		},
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			var tt = _.clone(this.attributes);
			//delete tt.team;
			//delete tt.tournament;
			return tt;
		},
		associations: {
			"team_id": "team",
			"tournament_id": "tournament"
		}
	});
	TournTeam.Collection = Backbone.Collection.extend({
		model: TournTeam.Model,
		urlRoot: Leaguevine.API.root + "tournament_teams",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if (this.team_id) {
				url += "team_ids=%5B" + this.team_id + "%5D&";
			}
			if (this.tournament_id) {
				url += "tournament_ids=%5B" + this.tournament_id + "%5D&";
			}
			url += "fields=%5Bfinal_standing%2Cseed%2Ctournament_id%2Ctournament%2Cteam_id%2Cteam%2Ctime_created%2C%20time_last_updated%5D&";
			return url.substr(0,url.length-1);
		},
		comparator: function(tournteam) {// Define how items in the collection will be sorted.
			return tournteam.get("final_standing");
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			/*
			var _this = this;
			if (this.team_id){resp = _.filter(resp, function(obj){
				return obj.team_id == _this.team_id;
			});}
			if (this.tournament_id){resp = _.filter(resp, function(obj){
				return obj.tournament_id == _this.tournament_id;
			});}*/
			
			var Team = require("modules/team");
			if (Team){
			output = _.map(resp, function (obj) {
				obj.team = new Team.Model(obj.team);
				return obj;
				},this);
			resp = output;}
			var Tournament = require("modules/tournament");
			output = _.map(resp, function (obj) {
					obj.tournament = new Tournament.Model(obj.tournament);
					return obj;
				},this);
			resp = output;
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.team_id) {this.team_id = options.team_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
			}
		}
	});
	
	TournTeam.Views.Team = Backbone.View.extend({
		template: "tournteams/team",
		tagName: "tr",
        serialize: function() {
            tournteam = this.model.toJSON();
            tournteam.team = this.model.get("team").toJSON(); //Expand the team on the model as well
            return tournteam;
        }
	});
	TournTeam.Views.TeamList = Backbone.View.extend({//Renders the standings for a tournament
		template: "tournteams/list",
		className: "tournteams-wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			//view.cleanup();
			this.collection.each(function(team) {
				this.insertView("table", new TournTeam.Views.Team({
					model: team
				}));
			}, this);
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {this.render();}, this);
		}
	});
	return TournTeam;
});

define('modules/gameevent',[
	"require",
  "app",

  // Libs
  "backbone",

  // Modules
  "modules/leaguevine",
  
  "plugins/backbone.websqlajax"
],

function(require, app, Backbone, Leaguevine) {

	var GameEvent = app.module();
	GameEvent.Model = Backbone.Model.extend({
		defaults: {// Include defaults for any attribute that will be rendered.
			type: NaN,//Need to set a dict somewhere, probably in Leaguevine.API
			time: NaN,//YYYY-MM-DDTHH:MM:SS±hh:mm
			ordinal_number: NaN,//smaller is earlier
			game_id: NaN,
			player_1_id: NaN,
			player_2_id: NaN,
			player_3_id: NaN,
			player_1_team_id: NaN,
			player_2_team_id: NaN,
			player_3_team_id: NaN,
			int_1: NaN
		},
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("gameevent"),
		associations: {
			"game_id": "game",
			"player_1_id": "player",
			"player_2_id": "player",
			"player_3_id": "player",
			"player_1_team_id": "team",
			"player_2_team_id": "team",
			"player_3_team_id": "team"
		},
		urlRoot: Leaguevine.API.root + "events",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored
			var temp = _.clone(this.attributes);
			var keys = _.keys(temp);
			_.each(keys, function(key){
				if (!temp[key]) {this.unset(key);}
			}, this);
            var date = new Date(); //The time now
            this.set("time", date.toJSON().substring(0, 19) + "+00:00"); //The current time in ISO Format
			return _.clone(this.attributes);
		}
	});
	GameEvent.Collection = Backbone.Collection.extend({
		model: GameEvent.Model,
		sync: Backbone.WebSQLAjaxSync,
		store: new Backbone.WebSQLStore("gameevent"),
		urlRoot: Leaguevine.API.root + "events",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += "/?";
			if (this.game_id) {
				url += "game_ids=%5B" + this.game_id + "%5D&";
			}
			return url.substr(0,url.length-1);
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			var _this = this;
			if (this.game_id){resp = _.filter(resp, function(obj){
				return obj.game_id == _this.game_id;
			});}
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.game_id) {this.game_id = options.game_id;}
			}
		},
		comparator: function(gameevent) {// Define how items in the collection will be sorted.
			//return gameevent.get("ordinal_number");
			return gameevent.get("time");
		}
	});

	//
	// VIEWS
	//
	GameEvent.Views.Item = Backbone.View.extend({
		template: "events/item",
		tagName: "li",
		serialize: function() {return this.model.toJSON();}
	});
	GameEvent.Views.List = Backbone.View.extend({
		template: "events/list",
		className: "events-wrapper",
		render: function(layout) {
			var view = layout(this);
			//this.$el.empty()
			// call .cleanup() on all child views, and remove all appended views
			view.cleanup();
			this.collection.each(function(gameevent) {
				this.insertView("ul", new Event.Views.Item({
					model: gameevent
				}));
			}, this);
			return view.render();
		},
		initialize: function() {
			this.collection.bind("reset", function() {this.render();}, this);
		}
	});	
	
	return GameEvent;// Required, return the module for AMD compliance
});

define('modules/trackedgame',[
	"require",
  "app",

  // Libs
  "backbone",

  // Modules  
  "modules/game",
  "modules/player",
  "modules/gameevent",
  
  "plugins/backbone.localStorage"
],

/*
 * Chad's TODO list:
 * -re-factor substitutions
 * -enable/disable buttons depending on state
 * -Player model needs a function that returns its formatted name from its attributes.
 */

/*
This module is an interface for tracking game action.
It has some data that is not persisted to the server.

There are basically 3 types of buttons.
1. Buttons that create an event
	-player-action buttons
	-immediate-event buttons (e.g., throwaway)
	-player substitution buttons
2. Buttons that temporarily change the game state
3. Buttons that change what is visible on the screen but do not modify any data
	-Rotate through action/sub1/sub2 screens
	-MISC action buttons
	
The basic workflow for event buttons is as follows:
1. create an event.
2. Using the type of button pressed and the current game state, set the event type, player ids and team ids.
3. $.when(save).then(add event to stack of events); this triggers
4. event_added: makes sure trackedgame's attributes are set properly. Then it saves trackedgame.
5. Setting the attributes causes a re-render of the UI elements that reflect the state (e.g., play-by-play, player prompt)

A button that temporarily changes the game state does just that. It is not saved.
*/

function(require, app, Backbone) {
    
	var TrackedGame = app.module();
	
	TrackedGame.Model = Backbone.Model.extend({
		sync: Backbone.localSync,
		localStorage: new Backbone.LocalStore("trackedGame"),
		defaults: {
			game: {},
			gameevents: [],
			roster_1: [],//TeamPlayer.Collection
			roster_2: [],
			field_status_1: {},//keys=player_id, values=1(onfield) or 0(offfield)
			field_status_2: {},
            //previous_state: "blank",
			current_state: "pulling",
			is_over: false,
			period_number: NaN,
			team_pulled_to_start_ix: NaN,
			team_in_possession_ix: NaN,
			player_in_possession_id: NaN,
			injury_to: false,//Whether or not substitutions will be injury substitutions.
			visible_screen: 0,
			showing_alternate: -1//I seem to be having trouble with using a boolean or using 0 and 1. So use 1 and -1.
		},
		toJSON: function() {//flatten the data so they are easy to read.
			var temp = _.clone(this.attributes);
			temp.game = this.get("game").toJSON();
			temp.gameevents = this.get("gameevents").toJSON();
			return temp;
		},
		
		screens_list: [{b_class: ".roster_1", b_string: "Roster1"}, {b_class: ".roster_2", b_string: "Roster2"}, {b_class: ".t_game", b_string: "Action"}],
		rotate_visibility: function() {
			var n_screens = this.screens_list.length;
			var sc_ix = this.get("visible_screen");
			this.set("visible_screen", sc_ix==n_screens-1 ? 0 : sc_ix + 1);
		},
		
		setButtonHeight: function() { 
             //Dynamically calculates and sets the button height for all buttons in the 
             //game tracking screen (not the substitution screen)
            
             // Get the browser height
             // Taken from here: http://bugs.jquery.com/ticket/6724
             var browser_height = window.innerHeight ? window.innerHeight : $(window).height();

             // Save some space for the text, space between buttons, and the rotate button
             var non_button_height = 240;
             
             // Divide the rest of the height between 5 rows of buttons
             var button_height = Math.floor((browser_height - non_button_height)/5);
             $(".t_game button").css({"height": button_height});

             // Make the score button larger than the rest
             var score_height = button_height + 30;
             $("button.score").css({"height": score_height});
        },
		
		/*
		* FUNCTIONS FOR GAME EVENTS
		* 
		* Pressing a player button will always create event.
		* The type of button created will depend on the game state.
		* 
		* Pressing an auxilliary button might create an
		* event (throwaway, unknown turn, injury, timeout, end_period).
		* Tapping an aux button will always result in a state change.
		* 
		*/
		
		/*
		* 
		* Define game states. Game state determines effect of tapping a player button.
		*/
		game_states: {
			pulling: {player_prompt: "Who pulled?", player_tap_event_type: 1},
			picking_up: {player_prompt: "Who picked up?", player_tap_event_type: 10},
			receiving: {player_prompt: "Completed pass to:", player_tap_event_type: 21, same_team: true},
			scoring: {player_prompt: "Who caught the goal?", player_tap_event_type: 22, same_team: true},
			dropping: {player_prompt: "Who dropped the disc?", player_tap_event_type: 33, same_team: true},
			blocking: {player_prompt: "Who got the D?", player_tap_event_type: 34, same_team: false},
			stalling: {player_prompt: "Who was marking?", player_tap_event_type: 51, same_team: false}
		},
		
		/*
		* Define the event types. Also specify whether the event is a turnover,
		* whether it is usually accompanied by a screen toggle, and what the
		* play-by-play will display.
		*/
		events_meta: {
			1: {is_turnover: true, toggle_screen: false, next_player_as: 1, play_string: "pulled", next_state: "picking_up"},
			10: {is_turnover: false, toggle_screen: false, next_player_as: 1, play_string: "picked up the disc", next_state: "receiving"},
			21: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "completed a pass to", next_player_as: 2, next_state: "receiving"},
			22: {is_turnover: false, toggle_screen: true, last_player_as: 1, play_string: "threw a goal to", next_player_as: 2, next_state: "pulling"},
			30: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "turnover", next_state: "picking_up"},
			32: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "threw the disc away", next_state: "picking_up"},
			33: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "'s pass was dropped by", next_player_as: 2, next_state: "picking_up"},
			34: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "'s pass was blocked by", next_player_as: 3, next_state: "picking_up"},
			51: {is_turnover: true, toggle_screen: false, last_player_as: 1, play_string: "ran out of time while marked by", next_player_as: 2, next_state: "picking_up"},
			80: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "stepped on the field"},
			81: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "stepped off the field"},
			82: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "bravely stepped on the field"},
			83: {is_turnover: false, toggle_screen: false, last_player_as: 1, play_string: "limped off the field"},
			91: {is_turnover: false, toggle_screen: false, play_string: "Timeout"},
			92: {is_turnover: false, toggle_screen: true, play_string: "Injury timeout", next_state: "picking_up"},
			94: {is_turnover: false, toggle_screen: true, play_string: "End of period", next_state: "pulling"},
			98: {is_turnover: false, toggle_screen: false, play_string: "Game over"}
		},
		
		//A helper function to create a template gameevent. Futher details will be added after.
		create_event: function () {
			var GameEvent = require("modules/gameevent");
			var d = new Date();//"2011-12-19T15:28:46.493Z"
			var time = d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate() + "T" + d.getUTCHours() + ":" + d.getUTCMinutes() + ":" + d.getUTCSeconds();
			var gameid = this.get("game").id;
			return new GameEvent.Model({time: time, game_id: gameid});
		},
		
		//Event type will be set either by an event button or by a player tap button.
		
		//Untouched throwaway, unknown turn, injury, timeout are all immediate events that do not require a game state.
		immediate_event: function(event_type){
			var this_event = this.create_event();
			this_event.set({type: event_type});
			this.process_event(this_event);
		},
		
		player_tap: function(pl_id){//pl_id is the tapped player. Might be NaN
			var this_event = this.create_event();
			//Set the event's type based on the current state.
			var state_meta = this.game_states[this.get("current_state")];
			var event_type = state_meta.player_tap_event_type;
			this_event.set({type: event_type});
			
			var event_meta = this.events_meta[event_type];
			
			//Determine how pl_id should be used.
			var team_ix = this.get("team_in_possession_ix");
			var team_id = this.get("game").get("team_"+team_ix+"_id");
			if (_.has(event_meta,"next_player_as")){	
				this_event.set("player_"+event_meta.next_player_as+"_id",pl_id);
				this_event.set("player_"+event_meta.next_player_as+"_team_id",team_id);
			}
			
			//For some states, setting the state swaps possession.
			//Swap back (temporarily) because we will swap again when processing the event.
			if (_.has(state_meta,"same_team") && !state_meta.same_team){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
			
			this.process_event(this_event);
		},
		
		process_event: function(this_event){
			//The disc is still currently in possession of the team that started with the disc.
			//Despite this, events where the second player is on the defending team already have
			//the correct player_id and team_id set for the defending player.
			
			var last_pl_id = this.get("player_in_possession_id");
			var team_ix = this.get("team_in_possession_ix");//team_ix is index of team that player is on. Might be NaN.
			var last_team_id = this.get("game").get("team_"+team_ix).id;
			var event_meta = this.events_meta[this_event.get("type")];
			
			if (_.has(event_meta,"last_player_as")){
				//Hack for unknown turn which has a team but not a player.
				if (this_event.get("type")!=30){
					this_event.set("player_"+event_meta.last_player_as+"_id",last_pl_id);
				}
				this_event.set("player_"+event_meta.last_player_as+"_team_id",last_team_id);
			}
			
			//Hack for timeout, assumes possession team is calling team.
			if (this_event.get("type")==91 || this_event.get("type")==92){
				this_event.set("int_1", last_team_id);
			}
			
			//save the event to the server.
			this.save_event(this_event, this);
			
		},
		
		injury_to: function(){
			this.set("injury_to", true);
			this.immediate_event(92);
		},
		
		end_period: function(){
			//the End Period button should be disabled if we are in an injury_to... but I will check for the state anywyay.
			//if (this.get("current_state")=="pulling" && !this.get("injury_to")) {
			var ev_type = 94;
			var last_per_num = this.get("period_number");
			//The following line COULD be used for specific end of period types,
			//except that non AUDL games would have "end of first" events instead of half-time events.
			//if (last_per_num <=3){ev_type = ev_type + last_per_num;}
			this.set("period_number", last_per_num+1);
			this.start_period_pull();
			
			var this_event = this.create_event();
			this_event.set({type: ev_type});
			this.save_event(this_event);
			//}
		},
		
		game_over: function(){
			var this_event = this.create_event();
			this_event.set({type: 98});
			$.when(this.save_event(this_event)).then( function() {
				this.set("is_over"); 
			});
			Backbone.history.navigate("games/"+this.get("game").id, true);
		},
		
		field_status_events: function(){
			var sc_ix = this.get("visible_screen");//0 is roster1, 1 is roster2, 2 is action
			if (sc_ix>0){//If the new screen is roster2 or action.
				var old_game = JSON.parse(localStorage.getItem("trackedGame-"+this.get("game").id));
				var old_status = old_game && old_game["field_status_"+sc_ix];
				var tm_id = this.get("game").get("team_"+sc_ix+"_id");
				var new_status = this.get("field_status_"+sc_ix);
				_.each(new_status, function (value, key, list){
					//console.log(key + " " + value);
					if ((old_status===null && value==1) || (old_status && old_status[key]!=value)){
						var event_type = 80;
						if (value===0){event_type = event_type + 1;}
						if (this.get("injury_to")){event_type = event_type + 2;}
						var this_event = this.create_event();
						this_event.set({type: event_type, player_1_id: key, player_1_team_id: tm_id});
						this.save_event(this_event);
					}
				}, this);
			}
		},
		
		save_event: function(event) {
			var trackedgame=this;
			$.when(event.save()).then(function(){
				trackedgame.get("gameevents").add(event);//Triggers play-by-play update, and this.event_added
			});
		},
		
		update_state: function(){
			//TODO: This might better belong in the immediate_event function.
			//The state is changed elsewhere. This simply handles changing possession.
			//The UI changes are handled by the views bound to the change in state.
			var state_name = this.get("current_state");
			if (_.has(this.game_states[state_name],"same_team") && !this.game_states[state_name].same_team){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
		},
		
		undo: function(){
			var event_coll = this.get("gameevents");
			var last_event = event_coll.at(event_coll.length-1);
			last_event.destroy({wait: true});//Will trigger a remove event, which triggers event_removed.
		},
		
		event_removed: function(model, collection, options){
			//This is triggered when an event is successfully removed from the data store and then the events stack.
			var last_event_meta = this.events_meta[model.get("type")];
			
			//undo substitution.
			if (model.get("type")>= 80 && model.get("type")<=83){
				//Instead we need to remove the tp from its current collection with silent:true
				//and then add the tp to the other collection
				var mv_pl_id = model.get("player_1_id"); //moved tp player_id
				var mv_tm_id = model.get("player_1_team_id"); //moved team id. Is this used?
				var team_ix = mv_tm_id == this.get("game").get("team_1_id") ? 1 : 2; //team index, 1 or 2
				var my_status = this.get("field_status_"+team_ix);
				my_status[mv_pl_id] = 1 - my_status[mv_pl_id];
				this.trigger("change:field_status_"+team_ix);//So the view gets updated.
			}
			
			//undo score
			if (model.get("type")== 22){
				var team_xx = this.get("team_in_possession_ix");
				var game_model = this.get("game");
				var team_score_string = "team_" + team_xx + "_score";
				var last_score = game_model.get(team_score_string);
				var new_score = last_score - 1;
				game_model.set(team_score_string,new_score);
			}
			
			if (last_event_meta.is_turnover){
				this.set("team_in_possession_ix",3-this.get("team_in_possession_ix"));
			}
			
			var event_coll = this.get("gameevents");
			var remaining_event = event_coll.at(event_coll.length-1);
			this.state_for_event(remaining_event);
		},
		
		event_added: function(model, collection, options){
			//Triggered when an event is successfully added to the stack.
			var team_ix = this.get("team_in_possession_ix");
			var event_meta = this.events_meta[model.get("type")];
			
			this.set("team_in_possession_ix",event_meta.is_turnover ? 3-team_ix : team_ix);
			
			//Hack for score.
			if (model.get("type")== 22){
				var game_model = this.get("game");
				var team_score_string = "team_" + team_ix + "_score";
				var last_score = game_model.get(team_score_string);
				var new_score = last_score === "" ? 1 : last_score + 1;
				game_model.set(team_score_string,new_score);
			}
			
			if (event_meta.toggle_screen){
				this.rotate_visibility();
			}
			
			this.state_for_event(model);
		},
		
		state_for_event: function(event){
			var team_ix = this.get("team_in_possession_ix");
			var event_meta = this.events_meta[event.get("type")];
			
			if (_.has(event_meta,"next_state")){
				this.set("current_state",event_meta.next_state);
				this.set("player_in_possession_id",event_meta.next_state == "receiving" ? event.get("player_" + event_meta.next_player_as + "_id"): NaN);
			}
			
			//If the event is a sub off, and the substituting player had the disc, then make the next state picking up.
			if ((event.get("type")==81 || event.get("type")==83) && event.get("player_1_id")==this.get("player_in_possession_id")){
				this.set("current_state","picking_up");
				this.set("player_in_possession_id",NaN);
			}
			
			//If the event is not an injury timeout event or an injury substitution event, then we need to make sure injury timeout is off.
			if (event.get("type") !== 82 && event.get("type")!==83 && event.get("type")!==92){
				this.set("injury_to", false);
			}
			
			this.save();
		},
		
		start_period_pull: function(){
			//This function is called at the beginning of a period (including the first) to determine which team has the disc.
			var per_num = this.get("period_number");
			if ( per_num==1 ){
				//Alert to ask which team is pulling to start.
				//TODO: Replace this with a nice view or style the alert.
				var pulled_team_1=confirm("Press OK if " + this.get("game").get("team_1").name + " is pulling to start the game.");
				this.set("team_pulled_to_start_ix", pulled_team_1 ? 1 : 2);
			}
			//Determine who should be pulling disc.
			//If the period number is odd, then the team now pulling is the team that pulled to start the game.
			var tip_ix = per_num%2==1 ? this.get("team_pulled_to_start_ix") : 3-this.get("team_pulled_to_start_ix");
			this.set("team_in_possession_ix", tip_ix);
		}
		
	});
	
	//
	// ROUTER
	//
	TrackedGame.Router = Backbone.Router.extend({
		routes : {
			"track/:gameId": "trackGame"
		},
		trackGame: function (gameId) {
            if (!app.api.is_logged_in()) {//Ensure that the user is logged in
                app.api.login();
                return;
            }
            
            //Load required modules.
			//var Team = require("modules/team");
			var Game = require("modules/game");
			var TeamPlayer = require("modules/teamplayer");
			var GameEvent = require("modules/gameevent");
			
			//Instantiate the trackedgame.
			var trackedgame = new TrackedGame.Model({id: gameId});
			trackedgame.fetch(); //uses localStorage. localStorage requests are synchronous.
			
			//It's useful to know if the game has been tracked previously.
			var was_tracked = !isNaN(trackedgame.get("period_number"));
			
			//Check to see if the game is over and if so ask if it should be enabled.
			if (was_tracked && trackedgame.get("is_over")) {
				var undo_over = confirm("You previously marked this game as over. Press OK to resume taking stats.");
				if (undo_over){
					var events = trackedgame.get("gameevents");
					var last_event = events.at(events.length-1);
					if (last_event.get("type")==98) {
						$.when(last_event.destroy()).then(function() {trackedgame.set("is_over",false);});
					}
				} else {
					Backbone.history.navigate("games/"+gameId, true);
				}
			}
			
			if (!was_tracked){//Game has not yet started. Set it up now.
				trackedgame.set("period_number", 1);
				trackedgame.set("current_state","pulling");
			}
			
			/*
			* Trackedgame has many child objects.
			* These need to be replaced with the proper Backbone models.
			* These models need to be refreshed from the data store.
			*/
			
			//.game
			trackedgame.set("game", new Game.Model(trackedgame.get("game")), {silent:true});
			if (!was_tracked) {trackedgame.get("game").id = gameId;}
			trackedgame.get("game").fetch();
			//Game also has team_1 and team_2 objects that are not yet Backbone Models.
			
			//roster_1 and roster_2. These require the team_x_id which only comes back after the game is fetched.
			trackedgame.set("roster_1", new TeamPlayer.Collection(), {silent:true});
			trackedgame.set("roster_2", new TeamPlayer.Collection(), {silent:true});
			trackedgame.get("game").on("reset", function(){//We need the team ids before we can get the rosters.
				for (var ix=1;ix<3;ix++){
					_.extend(trackedgame.get("roster_"+ix),{team_id: trackedgame.get("game").get("team_"+ix+"_id")});
					trackedgame.get("roster_"+ix).fetch();
				}
			});
			//Also fetch an empty collection to get all players from API. Then add new players to offfield.
			//Binding shouldn't be done in a loop, so I need to do this twice.
			trackedgame.get("game").bind("reset", function(){
				var tp_off = new TeamPlayer.Collection([],{team_id: trackedgame.get("game").get("team_1_id")});
				tp_off.fetch();
				tp_off.bind("reset", function(collection, options) {
					var local_pl_ids = _.union(trackedgame.get("onfield_1").pluck("player_id"),trackedgame.get("offfield_1").pluck("player_id"));
					var new_tps = _.reject(collection.models, function(tp){
						return (_.indexOf(local_pl_ids, tp.get("player_id")) >= 0);
					});
					if (new_tps.length>0){
						trackedgame.get("offfield_1").add(new_tps);
					}
				});
				var tp_off2 = new TeamPlayer.Collection([],{team_id: trackedgame.get("game").get("team_2_id")});
				tp_off2.fetch();
				tp_off2.bind("reset", function(collection, options) {
					var local_pl_ids2 = _.union(trackedgame.get("onfield_2").pluck("player_id"),trackedgame.get("offfield_2").pluck("player_id"));
					var new_tps2 = _.reject(collection.models, function(tp){
						return (_.indexOf(local_pl_ids2, tp.get("player_id")) >= 0);
					});
					if (new_tps2.length>0){
						trackedgame.get("offfield_2").add(new_tps2);
					}
				});
			});
			
			//.gameevents
			trackedgame.set("gameevents",
				new GameEvent.Collection(trackedgame.get("gameevents"),{game_id: gameId}));
			//trackedgame.get("gameevents").fetch(); //TODO: Fetch gameevents once the API is capable of returning events created by the user.
			
			/*
			* EXTRA MODEL BINDINGS.
			*/
			trackedgame.on("change:current_state",trackedgame.update_state,trackedgame);//update possession when the state changes.
			trackedgame.on("change:is_over",trackedgame.save);//save the game when it is set to being over or not-over.
			trackedgame.get("gameevents").on("add",trackedgame.event_added,trackedgame);
			trackedgame.get("gameevents").on("remove",trackedgame.event_removed,trackedgame);
			
			trackedgame.get("game").on("change:team_1", function(){
				if (trackedgame.get("game").get("team_1").name && !trackedgame.get("team_pulled_to_start_ix")){
					trackedgame.start_period_pull();
				}
			});
			
			trackedgame.on("change:visible_screen", trackedgame.field_status_events);
			trackedgame.get("roster_1").on("reset", function(collection, options){
				var status_1 = _.clone(trackedgame.get("field_status_1"));
				_.each(collection.models, function(tp, index, list){
					if (status_1[tp.get("player_id")]===undefined){status_1[tp.get("player_id")] = 0;} 
				}, this);
				trackedgame.set("field_status_1", status_1, {silent:true});
			}, this);
			trackedgame.get("roster_2").on("reset", function(collection, options){
				var status_2 = _.clone(trackedgame.get("field_status_2"));
				_.each(collection.models, function(tp, index, list){
					if (status_2[tp.get("player_id")]===undefined){status_2[tp.get("player_id")] = 0;} 
				}, this);
				trackedgame.set("field_status_2", status_2, {silent:true});
			}, this);
			
			/*
			* SET UP THE VIEWS
			*/
			var myLayout = app.router.useLayout("tracked_game");
			myLayout.setViews({
				".scoreboard": new TrackedGame.Views.Scoreboard({model: trackedgame}),//team names, score, possession indicator
				".rotate_screen": new TrackedGame.Views.RotateButton({model: trackedgame}),//just a button, but changes its text so it is in a view
				".main_section": new TrackedGame.Views.MainSection({model: trackedgame})//a container for either roster screen or action screen.
			});
			var callback = trackedgame.setButtonHeight;
			myLayout.render().then(function(){
                // Unbind any other bindings to the browser height
                $(window).unbind("resize"); //Is there a better way to do this besides binding globally?
                $(window).bind("resize", function() {
                    callback();
                });
                callback();
            });
		}
	});
	TrackedGame.router = new TrackedGame.Router();// INITIALIZE ROUTER
	
	/*
	* TrackedGame page view hierarchy:
	* 
	* .scoreboard = Scoreboard. Includes team names and scores. (possession indicator?)
	* .rotate_screen = RotateButton. A button that rotates the visibility of the remaining screens.
	* .main_section = MainSection. Will set its contents depending on which screen is visible.
	*   Either roster for 1, roster for 2, or action
	*   - roster = Roster
	*     - roster_onfield_sum = RosterSum
	*     - roster_area = RosterList
	*       - many RosterItem
	*   - t_game = GameAction
	*   - play_by_play = PlayByPlay
	*   - player_area = PlayerArea
	*     - player_area_1 = TeamPlayerArea. Not visible if the other player_area is visible.
	*       - many PlayerButton
	*     - player_area_2 = TeamPlayerArea. Not visible if the other player_area is visible.
	*       - many PlayerButton
	*   - action_area = ActionArea
	*/

	//
	// VIEWS
	//
	
	/*
	* Scoreboard
	*/
	TrackedGame.Views.Scoreboard = Backbone.View.extend({
		//this.model = trackedgame
		template: "trackedgame/scoreboard",
		initialize: function() {
			this.model.get("game").on("change:team_1_score change:team_2_score", this.render, this);//Update the display when the score changes.
			this.model.on("change:team_in_possession_ix", this.render, this);//Update the display when possession changes.
		},
		serialize: function() {
			return this.model.toJSON();
		}
	});
	
	/*
	* RotateButton
	*/
	TrackedGame.Views.RotateButton = Backbone.View.extend({
		//this.model = trackedgame.
		template: "trackedgame/rotate_button",
		initialize: function() {			
			this.model.on("change:visible_screen", this.render, this);
		},
		render: function(manage) {
			var n_screens = this.model.screens_list.length;
			var sc_ix = this.model.get("visible_screen");
			var next_screen_text = "";
			sc_ix = sc_ix == n_screens-1 ? 0 : sc_ix + 1;
			return manage(this).render({next_screen: this.model.screens_list[sc_ix].b_string});
		},
		events: {
			"click .rotate": function() {this.model.rotate_visibility();}
		}
	});
	
	/*
	* MainSection
	*/
	TrackedGame.Views.MainSection = Backbone.View.extend({
		//tagName: "div",
		initialize: function(){
			this.model.on("change:visible_screen", this.render, this);//re-render when screens rotate.
		},
		render: function(manage){
			var sc_ix = this.model.get("visible_screen");
			if (sc_ix<2){
				this.setView(new TrackedGame.Views.Roster({model: this.model, team_ix: sc_ix+1}));
			} else {
				this.setView(new TrackedGame.Views.GameAction({model: this.model}));
			}	
			return manage(this).render();
		}
	});
	
	/*
	* Parent view for the substitution screen. The layout has 2 of these.
	* Each contains two subviews: the list of players and a single number indicating how many players are onfield.
	* I'm using two subviews instead of putting everything in this view because I don't want the roster list to re-render when I update the number.
	*/
	TrackedGame.Views.Roster = Backbone.View.extend({
		//passed this.model = trackedgame, and this.options.team_ix is the index of the team this view is used for.
		template: "trackedgame/roster",
		initialize: function() {
			this.model.get("game").on("reset", this.render, this);
		},
		render: function(manage) {
			this.setViews({
				".roster_onfield_sum": new TrackedGame.Views.RosterSum({model: this.model, team_ix: this.options.team_ix}),
				".roster_area": new TrackedGame.Views.RosterList({model: this.model, team_ix: this.options.team_ix})
			});
			return manage(this).render({ team: this.model.get("game").get("team_"+this.options.team_ix)});
		}
	});
	TrackedGame.Views.RosterSum = Backbone.View.extend({
		template: "trackedgame/rostersum",
		initialize: function() {
			this.model.on("change:field_status_"+this.options.team_ix, this.render, this);
		},
		render: function(manage) {
			var my_status = this.model.get("field_status_"+this.options.team_ix);
			var n_onfield = 0;
			_.each(my_status, function(value,key,list){n_onfield=n_onfield+value;});
			return manage(this).render({onfield_sum: n_onfield});
		}
	});
	TrackedGame.Views.RosterList = Backbone.View.extend({
		//this.model is trackedgame. this.options.team_ix is the team for this view.
		initialize: function() {//Re-render the whole list whenever the fetch of teamplayers returns.
			this.model.get("roster_"+this.options.team_ix).on("reset", this.render, this);
		},
		tagName: "ul",
		render: function(manage){
			this.model.get("roster_"+this.options.team_ix).each(function(tp) {//for each teamplayer in the collection.
				this.insertView(new TrackedGame.Views.RosterItem({model: tp, trackedgame: this.model, team_ix: this.options.team_ix}));
			}, this);
			return manage(this).render();
		}
	});
	TrackedGame.Views.RosterItem = Backbone.View.extend({
		//this.model is the teamplayer. this.options.trackedgame, this.options.team_ix
		template: "trackedgame/roster_item",
		tagName: "li",
		render: function(manage){
			return manage(this).render(this.model.toJSON()).then(function(el){
				this.$el.toggleClass('onfield',this.options.trackedgame.get("field_status_"+this.options.team_ix)[this.model.get("player_id")]==1);
			}, this);
		},
		events: {
			"click": "toggle_me"
		},
		toggle_me: function(ev) {
			var my_status = this.options.trackedgame.get("field_status_"+this.options.team_ix);
			my_status[this.model.get("player_id")] = 1 - my_status[this.model.get("player_id")];
			//this.options.trackedgame.set("field_status_"+this.options.team_ix, my_status);
			this.options.trackedgame.trigger("change:field_status_"+this.options.team_ix);
			this.render();
		}
	});
    
    /*
	Parent view for the game screen
	*/
	TrackedGame.Views.GameAction = Backbone.View.extend({
		//this.model = trackedgame
		initialize: function() {
			this.model.get("roster_1").on("reset", this.render, this);
			this.model.get("roster_2").on("reset", this.render, this);
		},
		template: "trackedgame/game_action",
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				".playbyplay": new TrackedGame.Views.PlayByPlay({model: this.model}),
				".player_area": new TrackedGame.Views.PlayerArea({model: this.model}),
				".action_area": new TrackedGame.Views.ActionArea({model: this.model})
			});
			return view.render().then(function() {this.model.setButtonHeight();});
		}
	});
	
	/*
	* View for PlayByPlay
	*/
	TrackedGame.Views.PlayByPlay = Backbone.View.extend({
		//this.model is trackedgame
		template: "trackedgame/playbyplay",
		initialize: function() {//Update the play-by-play when a game event is added or removed.
			this.model.get("gameevents").on("add remove", function() {this.render();}, this);
		},
		//cleanup
		render: function(layout) {
			var view = layout(this);
			var playtext = "";
			//Use the last event to determine how to draw the play-by-play screen.
			var _events = this.model.get("gameevents");
			if (_events.length>0){
				var last_event = _events.at(_events.length-1);
				var event_meta = this.model.events_meta[last_event.get("type")];
				//if event_meta has last_player_as or next_player_as and either of them have a value of 1.
				var lpix = _.has(event_meta,"last_player_as") ? event_meta.last_player_as : null;
				var npix = _.has(event_meta,"next_player_as") ? event_meta.next_player_as : null;
				var players = [];
				if (lpix || npix){
					var t1 = this.model.get("roster_1").pluck("player");
					var t2 = this.model.get("roster_2").pluck("player");
					players = _.union(t1,t2);
				}
				if (lpix==1 || npix==1){
					var pl1 = _.find(players, function(pl_obj){return pl_obj.id == last_event.get("player_1_id");});
					if (pl1 !== undefined) {
                        playtext = pl1.first_name[0] + ". " + pl1.last_name + " ";
                    } else {
                        playtext = "Unknown ";
                    }
				}
				
				playtext += event_meta.play_string;
				
				if (npix>1){
					var pl2 = _.find(players, function(pl_obj){return pl_obj.id == last_event.get("player_" + npix + "_id");});
                    var pl2_name = 'Unknown';
                    if (pl2 !== undefined){
                        pl2_name = pl2.first_name[0] + ". " + pl2.last_name;
                    }
					playtext = playtext + " " + pl2_name + ".";
				}
			}
			return view.render({playtext: playtext});
		}
	});
	
	/*
	Nested views for player buttons. PlayerArea>TeamPlayerArea*2>PlayerButton*8
	*/
	TrackedGame.Views.PlayerArea = Backbone.View.extend({
		//this.model is trackedgame
		template: "trackedgame/player_area",
		initialize: function() {
			//I have moved the action prompt from the subview to here, because the action prompt is not team-specific.
			this.model.on("change:current_state", function() {this.render();}, this);//Update the action prompt.
			this.model.on("change:team_in_possession_ix", function() {this.show_teamplayer();}, this);//Update which player buttons to display.
		},
		render: function(layout) {
			var view = layout(this);
			this.setViews({
				//Need to pass the full trackedgame to the children views because we need to bind to its attributes that are not yet backbone model's'
				".player_area_1": new TrackedGame.Views.TeamPlayerArea({model: this.model, team_ix: 1}),
				".player_area_2": new TrackedGame.Views.TeamPlayerArea({model: this.model, team_ix: 2})
			});
			return view.render({
				//player_prompt: this.model.player_prompt_strings[this.model.get("current_state")]
				player_prompt: this.model.game_states[this.model.get("current_state")].player_prompt
			}).then(function(el) {
				this.show_teamplayer();
			});
		},
		show_teamplayer: function () {
			this.$(".player_area_"+(3-this.model.get("team_in_possession_ix"))).hide();
			this.$(".player_area_"+this.model.get("team_in_possession_ix")).show();
		}
	});
	TrackedGame.Views.TeamPlayerArea = Backbone.View.extend({
		//this.model = trackedgame; this.options.team_ix = 1 or 2
		template: "trackedgame/teamplayer_area",
		initialize: function() {
			this.model.get("game").on("change:team_"+this.options.team_ix, this.render, this);//Team name will update when returned from db.
			this.model.on("change:field_status_"+this.options.team_ix, this.render, this);//Change displayed player buttons
		},
		render: function(manage) {
			var my_status = this.model.get("field_status_"+this.options.team_ix);
			var n_onfield = 0;
			this.model.get("roster_"+this.options.team_ix).each(function(tp) {
				if (my_status[tp.get("player_id")]){
					n_onfield = n_onfield + 1;
					this.insertView("ul", new TrackedGame.Views.PlayerButton({
						model: tp, trackedgame: this.model
					}));
				}
			}, this);
			//insert unknown buttons for less than 8 players.
			var TeamPlayer = require("modules/teamplayer");
			for(var i=n_onfield;i<8;i++){
				this.insertView("ul", new TrackedGame.Views.PlayerButton({
					model: new TeamPlayer.Model({
						team_id: this.model.get("game").get("team_"+this.options.team_ix+"_id"),
						player_id: NaN,
						player: {id:NaN, last_name:"unknown"}}),
					trackedgame: this.model
				}));
			}
			var team = this.model.get("game").get("team_"+this.options.team_ix);
			return manage(this).render({ team: team }).then(function(el){
				this.model.setButtonHeight();
			}, this);
		}
	});
	TrackedGame.Views.PlayerButton = Backbone.View.extend({
		template: "trackedgame/player_button",
		tagName: "li",
		serialize: function() {
			return this.model.toJSON();//TODO: player model itself should generate the name.
		},
		events: {
			"click": "player_tap"
		},
		player_tap: function(ev){
            //var player_id = parseInt(this.$el.find("button.player").attr("id"),10);
			this.options.trackedgame.player_tap(this.model.get("player_id"));
		}
	});
	
	
	/*
	View for action buttons. ActionArea> (should this be nested?)
	*/
	TrackedGame.Views.ActionArea = Backbone.View.extend({
		template: "trackedgame/action_area",
		initialize: function() {			
			this.model.on("change:player_in_possession_id change:current_state change:period_number", function() {this.render();}, this);
			this.model.on("change:showing_alternate", this.show_action_buttons, this);//Which buttons are we showing?
		},
		render: function(layout) {
			var view = layout(this);
			var pl_string = "";
			var ac_string = "";
			var pl_id = this.model.get("player_in_possession_id");
			var team_ix = this.model.get("team_in_possession_ix");
			if (pl_id){
				var pl_model = _.find(this.model.get("roster_" + team_ix).pluck("player"), function(pl_obj){return pl_obj.id == pl_id;});
                if (pl_model !== undefined) {
					pl_string = pl_model.first_name[0] + ". " + pl_model.last_name + " ";
					ac_string = "throws a:";
                }
			}
			return view.render({
					player_string: pl_string,
					action_string: ac_string,
					per_num: this.model.get("period_number")
				}).then(function(el) {
					this.model.set("showing_alternate",-1);//We should probably ALWAYS show the default buttons after an event or state change.
					//this.show_action_buttons();
					this.show_player_name();
					this.model.setButtonHeight();
			});
		},
		show_action_buttons: function(ev){//shows or hides buttons depending on this.model.get("showing_alternate")
			if (this.model.get("showing_alternate")==1) {
				this.$(".main_action").hide();
				this.$(".alternate_action").show();
			}
			else {
				this.$(".alternate_action").hide();
				this.$(".main_action").show();
			}
		},
		toggle_action_buttons: function(ev){//toggle which buttons are being displayed.
			this.model.set("showing_alternate",-1*this.model.get("showing_alternate"));//Changing this should trigger show_action_buttons.
		},
        show_player_name: function(ev){
            //Update the player name that is shown above the action buttons
            this.$(".action_prompt_player").html(this.model.get("player_in_possession_name"));
        },
		events: {
			"click .misc": "toggle_action_buttons",
			"click .score": "score",
			"click .completion": "completion",
			"click .dropped_pass": "dropped_pass",
			"click .defd_pass": "defd_pass",
			"click .stall": "stall",
			"click .throwaway": "throwaway",
			"click .unknown_turn": "unknown_turn",
			"click .timeout": "timeout",
			"click .injury": "injury",
			"click .end_of_period": "end_of_period",
			"click .undo": "undo"
		},
		undo: function(){this.model.undo();},
		score: function(){this.model.set("current_state","scoring");},
		completion: function(){this.model.set("current_state","receiving");},
		dropped_pass: function(){this.model.set("current_state","dropping");},
		defd_pass: function(){this.model.set("current_state","blocking");},
		stall: function(){this.model.set("current_state","stalling");},
		throwaway: function(){this.model.immediate_event(32);},
		unknown_turn: function(){this.model.immediate_event(30);},
		timeout: function(){this.model.immediate_event(91);},
		injury: function(){this.model.injury_to();},
		end_of_period: function(){this.model.end_period();}
	});
	
	

	return TrackedGame;
});

require([
	"app",

	// Libs
	"jquery",
	"backbone",

	//Do we need all modules or only those with routers or that are not required by other modules?
	"modules/leaguevine",
	"modules/navigation",
	"modules/settings",	
	"modules/season",
	"modules/teamplayer",
	"modules/player",
	"modules/tournteam",
	"modules/stats",
	"modules/player_per_game_stats",
	"modules/team_per_game_stats",
	"modules/team",
	"modules/game",
	"modules/tournament",
	"modules/gameevent",
	"modules/trackedgame"
],
/*
 * The following callback is called after the dependices are loaded.
 * The dependencies are passed to the callback in the order they are required.
 * The Require callback normally returns an object that defines the module,
 * but in this case we are defining the jQuery ready function which will execute
 * once everything has finished loading.
 */
function(app, $, Backbone, Leaguevine) {
    
// Defining the application router, you can attach sub routers here.
	var Router = Backbone.Router.extend({
		//Routes are defined in sub modules.
		routes: {
			"": "index"
		},
		
		index: function () {
			Backbone.history.navigate('/teams', true); // Only works if I have a route to match teams
		},
		
		// Shortcut for building a url.
		go: function(){
			return this.navigate(_.toArray(arguments).join("/"), true);
		},
		useLayout: function(name) {
			// If already using this Layout, then don't re-inject into the DOM.
			if (this.layout) {
				return this.layout;
			}
		
			// Create a new Layout.
			this.layout = new Backbone.Layout({
				template: name,
				className: "layout " + name,
				id: "layout"
			});
		
			// Insert into the DOM.
			$("#main").html(this.layout.el);
			
			// Render the layout.
			this.layout.render();
			return this.layout;
		}
	});	

	// Treat the jQuery ready function as the entry point to the application.
	// Inside this function, kick-off all initialization, everything up to this
	// point should be definitions.
	$(function() {
		// Define your master router on the application namespace and trigger all
		// navigation from this instance.
		app.router = new Router(); //Necessary to catch default route.
		app.api = Leaguevine.API; //This will be useful if we ever use another API.

		// Trigger the initial route and enable HTML5 History API support
		Backbone.history.start({ pushState: true });
	});
    window.applicationCache.addEventListener('updateready', function(e) {
        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
            // Browser downloaded a new app cache.
            // Swap it in and reload the page to get the new code.
            window.applicationCache.swapCache();
            $('body').html('A new (better) version of this app is now loading...'); //Remove the current elements from the page to reduce confusion
            window.location.reload(); //Completely reload the page and re-fetch everything
        } else {
            // Manifest didn't changed. Nothing new to load.
        }
    }, false);
  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router.  If the link has a data-bypass
  // attribute, bypass the delegation completely.
	$(document).on("click", "a:not([data-bypass])", function(evt) {
		// Get the anchor href and protcol
		var href = $(this).attr("href");
		var protocol = this.protocol + "//";

        // TODO: If this is not localhost, only check to see if the cache is updated at most once an hour
        // Check to see if the cache has been updated. The request is done in the background and is not blocking

		window.applicationCache.update(); 
         
		// Ensure the protocol is not part of URL, meaning its relative.
		if (href && href.slice(0, protocol.length) !== protocol &&
			href.indexOf("javascript:") !== 0) {
			// Stop the default event to ensure the link will not cause a page
			// refresh.
			evt.preventDefault();

			// `Backbone.history.navigate` is sufficient for all Routers and will
			// trigger the correct events.  The Router's internal `navigate` method
			// calls this anyways.
			Backbone.history.navigate(href, true);
		}
	});
	
});

define("main", function(){});

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
		backbone: "../assets/js/libs/backbone"
	},

	shim: {
		
		backbone: {
			deps: ["lodash", "jquery"],
			exports: "Backbone"
		},
    
		"plugins/backbone.layoutmanager": {
			deps: ["backbone"],
			exports: "Backbone.LayoutManager"
		},

		"plugins/backbone.localStorage": {
			deps: ["backbone"]
		},
		
		"plugins/backbone-tastypie": {
			deps: ["backbone"]
		},
		
		"plugins/spinner": {
			deps: ["jquery"]
		},
		
		"plugins/backbone.websqlajax": {
			deps: ["backbone"]
		}
	}
});
define("config", function(){});
