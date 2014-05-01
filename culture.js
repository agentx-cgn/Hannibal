/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, logObject */

/*--------------- C I V I L I S A T I O N  ------------------------------------

  Models features of 0 A.D. civilisations as mesh network based on a triple store.
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Culture = function(civ, debug){

    deb();deb();
    deb("  CULT: parsing %s templates for [%s]", H.count(H.Templates), civ);

    this.debug = debug || 0;

    this.civ  = civ;
    this.researchedTechnologies = H.attribs(H.Bot.playerData.researchedTechs);

    this.verbs = H.Data.verbs;
    this.store = new H.Store(civ);
    this.verbs.forEach(this.store.addVerb.bind(this.store)); //??

    // store nodes found in templates
    this.classes = [];
    this.civilisations = []; // all
    this.technologies = [];
    this.resources = [];
    this.resourcetypes = [];

  };

  H.Culture.prototype = {
    constructor: H.Hannibal.Culture,
    saniTemplateName: function(nameTemplate){
      nameTemplate = H.replace(nameTemplate,  "|", ".");
      nameTemplate = H.replace(nameTemplate,  "_", ".");
      nameTemplate = H.replace(nameTemplate,  "/", ".");
      return nameTemplate.toLowerCase();
    },
    finalize: function(){
      // remove some propos from nodes
      var store = this.store;
      Object.keys(store.nodes).forEach(function(name){
        delete store.nodes[name].template;
        delete store.nodes[name].classes;
      });
    },
    loadTemplates: function(){

      var self = this, node, 
          store = this.store, 
          sani = this.saniTemplateName,
          // techTpl,
          conf = {
        'classes':        {deb: false, generic: "Class",         tooltip: "a class"},
        // 'technologies':   {deb: false, generic: "Technology",    tooltip: "a research target"},
        'resources':      {deb: false, generic: "Resource",      tooltip: "something to gather"},
        'resourcetypes':  {deb: false, generic: "ResourceType",  tooltip: "something to drop elsewhere"}
      };


      // manually add nodes for consistency
      // this.loadRootNodes();

      // reads the templates and looks for verb keywords
      // this.readTemplates();

      // var TT = H.SharedScript._techTemplates;

      // deb("------this.technologies: %s", this.technologies.length);
      // H.unique(this.technologies).sort().forEach(function(t){
      //   deb("%s, %s", t, (TT[t] !== undefined));
      // });
      // deb("------");



      // now load nodes collected above
      H.each(conf, function(type, conf){

        var counter = 0, 
            list = H.unique(self[type]).sort();

        list.forEach(function(key){

          var name, template = {Identity: {GenericName: conf.generic, Tooltip: conf.tooltip}};

          name = sani(key);
          if (type === "classes" && H.Data.ClassInfo[name]){
            template.Tooltip = H.Data.ClassInfo[name];
          }

          node = self.addNode(name, key, template);
            
          // // overwrite better desription for techs
          // techTpl = H.SharedScript._techTemplates[key];
          // if (techTpl && techTpl.description){
          //   node.info = techTpl.description;
          // }

          counter += 1;     

          if (conf.deb){deb("     C: Node added: %s for %s", name, type);}

        });

        deb("     C: created %s/%s nodes for %s", H.tab(counter, 4), H.tab(list.length, 4),type);

      });

      this.loadEdges();

      deb("     C: loaded  %s, %s verbs, %s nodes, %s edges: [%s]", 
        this.civ, this.verbs.length, H.count(store.nodes), store.edges.length, store.verbs.join(", ")
      );

    },
    loadEntities: function(){

      var self = this, targetNodes = [], cntNodes = 0, cntEdges = 0,
          sani = this.saniTemplateName,
          isShared = function(ent){
            var klasses = ent.classes().map(String.toLowerCase);
            return H.Config.data.sharedBuildingClasses.some(function(klass){
              return (klasses.indexOf(klass) !== -1);
            });
          };

      deb("     C: loadEntities from game: %s total", H.count(H.Entities));

      H.each(H.Entities, function(id, ent){

        var key  = ent._templateName,
            name = sani(key) + "#" + id;

        if (ent.owner() === H.Bot.id){

          if (ent.hasClass("Unit")){
            ent.setMetadata(H.Bot.id, "opname", "none");
            deb("     C:   set opname to 'none' %s", ent);

          } else if (ent.hasClass("Structure")){

            if (isShared(ent)){
              ent.setMetadata(H.Bot.id, "opname", "g.custodian");
              deb("     C:   set opname to 'custodian' for %s", ent);
            
            } else {
              ent.setMetadata(H.Bot.id, "opname", "none");
              deb("     C:   set opname to 'none' for %s", ent);
            
            }

          } else {
            deb("ERROR : loadEntities unhandled entity: %s classes: %s", ent, ent.classes());

          }

          targetNodes.push(self.addNode(name, key, ent._template, +id));
          cntNodes += 1;

        }

      });

      deb("     C: loaded %s nodes for game entities", H.tab(cntNodes, 4));

      targetNodes.forEach(function(nodeTarget){

        var nodeSourceName = nodeTarget.name.split("#")[0],
            nodeSource = H.Bot.culture.store.nodes[nodeSourceName];

        // deb(nodeSourceName);

        self.store.addEdge(nodeSource, "ingame",      nodeTarget);
        self.store.addEdge(nodeTarget, "describedby", nodeSource);
        cntEdges += 2;

      });

      deb("     C: created %s edges for game entities", H.tab(cntEdges, 4));      

    },
    loadTechTemplates: function(){

      // http://trac.wildfiregames.com/wiki/Technology_Templates

      var self = this, counter = 0, cntAll = H.unique(this.technologies).length,
          templs = H.SharedScript._techTemplates;

      H.unique(this.technologies).sort().forEach(function(key){

        if(templs[key]){
          self.loadTechTemplate(key);
          counter += 1;

        } else {
          deb("ERROR : tech: %s not in templates: %s", key);
        }

      });

      deb("     C: loaded  %s/%s technolgies & pairs", H.tab(counter, 4), H.tab(cntAll, 4));

    },    
    loadTechTemplate: function(nameTemplate, depth){

      // loads tech tree recursive 

      var nameSource, nameTarget, nodeSource, nodeTarget,
          tpls  = H.SharedScript._techTemplates,
          tpl   = tpls[nameTemplate],
          store = this.store,
          sani  = this.saniTemplateName, prit = H.prettify,
          deb   = (this.debug > 0) ? deb : H.FNULL;

      depth = depth || "";

      deb("     C: %s found tech: %s", depth, nameTemplate);

      nameSource = sani(nameTemplate);
      nodeSource = store.nodes[nameSource];

      if (!nodeSource){
        deb("     C:     %s addNode: %s", depth, nameTemplate);
        this.addNode(nameSource, nameTemplate, tpl);
      }

      if (tpl.supersedes){

        deb("     C:     %s %s supersedes %s", depth, nameTemplate, prit(tpl.supersedes));

        nameTarget = sani(tpl.supersedes);
        nodeTarget = store.nodes[nameTarget];

        if (!nodeTarget){
          this.loadTechTemplate(tpl.supersedes, depth + "  ");
        }
        
        if (nodeSource && nodeTarget) {
          store.addEdge(nodeSource, 'supersede',    nodeTarget);
          store.addEdge(nodeTarget, 'supersededby', nodeSource);
        } else {
          deb("     C:     %s supersedes techs not found: source: %s, target: %s", depth, nameSource, nameTarget);

        }

      }

      if (tpl.bottom || tpl.top){

        deb("     C:     %s %s pairs top: %s, bottom: %s", depth, nameTemplate, tpl.top, tpl.bottom);

        nameTarget = sani(tpl.top);
        nodeTarget = store.nodes[nameTarget];

        if (!nodeTarget){
          this.loadTechTemplate(tpl.top, depth + "  ");
        }

        nameTarget = sani(tpl.bottom);
        nodeTarget = store.nodes[nameTarget];

        if (!nodeTarget){
          this.loadTechTemplate(tpl.bottom, depth + "  ");
        }

        nodeTarget = store.nodes[sani(tpl.top)];

        if (nodeSource && nodeTarget){
          store.addEdge(nodeSource, 'pair',     nodeTarget);
          store.addEdge(nodeTarget, 'pairedby', nodeSource);
        } else {
          deb("     C:     %s pair techs not found: source: %s, top: %s", depth, nameSource, nodeTarget.name);
        }

        nodeTarget = store.nodes[sani(tpl.bottom)];

        if (nodeSource && nodeTarget){
          store.addEdge(nodeSource, 'pair',     nodeTarget);
          store.addEdge(nodeTarget, 'pairedby', nodeSource);
        } else {
          deb("     C:     %s pair techs not found: source: %s, bottom: %s", depth, nameSource, nodeTarget.name);
        }

      }



    },
    loadTechnologies: function(){

      var store = this.store, self = this,
          techs = H.Player.researchedTechs,
          sani  = this.saniTemplateName,
          counter = 0, nameSource, nameTarget, nodeSource, nodeTarget, names = [];

      H.each(techs, function(key, tech){

        nameTarget = sani(key);

        // //HACK
        // if (nameTarget === "phase.village"){
        //   nameTarget += "." + self.civ;
        //   self.addNode(nameTarget, key, {Identity: {GenericName: "Technology", Tooltip: "Research product"}});
        // }

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

      var sani = function(name){
            name = H.replace(name,  "_", ".");
            name = H.replace(name,  "|", ".");
            name = H.replace(name,  "/", ".").toLowerCase();
            // HACK: foundations
            if (name.split(".")[0] === 'foundation'){
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

      // if (ent.hasClass("unit")){ent.setMetadata(H.Bot.id, "operator", "none");}
      // if (ent.hasClass("structure")){ent.setMetadata(H.Bot.id, "operator", "none");}
      
      // deb("loadById: src: %s, tgt: %s", nameSource, nameTarget);

      this.store.addEdge(nodeSource, "ingame",      nodeTarget);
      this.store.addEdge(nodeTarget, "describedby", nodeSource);

      deb("  CULT: loaded id: %s, name: %s", id, nameTarget);

    },
    removeById: function(id){
      
      var hqc   = "INGAME WITH id = " + id,
          node  = H.QRY(hqc).execute()[0],  // can only be one
          store = this.store,
          verbs = [];

      if (node){
        // deb("  CULT: trying remove id: %s, hqc: %s", id, hqc);

        store.edges.forEach(function(edge){
          if(edge[0] === node || edge[2] === node){
            store.edges.slice(store.edges.indexOf(edge), 1);
            verbs.push(edge[1]);
          }
        });

        delete store.nodes[node.name];

        deb("     C: #%s removed name: %s, verbs: %s", id, node.name, verbs);

      } else {
        deb("     C: can't removed non existing node: #%s", id);

      }

    },
    addNode: function(name, key, template, id){

      var node = {
            name      : name,
            key       : key,
            template  : template  //TODO: remove this dependency
          },
          conf = {
            id        : +id || undefined,
            civ       : this.getCivilisation(template),
            info      : this.getInfo(template),
            size      : this.getSize(template),
            costs     : this.getCosts(template),
            armour    : this.getArmour(template),
            health    : this.getHealth(template), //TODO: ingames
            attack    : this.getAttack(template),
            affects   : this.getAffects(template),
            capacity  : this.getCapacity(template),
            requires  : this.getRequirements(template),     // tech
            autoresearch : (!!template.autoResearch ? template.autoResearch : undefined),       // tech
            modifications: this.getModifications(template)
          };

      H.each(conf, function(prop, value){
        if(value !== undefined){
          node[prop] = value;
        }
      });

      // Dynamic INGAME Props
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
            var freeSlots = this.capacity - H.Entities[id].garrisoned.length;
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
    loadRootNodes: function(){

      var self = this, counter = 0,
          rootNodes = H.Data.RootNodes();

      H.each(rootNodes['*'], function(name, data){
        if (H.Templates[data.key]){
          // deb("     C: enhanced root node: %s", data.key);
          self.addNode(name, data.key, H.Templates[data.key]);
        } else {
          self.addNode(name, data.key, data.template);
        }
        counter += 1;      
      });

      deb("     C: loaded %s root nodes from data: *", H.tab(counter, 4));    

      counter = 0;

      if (rootNodes[this.civ]){
        H.each(rootNodes[this.civ], function(name, data){
          if (H.Templates[data.key]){
            // deb("     C: enhanced root node: %s", data.key);
            self.addNode(name, data.key, H.Templates[data.key]);
          } else {
            self.addNode(name, data.key, data.template);
          }
          counter += 1;     
        });
      }

      deb("     C: loaded %s root nodes from civ:%s", H.tab(counter, 4), this.civ);    

    },
    readTemplates: function(){

      var self      = this, 
          msg       = "",
          cntNodes  = 0,
          cntThis   = {},
          cntAll    = H.count(H.Templates);

      // deb("**");
      // deb("**");
      // deb(" CIVIC: reading %s templates", cntTpls);

      H.each(H.Templates, function(key, template){

        var tokens = [key.split("/")[0]].concat(key.split("/")[1].split("_")),
            name   = tokens.join("."),
            civ    = (template.Identity && template.Identity.Civ) ? template.Identity.Civ : "nociv";

        civ = civ.toLowerCase();
        cntThis[civ] = (cntThis[civ] === undefined) ? 1 : ++cntThis[civ];

        if (civ === self.civ){

          self.addNode(name, key, template);
          cntNodes += 1;

          // classes
          if (template.Identity && template.Identity.Classes){
            template.Identity.Classes._string.split(" ").forEach(function(klass){
              self.classes.push(klass);
            });
          }

          // research tech
          if (template.ProductionQueue && template.ProductionQueue.Technologies){
            template.ProductionQueue.Technologies._string.split(" ").forEach(function(tech){
              self.technologies.push(tech);
            });
          }
          if (template.Identity && template.Identity.RequiredTechnology){
            self.technologies.push(template.Identity.RequiredTechnology);
          }

          // resources [wood.ruins]
          if (template.ResourceSupply && template.ResourceSupply.Type){
            self.resources.push(template.ResourceSupply.Type);
          }
          
          if (template.ResourceGatherer && template.ResourceGatherer.Rates){
            H.attribs(template.ResourceGatherer.Rates).forEach(function(resource){
              self.resources.push(resource);
            });
          }

          // resources type
          if (template.ResourceDropsite && template.ResourceDropsite.Types){
            template.ResourceDropsite.Types.split(" ").forEach(function(type){
              self.resourcetypes.push(type);
            });
          }

          // deb("     C: read %s nodes for %s", cntThis[civ], civ);

        }

      });

      // H.unique(self.resourcetypes).sort().forEach(function(c){
      //   deb("     C: found resourcetypes: %s", c.toLowerCase());
      // });    
      // H.unique(self.resources).sort().forEach(function(c){
      //   deb("     C: found resources: %s", c.toLowerCase());
      // });    
      // H.unique(self.technologies).sort().forEach(function(c){
      //   deb("     C: found technology: %s", c.toLowerCase());
      // });    
      // H.unique(self.classes).sort().forEach(function(c){
      //   deb("     C: found class: %s", c.toLowerCase());
      // });

      H.attribs(cntThis).sort().forEach(function(civ){
        if (self.civ === civ){
          deb("     C: found   %s/%s nodes for %s", H.tab(cntThis[civ], 4), H.tab(cntAll, 4), civ);
        } else {
          msg += H.format("%s(%s), ", civ, cntThis[civ]);
        }
      });
      deb("     C: ignored: %s", msg);
      deb("     C: created %s/%s nodes for entities", H.tab(cntNodes, 4), H.tab(cntAll, 4));



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
    // getId: function(name){
    //   return name.split("#")[1] || undefined;
    // },
    getAttack: function(template){

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
          return {tech: this.saniTemplateName(tr.tech)};
        } else if (tr.class) {
          return {class: this.saniTemplateName(tr.class), number: tr.number};
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
    getClasses: function(template){
      var classes = "";
      if (template.Identity !== undefined && template.Identity.Classes){
        if (template.Identity.Classes._string){
          classes = H.replace(template.Identity.Classes._string.toLowerCase(), "\n", " ");
          classes = classes.split(" ").filter(function(s){return !!s;});
          // classes = classes.map(function(s){return s.toLowerCase();});
        }
      }
      return classes.length ? classes : undefined;
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
    getHealth: function(template){
      var health;
      if (template.Health !== undefined){
        if (template.Health.max){
          health = template.Health.max;
        }
      }
      return health;

    },
    getSize: function(template){
      var size = {}; // {width: 0, height: 0, depth: 0};
      if (template.Footprint !== undefined){
        if (template.Footprint.Square){
          if (template.Footprint.Square.width){size.width = template.Footprint.Square.width;}
          if (template.Footprint.Square.depth){size.depth = template.Footprint.Square.depth;}
        }
        if (template.Footprint.Height){size.depth = template.Footprint.Height;}
      }
      return H.count(size) > 0 ? size : undefined;

    },
    getCapacity: function(template){
      return template.GarrisonHolder !== undefined && ~~template.GarrisonHolder.Max ? 
        ~~template.GarrisonHolder.Max : undefined;
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
      var costs = {population: 0, time: 0, food:0, wood: 0, stone: 0, metal: 0},
          TC = template.Cost, // ents
          tc = template.cost; // tech
      if (TC !== undefined){
        if (TC.Population)       {costs.population =  ~~TC.Population;} 
        if (TC.PopulationBonus)  {costs.population = -~~TC.PopulationBonus;} 
        if (TC.BuildTime)        {costs.time       =  ~~TC.BuildTime;}
        if (TC.ResearchTime)     {costs.time       =  ~~TC.ResearchTime;}
        if (TC.Resources){
          if (TC.Resources.food) {costs.food  = ~~TC.Resources.food;} 
          if (TC.Resources.wood) {costs.wood  = ~~TC.Resources.wood;} 
          if (TC.Resources.metal){costs.metal = ~~TC.Resources.metal;}
          if (TC.Resources.stone){costs.stone = ~~TC.Resources.stone;}
        }
      } else if (tc !== undefined) {
        if (tc.food) {costs.food  = ~~tc.food;} 
        if (tc.wood) {costs.wood  = ~~tc.wood;} 
        if (tc.metal){costs.metal = ~~tc.metal;}
        if (tc.stone){costs.stone = ~~tc.stone;}
      }

      if (template.researchTime){
        costs.time =  ~~template.researchTime;
      }

      return H.count(costs) > 0 ? costs : undefined;

    },
    createEdges: function(verb, inverse, msg, test, targets, debug){

      var self = this, store = self.store, nodeTarget, counter = 0;

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

      if(this.debug > 0){
        deb("     C: created %s edges on pair: %s|%s - %s", H.tab(counter*2, 4), verb, inverse, msg);
      }

    },        
    loadEdges: function(){

      // Entities member classes

      var sani = this.saniTemplateName;

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
          return !!node.template.Identity && 
                 !!node.template.Identity.Classes &&
                 node.template.Identity.Classes._string !== undefined;
        }, 
        function target(node){
          return (
            H.replace(node.template.Identity.Classes._string, "\n", " ")
              .split(" ").filter(function(s){return !!s;})
              .map(String.toLowerCase)
          );
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
          return (
            H.replace(node.template.GarrisonHolder.List._string.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
            );
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

