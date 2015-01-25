/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.infantry" : {

      /* Behaviour: 
        basic attack group
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "infantry",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       2,              // call onInterval every x ticks

      scripts: {


        launch: function launch (w, config) {

          var path, pos = w.group.position[0] + " " + w.group.position[1];

          w.units       = ["exclusive", "infantry CONTAIN"];
          w.units.size  = config.size || 10;

          path          = w.units.size + "; translate " + pos + "; translatep 0 70; square 6";
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
            .stance("passive")
            .item.do.move(w.path.points("0"))
          ;

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

          w.deb("     G: attack.0: %s, %s, %s", w, item, enemy);


        // de-garrison

        }, release: function release (w, item) {

          w.deb("     G: release.0: %s, %s", w, item);


        // group radio

        }, radio: function radio (w, source, msg){

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        // defined by this.interval

        }, interval: function interval (w, tick, secs){

          w.deb("     G: interval: %s, %s secs", this, secs);

          //  if complete and idle, change path and spread
          
          w.units.on
            .match(tick % 2, 0)
            .doing("idle")
            .match(w.units.count, w.units.size)
            .path.do.modify("square; rotate 120")
            .units.do.spread(w.path)
          ;

          w.units.on
            .match(tick % 2, 1)
            .doing("idle")
            .match(w.units.count, w.units.size)
            .path.do.modify("square")
            .units.do.spread(w.path)
          ;

        }


      } // end scripts

    }

  });

return H; }(HANNIBAL));
