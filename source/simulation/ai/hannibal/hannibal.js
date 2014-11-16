/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

/*--------------- H A N N I B A L ---------------------------------------------

  this is the actual bot, it loads from start, saved game or context and 
  runs against the engine or in a simulation


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){


  H.LIB.Bot = function(config){
    H.extend(this, config);
  };

  H.LIB.Bot.prototype = {
    constructor: H.LIB.Bot,
    clone: function(){},
    deserialize: function(){},
    tick: function(){},

  };

return H; }(HANNIBAL));  
