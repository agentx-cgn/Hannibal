/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, uneval */

/*--------------- E F F E C T O R S -------------------------------------------

  Interface to the current engine (0AD or simulator)



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){


  // Engine.PostCommand(PlayerID,{"type": "set-shading-color", "entities": [ent], "rgb": [0.5,0,0]});

  H.LIB.Effector = function(config){

    // deb("eff: %s", uneval(config));

    H.extend(this, config, H.LIB.Effector[config.connector], {
      log: function(){
        deb();deb("EFFCTR: connector: '%s'", this.connector);        
      }
    });

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

  H.LIB.Effector.engine = {

    dumpgrid: function(name, grid, threshold){
      Engine.DumpImage(H.APP.map + "-" + name + ".png", grid.toArray(), grid.width, grid.height, threshold);    
    },
    dumparray: function(name, array, width, height, threshold){
      Engine.DumpImage(H.APP.map + "-" + name + ".png", array, width, height, threshold);    
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

    // m.BaseAI.prototype.chatTeam = function(message)
    // {
    //   Engine.PostCommand(PlayerID,{"type": "aichat", "message": "/team " +message});
    // };
    // m.BaseAI.prototype.chatEnemies = function(message)
    // {
    //   Engine.PostCommand(PlayerID,{"type": "aichat", "message": "/enemy " +message});
    // };
    
    format: function(who, what){

      deb("   EFF: format: %s", uneval(arguments));

      // Scatter, Line Open, Box, passive, standground

      if (who.length && H.contains(H.Data.formations, what)){

        Engine.PostCommand(H.Bot.id, {type: "formation", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { deb("   EFF: ignored format : %s", uneval(arguments)); }

    },

    stance: function(who, what){

      // deb("   EFF: stance: %s", uneval(arguments));

      if (who.length && H.contains(H.Data.stances, what)){

        Engine.PostCommand(H.Bot.id, {type: "stance", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { deb("   EFF: ignored stance: %s", uneval(arguments)); }

    },

    flee: function(who, whom){

      deb("   EFF: flee: %s", uneval(arguments));

      var posWho, posWhom, direction, distance;

      if (who.length && whom.length) {

        posWho       = H.Map.getCenter(who);
        posWhom      = H.Map.getCenter(whom);
        direction    = [posWho[0] - posWhom[0], posWho[1] - posWhom[1]];
        distance     = H.API.VectorDistance(posWhom, posWho);
        direction[0] = (direction[0] / distance) * 8;
        direction[1] = (direction[1] / distance) * 8;
        
        Engine.PostCommand(H.Bot.id, {type: "walk", 
          entities: who, 
          x: posWho[0] + direction[0] * 5, 
          z: posWho[1] + direction[1] * 5, 
          queued: false
        });

      } else { deb("   EFF: ignored flee: %s", uneval(arguments)); }

    },

    move: function(who, where){

      // deb("   EFF: move: %s", uneval(arguments));

      if (who.length && where.length === 2){

        Engine.PostCommand(H.Bot.id, {type: "walk", 
          entities: who, 
          x: where[0], 
          z: where[1], 
          queued: false 
        });

      } 
      // else { deb("   EFF: ignored move %s", uneval(arguments));}

    },

    destroy: function(who){

      deb("   EFF: destroy: %s", uneval(arguments));

      if (who.length){

        Engine.PostCommand(H.Bot.id, {type: "delete-entities", 
          entities: who
        });

      } else { deb("   EFF: ignored destroy who: %s", uneval(arguments)); }

    },

    garrison:     function(who, where){

      deb("   EFF: garrison: %s", uneval(arguments));

      if (who.length && H.isInteger(where)){

        Engine.PostCommand(H.Bot.id, {type: "garrison", 
          entities: who,       // array
          target:   where,     // id
          queued:   false
        });

      } else { deb("   EFF: ignored garrison: %s", uneval(arguments)); }

    },

    collect: function (who, what){

      deb("   EFF: collect: %s", uneval(arguments));

      if (what.length && who.length){

        Engine.PostCommand(H.Bot.id, {type: "gather", 
          entities: who, 
          target:   what[0], 
          queued:   false
        });

        what.slice(1).forEach(function(id){
          Engine.PostCommand(H.Bot.id, {type: "gather", 
            entities: who, 
            target:   id, 
            queued:   true
          });

        });

        H.Resources.consume(what);

      } else { deb("   EFF: ignored collect: %s", uneval(arguments)); }

    },

    skim: function (who, what){

      deb("   EFF: skim: %s", uneval(arguments));

      if (who.length, what){

        who.forEach(function(id){

          var [x, z] = H.Entities[id].position();

          Engine.PostCommand(H.Bot.id, {type: "gather-near-position", 
            entities: [id], 
            x: x, 
            z: z, 
            resourceType: what, 
            resourceTemplate: "", 
            queued:   false
          });

        });

      } else {deb("   EFF: ignored skim:", uneval(arguments)); }

      // case "gather-near-position":
      //   GetFormationUnitAIs(entities, player).forEach(function(cmpUnitAI) {
      //     cmpUnitAI.GatherNearPosition(cmd.x, cmd.z, cmd.resourceType, cmd.resourceTemplate, cmd.queued);
      //   });
      //   break;

    },

    gather: function(who, what){

      // deb("   EFF: gather: %s", uneval(arguments));

      if (who.length && H.isInteger(what)){

        Engine.PostCommand(H.Bot.id, {type: "gather", 
          entities: who, 
          target:   what, 
          queued:   false
        });

      } else { deb("   EFF: ignored gather: %s", uneval(arguments)); }

    },

    repair: function(who, what){

      // deb("   EFF: repair: %s", uneval(arguments));

      if (who.length && H.isInteger(what)){

        Engine.PostCommand(H.Bot.id, {type: "repair", 
          entities: who,  // Array
          target:   what, // Int
          autocontinue: true, 
          queued: false
        });

      } else { deb("   EFF: ignored repair: %s, who, what", uneval(arguments));}

    },

    train: function(who, what, amount, meta){

      deb("   EFF: train: %s", uneval(arguments));

      if (who.length && H.Templates[what] && amount){

        Engine.PostCommand(H.Bot.id, {type: "train", 
          count: amount,
          entities: who, // array
          template: what,
          metadata: meta || {} //{order: order.id}
        }); 

      } else { deb("   EFF: ignored train: %s", uneval(arguments)); }

    },

    construct: function(who, what, pos, meta){

      deb("   EFF: construct: %s", uneval(arguments));

      if (who.length && H.isInteger(who[0]) && H.Templates[what] && pos.length >= 2){

        Engine.PostCommand(H.Bot.id, { type: "construct",
          entities:     who, // array
          template:     what,
          x:            pos[0], 
          z:            pos[1],
          angle:        pos[2],
          autorepair:   false,   //??
          autocontinue: false,
          queued:       false,
          metadata:     meta || {} // {order: order.id}
        });  

      } else { deb("   EFF: ignored construct: %s", uneval(arguments)); }

    },

    research: function(who, what){

      deb("   EFF: research: %s", uneval(arguments));

      if (H.isInteger(who) && H.TechTemplates[what]){

        Engine.PostCommand(H.Bot.id, { type: "research",
          entity:   who, 
          template: what 
        }); 

      } else { deb("   EFF: ignored research: %s", uneval(arguments)); }

    },


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

  };


return H; }(HANNIBAL));

