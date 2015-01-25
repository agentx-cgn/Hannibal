/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, TriggerHelper, Trigger, print, uneval */
/*globals SYSTEM_ENTITY, IID_PlayerManager, IID_TechnologyManager, IID_Trigger */

"use strict";

// helper

function fmt (){var a=Array.prototype.slice.call(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join("");}
function deb (){var s = fmt.apply(null, arguments); print("RMG   : " + s + "\n");}
function loop (n, fn){for (var i=0; i<n; i++){fn(i);}}


// MAP INITIALIZATION

// deb("Triggers.load.in");

  loop(TriggerHelper.GetNumberOfPlayers(), p => {

    TriggerHelper
      .GetPlayerComponent(p)
      .SetResourceCounts({
        food:  1000, 
        wood:  1000, 
        stone: 1000, 
        metal: 1000
      })
    ;

  });

// deb("Triggers.load.out");


// GAME INITIALIZATION

Trigger.prototype.cinema = function(){

  var start = [   400,   400,    10,    0,    0,    0 ];
  var end   = [    10,    10,    10,    0,    0,    0 ];


  deb("------: Trigger.cinema.in");

  Object.keys(Trigger.prototype).forEach(k => deb(k));


  Engine.SetCameraData(...start);

  deb("Camera: %s, %s, %s", Engine.CameraGetX(), Engine.CameraGetY(), Engine.CameraGetZ());

    //   Engine.SetCameraData(data.camera.PosX, data.camera.PosY, data.camera.PosZ,
    //      data.camera.RotX, data.camera.RotY, data.camera.Zoom);

    Engine.CameraMoveTo(400, 400);

  deb("------: Trigger.cinema.out");

};
Trigger.prototype.forceResearch = function(){

  var 
    player, 
    cmpTechnologyManager, 
    technologies = [
      // "phase_town_generic", 
      // "phase_city_generic"
    ];

  loop(TriggerHelper.GetNumberOfPlayers(), p => {

     player = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetPlayerByID(p);
     cmpTechnologyManager = Engine.QueryInterface(player, IID_TechnologyManager); 

     technologies.forEach(tech => {

       if (!cmpTechnologyManager.IsTechnologyResearched(tech)) {
         deb("Triggers.forceResearch.tech: player %s researches %s", p, tech);
         cmpTechnologyManager.ResearchTechnology(tech); 

       } else {
         deb("Triggers.forceResearch.tech: %s rejected %s", p, tech);

       }

     });

  });
   
};

Engine
  .QueryInterface(SYSTEM_ENTITY, IID_Trigger)
  .DoAfterDelay(   0, "forceResearch", {})
;
Engine
  .QueryInterface(SYSTEM_ENTITY, IID_Trigger)
  .DoAfterDelay(1000, "cinema", {})
; 
