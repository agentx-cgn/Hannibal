/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {

    "g.template" : {

      /* Behaviour: 
          to explore the map, 
          to avoid violent combat
          to report enemies + buildings
          to report resources, wood, metal, stone, animals
          to fill the scout grid
      */

      // variables available in listener with *this*. All optional

      active:         false,          // ready to init/launch ...
      description:    "scouts",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics

      interval:        2,             // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "2 food/sec",   // (athen) give the economy a hint what this group provides.


      // this got initialized by launcher
      position:       null,           // coords of the group's position/activities

      units:         ["exclusive", "cavalry CONTAIN SORT > speed"],


      // message queue sniffer

      listener: {
        onLaunch:    function(){

          this.register("units"); // turn res definitions into res objects
          this.economy.request(1, this.units, this.position);                 // assuming a CC exists

        },
        onAssign:    function(resource){

          deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);

        },
        onDestroy:   function(resource){

          deb("     G: %s onDestroy: %s", this, resource);

          if (this.units.match(resource)){
            this.economy.request(1, this.units, this.position);  
          }      

        },
        onAttack:    function(resource, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);

        },
        onBroadcast: function(source, msg){},
        onRelease:   function(resource){

          deb("     G: %s onRelease: %s", this, resource);

        },
        onInterval:  function(){

          deb("     G: %s onInterval,  states: %s", this, H.prettify(this.units.states()));

        }
      }
    }

  });

return H; }(HANNIBAL));

