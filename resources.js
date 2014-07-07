/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- R E S O U R C E S  ------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  /*
treasure  
wood.tree  
wood.ruins  
stone.ruins  
stone.rock  
metal.ore  
food.meat  
food.grain  
food.fruit  
food.fish
  */


  function Resource(ent){
    this.id    = ent.id();
    this.resources = [this.id];   // asset gatherable
    this.owner = ent.owner();
    this.found = false;
    this.consumed = false;
    this.update();
  }
  Resource.prototype = {
    constructor: Resource,
    update: function(){
      var ent = H.Entities[this.id];
      this.supply   = ent.resourceSupplyMax();
      this.generic  = ent.resourceSupplyType().generic;
      this.specific = ent.resourceSupplyType().specific;
      this.position = ent.position();
    },
    log: function(){
      var t = this;
      deb("   RES: %s, %s, type: %s/%s, pos: %s, owner: %s, found: %s",
        t.id, t.supply, t.generic, t.specific, t.position.map(c => ~~c), t.owner, t.found
      );
    }
  };


  H.Resources = (function(){

    var self, 
        generics  = ["food", "wood", "metal", "stone", "treasure"],
        resources = {
          wood:  {},
          food:  {},
          metal: {},
          stone: {},
          treasure: {},
        },
        stats = {
          wood: {    ents: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0},
          food: {    ents: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0},
          metal: {   ents: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0},
          stone: {   ents: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0},
          treasure: {ents: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0},
        };

    return {
      boot: function(){return self = this;},
      init: function(){

        var res, type;

        H.each(H.Entities, function(id, ent){
          type = ent.resourceSupplyType(); // return { "generic": type, "specific": subtype };
          if (!!type && type.generic){
            res = resources[type.generic][ent.id()] = new Resource(ent);
            if (H.Map.isOwnTerritory(res.position)){
              res.found = true;
            }
          }
        });

        H.each(stats, function(generic, stat){
          H.each(resources[generic], function(id, res){

            if (H.Entities[res.id] && !res.consumed){
              stat.ents      += 1;
              stat.found     += res.found ? 1 : 0;
              stat.available += res.found ? res.supply : 0;
              stat.total     += res.supply;
            } else if (!H.Entities[res.id] && !res.consumed){
              res.consumed   = true;
              stat.consumed += res.supply;
              stat.depleted += 1;
            }

          });
        });

        this.report();

      },
      report: function(){

        var tab = H.tab, head, props, tabs, msg = "";
        head   = "ents, found, avail, total, depl, cons".split(", ");
        props  = "ents, found, available, total, depleted, consumed".split(", ");
        tabs   = [   6,     6,    6,    6,    6,    6];

        H.zip(head, tabs, function(h, t){msg += tab(h, t);});
        deb();deb();deb("RESOUR:           " + msg);

        H.each(stats, function(stat, data){
          msg = "";
          H.zip(props, tabs, function(p, t){
            msg += tab(data[p], t);
          });    
          deb("      : %s: %s", tab(stat, 8), msg);
        });

      },
      consume: function(ids){
        var res;
        ids.forEach(function(id){
          generics.forEach(function(generic){
            res = resources[generic][id];
            if(res){
              res.consumed = true;
              stats[generic].consumed += res.supply;
              stats[generic].depleted += 1;
            }
          });
        });
      },
      nearest: function(item, generic){

        // specs [{generic: 'stone', specific: 'rock'}, {generic: 'stone', specific: 'ruins'}],

        var dis = 1e7, idres, distance, kmeans, tree, trees = [], cid,
            pos = Array.isArray(item) ? item : item.location();

        switch (generic){
          case "stone":
          case "metal":
          case "treasure":
          case "food":
            H.each(resources[generic], function(id, res){
              if (res.found && !res.consumed){
                distance = H.Map.distance(pos, res.position);
                if (distance < dis){idres = id; dis = distance;}
              }
            });
            return resources[idres] || undefined;

          case "wood":
            H.each(resources.wood, function(id, res){
              if (res.found && !res.consumed){
                trees.push({x: res.position[0], z: res.position[1], id: id});
              }
            });
            kmeans = new H.AI.KMeans();
            kmeans.k = 3; // map size !!!!
            kmeans.maxIterations = 50;
            kmeans.setPoints(trees);
            kmeans.initCentroids();
            kmeans.cluster();
            // nearest cluster
            cid = kmeans.centroids.sort(function(a, b){
              var da = (a.x - pos[0]) * (a.x - pos[0]) + (a.z - pos[1]) * (a.z - pos[1]),
                  db = (b.x - pos[0]) * (b.x - pos[0]) + (b.z - pos[1]) * (b.z - pos[1]);
              return da - db;
            })[0];
            // nearest tree from that cluster
            tree = trees.sort(function(a, b){
              var da = (a.x - cid.x) * (a.x - cid.x) + (a.z - cid.z) * (a.z - cid.z),
                  db = (b.x - cid.x) * (b.x - cid.x) + (b.z - cid.z) * (b.z - cid.z);
              return da - db;
            })[0];

            return resources[tree.id];
        }
      },      
      update: function(generic){

        switch (generic){
          case "wood" : 
          break;
        }

      },

    };




  }()).boot();



return H; }(HANNIBAL));


