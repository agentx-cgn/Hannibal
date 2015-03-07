/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- GROUP:  S H E P H E R D S  ----------------------------------

  a group to generate food from corrals


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.shepherds" : {

      /* Behaviour: 
          to build a corral
          to use corral to breed sheeps (food.meat), 
          to return gathered meat to dropsite
          to shelter from violence (garrison)
          to help with nearby repair
      */

      // variables available in listener with *this*. All optional
      active:         true,           // ready to init/launch ...
      description:    "shepherds",    // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       10,             // call onInterval every x ticks

      // these techs help
      technologies: [                 
        "gather_animals_stockbreeding",
      ],

      scripts: {

        // game started, something launched this group
        launch: function launch (w, config) {

          w.units    = ["exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0"];
          w.corral   = ["exclusive", "gaia.fauna.sheep TRAINEDBY"];
          w.dropsite = ["shared",    "food ACCEPTEDBY"]; //TODO: exclude docks
          w.flock    = ["exclusive", "gaia.fauna.sheep"];

          w.units.size    = 8;
          w.corral.size   = 1;
          w.dropsite.size = 1;
          w.flock.size    = 100; // infinty

          w.nounify("units", "corral", "dropsite", "flock");

          w.dropsite.on.request();   


        // a request was succesful

        }, assign: function assign (w, item) {

          w.deb("     G: assign: %s, %s", this, item);

          w.nounify("item", item);

          // got dropsite, request unit, exits
          w.dropsite.on
            .member(w.item)
            .units.do.request()
            .exit
          ;

          // have too much units, release, exits
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

          //  the first unit requests corral, exits
          w.units.on
            .member(w.item)
            .match(w.units.count, 1)
            .match(w.corral.count, 0)
            .corral.do.request() 
            .exit
          ;

          //  got unit let repair/gather, exits
          w.units.on
            .member(w.item)
            .match(w.corral.count, 1)
            .item.do.repair(w.corral)  // relies on autocontinue
            .exit
          ;

          // got the corral foundation, update position, all units repair, exits
          w.corral.on
            .member(w.item)
            .match(w.item.foundation)
            .units.do.repair(w.item)
            .group.do.relocate(w.item.position)
            .exit
          ;

          // got the corral, request 2 sheeps
          w.corral.on
            .member(w.item)
            .match(!w.item.foundation)
            // .flock.do.request({amount: 2, producer: w.corral.first})
            .flock.do.request()
            .exit
          ;

          // got a sheep, gather, exit
          w.flock.on
            .member(w.item)
            .units.do.gather(w.flock)
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

          // lost corral, request another
          w.corral.on
            .member(w.item)
            .request()
          ;

          // killed sheep, request another
          w.flock.on
            .member(w.item)
            .flock.do.request({producer: w.corral.first})
          ;


        }, attack: function attack (w, attacker, victim, type, damage){

          w.deb("     G: attack: %s, %s, %s", this, attacker, victim);

          w.nounify("attacker",  attacker, "victim", victim);

          w.corral.on
            .member(w.victim)
            .units.on.repair(w.victim)
            .echo("corral attack")
          ;


        }, release: function release (w, item) {

          // de-garrison

          w.deb("     G: release.0: %s, %s", this, item);


        }, radio: function radio (w, source, msg){

          // group radio

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        }, interval: function interval (w, tick, secs){

          // defined by this.interval

          // w.deb("     G: interval: %s, secs: %s, intv: %s", this, secs, this.interval);

          // // send few idle unit to gather, exits
          // w.units.on
          //   .doing("idle")
          //   .lt(w.units.count, w.units.size)
          //   .gt(w.units.count, 0)
          //   .units.on.gather(w.field)
          //   .exit
          // ;

          // // if all idle, release group
          // w.units.on
          //   .doing("idle")
          //   .match(w.units.count, w.units.size)
          //   .group.release()
          // ;


        }


      } // end listener

    }

  });

return H; }(HANNIBAL));

