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

    API uses: resourceSupplyMax, resourceSupplyType, resourceSupplyAmount, _template, owner

  */


  function Resource(ent){
    var tpl        = ent._template;
    this.id        = ent.id();
    this.owner     = ent.owner();
    this.found     = false;
    this.consumed  = false;
    this.resources = [this.id];   // make asset gatherable
    this.name      = (tpl.Identity && tpl.Identity.SpecificName) ? tpl.Identity.SpecificName.toLowerCase() : "unknown";
    this.isPrey    = H.Config.data.prey.indexOf(this.name) !== -1;
    this.maxSupply = ent.resourceSupplyMax();
    this.generic   = ent.resourceSupplyType().generic;
    this.specific  = ent.resourceSupplyType().specific;
    this.update();
    // deb("   RES: id: %s name: %s", this.id, this.name);
  }
  Resource.prototype = {
    constructor: Resource,
    update: function(){
      var ent = H.Entities[this.id];
      if (ent){
        this.position = ent.position();
        this.found = this.found ? true : H.Map.isOwnTerritory(this.position) ? true : false;
        this.supply = ent.resourceSupplyAmount();
      } else {
        this.consumed = true;
      }
    },
    log: function(){
      var t = this;
      deb("   RES: %s, %s, type: %s/%s, pos: %s, owner: %s, found: %s",
        t.id, t.supply, t.generic, t.specific, t.position.map(c => ~~c), t.owner, t.found
      );
    }
  };


  H.Resources = (function(){

    var 
      self, 
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
      boot: function(){return (self = this);},
      init: function(){

        var res, type;

        H.each(H.Entities, function(id, ent){
          type = ent.resourceSupplyType(); // return { "generic": type, "specific": subtype };
          if (!!type && type.generic){
            res = resources[type.generic][ent.id()] = new Resource(ent);
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
        tabs   = [   6,     6,    8,    8,    6,    8];

        H.zip(head, tabs, function(h, t){msg += tab(h, t);});
        deb();deb();deb("  RESS:           " + msg);

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
      markFound: function(pos, range){
        generics.forEach(function(generic){
          Object.keys(resources[generic]).forEach(function(id){
            var res = resources[generic][id];
            if (H.Map.distance(pos, res.position) < range){
              res.found = true;
            }            
          });
        });
      },
      nearest: function(item, generic){

        // specs [{generic: 'stone', specific: 'rock'}, {generic: 'stone', specific: 'ruins'}],

        var t0, t1, dis = 1e7, idres, distance, kmeans, tree, trees = [], cid,
            pos = Array.isArray(item) ? item : item.location();

        deb("   RES: looking for nearest '%s' at %s", generic, pos);

        switch (generic){
          case "stone":
          case "metal":
          case "treasure":
            H.each(resources[generic], function(id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed){
                  distance = H.Map.distance(pos, res.position);
                  if (distance < dis){idres = id; dis = distance;}
                }
              } else {
                res.consumed = true;
              }
            });
            deb("   RES: found %s", uneval(resources[generic][idres]));
            return resources[generic][idres] || undefined;
          break;

          case "food.fruit":
            H.each(resources["food"], function(id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed && res.specific === "fruit"){
                  distance = H.Map.distance(pos, res.position);
                  if (distance < dis){idres = id; dis = distance;}
                }
              } else {
                res.consumed = true;
              }
            });
            deb("   RES: found %s", uneval(resources["food"][idres]));
            return resources["food"][idres] || undefined;
          break;

          case "food.meat":
            H.each(resources["food"], function(id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed && res.isPrey){
                  distance = H.Map.distance(pos, res.position);
                  if (distance < dis){idres = id; dis = distance;}
                }
              } else {
                res.consumed = true;
              }
            });
            deb("   RES: found %s", uneval(resources["food"][idres]));
            return resources["food"][idres] || undefined;
          break;

          case "wood":
            H.each(resources.wood, function(id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed){
                  trees.push({x: res.position[0], z: res.position[1], id: id});
                }
              } else {
                res.consumed = true;
              }
            });
            deb("   RES: kmeans: %s trees", trees.length);
            kmeans = new H.AI.KMeans();
            kmeans.k = 3; // map size !!!!
            kmeans.maxIterations = 50;
            kmeans.setPoints(trees);
            kmeans.initCentroids();
            t0 = Date.now();
            kmeans.cluster();
            t1 = Date.now();
            // nearest cluster
            deb("   RES: kmeans:  %s trees, %s cluster, %s msecs", trees.length, kmeans.centroids.length, t1-t0);
            cid = kmeans.centroids.sort(function(a, b){
              var da = (a.x - pos[0]) * (a.x - pos[0]) + (a.z - pos[1]) * (a.z - pos[1]),
                  db = (b.x - pos[0]) * (b.x - pos[0]) + (b.z - pos[1]) * (b.z - pos[1]);
              return da - db;
            })[0];
            // nearest tree from that cluster
            deb("   RES: kmeans: chose cluster %s with %s trees", cid, kmeans.centroids[0].items);
            tree = trees.sort(function(a, b){
              var da = (a.x - cid.x) * (a.x - cid.x) + (a.z - cid.z) * (a.z - cid.z),
                  db = (b.x - cid.x) * (b.x - cid.x) + (b.z - cid.z) * (b.z - cid.z);
              return da - db;
            })[0];
            deb("   RES: kmeans: chose tree: %s, %s", tree.id, uneval(tree));

            return resources.wood[tree.id];
          break;

          default: 
            deb(" ERROR: unknown resource: %s in mearest", generic);

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


