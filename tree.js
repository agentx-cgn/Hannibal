/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- T E C H N O L G Y   T R E E  --------------------------------

  Models the dependencies of entities and technologies
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var phases = {
      '1' : {idx: 1, abbr: "vill", generic: "phase_village", alternates: ["vill", "phase_village"]},
      '2' : {idx: 2, abbr: "town", generic: "phase_town",    alternates: ["town", "phase_town", "phase_town_generic", "phase_town_athen"]},
      '3' : {idx: 3, abbr: "city", generic: "phase_city",    alternates: ["city", "phase_city", "phase_city_generic", "phase_city_britons", "city_phase_gauls", "phase_city_pair_celts", "phase_city_athen"]},
      // list: [],
      find: function(phase){
        for (var i=1; i<=3; i++) {
          if (H.contains(phases[i].alternates, phase)){
            return phases[i];
          }
        } /* deb("WARN  : unknown phase: %s", phase); */ return undefined;
      },
      prev: function(phase){return phases[(phases.find(phase).idx - 1) || 1];}
    };

  // [1, 2, 3].forEach(p => phases[p].alternates.forEach(a => phases.list.push(a)));


  H.TechTree = function (idplayer) {
    this.id = idplayer;
    this.civ = H.SharedScript.playersData[idplayer].civ;
    this.templates = {};
    this.sources = [].concat(
      H.attribs(H.SharedScript.playersData[idplayer].researchedTechs), 
      H.attribs(H.SharedScript._techModifications[idplayer]),
      H.attribs(H.Entities)
        .filter(id => H.Entities[id].owner() === idplayer)
        .map(id => H.Entities[id]._templateName)
    );    
    this.sources = H.unique(this.sources).map(src => [0, src]);
    deb();deb();
    deb("  TREE: expanding %s sources for id: %s with civ: %s", H.count(this.sources), this.id, this.civ);
    this.expand();
    deb("     T: found %s templates", H.count(this.templates));
    this.enhance();
    this.names = H.attribs(this.templates);
    this.keys = H.attribs(this.templates).map(t => this.templates[t].key);
    // this.log();
  };

  H.TechTree.prototype = {
    constructor: H.TechTree,
    log: function (){

      var 
        tpls = H.attribs(this.templates),
        tt = this.templates;

      tpls.sort(function(a, b){
        if (tt[a].phase !== tt[b].phase){
          return phases.find(tt[a].phase).idx > phases.find(tt[b].phase).idx;
        } else {
          return tt[a].depth > tt[b].depth;
        }
      });

      tpls.forEach(function(t){
        deb("     T: %s %s %s %s", tt[t].phase, tt[t].type, tt[t].depth, tt[t].name);
      });

    },
    getType: function(tpln){
      if (tpln.contains("units/")){return "unit";}
      if (tpln.contains("structures/")){return "stuc";}
      if (tpln.contains("other/")){return "othr";}
      if (tpln.contains("gaia/")){return "gaia";}
      if (tpln.contains("pair_")){return "pair";}
      if (H.SharedScript._techTemplates[tpln]){return "tech";}
      return "XXXX";
    },
    getPhase: function(tpln, space){

      var phase = "phase_village", tpl = H.Templates[tpln] || H.SharedScript._techTemplates[tpln];

      space = space || "";

      if (tpl.Identity && tpl.Identity.RequiredTechnology){
        phase = tpl.Identity.RequiredTechnology;
      } else if (tpl.requirements && tpl.requirements.any){
        phase = tpl.requirements.any[0].tech;
      } else if (tpl.requirements && tpl.requirements.tech){
        phase = tpl.requirements.tech;
      } else if (phases.find(tpln)){
        phase = phases.prev(tpln).generic;
      } else if (tpl.top) {
        return this.getPhase(tpl.top, space + "  ");
      }

      // deb("     P:%s %s -> %s", space, tpln, phase);

      if (!phases.find(phase)){
        return this.getPhase(phase, space + "  ");
      } else {
        return phase;
      }


    },
    enhance: function (){

      H.each(this.templates, function(name, template){

        var 
          type  = this.getType(template.key),
          phase = phases.find(this.getPhase(template.key)).abbr;

        template.type  = type;
        template.phase = phase;

        // deb("%s %s, %s", phase, type, name);

      }.bind(this));

    },
    expand: function (){

      var tpln, key, tpl, name, src, depth = 0,
          push = function(item){this.sources.push([depth, item]);}.bind(this);

      while (this.sources.length){

        src  = this.sources.shift();
        tpln = src[1];
        key  = tpln.replace(/\{civ\}/g, this.civ);
        tpl  = H.Templates[key] || H.SharedScript._techTemplates[key];
        name = H.saniTemplateName(key);

        if (!this.templates[name]){

          this.templates[name] = {
            name:      name,
            key:       key,
            template:  tpl,
            depth:     src[0],
            type:      "",
            phase:     "",
            producers: []
          };

          // deb("     T: %s, %s, %s ----- %s", typeof tpl, !!tpl, name, key);

          if(key.slice(-2) === "_b"){
            push(key.slice(0, -2) + "_e");
            push(key.slice(0, -2) + "_a");
          }

          // can research tech
          if (tpl.ProductionQueue && tpl.ProductionQueue.Technologies && tpl.ProductionQueue.Technologies._string){
            tpl.ProductionQueue.Technologies._string.split(" ").forEach(push);
          }

          // can train ents
          if (tpl.ProductionQueue && tpl.ProductionQueue.Entities && tpl.ProductionQueue.Entities._string){
            tpl.ProductionQueue.Entities._string.split(" ").forEach(push);
          }

          // can build structs
          if (tpl.Builder && tpl.Builder.Entities && tpl.Builder.Entities._string){
            tpl.Builder.Entities._string.split(" ").forEach(push);
          }

          // needs tech
          if (tpl.Identity && tpl.Identity.RequiredTechnology){
            push(tpl.Identity.RequiredTechnology);
          }

          // is tech
          if (tpl.supersedes){push(tpl.supersedes);}
          if (tpl.bottom){push(tpl.bottom);}
          if (tpl.top){push(tpl.top);}

          depth += 1;

        }

      }

    }

  };


return H; }(HANNIBAL));

