/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.idle" : {

      /* Behaviour: 
        centers units at agora
        works as buffer
        has extra comm caps
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "idle",         // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       4,              // call onInterval every x ticks

      scripts: {


        launch: function launch (w, config) {

          var path, pos = w.group.position[0] + " " + w.group.position[1];

          w.units       = ["exclusive", "citizen CONTAIN"];
          w.units.size  = 20;

          path          = w.units.size + "; translatep 0 20; circle 10";
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
            .units.do.request()
            .exit
          ;

          // have too much units, exits
          w.units.on
            .gt(w.units.count, w.units.size)
            .release(w.item)
            .exit
          ;          

          // got a unit, send to path
          w.units.on
            .member(w.item)
            .stance("passive")
            .spread(w.path) 
          ;


        // resource lost

        }, destroy: function destroy (w, item) {

          w.objectify("item", item);

          // keep minumum units, exits
          w.units.on
            .member(w.item)
            .lt(w.units.count, 5)
            .request()
            .exit
          ;          


        // there are enemies and gaia

        }, attack: function attack (w, shooter, victim, type, damage){

          w.deb("     G: attack.0: %s, %s, %s", w, shooter, victim);

          w.objectify("shooter", shooter);
          w.objectify("victim",  victim);


        // de-garrison

        }, release: function release (w, item) {

          w.deb("     G: release.0: %s, %s", w, item);


        // group radio

        }, radio: function radio (w, source, msg){

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        // defined by this.interval

        }, interval: function interval (w, secs, ticks){

          w.deb("     G: interval: %s, %s secs", this, secs);

          //  if complete and idle, change path and spread
          
          w.units.on
            .match(ticks % 4, 0)
            .doing("idle")
            .match(w.units.count, w.units.size)
            .stance("passive")
            .spread(w.path)
            .path.do.modify("rotate 120")
          ;

          w.units.on
            .match(ticks % 4, 2)
            .doing("idle")
            .match(w.units.count, w.units.size)
            .stance("passive")
            .spread(w.path)
            .path.do.modify("rotate 20")
          ;

        }


      } // end scripts

    }

  });

return H; }(HANNIBAL));
