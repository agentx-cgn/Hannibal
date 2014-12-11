/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval, logObject */

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

    H.extend(this, {
      klass:    "resource",
      found:    false,
      consumed: false,
    }, data);

    if (!this.entities || !this.map){
      logObject(this);
    }

  }

  Resource.prototype = {
    constructor: Resource,
    log: function(){
      var t = this;
      deb("   RES: %s, %s, type: %s/%s, pos: %s, owner: %s, found: %s",
        t.id, t.supply, t.generic, t.specific, t.position.map(c => ~~c), t.owner, t.found
      );
    },
    toString: function(){
      return H.format("[%s %s]", this.klass, this.name);
    },
    serialize: function(){
      return {
        id: this.id,
        found: this.found,
        consumed: this.consumed,
      };
    },
    initialize: function(){

      var tpl, specficname, ent = this.entities[this.id];

      if (ent){

        tpl  = ent._template;
        specficname = (tpl.Identity && tpl.Identity.SpecificName) ? tpl.Identity.SpecificName.toLowerCase() : "unknown";

        H.extend(this, {
          name:      (this.generic + "." + this.specific + "#" + this.id).toLowerCase(),
          owner:     ent.owner(),
          position:  ent.position(),
          resources: [this.id],   // make asset gatherable
          isPrey:    this.config.data.prey.indexOf(specficname) !== -1,
          maxSupply: ent.resourceSupplyMax(),
          found:     this.found ? true : this.map.isOwnTerritory(ent.position()) ? true : false,
          supply:    ent.resourceSupplyAmount(),
        });

      } else {
        this.consumed = true;
        deb("   RES: res with id: '%s' was consumed, no entity", this.id);

      }

      return this;

    },
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

      resources: null,

      template: {
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
    log: function(){
      var 
        tab = H.tab, type, msg = "",
        head   = "ents,     found, avail, total, depl, cons".split(", "),
        props  = "entities, found, available, total, depleted, consumed".split(", "),
        tabs   = [   6,     6,    8,    8,    6,    8];  

      // header
      H.zip(head, tabs, function(h, t){msg += tab(h, t);});
      deb();
      deb("RESRCS:                " + msg);

      // lines
      this.eachStats(function(generic, specific, stats){
        msg = "";
        H.zip(props, tabs, function(p, t){
          msg += tab(stats[p], t);
        });    
        type = H.tab(generic + "." + specific, 13);
        deb("     R: %s: %s", type, msg);
      });

    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      var data = {};
      this.eachAll((generic, specific, stats, id, res) => {
        if (!data[generic]){data[generic] = {};}
        if (!data[generic][specific]){data[generic][specific] = {};}
        if (!data[generic][specific].stats){data[generic][specific].stats = H.deepcopy(stats);}
        data[generic][specific][id] = res.serialize();
      });
      return data;
    },
    deserialize: function(){
      if (this.context.data[this.name]){
        this.resources = this.context.data[this.name];
        this.eachAll((generic, specific, stats, id, res) => {
          this.resources[generic][specific][id] = new Resource(H.mixin(res, {
            map:      this.map,
            config:   this.config,
            context:  this.context,
            generic:  generic,
            specific: specific,
            entities: this.entities,
          })).initialize();
        });
      }
    },
    initialize: function(){

      var res, type, counter = 0, t0 = Date.now();

      // deb();deb();deb("   RES: init -----------");

      if (!this.resources){

        this.resources = this.template;

        H.each(this.entities, (id, ent) => {
          
          if ((type = ent.resourceSupplyType())){ // returns { "generic": type, "specific": subtype };
            //TODO: whales
            if (this.resources[type.generic][type.specific]){
              counter += 1;
              res = this.resources[type.generic][type.specific][ent.id()] = new Resource({
                id:       ~~id, 
                map:      this.map,
                config:   this.config,
                context:  this.context,
                generic:  type.generic,
                specific: type.specific,
                entities: this.entities,
              }).initialize();

            } else {
              deb("ERROR : unknown resource type %s %s %s", type.generic, type.specific, ent._templateName);
            }

          }

        });

        this.eachAll((generic, specific, stats, id, res) => {

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

      }

      // deb("     R: found %s, %s msecs", counter, Date.now() - t0);

    },
    activate: function(){},
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

        H.each(resources[generic], (specific, specentry) => {
          H.each(specentry, (id, resource) => {
            if (id !== "stats"){
              fn(generic, specific, id, resource);
            }
          });
        });

      } else if (resources[generic][specific]){

        H.each(resources[generic][specific], (id, resource) => {
          if (id !== "stats"){
            fn(generic, specific, id, resource);
          }
        });

      } else {
        deb("ERROR : res.each: type: '%s' unknown", type);

      }

    },
    eachAll: function(fn){

      H.each(this.resources, (generic, genentry) => {
        H.each(genentry, (specific, specentry) => {
          H.each(specentry, (id, resource) => {
            if (id !== "stats"){
              fn(generic, specific, specentry.stats, id, resource);
            }
          });
        });
      });

    },
    eachStats: function(fn){

      H.each(this.resources, (generic, genentry) => {
        H.each(genentry, (specific, specentry) => {
          fn(generic, specific, specentry.stats);
        });
      });

    },
    consume: function(ids){ //TODO
      this.eachAll( (generic, specific, stats, id, res) => {
        if (H.contains(ids, id)){
          res.consumed = true;
          stats.consumed += res.supply;
          stats.depleted += 1;
        }
      });
    },
    markFound: function(pos, range){ //TODO
      this.eachAll( (generic, specific, stats, id, res) => {
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
            deb("   RES: kmeans: chose cluster with %s trees", kmeans.centroids[0].items);
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

      deb("   RES: nearest '%s': %s at %s", type, resource, pos);
      // deb("   RES: attribs: %s", H.attribs(resource));
      return resource;

    },      
  
  };

return H; }(HANNIBAL));
