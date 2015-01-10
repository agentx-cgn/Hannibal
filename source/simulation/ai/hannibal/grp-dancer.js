/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.dancer" : {

      /* Behaviour: 
        runs some digital dance moves to amuse the opponent
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "dancer",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       2,              // call onInterval every x ticks

      scripts: {


        launch: function launch (w, config) {

          var path, pos = w.group.position[0] + " " + w.group.position[1];

          w.units       = ["exclusive", "food.grain GATHEREDBY"];
          w.units.size  = 5;

          path          = w.units.size + "; translate " + pos + "; translatep 0, 70; circle 5";
          w.path        = ["path", path];
          w.path.size   = w.units.size;

          w.nounify("units", "path");

          w.path.on.request();   


        // a request was succesful

        }, assign: function assign (w, item) {

          // w.deb("     G: assign.0: %s, %s", w, item);

          w.objectify("item", item);

          // got path, request all units, exits
          w.path.on
            .member(w.item)
            .units.do.request(w.units.size)
            .exit
          ;

          // got a unit, send to path start
          w.units.on
            .member(w.item)
            .item.do.move(w.path.points("0"))
          ;

          // w.deb("     G: assign.3: %s, %s", w, item);

          //  got final unit, spread them over path
          w.units.on
            .member(w.item)
            .match(w.units.count, w.units.size)
            .spread(w.path) 
          ;


        // resource lost

        }, destroy: function destroy (w, item) {

          w.objectify("item", item);

          // lost unit, request another
          w.units
            .member(w.item)
            .request()
          ;


        // there are enemies and gaia

        }, attack: function attack (w, item, enemy, type, damage){

          w.deb("     G: attack.0: %s, %s", w, item);

          w.field.on
            .member(w.item)
            .units.on.repair(w.item)
          ;

        // de-garrison

        }, release: function release (w, item) {

          w.deb("     G: release.0: %s, %s", w, item);


        // group radio

        }, radio: function radio (w, source, msg){

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        // defined by this.interval

        }, interval: function interval (w, tick, secs){

          w.deb("     G: interval: %s, %s secs", w, secs);

          //  if complete and idle, change path and spread
          w.units.on
            .doing("idle")
            .match(w.units.count, w.units.size)
            .path.do.modify("rotate 0")
            .units.do.spread(w.path)
            .echo("danced")
          ;

        }


      } // end listener

    }

  });

return H; }(HANNIBAL));

// 501,4538314155411 / 511,4538314265622 / 531,4538314486044

// 0,980447893 0,96236738