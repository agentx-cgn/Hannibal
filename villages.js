/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures and units around civic centres
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var self, villages = {};

  H.Villages = (function(){

    return {
      log:  function(){},
      boot: function(){self = this; return this;},
      init: function(){},
      tick: function(){},
      activate: function(){

        H.Events.on("ConstructionFinished", function (msg){

          var order = H.Objects(H.MetaData[msg.id].order);

          if (order.ccid){
            H.MetaData[msg.id].ccid = order.ccid;
            // deb("  VILL: set ccid: %s of %s %s", order.ccid, msg.id, H.Entities[msg.id]._templateName);
          }

        });

      },

    };

  }()).boot();

return H; }(HANNIBAL));  