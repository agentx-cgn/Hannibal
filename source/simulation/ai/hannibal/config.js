/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- C O N F I G --------------------------------------------

  debug/numerus/tester settings, shortcuts and heuristics



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Config = {

    //logging 0=zero, 1=errors, 2=1+warnings, 3=2+info, 4=everything
    deb:      4,                   // enables messages to dbgView via _xdebug.js.deb()
    con:      1,                   // enables messages to the in game console via _xdebug.js.con()

    sequence:                "random/brainland",
    // sequence: "Forest Battle",

    // enable psy-ops
    brag:                    true,  

    // angle:                   3 * Math.PI/4,       // depends on first CC

    data:                    {
      sharedBuildingClasses: [
        "civilcentre", 
        "blacksmith", 
        "farmstead",
        "storehouse",
        "barracks", // temporarely
                             ],
      prey:                  [ // possible food resources
        "chicken", 
        "sheep", 
        "pig", 
        "goat"
                             ], 
    },

    numerus: {
      enabled:              true,
      file:                 "/home/noiv/Desktop/0ad/stats.csv",
      resolution:           10       // 10 = 16 secs
    },

    stats: {
      LengthStatsBuffer:    40, // approx 1 minute
    },

    economy: {
      IntervalMonitorGoals: 10,
      MaxQueueLength:        3,    // queue length for producers
    },

    map: {
      DangerEventRadius:    60,    // meter
      DangerEventRelax:      8,    // tick % N => 50%
    },


  };

return H; }(HANNIBAL));
