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
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="track substitution sub_team_1"></section>\r\n<section class="track substitution sub_team_2"></section>\r\n<section class="track t_game"></section>\r\n<section class="track rotate_screen"></section>');}return __p.join('');
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
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="scoreboard"></div>\r\n<div class="playbyplay"></div>\r\n<div class="player_area"></div>\r\n<div class="action_area"></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/game_substitution.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="track sub_page_wrapper">\r\n    <div class="sub_team_header">\r\n        <span class="sub_team_name">\r\n            ', team.name ,'\r\n        </span>\r\n    </div>\r\n    <div class="sub_wrapper">\r\n        <div class="sub_on_field_wrapper">\r\n        \t<div class="sub_on_field_title">On field</div>\r\n            <div class="sub_on_field_area"></div>\r\n        </div>\r\n        <div class="sub_off_field_wrapper">\r\n        \t<div class="sub_off_field_title">Off field</div>\r\n            <div class="sub_off_field_area"></div>\r\n        </div>\r\n    </div>\r\n    <div class="sub_buttons_area">\r\n        <button class="button game_over">End Game</button>\r\n    </div>\r\n</div>\r\n');}return __p.join('');
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

this['JST']['app/templates/trackedgame/roster_item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="roster_player player" id="', player.id ,'">\r\n    <span class="player_name" id="', player.id ,'">', player.first_name ,' ', player.last_name ,'</span>\r\n    <span class="player_number" id="', player.id ,'">', number ,'</span>\r\n</button>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/roster_item_remove_all.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="roster_remove_all">\r\n    <span>REMOVE ALL</span>\r\n</button>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/rotate_button.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="button rotate">', next_screen ,'</button>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/scoreboard.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="score_area">\r\n    <div class="name team1"><span>', game.team_1.name ,'</div>\r\n    <div class="score team1"><span>', game.team_1_score ,'</div>\r\n    <div class="score team2"><span>', game.team_2_score ,'</div>\r\n    <div class="name team2"><span>', game.team_2.name ,'</div>\r\n</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/teamplayer_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="player_buttons"></ul>\r\n<div class="offense_teamname"><p>', team.name ,'</p></div>\r\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/ul.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul></ul>');}return __p.join('');
}(data, _)};