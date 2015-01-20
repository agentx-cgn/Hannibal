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
      .SetResourceCounts({food: 1000, wood: 1000, stone: 1000, metal: 1000})
    ;

  });

// deb("Triggers.load.out");


// GAME INITIALIZATION

Trigger.prototype.forceResearch = function(){

  // deb("Triggers.forceResearch.in");

  var 
    player, cmpTechnologyManager, 
    technologies = ["phase_town_generic", "phase_city_generic"];

  loop(TriggerHelper.GetNumberOfPlayers(), p => {

     player = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetPlayerByID(p);
     cmpTechnologyManager = Engine.QueryInterface(player, IID_TechnologyManager); 

     technologies.forEach(tech => {

       if (!cmpTechnologyManager.IsTechnologyResearched(tech)) {
         // deb("Triggers.forceResearch.tech: %s research %s", p, tech);
         cmpTechnologyManager.ResearchTechnology(tech); 

       } else {
         deb("Triggers.forceResearch.tech: %s rejected %s", p, tech);
       }


     });

  });
   
  // deb("Triggers.forceResearch.out");

};

Engine
  .QueryInterface(SYSTEM_ENTITY, IID_Trigger)
  .DoAfterDelay(0, "forceResearch", {})
; 
