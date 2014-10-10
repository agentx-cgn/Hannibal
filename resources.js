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


  function Resource(ent, generic, specific){
    var tpl        = ent._template;
    this.id        = ent.id();
    this.owner     = ent.owner();
    this.found     = false;
    this.consumed  = false;
    this.resources = [this.id];   // make asset gatherable
    this.name      = (tpl.Identity && tpl.Identity.SpecificName) ? tpl.Identity.SpecificName.toLowerCase() : "unknown";
    this.isPrey    = H.Config.data.prey.indexOf(this.name) !== -1;
    this.maxSupply = ent.resourceSupplyMax();
    this.generic   = generic;
    this.specific  = specific;
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
      stats = {entities: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0},
      resources = {
        food:  {
          meat:  {stats: H.deepcopy(stats)},
          grain: {stats: H.deepcopy(stats)},
          fish:  {stats: H.deepcopy(stats)},
          whale: {stats: H.deepcopy(stats)},
        },
        wood:  {
          tree:  {stats: H.deepcopy(stats)},
          ruins: {stats: H.deepcopy(stats)},
        },
        metal: {
          ore:   {stats: H.deepcopy(stats)}
        },
        stone: {
          ruins: {stats: H.deepcopy(stats)},
          rock:  {stats: H.deepcopy(stats)},
        },
        treasure: {
          food:  {stats: H.deepcopy(stats)},
          wood:  {stats: H.deepcopy(stats)},
          stone: {stats: H.deepcopy(stats)},
          metal: {stats: H.deepcopy(stats)},
        },
      },
      generics  = H.attribs[resources];

    return {
      boot: function(){return (self = this);},
      eachType: function(type, fn){

        var 
          types    = type.split("."),
          generic  = types[0],
          specific = types[1] || "";

        if (resources[generic] && specific === ""){

          H.each(resources[generic], function(specific, specentry){
            H.each(specentry, function(id, resource){
              if (id !== "stats"){
                fn(generic, specific, id, resource);
              }
            });
          });

        } else if (resources[generic][specific]){

          H.each(resources[generic][specific], function(id, resource){
            if (id !== "stats"){
              fn(generic, specific, id, resource);
            }
          });

        } else {
          deb("ERROR : res.each: type: '%s' unknown", type);

        }

      },
      eachAll: function(fn){

        H.each(resources, function(generic, genentry){
          H.each(genentry, function(specific, specentry){
            H.each(specentry, function(id, resource){
              if (id !== "stats"){
                fn(generic, specific, specentry.stats, id, resource);
              }
            });
          });
        });

      },
      eachStats: function(fn){

        H.each(resources, function(generic, genentry){
          H.each(genentry, function(specific, specentry){
            fn(generic, specific, specentry.stats);
          });
        });

      },
      log: function(){

        var 
          tab = H.tab, type, msg = "",
          head   = "ents,     found, avail, total, depl, cons".split(", "),
          props  = "entities, found, available, total, depleted, consumed".split(", "),
          tabs   = [   6,     6,    8,    8,    6,    8];  

        // header
        H.zip(head, tabs, function(h, t){msg += tab(h, t);});
        deb("     R:                " + msg);

        // lines
        H.Resources.eachStats(function(generic, specific, stats){
          msg = "";
          H.zip(props, tabs, function(p, t){
            msg += tab(stats[p], t);
          });    
          type = H.tab(generic + "." + specific, 13);
          deb("      : %s: %s", type, msg);
        });

      },
      init: function(){

        var res, type, counter = 0, t0 = Date.now();

        deb();deb();deb("   RES: init -----------");

        H.each(H.Entities, function(id, ent){
          
          if ((type = ent.resourceSupplyType())){ // returns { "generic": type, "specific": subtype };
            //TODO: whales
            if (resources[type.generic][type.specific]){
              counter += 1;
              res = resources[type.generic][type.specific][ent.id()] = new Resource(ent);
            } else {
              deb("ERROR : unknown resource type %s %s %s", type.generic, type.specific, ent._templateName);
            }

          }

        });

        H.Resources.eachAll(function(generic, specific, stats, id, res){

          if (H.Entities[id] && !res.consumed){
            stats.entities  += 1;
            stats.found     += res.found ? 1 : 0;
            stats.available += res.found ? res.supply : 0;
            stats.total     += res.supply;
          } else if (!H.Entities[id] && !res.consumed){
            res.consumed   = true;
            stats.consumed += res.supply;
            stats.depleted += 1;
          }

        });

        deb("     R: found %s, %s msecs", counter, Date.now() - t0);

      },
      consume: function(ids){ //TODO
        H.Resources.eachAll(function(generic, specific, stats, id, res){
          if (H.contains(ids, id)){
            res.consumed = true;
            stats.consumed += res.supply;
            stats.depleted += 1;
          }
        });
      },
      markFound: function(pos, range){ //TODO
        H.Resources.eachAll(function(generic, specific, stats, id, res){
          if (H.Map.distance(pos, res.position) < range){
            res.found = true;
          }            
        });
      },
      nearest: function(loc, type){

        // specs [{generic: 'stone', specific: 'rock'}, {generic: 'stone', specific: 'ruins'}],

        var 
          t0, t1, resource, distance, kmeans, trees, cid,
          resFound = null, 
          dis = 1e7, 
          pos = Array.isArray(loc) ? loc : loc.location();

        // deb("   RES: looking for nearest '%s' at %s", generic, pos);

        switch (type){
          case "stone":
          case "stone.ruin":
          case "stone.rock":
          case "metal":
          case "metal.ore":
          case "treasure":
          case "treasure.food":
          case "treasure.wood":
          case "treasure.metal":
          case "treasure.stone":
          case "food.fruit":
          case "food.grain": // untested
          case "food.whale": // untested
          case "food.fish": // untested
            H.Resources.eachType(type, function(generic, specific, id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed){
                  distance = H.Map.distance(pos, res.position);
                  if (distance < dis){resFound = res; dis = distance;}
                }
              } else {
                res.consumed = true;
              }
            });
            resource = resFound;
          break;

          case "food.meat": // has prey check
            H.Resources.each(resources.food, function(id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed && res.isPrey){
                  distance = H.Map.distance(pos, res.position);
                  if (distance < dis){resFound = res; dis = distance;}
                }
              } else {
                res.consumed = true;
              }
            });
            resource = resFound;
          break;

          case "wood":
          case "wood.ruins":
          case "wood.tree":
            trees = [];
            H.Resources.eachType(type, function(generic, specific, id, res){
              if (H.Entities[id]){
                if (res.found && !res.consumed){
                  trees.push({x: res.position[0], z: res.position[1], id: id, res: res});
                }
              } else {
                res.consumed = true;
              }
            });
            if (!trees.length){
              deb("   RES: kmeans: 0 trees");
            } else {
              kmeans = new H.AI.KMeans();
              kmeans.k = 3; // map size !!!!
              kmeans.maxIterations = 50;
              kmeans.setPoints(trees);
              kmeans.initCentroids();
              t0 = Date.now();
              kmeans.cluster();
              t1 = Date.now();
              // nearest cluster
              deb("   RES: kmeans: %s trees, %s cluster, %s msecs", trees.length, kmeans.centroids.length, t1-t0);
              // TODO: filter out centroids without trees
              cid = kmeans.centroids.sort(function(a, b){
                var da = (a.x - pos[0]) * (a.x - pos[0]) + (a.z - pos[1]) * (a.z - pos[1]),
                    db = (b.x - pos[0]) * (b.x - pos[0]) + (b.z - pos[1]) * (b.z - pos[1]);
                return da - db;
              })[0];
              // nearest tree from that cluster
              deb("   RES: kmeans: chose cluster %s with %s trees", cid, kmeans.centroids[0].items);
              trees.sort(function(a, b){
                var da = (a.x - cid.x) * (a.x - cid.x) + (a.z - cid.z) * (a.z - cid.z),
                    db = (b.x - cid.x) * (b.x - cid.x) + (b.z - cid.z) * (b.z - cid.z);
                return da - db;
              });
            }
            resource = trees.length ? trees[0].res : null;
          break;

          default: 
            deb("ERROR : unknown resource type: %s in nearest", type);

        }

        // deb("   RES: %s / %s at %s", generic, uneval(resource), pos); // TODO too long
        return resource;

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


