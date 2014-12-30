/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.scouts" : {

      /* Behaviour: 
          to explore the land part of map, 
          by feeding the scout grid with postions to analyse
          to avoid violent combat
          to report enemies + buildings
          to report resources, wood, metal, stone, animals
          to report job finished
          to stay healthy
      */

      active:         true,           // ready to init/launch ...
      description:    "scouts",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:        2,             // call onInterval every x ticks

      listener: {  

        onLaunch: function (w, config) {

          //scanner gives asset/scanner, verb/scan, attribute/target

          w.group.size = config.size || 8;
          w.units = ["exclusive", "cavalry CONTAIN SORT > speed"];
          w.register("units");
          w.import("scanner");
          w.units.request();

        }, onAssign: function(w, asset) {

          w.log("onAssign", w, asset);

          // first unit orders scanner
          w.scanner.on
            .member(asset, w.units)
            .match(0, w.scanner.size)
            .match(1, w.units.size)
            .request()
          ;

          // got scanner, pick unit to scan for w.target
          w.units.on
            .member(asset, w.scanner)
            .scan("grid", w.target)
          ;

          // have too much units
          g.units.on
            .gt(g.unit.count, g.unit.size)
            .unhealthy()
            .release()
          ;

        }, onDestroy: function(w, asset) {

          // lost unit, double size, hence release unhealthy
          w.units.on
            .member(asset, w.units)
            .request(w.units.count * 2)
          ;

        }, onAttack: function(w, asset, attacker, type, damage) {

          // with group spread, health low, flee
          asset.on
            .member(asset, w.units)
            .lt(50, asset.health)
            .gt(50, g.units.spread)
            .scan("attacker", attacker)
            .scan("grid", w.target)
            .stance("defensive")
            .flee(attacker)
          ;

          // with group spread, health low, all flee
          g.units.on
            .member(asset, w.units)
            .lt(80, g.units.health)
            .stance("defensive")
            .flee(attacker)
            .nearest(attacker)
            .scan("attacker", attacker)
          ;

        }, onBroadcast: function(source, msg) {

        }, onRelease: function(asset) {

          deb("     G: %s onRelease: %s", this, asset);

        }, onInterval:  function(secs, ticks) {

          // deb("     G: %s onInterval,  states: %s, health: %s", 
          //   this, H.prettify(this.units.states()), this.units.health
          // );

          // var t0 = Date.now();

          if (this.units.count){
            
            if (this.units.doing("idle").count === this.units.count){

              this.position = this.units.center;

              this.target = this.scanner.next(this.position);

              if (this.target.point && this.target.treasures.length) {
                this.units.first.collect(this.target.treasures);
                return;
              
              } else if (this.target.point && this.target.terrain === "land") {
                this.units.doing("idle").forEach(function(unit){
                  this.units.stance("aggressive");
                  unit.move(this.target.point);
                });

              } else {
                this.units.release();
                this.dissolve();
                H.Scout.dump("scout-final-" + ticks + ".png", 255);
                deb("      G: %s finished scouting");
                return;

              }
            } else {
              this.units.doing("idle").move(this.units.center);
            }

            H.Scout.scan(this.units.nearest(this.target.point));

          }

          if ((ticks % 10) === 0){
            H.Scout.dump("scout-" + ticks + ".png", 255);
          }

          // deb("     G: scout interval: %s msecs", Date.now() - t0);

        }

      }
    }

  });

return H; }(HANNIBAL));

