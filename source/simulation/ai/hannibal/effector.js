/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, uneval */

/*--------------- E F F E C T O R S -------------------------------------------

  Interface to the current engine (0AD or simulator)



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Effector = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "map",
        "templates",
      ],

    });

    // copy actual effectors
    H.extend(this, H.LIB.Effector[context.connector]);

  };

  H.LIB.Effector.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Effector,
    log: function(){
      this.deb();
      this.deb("   EFF: connector: '%s'", this.connector);        
    }
  });

  H.LIB.Effector.engine = {

    // Engine.PostCommand(PlayerID,{"type": "set-shading-color", "entities": [ent], "rgb": [0.5,0,0]});


    // m.BaseAI.prototype.chatTeam = function(message)
    // {
    //   Engine.PostCommand(PlayerID,{"type": "aichat", "message": "/team " +message});
    // };
    // m.BaseAI.prototype.chatEnemies = function(message)
    // {
    //   Engine.PostCommand(PlayerID,{"type": "aichat", "message": "/enemy " +message});
    // };

    // case 'stop-production' : Engine.PostCommand(PID,{ 
    //   "type": cmd, "entity": id 
    //   // "id": queue[i].id ????
    // }); break;

    // case 'barter' : Engine.PostCommand(PID, {
    //     "type":   cmd, 
    //     "sell":   order.barter.sellType, 
    //     "buy":    order.barter.buyType, 
    //     "amount": order.barter.amount 
    // }); break;

    // case 'setup-trade-route' :
    //   // queue.RemoveBatch(cmd.id);
    // break;
    // case 'set-trading-goods' :
    //   // queue.RemoveBatch(cmd.id);
    // break;

    dumpgrid: function(name, grid, threshold){
      var 
        id = this.id, 
        map = this.context.launcher.map,
        filename = H.format("%s-%s-%s.png", id, map, name);
      Engine.DumpImage(filename, grid.toArray(), grid.width, grid.height, threshold);    
    },
    dumparray: function(name, array, width, height, threshold){
      var 
        id = this.id, 
        map = this.context.launcher.map,
        filename = H.format("%s-%s-%s.png", id, map, name);
      Engine.DumpImage(filename, array, width, height, threshold);    
    },
    execute: function(command){
      Engine.PostCommand(this.id, command);
    },
    quit:  function(){
      this.execute({type: "quit"});
    },
    chat:  function(msg){
      this.execute({type: "chat", message: msg});
    },
    
    format: function(who, what){

      this.deb("   EFF: format: %s", uneval(arguments));

      // Scatter, Line Open, Box, passive, standground

      if (who.length && H.contains(H.Data.formations, what)){

        Engine.PostCommand(this.id, {type: "formation", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { this.deb("   EFF: ignored format : %s", uneval(arguments)); }

    },

    stance: function(who, what){

      // deb("   EFF: stance: %s", uneval(arguments));

      if (who.length && H.contains(H.Data.stances, what)){

        Engine.PostCommand(this.id, {type: "stance", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { this.deb("   EFF: ignored stance: %s", uneval(arguments)); }

    },

    flee: function(who, whom){

      this.deb("   EFF: flee: %s", uneval(arguments));

      var posWho, posWhom, direction, distance;

      if (who.length && whom.length) {

        posWho       = this.map.getCenter(who);
        posWhom      = this.map.getCenter(whom);
        direction    = [posWho[0] - posWhom[0], posWho[1] - posWhom[1]];
        distance     = H.API.VectorDistance(posWhom, posWho);
        direction[0] = (direction[0] / distance) * 8;
        direction[1] = (direction[1] / distance) * 8;
        
        Engine.PostCommand(this.id, {type: "walk", 
          entities: who, 
          x: posWho[0] + direction[0] * 5, 
          z: posWho[1] + direction[1] * 5, 
          queued: false
        });

      } else { this.deb("   EFF: ignored flee: %s", uneval(arguments)); }

    },

    move: function(who, where){

      // this.deb("   EFF: move: %s", uneval(arguments));

      //TODO: make this queue

      if (who.length && where.length === 2){

        Engine.PostCommand(this.id, {type: "walk", 
          entities: who, 
          x: where[0], 
          z: where[1], 
          queued: false 
        });

      } 
      // else { this.deb("   EFF: ignored move %s", uneval(arguments));}

    },

    destroy: function(who){

      this.deb("   EFF: destroy: %s", uneval(arguments));

      if (who.length){

        Engine.PostCommand(this.id, {type: "delete-entities", 
          entities: who
        });

      } else { this.deb("   EFF: ignored destroy who: %s", uneval(arguments)); }

    },

    garrison:     function(who, where){

      this.deb("   EFF: garrison: %s", uneval(arguments));

      if (who.length && H.isInteger(where)){

        Engine.PostCommand(this.id, {type: "garrison", 
          entities: who,       // array
          target:   where,     // id
          queued:   false
        });

      } else { this.deb("   EFF: ignored garrison: %s", uneval(arguments)); }

    },

    collect: function (who, what){

      this.deb("   EFF: collect: %s", uneval(arguments));

      if (what.length && who.length){

        Engine.PostCommand(this.id, {type: "gather", 
          entities: who, 
          target:   what[0], 
          queued:   false
        });

        what.slice(1).forEach(function(id){
          Engine.PostCommand(this.id, {type: "gather", 
            entities: who, 
            target:   id, 
            queued:   true
          });

        });

        H.Resources.consume(what);

      } else { this.deb("   EFF: ignored collect: %s", uneval(arguments)); }

    },

    skim: function (who, what){

      this.deb("   EFF: skim: %s", uneval(arguments));

      if (who.length, what){

        who.forEach(function(id){

          var [x, z] = H.Entities[id].position();

          Engine.PostCommand(this.id, {type: "gather-near-position", 
            entities: [id], 
            x: x, 
            z: z, 
            resourceType: what, 
            resourceTemplate: "", 
            queued:   false
          });

        });

      } else {this.deb("   EFF: ignored skim:", uneval(arguments)); }

      // case "gather-near-position":
      //   GetFormationUnitAIs(entities, player).forEach(function(cmpUnitAI) {
      //     cmpUnitAI.GatherNearPosition(cmd.x, cmd.z, cmd.resourceType, cmd.resourceTemplate, cmd.queued);
      //   });
      //   break;

    },

    gather: function(who, what){

      this.deb("   EFF: gather: %s", uneval(arguments));

      if (who.length && what.length){

        if (what.length === 1){

          // all units gather this
          Engine.PostCommand(this.id, {type: "gather", 
            entities: who,      // array
            target:   what[0],  // int
            queued:   false
          });

        } else {

          // let units gather in queue
          who.forEach(whoid => {

            what = H.rotate(what, 1);

            what.forEach( (whatid, index) => {

              Engine.PostCommand(this.id, {type: "gather", 
                entities: [whoid],   // array
                target:   whatid,    // int
                queued:   index > 0
              });

            });

          });

        }

      } else { this.deb("   EFF: ignored gather: %s", uneval(arguments)); }

    },

    repair: function(who, what){

      //TODO: make deal with large whos

      // deb("   EFF: repair: %s", uneval(arguments));

      if (who.length && what.length){

        what.forEach( (id, index) => {

          Engine.PostCommand(this.id, {type: "repair", 
            entities: who,  // Array
            target:   id,   // Int
            autocontinue: true, 
            queued: (index > 0)
          });

        });


      } else { this.deb("   EFF: ignored repair: %s, who, what", uneval(arguments));}

    },

    train: function(who, what, amount, metadata){

      this.deb("   EFF: train: %s, id: %s", uneval(arguments), uneval(this.id));

      if (who.length && this.templates[what] && amount){

        Engine.PostCommand(this.id, {type: "train", 
          count:    amount,
          entities: who, // array
          template: what,
          metadata: metadata || {} //{order: order.id}
        }); 

      } else { this.deb("   EFF: ignored train: %s", uneval(arguments)); }

    },

    construct: function(who, what, pos, metadata){

      this.deb("   EFF: construct: %s", uneval(arguments));

      if (who.length && H.isInteger(who[0]) && this.templates[what] && pos.length >= 2){

        Engine.PostCommand(this.id, { type: "construct",
          entities:     who, // array
          template:     what,
          x:            pos[0], 
          z:            pos[1],
          angle:        pos[2],
          autorepair:   false,   //??
          autocontinue: false,
          queued:       false,
          metadata:     metadata || {} // {order: order.id}
        });  

      } else { this.deb("   EFF: ignored construct: %s", uneval(arguments)); }

    },

    research: function(who, what){

      this.deb("   EFF: research: %s", uneval(arguments));

      if (H.isInteger(who) && H.TechTemplates[what]){

        Engine.PostCommand(this.id, { type: "research",
          entity:   who, 
          template: what 
        }); 

      } else { this.deb("   EFF: ignored research: %s", uneval(arguments)); }

    },


  };

  H.LIB.Effector.simulator = {

    move: function(who, where){
      if (who.length && where.length === 2){
        who.forEach(id => {
          this.simulation.entities[id].target = where;
          this.simulation.entities[id].path = null;
        });
      } 
    },

    destroy: function(who){
      if (who.length){
        who.forEach(id => this.simulation.destroy(id));
      }
    },    

  };

return H; }(HANNIBAL));
