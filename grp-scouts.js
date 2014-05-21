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

      capabilities:   "2 food/sec",   // (athen) give the economy a hint what this group provides.


      // this got initialized by launcher
      position:       null,           // coords of the group's position/activities
      target:         null,

      counter:        0,
      units:         ["exclusive", "cavalry CONTAIN SORT > speed"],


      // message queue sniffer

      listener: {

        onLaunch:    function(){

          this.register("units"); // turn res definitions into res objects
          this.economy.request(1, this.units, this.position);                 // assuming a CC exists

        },
        onAssign:    function(resource){

          deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);

          if (!this.counter){
            resource.move(H.Grids.center.map(c => c*4));
          } else {
            resource.move(this.position);
          }

          deb("scout.center: %s", H.Grids.center);


        },
        onDestroy:   function(resource){

          deb("     G: %s onDestroy: %s", this, resource);

          if (this.units.match(resource)){
            this.economy.request(Math.min(this.counter +1, 5), this.units, this.position);  
            this.counter += 1;
          }      

        },
        onAttack:    function(resource, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage.toFixed(1));

        },
        onBroadcast: function(source, msg){},
        onRelease:   function(resource){

          deb("     G: %s onRelease: %s", this, resource);

        },
        onInterval:  function(secs, ticks){

          deb("     G: %s onInterval,  %s/%s, states: %s", this, secs, ticks, H.prettify(this.units.states()));

          if (this.units.count){
            this.position = this.units.center;
          }

          if (!(ticks % 10)){
            H.Grids.scouting.dump("scout-" + ticks + ".png", 8)
          }

        }
      }
    }

  });

return H; }(HANNIBAL));

