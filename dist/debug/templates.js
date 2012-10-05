this['JST'] = this['JST'] || {};

this['JST']['app/templates/games/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="game_detail">\n    <div id="team1">\n        <div id="team1_name"><a href="/teams/', team_1.id ,'">', team_1.name ,'</a></div>\n        <div id="team1_score"><span>', team_1_score ,'</span></div>\n    </div>\n    <div id="team2">\n        <div id="team2_name"><a href="/teams/', team_2.id ,'">', team_2.name ,'</a></div>\n        <div id="team2_score"><span>', team_2_score ,'</span></div>\n    </div>\n    <div class="start_time">\n        <span>', start_time_string ,'</span>\n    </div>\n    <div class="game_tournament">\n        <span>'); if (tournament) { ;__p.push('', tournament.name ,''); } ;__p.push('</span>\n    </div>\n    <div>\n        <form action="/', track ,'/', id ,'">\n            <button class="button btrack_game">Take Stats</button>\n        </form>\n    </div>\n</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/edit.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="edit_area"></section>\n<section class="team_search_list"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/edit_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<form>\n    <label>Team 1:</label>\n    <h3 id="team1_txt"><span>', team_1.name ,'</span></h3>\n    <label>Team 2:</label>\n    <h3 id="team2_txt"><span>', team_2.name ,'</span></h3>\n    <label>Start Time:</label>\n    <input type="text" id="start_time" name="start_time" value="', start_time ,'" />\n    <button class="save">Save</button>\n    <button class="delete">Delete</button>\n</form>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/find.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="game_find_detail">\n    <form action="/teams">\n    <h2>Get started</h2>\n    <p>To get started, find or create your team.</p>\n        <button class="button">Find your team</button>\n    </form>\n    <form action="/tournaments">\n    <p>Or, search for your game by tournament</p>\n        <button class="button">Find your tournament</button>\n    </form>\n</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a class="game_list_item_link" href=\'/games/', id ,'\'>\n    <div class="game_list_team_name">'); if (team_1) { ;__p.push('', team_1.name ,''); } ;__p.push('</div>\n    <div class="game_list_icon_spacer">&nbsp</div>\n    <div class="game_list_team_score">', team_1_score ,'</div>\n    <div class="game_list_team_name">'); if (team_2) { ;__p.push('', team_2.name ,''); } ;__p.push('</div>\n    <div class="game_list_icon_spacer">&nbsp</div>\n    <div class="game_list_team_score">', team_2_score ,'</div>\n    <div class="game_list_start_time">', start_time_string ,'</div>\n</a>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="games-list obj-list"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/games/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\n    <table>\n        <tr>\n            <td>\n                <button class="button bplayer_stats is_active">Player Stats</button>\n            </td>\n            <td>\n                <button class="button bteam_stats">Team Stats</button>\n            </td>\n        </tr>\n    </table>\n</div>\n<div class="list lteam_stats"></div>\n<div class="list lplayer_stats"></div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/div.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div></div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/main.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="navbar clearfix"></section>\n<section class="titlebar clearfix"></section>\n<section class="content_1 clearfix"></section>\n<section class="content_2 clearfix"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/nav_content.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="navbar clearfix"></section>\n<section class="titlebar clearfix"></section>\n<section class="content clearfix"></section>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/nav_detail_list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="navbar clearfix"></section>\n<section class="titlebar clearfix"></section>\n<section class="detail clearfix"></section>\n<section class="list_children clearfix"></section>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/layouts/tracked_game.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="track scoreboard"></section>\n<section class="track rotate_screen"></section>\n<section class="track main_section"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/leaguevine/more_items.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (num_items > 0) { ;__p.push('\n    <a id="more-items">\n        <div class="more-items-main-txt">Load ', num_items ,' More</div>\n        <div class="more-items-loading-txt">Loading...</div>\n    </a>\n'); } ;__p.push('\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/navigation/navbar.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="navbar-list">\n    <li>\n        <a href="', teams_href ,'" class="teams ', teams_class ,'">\n            Teams\n            <div>\n                <img '); if (teams_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/teams_list_white.png"'); } else { ;__p.push('src="/assets/img/icons/teams_list.png"'); } ;__p.push('>\n            </div>\n        </a>\n    </li>\n    <li>\n        <a href="', tournaments_href ,'" class="tournaments ', tournaments_class ,'">\n            Tournaments\n            <div>\n                <img '); if (tournaments_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/tournaments_icon_white.png"'); } else { ;__p.push('src="/assets/img/icons/tournaments_icon.png"'); } ;__p.push('>\n            </div>\n        </a>\n    </li>\n    <li>\n        <a href="', games_href ,'" class="games ', games_class ,'">\n            Games\n            <div>\n                <img '); if (games_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/games_icon_white.png"'); } else { ;__p.push('src="/assets/img/icons/games_icon.png"'); } ;__p.push('>\n            </div>\n        </a>\n    </li>\n    <li>\n        <a href="', settings_href ,'" class="settings ', settings_class ,'">\n            Settings\n            <div>\n                <img '); if (settings_class == "currently_viewed") { ;__p.push('src="/assets/img/icons/settings_gear_white.png"'); } else { ;__p.push('src="/assets/img/icons/settings_gear.png"'); } ;__p.push('>\n            </div>\n        </a>\n    </li>\n</ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/navigation/searchable_list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="search_bar_wrapper">\n\t<input type="text" class="search_bar" id="object_search" name="search" placeholder="Search for a ', search_object_name ,'" />\n</div>\n<section class="object_list_area clearfix"></section>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/navigation/titlebar.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="title_body">\n    <h1 id="title_txt"><span>', title ,'</span></h1>\n    <div id="title_left_btn" class="btn ', left_btn_class ,'">\n        <div id="title_left_pointer"><span></span></div>\n        <a href="', left_btn_href ,'">\n            <span></span>\n            <p>', left_btn_txt ,'</p>\n        </a>\n    </div>\n    <div id="title_right_btn" class="btn ', right_btn_class ,'">\n        <a href="', right_btn_href ,'">\n            <span>&nbsp</span>\n            <p>', right_btn_txt ,'</p>\n        </a>\n    </div>\n</div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<!--\n<ul>\n\t<li> DOB: ', birth_date ,'</li>\n\t<li> Height: ', height ,' cm</li>\n\t<li> Weight: ', weight ,' kg?</li>\n</ul>\n-->\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href=\'/players/', id ,'\'>\n    ', number ,' \n    ', first_name ,' \n    '); if (nickname) { ;__p.push('"', nickname ,'"'); } ;__p.push('\n    ', last_name ,'\n</a>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="players-list obj-list"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/players/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\n\t<button class="button bteams is_active">Teams</button>\n</div>\n<div class="list lteams"></div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/playerstats/boxscore.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table id="player_per_game_stats_1" class="playerstats_list stats">\n    <tr class="table_name">\n        <td colspan=8 width="100%" >', team_1.name ,'</td>\n    </tr>\n    <tr class="column_headers">\n        <th width="40%" class="table_first_item">\n            PLAYER\n        </th>\n        <th width="12%">\n            COMP\n        </th>\n        <th width="8%">\n            PT\n        </th>\n        <th width="8%">\n            AST\n        </th>\n        <th width="8%">\n            Ds\n        </th>\n        <th width="8%">\n            TO\n        </th>\n        <th width="8%">\n            +/-\n        </th>\n        <th width="8%">\n            GLS\n        </th>\n    </th>\n</table>\n\n<table id="player_per_game_stats_2" class="playerstats_list stats">\n    <tr class="table_name">\n        <td colspan=8 width="100%" >', team_2.name ,'</td>\n    </tr>\n    <tr class="column_headers">\n        <th width="40%" class="table_first_item">\n            PLAYER\n        </th>\n        <th width="12%">\n            COMP\n        </th>\n        <th width="8%">\n            PT\n        </th>\n        <th width="8%">\n            AST\n        </th>\n        <th width="8%">\n            Ds\n        </th>\n        <th width="8%">\n            TO\n        </th>\n        <th width="8%">\n            +/-\n        </th>\n        <th width="8%">\n            GLS\n        </th>\n    </th>\n</table>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/playerstats/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table class="playerstats-list">\n    <tr>\n        <th width="60%">\n            Player\n        </th>\n        <th width="10%">\n            Goals\n        </th>\n        <th width="10%">\n            Assists\n        </th>\n        <th width="10%">\n            Ds\n        </th>\n        <th width="10%">\n            Turns\n        </th>\n    </th>\n</table>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/playerstats/per_game_stat_line.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<td class="table_first_item">\n    <a href="players/', player.id ,'">', player.first_name ,' '); if (player.nickname) { ;__p.push('"'); } ;__p.push('', player.nickname ,''); if (player.nickname) { ;__p.push('"'); } ;__p.push(' ', player.last_name ,'</a>\n</td>\n<td>\n    ', completed_passes_thrown ,'/', passes_thrown ,'\n</td>\n<td>\n    ', points_played ,'\n</td>\n<td>\n    ', goals_thrown ,'\n</td>\n<td>\n    ', ds ,'\n</td>\n<td>\n    ', turnovers ,'\n</td>\n<td>\n    ', plus_minus ,'\n</td>\n<td>\n    ', goals_caught ,'\n</td>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/settings/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push(''); if (logged_in) { ;__p.push('\n<div id="logout_area">\n    <h2>You are logged in</h2>\n    <button id="logout" href="#">Log out</button>\n</div>\n'); } else { ;__p.push('\n<div id="logout_area">\n    <h2>Please log in</h2>\n    <button id="login" href="#">Log in</button>\n</div>\n'); } ;__p.push('\n<div id="battery_usage_area">\n    <h2>Set battery usage</h2>\n    <p>Sorry, this feature is not available at this time.</p>\n</div>\n');}return __p.join('');
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
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a class="team_player_list_link" href=\'players/', player.id ,'\'>\n    <span class="team_player_list_number">', number ,'</span>\n    <span class="team_player_list_name">\n        ', player.first_name ,' \n        '); if (player.nickname) { ;__p.push('"'); } ;__p.push('', player.nickname ,''); if (player.nickname) { ;__p.push('"'); } ;__p.push(' \n        ', player.last_name ,'\n    </span>\n</a>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/playerlist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="players-list obj-list"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/team.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href=\'teams/', team.id ,'\'>', team.name ,'</a>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamplayers/teamlist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="teams-list"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div>', info ,'</div>\n<div>\n\n    <!--\n    <form>\n        <button class="button bcreategame">Create a Game</button>\n    </form>\n    -->\n\n</div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/edit.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<form>\n    <label>Name:</label>\n    <input type="text" id="name" name="name" value="', name ,'" required/>\n    <label>Info:</label>\n    <input type="text" id="info" name="info" value="', info ,'" />\n</form>\n<button class="save">Save</button>\n<button class="delete">Delete</button>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a class="teams_list_item_link">\n    <div class="teams_list_team_name">', name ,'</div>\n    <div class="teams_list_season_name">\n        ', season_name ,' ', league_name ,'\n    </div>\n</a>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="team-list obj-list"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teams/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\n    <table>\n        <tr>\n            <td>\n                <button class="button bgames is_active">Games</button>\n            </td>\n            <td>\n                <button class="button bplayers">Players</button>\n            </td>\n        </tr>\n    </table>\n</div>\n<div class="list lgames"></div>\n<div class="list lplayers"></div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamstats/boxscore.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table id="team_per_game_stats" class="teamstats_list stats">\n    <tr class="table_name">\n        <td colspan=8 width="100%" >Team Stats</td>\n    </tr>\n    <tr class="column_headers">\n        <th width="40%" class="table_first_item">\n            TEAM\n        </th>\n        <th width="14%">\n            COMP\n        </th>\n        <th width="14%">\n            COMP%\n        </th>\n        <th width="8">\n            Ds\n        </th>\n        <th width="8%">\n            DRP\n        </th>\n        <th width="8%">\n            TA\n        </th>\n        <th width="8%">\n            TO\n        </th>\n    </th>\n</table>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/teamstats/per_game_stat_line.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<td class="table_first_item">\n    <a href="teams/', team.id ,'">', team.name ,'</a>\n</td>\n<td>\n    ', completed_passes_thrown ,'/', passes_thrown ,'\n</td>\n<td>\n    ', completion_percent ,'\n</td>\n<td>\n    ', ds ,'\n</td>\n<td>\n    ', drops ,'\n</td>\n<td>\n    ', throwaways ,'\n</td>\n<td>\n    ', turnovers ,'\n</td>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/detail.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="tournament_start_date"><span>', start_date_string ,'</span></div>\n<div>', info ,'</div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<a href=\'tournaments/', id ,'\'>', name ,'</a>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="tournament-list obj-list"></ul>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournaments/multilist.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons">\n    <table>\n        <tr>\n            <td>\n                <button class="button bgames is_active">Games</button>\n            </td>\n            <td>\n                <button class="button bstandings">Standings</button>\n            </td>\n            <!--\n            <td>\n                <button class="button bpools">Pools</button>\n            </td>\n            <td>\n                <button class="button bbrackets">Brackets</button>\n            </td>\n            -->\n        </tr>\n    </table>\n</div>\n<div class="list lgames"></div>\n<div class="list lstandings"></div>\n<!--\n<div class="list lpools"></div>\n<div class="list lbrackets"></div>\n-->\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournteams/list.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<table id="tournament_standings" class="tournteam-list">\n    <tr>\n        <th width="70%">\n            Team\n        </th>\n        <th width="15%">\n            Seed\n        </th>\n        <th width="15%">\n            Finish\n        </th>\n    </th>\n</table>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/tournteams/team.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<td>\n    <a href=\'teams/', team.id ,'\'>', team.name ,'</a>\n</td>\n<td>\n    ', seed ,'\n</td>\n<td>\n    ', final_standing ,'\n</td>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/action_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="buttons main_action">\n    <div id="throw_prompt" class="action_prompt">\n        <div class="action_prompt_player">\n            ', player_string ,'\n        </div>\n        <div class="action_prompt_action">\n            ', action_string ,'\n        </div>\n    </div>\n    <button class="button completion">Complete Pass</button>\n\t<button class="button dropped_pass">Dropped pass</button>\n\t<button class="button defd_pass">D\'ed Pass</button>\n    <button class="button throwaway">\n        <span class="button_line_1">Untouched</span> \n        <span class="button_line_2">Throwaway</span>\n    </button>\n    <button class="button score">Score</button>\n</div>\n<div class="buttons alternate_action">\n    <div id="alternate_action_prompt" class="action_prompt">\n        <div class="action_prompt_action">What happened?</div>\n    </div>\n\t<button class="button unknown_turn">Unknown Turn</button>\n\t<button class="button stall">Stall</button>\n    <!-- Removed for simplicity for the first version \n        <button class="button foul">Foul/Violation</button>\n    -->\n\t<button class="button injury">Injury</button>\n\t<button class="button timeout">Timeout</button>\n\t<button class="button end_of_period">End of Period ', per_num ,'</button>\n</div>\n<div class="buttons extra_actions">\n    <button class="button misc">Misc</button>\n    <button class="button undo">Undo</button>\n</div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/basic.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div id="trackbasic">\n    <div id="team1">\n        <button class="team_1 decrement">-</button>\n        <button class="team_1 increment">+</button>\n    </div>\n    <div id="team2">\n        <button class="team_2 decrement">-</button>\n        <button class="team_2 increment">+</button>\n    </div>\n</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/game_action.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="playbyplay"></div>\n<div class="player_area"></div>\n<div class="action_area"></div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/main.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<section class="roster_1"></section>\n<section class="roster_2"></section>\n<section class="action"></section>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/playbyplay.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="last_action_label">Previous Play:</div>\n<div class="last_action">', playtext ,'</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/player_action_prompt.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('', player_prompt ,'');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/player_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="player_prompt"></div>\n<div class="player_area_1"></div>\n<div class="player_area_2"></div>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/player_button.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="button player" id="', player.id ,'"><span class="player_name">', player.first_name ,' ', player.last_name ,'</span><span class="player_number">', number ,'</span></button>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/roster.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="roster_team_header">\n    <span class="roster_team_name">\n        ', team.name ,'\n    </span>\n</div>\n<div class="roster_onfield_sum"></div>\n<div class="roster_quick">\n\t<ul>\n\t\t<li>\n\t\t\t<button class="clear_roster">\n\t\t\t\t<span>Clear</span>\n\t\t\t</button>\n\t\t</li>\n\t\t<li>\n\t\t\t<button class="last_o">\n\t\t\t\t<span>Last O-Line</span>\n\t\t\t</button>\n\t\t</li>\n\t\t<li>\n\t\t\t<button class="last_d">\n\t\t\t\t<span>Last D-Line</span>\n\t\t\t</button>\n\t\t</li>\n\t</ul>\n</div>\n<div class="roster_area"></div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/roster_item.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<button class="roster_player player" id="', player_id ,'">\n    <span class="player_name" id="', player_id ,'">', player.first_name ,' ', player.last_name ,'</span>\n    <span class="player_number" id="', player_id ,'">', number ,'</span>\n</button>\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/roster_sum.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('', onfield_sum ,' players in\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/rotate_button.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('', next_screen ,'\n');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/scoreboard.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<div class="name team1">', game.team_1.name ,'</div>\n<div class="score team1">', game.team_1_score ,'</div>\n<div class="score team2">', game.team_2_score ,'</div>\n<div class="name team2">', game.team_2.name ,'</div>');}return __p.join('');
}(data, _)};

this['JST']['app/templates/trackedgame/teamplayer_area.html'] = function(data) { return function (obj,_) {
var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('<ul class="player_buttons"></ul>\n<div class="offense_teamname"><p>', team.name ,'</p></div>\n');}return __p.join('');
}(data, _)};