/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- R E S O U R C E S  ------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

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


  function Resource(data){

    //TODO remove API access, owner, template.Identity, resourceSupplyMax

    H.extend(this, data, {
      id:       data.id,
      found:    false,
      consumed: false,
    });

    this.initialize();

  }

  Resource.prototype = {
    constructor: Resource,
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    serialize: function(){
      return {
        id: this.id,
        found: this.found,
        consumed: this.consumed,
      };
    },
    initialize: function(){

      var tpl, name, ent = this.entities[this.id];

      if (ent){

        tpl  = ent._template;
        name = (tpl.Identity && tpl.Identity.SpecificName) ? tpl.Identity.SpecificName.toLowerCase() : "unknown";

        H.extend(this, {
          name:      name,
          owner:     ent.owner(),
          position:  ent.position(),
          resources: [this.id],   // make asset gatherable
          isPrey:    this.config.data.prey.indexOf(name) !== -1,
          maxSupply: ent.resourceSupplyMax(),
          found:     this.found ? true : this.map.isOwnTerritory(ent.position()) ? true : false,
          supply:    ent.resourceSupplyAmount(),
        });

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


  H.LIB.Resources = function(context){

    var stats = {entities: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0};

    H.extend(this, {

      name:  "resources",
      context:  context,
      imports:  [
        "map",
        "config",
        "entities",
      ],

      resources: {
        food:  {
          meat:  {stats: H.deepcopy(stats)},
          grain: {stats: H.deepcopy(stats)},
          fruit: {stats: H.deepcopy(stats)},
          fish:  {stats: H.deepcopy(stats)},
          whale: {stats: H.deepcopy(stats)},
        },
        wood:  {
          tree:  {stats: H.deepcopy(stats)},
          ruins: {stats: H.deepcopy(stats)},
        },
        metal: {
          ore:   {stats: H.deepcopy(stats)},
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
    
    }); 

  };

  H.LIB.Resources.prototype = {
    constructor: H.LIB.Resources,
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      return {
        resources: H.deepcopy(this.resources),
      };
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
      this.eachStats(function(generic, specific, stats){
        msg = "";
        H.zip(props, tabs, function(p, t){
          msg += tab(stats[p], t);
        });    
        type = H.tab(generic + "." + specific, 13);
        deb("      : %s: %s", type, msg);
      });

    },
    activate: function(){},
    initialize: function(){

      var res, type, counter = 0, t0 = Date.now();

      deb();deb();deb("   RES: init -----------");

      H.each(this.entities, (id, ent) => {
        
        if ((type = ent.resourceSupplyType())){ // returns { "generic": type, "specific": subtype };
          //TODO: whales
          if (this.resources[type.generic][type.specific]){
            counter += 1;
            res = this.resources[type.generic][type.specific][ent.id()] = new Resource({
              id:       id, 
              map:      this.map,
              config:   this.config,
              context:  this.context,
              generic:  type.generic,
              specific: type.specific,
              entities: this.entities,
            });
          } else {
            deb("ERROR : unknown resource type %s %s %s", type.generic, type.specific, ent._templateName);
          }

        }

      });

      this.eachAll(function(generic, specific, stats, id, res){

        if (this.entities[id] && !res.consumed){
          stats.entities  += 1;
          stats.found     += res.found ? 1 : 0;
          stats.available += res.found ? res.supply : 0;
          stats.total     += res.supply;
        } else if (!this.entities[id] && !res.consumed){
          res.consumed   = true;
          stats.consumed += res.supply;
          stats.depleted += 1;
        }

      });

      deb("     R: found %s, %s msecs", counter, Date.now() - t0);

    },
    availability: function( /* arguments */ ){

        var 
          types = H.toArray(arguments), 
          res = {food: 0, wood: 0, stone: 0, metal: 0};

        types.forEach(type => this.eachType(type, (generic, specific, id, resource) => {
          resource.update();
          if (resource.found){
            if (generic === "treasure"){
              res[specific] += resource.supply;              
            } else {
              res[generic] += resource.supply;
            }
          }
        }));

        return res;

    },
    eachType: function(type, fn){

      var 
        types     = type.split("."),
        generic   = types[0],
        specific  = types[1] || "",
        resources = this.resources;

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

      H.each(this.resources, function(generic, genentry){
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

      H.each(this.resources, function(generic, genentry){
        H.each(genentry, function(specific, specentry){
          fn(generic, specific, specentry.stats);
        });
      });

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
      this.eachAll(function(generic, specific, stats, id, res){
        if (this.map.distance(pos, res.position) < range){
          res.found = true;
        }            
      });
    },
    nearest: function(loc, type){

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
        case "food.fish":  // untested
          this.eachType(type, (generic, specific, id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed){
                distance = this.map.distance(pos, res.position);
                if (distance < dis){resFound = res; dis = distance;}
              }
            } else {
              res.consumed = true;
            }
          });
          resource = resFound;
        break;

        case "food.meat": // has prey check
          this.each(this.resources.food, (id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed && res.isPrey){
                distance = this.map.distance(pos, res.position);
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
          this.eachType(type, (generic, specific, id, res) => {
            if (this.entities[id]){
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
  
  };

return H; }(HANNIBAL));
