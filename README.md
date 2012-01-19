#Leaguevine Ultistats
v0

##Summary:
Leaguevine Ultistats (lvus) is a Web App targeting mobile devices for tracking gameplay statistics in the sport of Ultimate.
It is very much in the early stages of development. Development will proceed in stages. These stages will proceed as follows:

1.  A simple REST read-only client with no user input, built using the angular.js framework.
2.  Add the ability to track gameplay but still can't add/edit teams/players/games. Again, this will require continued access to the server.
3.  Work on giving the app a clean and organized look.
4.  Add on an abstracted WebSQL local storage. I can probably do this by creating a custom angular service (google wspl might be a good reference here) but I will also take this opportunity to examine other frameworks such as backbone.
5.  Remove dependence on the server, possibly by moving the API interaction to be part of the data abstraction (some of this already exists in google wspl)
6.  Add the ability to enter new data like Teams, Games, Players, etc.
7.  Detect screen size and make the app work better with tablets, desktops, etc.
8.  More browser compatibility using html and css techniques used by h5bp.com/mobile. Also add the bookmark bubble.

Also in this directory you will be able to find some design documents, including
*  Screen wireframes (preliminary version available)
*  Model classes (available before v0.4 release)
*  Controller classes (available before v0.4 release)
*  State flow (available before v0.4 release)
*  data UML (available before v0.4 release)