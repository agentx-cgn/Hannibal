/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, TIM, HANNIBAL, STRUCTURES, OTHER, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  var 
    size = 512, map, doAnimate = false;

  H.Simulation = {};

  H.Simulation.Unit = function (){

  }

  H.Simulation.Unit.prototype = {
  	constructor: H.Simulation.Unit,
  	
  }


  H.Simulation.Group = function (units){
  	this.units = units;
  }

  H.Simulation.Group.prototype = {
  	constructor: H.Simulation.Group,
  	
  }

return H; }(HANNIBAL));   

