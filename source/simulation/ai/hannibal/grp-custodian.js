/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {

    "g.custodian" : {

      /*
        a group without units 

        Behaviour: 
          to maintain a shared structure
          to organize repair
          to rebuild on destroy, if any users
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "test group",   // text field for humans 
      civilisations:  ["*"],          // 
      interval:       10,             // call onInterval every x ticks
      parent:         "",             // inherit useful features

      position:       null,           // refers to the coords of the group's position/activities
      structure:      [],             // still unkown asset, inits in Groups.appoint

      listener: {
        onLaunch: function(options){
          deb("     G: launch %s %s", this, uneval(options));
          this.options = options;
        },
        onConnect: function(listener){
          deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
          this.structure.users.push(listener);
        },
        onDisConnect: function(listener){
          deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
          H.remove(this.structure.users, listener);
        },
        onAssign: function(asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          if (this.structure.match(asset)){
            deb("     G: %s structure matches asset: %s", this, asset);
          } else {
            deb("     G: %s structure does NOT matches asset: %s", this, asset);
            logObject(this, "this.onAssign");
          }

          this.position = asset;

          this.structure.users.forEach(function(listener){
            listener.onAssign(asset);
          });

        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          // logObject(this.position, "this.position: " + this.position);

          if (this.structure.users.length > 0){
            this.structure.users.forEach(function(listener){
              listener.onDestroy(asset);
            });
            this.economy.request(1, this.structure, this.structure);
          } else {
            deb("     G: ignored destroyed asset: %s", asset.name);
          }

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);
          
          this.structure.users.forEach(function(listener){
            listener.onAttack(asset, enemy, type, damage);
          });

        },
        onBroadcast: function(){},
        onInterval: function(){
          // currently not much to see here
          // deb("     G: interval %s, states: %s", this.name, H.prettify(this.structure.states()));
        }
      }

    }

  });

return H; }(HANNIBAL));

