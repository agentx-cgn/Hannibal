/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.harvester" : {

      /* Behaviour: 
          to maintain one field resource (food.grain), 
          to return gathered food to dropsite
          to shelter from violence (garrison)
          to help with nearby repair
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "harvester",    // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       10,             // call onInterval every x ticks

      technologies: [                 // these techs help
        "gather.capacity.wheelbarrow",
        "celts.special.gather.crop.rotation",
        "gather.farming.plows"
      ],

      scripts: {

        // game started, something launched this group
        launch: function launch (w, config) {

          w.units    = ["exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0"];
          w.field    = ["exclusive", "food.grain PROVIDEDBY"];
          w.dropsite = ["shared",    "food ACCEPTEDBY"]; //TODO: exclude docks

          w.units.size    = 5;
          w.field.size    = 1;
          w.dropsite.size = 1;

          w.nounify("units", "field", "dropsite");

          w.dropsite.on.request();   


        // a request was succesful

        }, assign: function assign (w, item) {

          // w.deb("     G: assign.0: %s, %s", w, item);

          w.nounify("item", item);

          // got dropsite, request unit, exits
          w.dropsite.on
            .member(w.item)
            .units.do.request()
            .exit
          ;

          // have too much units, exits
          w.units.on
            .gt(w.units.count, w.units.size)
            .release(w.item)
            .exit
          ;          

          // keep requesting units until size
          w.units.on
            .member(w.item)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          //  the first unit requests field, exits
          w.units.on
            .member(w.item)
            .match(w.units.count, 1)
            .match(w.field.count, 0)
            .field.do.request() 
            .exit
          ;

          //  got unit let repair/gather, exits
          w.units.on
            .member(w.item)
            .match(w.field.count, 1)
            .item.do.repair(w.field)  // relies on autocontinue
            .exit
          ;

          // got the field foundation, update position, all units repair, exits
          w.field.on
            .member(w.item)
            .match(w.item.foundation)
            .units.do.repair(w.item)
            .group.do.relocate(w.item.position)
            .exit
          ;

          // got the field, units gather exits
          w.field.on
            .member(w.item)
            .match(!w.item.foundation)
            .units.do.gather(w.field)
            .exit
          ;


        // resource lost

        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", this, item);

          w.nounify("item", item);

          // lost unit, request another
          w.units.on
            .member(w.item)
            .request()
          ;

          // lost field, request another
          w.field.on
            .member(w.item)
            .request()
          ;


        // there are enemies and gaia

        }, attack: function attack (w, item, enemy, type, damage){

          w.deb("     G: attack: %s, %s", this, item);

          w.nounify("item",  item);

          w.field.on
            .member(w.item)
            .units.on.repair(w.item)
          ;

        // de-garrison

        }, release: function release (w, item) {

          w.deb("     G: release.0: %s, %s", this, item);


        // group radio

        }, radio: function radio (w, source, msg){

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        // defined by this.interval

        }, interval: function interval (w, tick, secs){

          // w.deb("     G: interval: %s, secs: %s, intv: %s", this, secs, this.interval);

          // send few idle unit to gather, exits
          w.units.on
            .doing("idle")
            .lt(w.units.count, w.units.size)
            .units.on.gather(w.field)
            .exit
          ;

          // if all idle, release group
          w.units.on
            .doing("idle")
            .match(w.units.count, w.units.size)
            .group.release()
          ;


        }


      } // end listener

    }

  });

return H; }(HANNIBAL));

