/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- C U L T U R E  ----------------------------------------------

  Models features of 0 A.D. civilisations as mesh network based on a triple store.
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Culture = function(tree, debug){

    deb();deb();deb("  CULT: build culture/store for player id: %s, %s", tree.id, tree.civ);

    this.debug = debug || 0;

    this.civ  = tree.civ;
    this.tree = tree;
    this.tree.culture = this;

    this.verbs = H.Data.verbs;
    this.store = new H.Store(tree.civ);
    this.verbs.forEach(this.store.addVerb.bind(this.store)); //??

    // stores nodes found in templates
    this.classes = [];
    this.technologies = [];
    this.resources = [];
    this.resourcetypes = [];

  };

  H.Culture.prototype = {
    constructor: H.Hannibal.Culture,
    activate: function(){

      var self = this;

      H.Events.on("EntityRenamed", this.tree.id, function (msg){
        self.removeById(msg.id);
        self.loadById(msg.id2);
      });

      H.Events.on("AIMetadata", this.tree.id, function (msg){
        self.loadById(msg.id);
      });

      H.Events.on("Destroy", this.tree.id, function (msg){
        if (!msg.data.foundation){
          self.removeById(msg.id);
        }
      });

      H.Events.on("Advance", this.tree.id, function (msg){
        // self.loadByName(msg.data.technology);
      });


    },
    finalize: function(){

      // remove some attributes from nodes
      
      var store = this.store;
      Object.keys(store.nodes).forEach(function(name){
        delete store.nodes[name].template;
        delete store.nodes[name].classes;
      });

      deb("     C: loaded [%s], verbs: %s, nodes: %s, edges: %s", 
        this.civ, this.verbs.length, H.count(this.store.nodes), this.store.edges.length);

    },
    loadNodes: function(){

      var 
        self  = this, node, name, template, 
        sani  = H.saniTemplateName,
        counter = 0, counterTechs = 0, counterUnits = 0, counterStucs = 0,
        conf  = {
          "classes":        {deb: false, generic: "Class",         tooltip: "a class"},
          "resources":      {deb: false, generic: "Resource",      tooltip: "something to gather"},
          "resourcetypes":  {deb: false, generic: "ResourceType",  tooltip: "something to drop elsewhere"}
        };

      H.each(conf, function(type, conf){

        // load nodes collected in readTemplates

        self[type].forEach(function(tpln){

          name = sani(tpln);
          template = {Identity: {GenericName: conf.generic, Tooltip: conf.tooltip}};

          if (type === "classes" && H.Data.ClassInfo[name]){
            template.Tooltip = H.Data.ClassInfo[name];
          }

          node = self.addNode(name, tpln, template);
          counter += 1;     

          if (conf.deb){deb("     C: Node added: %s for %s", name, type);}

        });

        deb("     C: created %s nodes for %s", H.tab(self[type].length, 4), type);

      });

      // load nodes collected in selectTemplates
      H.each(this.tree.nodes, function (name, template){
        counterTechs += template.type === "tech" ? 1 : 0;
        counterStucs += template.type === "stuc" ? 1 : 0;
        counterUnits += template.type === "unit" ? 1 : 0;
        node = self.addNode(template.name, template.key, template.template);
      });

      deb("     C: created %s nodes for units", H.tab(counterUnits, 4));
      deb("     C: created %s nodes for structures", H.tab(counterStucs, 4));
      deb("     C: created %s nodes for technologies", H.tab(counterTechs, 4));

    },
    searchTemplates: function(){

      // searches for classes, resources and resourcetypes

      var list, tpl, self = this;

      H.each(this.tree.nodes, function(name, node){

        tpl = node.template;

        // classes
        if (tpl.Identity && tpl.Identity.VisibleClasses){
          list = tpl.Identity.VisibleClasses._string.toLowerCase();
          list = H.replace(list, "\n", " ");
          list.split(" ")
            .filter(klass => !!klass)
            .filter(klass => klass[0] !== "-") // ??
            .forEach(klass => self.classes.push(klass));
        }

        // more classes
        if (tpl.Identity && tpl.Identity.Classes){
          list = tpl.Identity.Classes._string.toLowerCase();
          list = H.replace(list, "\n", " ");
          list.split(" ")
            .filter(klass => !!klass)
            .filter(klass => klass[0] !== "-") //??
            .forEach(klass => self.classes.push(klass));
        }

        // even more classes
        if (tpl.GarrisonHolder && tpl.GarrisonHolder.List){
          tpl.GarrisonHolder.List._string.split(" ").forEach(function(klass){
            self.classes.push(klass.toLowerCase());
          });
        }

        // resources [wood.ruins]
        if (tpl.ResourceSupply && tpl.ResourceSupply.Type){
          self.resources.push(tpl.ResourceSupply.Type);
        }
        
        if (tpl.ResourceGatherer && tpl.ResourceGatherer.Rates){
          H.attribs(tpl.ResourceGatherer.Rates).forEach(function(resource){
            self.resources.push(resource);
          });
        }

        // resources type
        if (tpl.ResourceDropsite && tpl.ResourceDropsite.Types){
          tpl.ResourceDropsite.Types.split(" ").forEach(function(type){
            self.resourcetypes.push(type);
          });
        }

      });

      this.classes = H.unique(this.classes.sort());
      this.resources = H.unique(this.resources.sort());
      this.resourcetypes = H.unique(this.resourcetypes.sort());

    },
    loadEntities: function(){

      var 
        self = this, 
        targetNodes = [], 
        cntNodes = 0, cntEdges = 0, key, name, 
        nodeSource, nodeSourceName, 
        sani = H.saniTemplateName;

      deb();deb("     C: loadEntities from game: %s total", H.count(H.Entities));

      H.each(H.Entities, function(id, ent){

        key  = ent._templateName;
        name = sani(key) + "#" + id;

        if (ent.owner() === H.Bot.id){
          targetNodes.push(self.addNode(name, key, ent._template, +id));
          cntNodes += 1;
        }

      });

      targetNodes.forEach(function(nodeTarget){

        nodeSourceName = nodeTarget.name.split("#")[0];
        nodeSource = H.Bot.culture.store.nodes[nodeSourceName];

        if (!nodeSource){deb("ERROR : loadEntities nodeSource: %s", nodeSourceName);}
        if (!nodeTarget){deb("ERROR : loadEntities nodeTarget: %s", nodeTarget.name);}

        self.store.addEdge(nodeSource, "ingame",      nodeTarget);
        self.store.addEdge(nodeTarget, "describedby", nodeSource);

        cntEdges += 2;

      });

      deb("     C: created %s nodes for game entities", H.tab(cntNodes, 4));
      deb("     C: created %s edges for game entities", H.tab(cntEdges, 4));      

    },
    loadTechnologies: function(){

      var 
        self = this, store = this.store, 
        techs = H.Player.researchedTechs,
        sani  = H.saniTemplateName,
        counter = 0, nameSource, nameTarget, nodeSource, nodeTarget, names = [];

      // TODO: Can tech be INGAME ???

      H.each(techs, function(key, tech){

        nameTarget = sani(key);

        nameSource = H.format("%s#T", nameTarget);
        names.push(nameTarget);

        nodeTarget = store.nodes[nameTarget];
        nodeSource = self.addNode(nameSource, key, tech);
        
        store.addEdge(nodeSource, "techdescribedby", nodeTarget);
        store.addEdge(nodeTarget, "techingame",      nodeSource);
        
        counter += 1;

      });

      deb("     C: loaded %s nodes %s edges as tech: [%s]", H.tab(counter, 4), counter*2, names);  


    },
    loadById: function(id){

      // called by events

      var 
        sani = function(name){
          name = H.replace(name,  "_", ".");
          name = H.replace(name,  "|", ".");
          name = H.replace(name,  "/", ".").toLowerCase();
          // HACK: foundations
          if (name.split(".")[0] === "foundation"){
            name = name.split(".").slice(1).join(".");
          }
          return name;
        },
        ent  = H.Entities[id],
        key  = ent._templateName,
        nameSource = sani(ent._templateName),
        nameTarget = nameSource + "#" + id,
        nodeTarget = this.addNode(nameTarget, key, ent._template, id),
        nodeSource = H.Bot.culture.store.nodes[nameSource];

      this.store.addEdge(nodeSource, "ingame",      nodeTarget);
      this.store.addEdge(nodeTarget, "describedby", nodeSource);

      // deb("  CULT: loadById %s <= %s", nameTarget, nameSource);

    },
    removeById: function(id){
      
      var 
        node = H.QRY("INGAME WITH id = " + id).first(), 
        ent = H.Entities[id],
        tpln = ent ? ent._templateName : "unknown";

      if (node){
        this.store.edges
          .filter(edge => edge[0] === node || edge[2] === node)
          .forEach(edge => this.store.edges.splice(this.store.edges.indexOf(edge), 1));
        delete this.store.nodes[node.name];

      } else {
        deb("WARN  : removeById failed on id: %s, tpl: %s", id, tpln);
        H.QRY("INGAME SORT < id").execute("metadata", 5, 50, "removeById: ingames with metadata");

      }

    },
    addNode: function(name, key, template, id){

      var 
        node = {
          name      : name,
          key       : key,
          template  : template  //TODO: remove this dependency
        },
        properties = {
          id        : +id || undefined,
          civ       : this.getCivilisation(template),
          info      : this.getInfo(template),
          icon      : (!!template.Identity && template.Identity.Icon) ? template.Identity.Icon : undefined,       // tech
          size      : this.getSize(template),
          costs     : this.getCosts(template),
          speed     : this.getSpeed(template),
          armour    : this.getArmour(template),
          rates     : this.getRates(template),
          health    : this.getHealth(template), //TODO: ingames
          vision    : this.getVision(template),
          attack    : this.getAttack(template),
          affects   : this.getAffects(template),
          capacity  : this.getCapacity(template),
          requires  : this.getRequirements(template),     // tech
          autoresearch : (!!template.autoResearch ? template.autoResearch : undefined),       // tech
          modifications: this.getModifications(template),
        };

      // create only props with value
      H.each(properties, function(prop, value){
        if(value !== undefined){
          node[prop] = value;
        }
      });

      // dynamic properties for ingames
      // if (id){
      //   H.extend(node, {
      //     get position () {return H.Entities[id].position();},
      //     get metadata () {var meta = H.MetaData[id]; return (meta === Object(meta)) ? meta : {};}, // ~~??
      //     get state    () {return H.Entities[id].unitAIState().split(".").slice(-1)[0].toLowerCase();},
      //     get health   () {var ent = H.Entities[id]; return Math.round(ent.hitpoints() / ent.maxHitpoints());}, // propbably slow
      //     get slots    () {return node.capacity ? node.capacity - H.Entities[id].garrisoned.length : undefined;},
      //   });
      // }

      if (id){
        Object.defineProperties(node, {
          'position': {enumerable: true, get: function(){
            var pos = H.Entities[id].position();
            return pos;
          }},
          'metadata': {enumerable: true, get: function(){
            var meta = H.MetaData[id];
            return (meta === Object(meta)) ? meta : {};
          }},
          'slots': {enumerable: true, get: function(){

            if (!node.capacity){
              deb("WARN  : node.slots on invalid id: %s, tpl: %s", id, H.Entities[id].templateName() || "???");
              return undefined;
            }

            var freeSlots = node.capacity - H.Entities[id].garrisoned.length;
            return freeSlots;
          }},          
          'state': {enumerable: true, get: function(){
            var state = H.Entities[id].unitAIState().split(".").slice(-1)[0].toLowerCase();
            return state;
          }},
          'health': {enumerable: true, get: function(){
            var ent = H.Entities[id];
            return Math.round(ent.hitpoints() / ent.maxHitpoints()); // propbably slow
          }}
        });
      }

      this.store.addNode(node);

      // deb("  CULT: addNode: %s, id: %s", node.name, id);

      return node;

    },    
    logNode: function(node){
      deb("    %s", node.name);
      deb("      : key  %s", node.key);
      deb("      : type %s", node.type);
      deb("      : desc %s", node.description);
      deb("      : clas %s", node.classes.join(", "));
      if (node.costs)   {deb("      :   cost:   %s", H.prettify(node.costs));}
      if (node.armour)  {deb("      :   armour: %s", H.prettify(node.armour));}
      if (node.health)  {deb("      :   health: %s", node.health);}
      if (node.capacity){deb("      :   capacity: %s", node.capacity);}
      if (node.requires){deb("      :   requires: %s", node.requires);}
    },
    getAttack: function(/* template */){

      // var ta = template.attack;
      // if (ta)
      // <Attack>
        // <Melee>
          // <Hack>40.0</Hack>
          // <Pierce>0.0</Pierce>
          // <Crush>0.0</Crush>
          // <MaxRange>5.0</MaxRange>
          // <RepeatTime>1500</RepeatTime>
        // </Melee>
        // <Charge>
          // <Hack>120.0</Hack>
          // <Pierce>0.0</Pierce>
          // <Crush>0.0</Crush>
          // <MaxRange>5.0</MaxRange>
          // <MinRange>0.0</MinRange>
        // </Charge>
        // <Slaughter>
        //   <Hack>25.0</Hack>
        //   <Pierce>0.0</Pierce>
        //   <Crush>0.0</Crush>
        //   <MaxRange>4.0</MaxRange>
        // </Slaughter>        
      // </Attack>    
    },
    getModifications: function(template){
      // "modifications": [
      //     {"value": "ResourceGatherer/Rates/food.grain", "multiply": 15, "affects": "Spearman"},
      //     {"value": "ResourceGatherer/Rates/food.meat", "multiply": 10}
      // ],      
      return template.modifications || undefined;
    },
    getRequirements: function(t){
      // "requirements": { "class": "Village", "numberOfTypes": 2 },
      // "requirementsTooltip": "Requires two village structures", 
      var tr = t.requirements;
      if (tr){
        if (tr.tech){
          return {tech: H.saniTemplateName(tr.tech)};
        } else if (tr.class) {
          return {class: H.saniTemplateName(tr.class), number: tr.number};
        } else if (tr.any) {
          return {any: tr.any}; //TODO: sani techs
        }
      }
      return t.requirements || undefined;
    },    
    getAffects: function(t){
      // affects: ["Infantry Spear"],      
      return !t.affects ? undefined : (
        t.affects.map(String.toLowerCase)
      );
    },
    getType: function(template, type){
      type = [type];
      if (template.Identity !== undefined){
        if (template.Identity.GenericName !== undefined){
          type.push(template.Identity.GenericName);
        }
        if (template.Identity.SpecficName !== undefined){
          type.push(template.Identity.SpecificName);
        }
      }
      return type.join("|");
    },
    getInfo: function(t){
      var tip;
      if (t.Identity !== undefined){
        if (t.Identity.Tooltip){
          tip = H.replace(t.Identity.Tooltip, "\n", " ");
        }
      } else if (t.tooltip !== undefined) {
        tip = t.tooltip;
      } else if (t.description) {
        tip = t.description;
      } else if (t.top) { // pair
        tip = t.genericName;
      } else if (t.genericName) { // phase.city
        tip = t.genericName;
      }
      return tip;
    }, 
    getCivilisation: function(t){
      var civ;
      if (t.Identity !== undefined){
        if (t.Identity.Civ){
          civ = t.Identity.Civ;
        }
      }
      return civ;
    },
    // getRequirements: function(template){
    //   var requirement;
    //   if (template.Identity !== undefined){
    //     if (template.Identity.RequiredTechnology){
    //       requirement = template.Identity.RequiredTechnology;
    //     }
    //   }    
    //   return requirement;
    // },
    getHealth: function(tpl){
      return (
        (!!tpl.Health && ~~tpl.Health.Max) ? 
          ~~tpl.Health.Max : 
            undefined
      );
    },
    getRates: function(tpl){
      // <ResourceGatherer>
      //   <MaxDistance>2.0</MaxDistance>
      //   <BaseSpeed>1.0</BaseSpeed>
      //   <Rates>
      //     <food.fruit>1</food.fruit>
      //     <food.grain>0.5</food.grain>
      //     <food.meat>1</food.meat>
      //     <wood.tree>0.7</wood.tree>
      //     <wood.ruins>5</wood.ruins>
      //     <stone.rock>0.5</stone.rock>
      //     <stone.ruins>2</stone.ruins>
      //     <metal.ore>0.5</metal.ore>
      //   </Rates>
      // </ResourceGatherer>      
      var rates = {}, has = false, speed, tr;
      if (!!tpl.ResourceGatherer && !!tpl.ResourceGatherer.Rates){
        speed = parseFloat(tpl.ResourceGatherer.BaseSpeed);
        tr = tpl.ResourceGatherer.Rates;
        H.each(tr, function(res, rate){
          has = true;
          if (res.contains(".")){
            var [p1, p2] = res.split(".");
            if (!rates[p1]){
              rates[p1] = {};
            }
            rates[p1][p2] = parseFloat(rate) * speed;

          } else {
            rates[res] = parseFloat(rate) * speed;
          }
        });
        // deb("rates: tpl: %s", tpl.Identity.GenericName, JSON.stringify(rates));
      }
      return has ? rates : undefined;
    },
    getSize: function(tpl){
      var size = {}; // {width: 0, depth: 0};
      if (tpl.Footprint){
        if (tpl.Footprint.Square) {
          if (tpl.Footprint.Square["@width"]){size.width = tpl.Footprint.Square["@width"];}
          if (tpl.Footprint.Square["@depth"]){size.depth = tpl.Footprint.Square["@depth"];}
        }
        if (tpl.Footprint.Circle && tpl.Footprint.Circle["@radius"]){
          size.radius = tpl.Footprint.Circle["@radius"];
        } else {
          size.radius = (Math.sqrt(size.width*size.width + size.depth*size.depth) / 2).toFixed(2);
        }
        // deb("      : square %s, tpl: %s, size: %s", uneval(tpl.Footprint.Square), tpl._templateName, uneval(size));
      }
      return H.count(size) > 0 ? size : undefined;
    },
    getSpeed: function(tpl){
      return (
        (!!tpl.UnitMotion && ~~tpl.UnitMotion.WalkSpeed) ? 
          ~~tpl.UnitMotion.WalkSpeed : 
            undefined
      );
    },   
    getVision: function(tpl){
      return (
        (!!tpl.Vision && ~~tpl.Vision.Range) ? 
          ~~tpl.Vision.Range : 
            undefined
      );
    },
    getCapacity: function(tpl){
      return (
        (!!tpl.GarrisonHolder && ~~tpl.GarrisonHolder.Max) ? 
          ~~tpl.GarrisonHolder.Max : 
            undefined
      );
    },
    getArmour: function(template){
      var armour = {}; // {hack: 0, pierce: 0, crush: 0};
      if (template.Armour !== undefined){
        if (~~template.Armour.Hack)  {armour.hack   = ~~template.Armour.Hack;}
        if (~~template.Armour.Pierce){armour.pierce = ~~template.Armour.Pierce;}
        if (~~template.Armour.Crush) {armour.crush  = ~~template.Armour.Crush;}
      }
      return H.count(armour) > 0 ? armour : undefined;
    },
    getCosts: function(template){
      // we want integers
      var has = false, costs = {population: 0, time: 0, food:0, wood: 0, stone: 0, metal: 0},
          TC = template.Cost, // ents
          tc = template.cost; // tech
      if (TC !== undefined){
        has = true;
        costs.population = ~~TC.Population || -~~TC.PopulationBonus || 0;
        // if (TC.Population)       {costs.population =  ~~TC.Population;} 
        // if (TC.PopulationBonus)  {costs.population = -~~TC.PopulationBonus;} 
        if (TC.BuildTime)        {costs.time       =  ~~TC.BuildTime;}
        if (TC.ResearchTime)     {costs.time       =  ~~TC.ResearchTime;}
        if (TC.Resources){
          if (TC.Resources.food) {costs.food  = ~~TC.Resources.food;} 
          if (TC.Resources.wood) {costs.wood  = ~~TC.Resources.wood;} 
          if (TC.Resources.metal){costs.metal = ~~TC.Resources.metal;}
          if (TC.Resources.stone){costs.stone = ~~TC.Resources.stone;}
        }
      } else if (tc !== undefined) {
        has = true;
        if (tc.food) {costs.food  = ~~tc.food;} 
        if (tc.wood) {costs.wood  = ~~tc.wood;} 
        if (tc.metal){costs.metal = ~~tc.metal;}
        if (tc.stone){costs.stone = ~~tc.stone;}
      }

      if (template.researchTime){
        costs.time =  ~~template.researchTime;
        has = true;
      }

      return has ? costs : undefined;

    },
    createEdges: function(verb, inverse, msg, test, targets, debug){

      var store = this.store, nodeTarget, counter = 0;

      debug = debug || false;

      H.each(store.nodes, function(name, nodeSource){
        if (test(nodeSource)){
          if (debug){deb("     C: Edge.%s test: %s", verb, name);}
          targets(nodeSource).forEach(function(nameTarget){
            nodeTarget = store.nodes[nameTarget];
            if (nodeTarget){
              store.addEdge(nodeSource, verb,    nodeTarget);
              store.addEdge(nodeTarget, inverse, nodeSource);
              counter += 1;
              if (debug){deb("     C: Edge.%s:      -> %s", verb, nodeTarget.name);}
            } else {
              deb("ERROR : createEdges: verb: %s, no node for %s <= %s", verb, nameTarget, nodeSource.name);
            }
          });
        }
      });

      deb("     C: created %s edges on pair: %s|%s - %s", H.tab(counter*2, 4), verb, inverse, msg);

    },        
    loadEdges: function(){

      // Entities member classes

      var sani = H.saniTemplateName;

      this.createEdges("supersede", "supersededby", "a tech order",
        function test(node){
          return !!node.template.supersedes;
        }, 
        function target(node){
          return [sani(node.template.supersedes)];
        }, false
      );

      this.createEdges("pair", "pairedby", "pair pairs two techs",
        function test(node){
          return !!node.template.top &&!!node.template.bottom;
        }, 
        function target(node){
          return [sani(node.template.top), sani(node.template.bottom)];
        }, false
      );

      this.createEdges("member", "contain", "Entities member/contain classes",
        function test(node){
          var identity = node.template.Identity;
          return !!identity && (
                 (!!identity.VisibleClasses &&identity.VisibleClasses._string !== undefined ) || 
                 (!!identity.Classes && identity.Classes._string !== undefined)
                 );
        }, 
        function target(node){
          var identity = node.template.Identity, classes = "";
          if (identity.VisibleClasses){classes += identity.VisibleClasses._string;}
          if (identity.Classes){classes += " " + identity.Classes._string;}
          classes = H.replace(classes, "\n", " ").toLowerCase();
          classes = classes.split(" ")
            .filter(klass => !!klass)
            .filter(klass => klass[0] !== "-");
          return H.unique(classes);
        }, false
      );


      // Entities provide resources

      this.createEdges("provide", "providedby", "entities provide resources",
        // gaia.special.ruins.stone.statues.roman -> stone.ruins
        function test(node){
          return node.template.ResourceSupply && 
                 node.template.ResourceSupply.Type;
        }, 
        function target(node){
          return [node.template.ResourceSupply.Type];
        }, false
      );


      // Entities gather resources

      this.createEdges("gather", "gatheredby", "entities gather resources",
        function test(node){
          return  !!node.template.ResourceGatherer &&
                  node.template.ResourceGatherer.Rates !== undefined;
        }, 
        function target(node){
          return H.attribs(node.template.ResourceGatherer.Rates).sort();
        }, false
      );


      // Entities build Entities (mind {civ})

      this.createEdges("build", "buildby", "entities build entities",
        // units.athen.infantry.spearman.a -> structures.athen.defense.tower
        function test(node){
          return  !!node.template.Builder && 
                  !!node.template.Builder.Entities &&
                  node.template.Builder.Entities._string !== undefined;
        }, 
        function target(node){
          var ents = H.replace(node.template.Builder.Entities._string.toLowerCase(), "\n", " ");
          if (ents.search("{civ}") !== -1){
            if(!node.template.Identity.Civ){
              deb("ERROR : {civ} but no Indetity.Civ");
            } else {
              ents = H.replace(ents, "{civ}", node.template.Identity.Civ);
            }
          }
          return (
            ents.split(" ").filter(function(s){return !!s;})
              .map(function(t){return H.replace(t, "_", ".");})
              .map(function(t){return H.replace(t, "/", ".");})
          );
        }, false
      );


      // Entities train Entities (mind {civ})

      this.createEdges("train", "trainedby", "entities train entities",
        function test(node){
          return  !!node.template.ProductionQueue && 
                  !!node.template.ProductionQueue.Entities &&
                  node.template.ProductionQueue.Entities._string !== undefined;
        }, 
        function target(node){
          var ents = H.replace(node.template.ProductionQueue.Entities._string.toLowerCase(), "\n", " ");
          if (ents.search("{civ}") !== -1){
            if(!node.template.Identity.Civ){
              deb("ERROR : {civ} but no Indetity.Civ");
            } else {
              ents = H.replace(ents, "{civ}", node.template.Identity.Civ);
            }
          }
          return (
            ents.split(" ").filter(function(s){return !!s;})
              .map(function(t){return H.replace(t, "_", ".");})
              .map(function(t){return H.replace(t, "/", ".");})
            );
        }, false
      );


      // Buildings hold classes

      this.createEdges("hold", "holdby", "entities hold classes",
        function test(node){
          return  !!node.template.GarrisonHolder &&
                  node.template.GarrisonHolder.List._string;
        }, 
        function target(node){
          var list = node.template.GarrisonHolder.List._string.toLowerCase();
          list = H.replace(list, "\n", " ");
          list = H.replace(list, "+", " ");
          return list.split(" ").filter(function(s){return !!s;});
        }, false
      );


      // Healer heal classes

      this.createEdges("heal", "healedby", "healer heal classes",
        function test(node){
          return  !!node.template.Heal &&
                  node.template.Heal.HealableClasses._string !== undefined;
        }, 
        function target(node){
          return (
            H.replace(node.template.Heal.HealableClasses._string.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
            );
        }, false
      );


      // Entities research technologies

      this.createEdges("research", "researchedby", "entities research technologies",
        function test(node){
          return  !!node.template.ProductionQueue && 
                  !!node.template.ProductionQueue.Technologies &&
                  node.template.ProductionQueue.Technologies._string;
        }, 
        function target(node){
          return (
            H.replace(node.template.ProductionQueue.Technologies ._string.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
              .map(function(t){return H.replace(t, "_", ".");})
              .map(function(t){return H.replace(t, "/", ".");})
            );
        }, false
      );


      // Entities require/enable technologies

      this.createEdges("require", "enable", "entities require/enable technologies",
        // other.wallset.palisade -> phase.village
        function test(node){
          return  (
            !!node.template.Identity && 
            !!node.template.Identity.RequiredTechnology
          );
        }, 
        function target(node){
          var tech = node.template.Identity.RequiredTechnology;
          tech = H.replace(tech, "_", ".");
          tech = H.replace(tech, "/", ".");
          return [tech];
        }, false
      );


      // Entities accept resourcestype (Dropsite)

      this.createEdges("accept", "acceptedby", "entities accept resourcetypes (dropsites)",
        function test(node){
          return  (
            !!node.template.ResourceDropsite &&
            node.template.ResourceDropsite.Types !== undefined
          );
        }, 
        function target(node){
          return (
            H.replace(node.template.ResourceDropsite.Types.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
            );
        }, false
      );


      // Entities carry resourcestype (Ships)

      this.createEdges("carry", "carriedby", "entities carry resourcetypes (ships, trader, gatherer)",
        // units.athen.cavalry.javelinist.e -> food
        function test(node){
          return  !!node.template.ResourceGatherer && 
                  node.template.ResourceGatherer.Capacities !== undefined;
        }, 
        function target(node){
            return H.attribs(node.template.ResourceGatherer.Capacities).sort();
        }, false
      );

    }    

  };

return H; }(HANNIBAL));
