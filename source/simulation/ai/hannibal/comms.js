/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- C O M M U N I C A T I O N -----------------------------------

  Short range communication between citizens


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){

  H.LIB.Comms = function(context){

    H.extend(this, {

      context:  context,

      klass: "comms",

      imports:  [
        "map",
        "query",
        "events",
        "entities",
      ],

      actors: null,   // Map
      raster: null,   // Array

    });

  };


  H.LIB.Comms.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Comms,
    log: function(){
      this.deb("  COMM: %s citizens", this.actors.size);
    },
    serialize: function(){
      return {
        raster: H.deepcopy(this.raster),
        actors: H.deepcopy(this.actors),
      };
    },
    deserialize: function(data){
      if(data){
        this.actors = new Map(data.actors);
        this.raster = data.raster;
      }
      return this;
    },
    finalize: function(){return this;},

    initialize: function(){

      var x, y, size = this.map.gridsize;

      if(this.actors === null){

        this.actors = new Map();
        this.raster = [];
        
        x = size; while(x--){
          this.raster[x] = [];
          y = size; while(y--){
            this.raster[x][y] = [];
          }
        }

        this.update();

      }


      return this;


    },



    activate: function(){

      var actor, x, z;

      this.events.on("UnitDestroyed", msg => {

        actor = this.actors.get(msg.id);

        if(actor){
          [x, z] = actor;
          this.actors.delete(msg.id);
          H.delete(this.raster[x][z], id => id === msg.id);
        }

        this.deb("  COMM: removed actor: %s", msg.id);

      });

      return this;

    },
    
    tick: function(secs, ticks){

      var t0 = Date.now();

      this.secs = secs;
      this.ticks = ticks;

      this.update();

      return Date.now() - t0;

    },

    update: function(){

      var 
        t0 = Date.now(), 
        actor, oldx, oldz, curx, curz, cntold = 0, cntnew = 0;

      this.query("citizen CONTAIN INGAME").forEach(node => {
        
          // current coords
          [curx, curz] = this.map.mapPosToGridCoords(this.entities[node.id].position());

          actor = this.actors.get(node.id);

          // actor known
          if (actor){

            cntold += 1;

            [oldx, oldz] = actor;

            // with new position ?
            if (oldx !== curx || oldz !== curz){

              // update in raster
              H.delete(this.raster[oldx][oldz], id => id === node.id);
              this.raster[curx][curz].push(node.id);
              
              // update in actors
              actor[0] = curx;
              actor[1] = curz;
            
            // did not move, nothing to do 
            } else {return;}

          // actor unknown
          } else {

            cntnew += 1;

            // update in actors
            this.actors.set(node.id, [curx, curz]);

            // update raster
            this.raster[curx][curz].push(node.id);

          }

        });

      // this.deb("  COMM: update took %s msecs (%s/%s/%s)", Date.now() - t0, cntnew, cntold, this.actors.size);

    },

    query: function(){

    },


  });

return H; }(HANNIBAL));
