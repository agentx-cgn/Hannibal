/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {


    "g.scouts" : {

      /* Behaviour: 
          to explore the map, 
          to avoid violent combat
          to report enemies + buildings
          to report resources, wood, metal, stone, animals
          to fill the scout grid
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "scouts",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics

      interval:        2,             // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "+area",        // (athen) give the economy a hint what this group provides.


      // this got initialized by launcher
      position:       null,           // coords of the group's position/activities

      counter:        0,
      losses:         0,
      units:         ["exclusive", "cavalry CONTAIN SORT > speed"],
      maxUnits:       5,

      scanner:       null,
      target:        null,


      // message queue sniffer

      listener: {

        onLaunch:    function(){

          this.register("units");                                // turn res definitions into res objects
          this.economy.request(1, this.units, this.position);    // 1 unit is a good start

        },
        onAssign:    function(asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          if (!this.counter){
            this.scanner = H.Scout.scanner(asset);  // inits search pattern with first unit
            this.target = this.scanner.next(asset.location());

          } else if (this.units.count > this.maxUnits) {
            asset.release();

          } else {
            asset.move(this.units.center);                        // all other move to last known location

          }

          this.counter += 1;

        },
        onDestroy:   function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.units.match(asset)){
            this.losses += 1;
            // succesively increment up to 5
            var amount = Math.max(this.maxUnits - this.units.count, this.losses +1);
            deb("AMOUNT: %s, max: %s, units: %s, losses: %s", amount, this.maxUnits, this.units.count, this.losses);
            this.economy.request(amount, this.units, this.position);  
          }      

        },
        onAttack:    function(asset, attacker, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, H.Entities[attacker] || attacker, damage.toFixed(1));

          H.Scout.scanAttacker(attacker);

          if (asset.health < 80){
            if (this.units.spread > 50){
              asset.stance("defensive");
              asset.flee(attacker);
            } else {
              H.Scout.scan(this.units.nearest(this.target.point));
              this.units.stance("defensive");
              this.units.flee(attacker);
            }
          }

        },
        onBroadcast: function(source, msg){},
        onRelease:   function(asset){

          deb("     G: %s onRelease: %s", this, asset);

        },
        onInterval:  function(secs, ticks){

          deb("     G: %s onInterval,  states: %s, health: %s", 
            this, H.prettify(this.units.states()), this.units.health
          );

          // var t0 = Date.now();

          if (this.units.count){
            
            if (this.units.doing("idle").count === this.units.count){

              this.position = this.units.center;

              this.target = this.scanner.next(this.position);

              if (this.target.point && this.target.treasures) {
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
                H.Scout.dump("scout-final-" + ticks + ".png", 255)
                deb("      G: %s finished scouting");
                return;

              }
            } else {
              this.units.doing("idle").move(this.units.center);
            }

            H.Scout.scan(this.units.nearest(this.target.point));

          }

          if (!(ticks % 10)){
            H.Scout.dump("scout-" + ticks + ".png", 255)
          }

          // deb("     G: scout interval: %s msecs", Date.now() - t0);

        }
      }
    }

  });

return H; }(HANNIBAL));

