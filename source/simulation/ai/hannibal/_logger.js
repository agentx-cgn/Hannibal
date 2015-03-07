/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, HANNIBAL_DEBUG, uneval, print */

/*--------------- D E B U G  --------------------------------------------------

  global functions for debugging, mainly to output to STD/dbgView
  http://trac.wildfiregames.com/wiki/Logging

  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){

  // ultimtate switch
  var DEBOFF = false;

  H.extend(H, {

    logFn: function (fn){return fn.toString().split("\n").join("").slice(0, 80) + "|...";},

    deboff: function(what=true){DEBOFF = what;},
    deb: function(/* id, msg */){

      // print("H.deb: DEBOFF: " + DEBOFF  + " args: " + uneval(arguments) + "\n");

      if(DEBOFF) return;

      var 
        args = H.toArray(arguments), al = args.length,
        id   = (args[0] && H.isInteger(args[0])) ? args[0] : 0,
        empty = ["      :\n" + id + "::      :"],
        DEB  = HANNIBAL_DEBUG && HANNIBAL_DEBUG.bots ? HANNIBAL_DEBUG.bots[id] : {},
        msg = H.format.apply(null, (
          (al === 0)             ? empty            : // no args
          (al  >  0 && id === 0) ? args.slice(0)    : // msg given as 0
          (al === 1 && id  >  0)   ? empty          : // only id, no msg
          (al   > 1 && id  >  0 && args[1] === undefined)     ? empty            : // id + []
          (al   > 1 && id  >  0 && args.slice(1).length > 0)  ? args.slice(1)    : // id + [msg, ...]
            print("ERROR: in H.deb: args: " + uneval(arguments) + "\n\n") // else 
        )) + "\n",
        prefix   = msg.substr(0, 7).toUpperCase(),
        deblevel = DEB.log || H.Config.deb || 0,
        msglevel = (
          prefix === "ERROR :" ? 1 :
          prefix === "WARN  :" ? 2 :
          prefix === "INFO  :" ? 3 :
            4
        );

      if (msglevel <= deblevel){
        if (msg.length > 3000){
          print("\nTRUNCATED ##############################\n");
          print(id + "::" + msg.slice(0, 300));
          print("\nTRUNCATED ##############################\n\n");
        } else {
          print(id + "::" + msg);
        }
      }

    },
    printf: function(){
      print(H.format.apply(H, arguments) + "\n");
    },
    diffJSON: function (a, b) {

      // https://github.com/paldepind/dffptch
      
      var 
        O = Object, keys = O.keys,
        aKey, bKey, aVal, bVal, rDelta, shortAKey, 
        aKeys = keys(a).sort(),
        bKeys = keys(b).sort(),
        delta = {}, adds = {}, mods = {}, dels = [], recurses = {},
        aI = 0, bI = 0;

      // Continue looping as long as we haven't reached the end of both keys lists

      while(aKeys[aI] !== undefined || bKeys[bI]  !== undefined || false) {
        
        aKey = aKeys[aI]; 
        bKey = bKeys[bI];
        aVal = a[aKey];
        bVal = b[bKey];
        shortAKey = String.fromCharCode(aI+48);

        if (aKey == bKey) {

          // We are looking at two equal keys this is a
          // change – possibly to an object or array
          
          if (O(aVal) === aVal && O(bVal) === bVal) {
          
            // Find changs in the object recursively
            rDelta = H.diffJSON(aVal, bVal);
          
            // Add recursive delta if it contains modifications
            if (keys(rDelta)) {recurses[shortAKey] = rDelta;}
          
          } else if (aVal !== bVal) {
            mods[shortAKey] = bVal;
          
          }
          
          aI++; bI++;

        } else if (aKey > bKey || !aKey) {
          // aKey is ahead, this means keys have been added to b
          adds[bKey] = bVal;
          bI++;

        } else {
          // bKey is larger, keys have been deleted
          dels.push(shortAKey);
          aI++;

        }
      }

      // We only add the change types to delta if they contains changes
      if (dels[0]) delta.d = dels;
      if (keys(adds)[0]) delta.a = adds;
      if (keys(mods)[0]) delta.m = mods;
      // if (keys(recurses)[0]) delta.r = recurses;
      
      return delta;

    },

    logObject: function(o, msg){
      var inst = "unidentified";
      msg = msg || "";
      H.deb();
      H.deb("Object [%s] : attributes: %s, comment: %s", inst, Object.keys(o).length, msg);
      if (o.constructor){
        H.deb("Object: %s", H.getAttribType("constructor", o.constructor));
      }
      H.logObjectShort(o);
      H.deb("Object.prototype: %s attributes", H.count(Object.getPrototypeOf(o)));
      if (H.count(Object.getPrototypeOf(o))){
        H.logObjectShort(Object.getPrototypeOf(o));
      }
      H.deb("------: logObject end");
    },
    logObjectShort: function(o){
      H.attribs(o)
        .sort()
        .forEach(a => H.deb(this.getAttribType(o, a)));
    },
    getAttribType: function(object, attr){

      var keys, body, value, test, [o, a] = [object, attr];

      function toString(value){
        return value.toString ? value.toString() : value + "";
      }

      function toFunc(body){
        return ( body
          .split("\n").join("")
          .split("\r").join("")
          .split("\t").join(" ")
          .split("     ").join(" ")
          .split("    ").join(" ")
          .split("   ").join(" ")
          .split("  ").join(" ")
          .slice(0, 100)
        );
      }

      try {
        value = o[a];
      } catch(e){
        test = Object.getOwnPropertyDescriptor(object, attr);
        if (test.get){
          body = toFunc(test.get.toString());
          return H.format("  %s: GETTER %s (...)", attr, body);
        } else if (test.set){
          body = toFunc(test.set.toString());
          return H.format("  %s: SETTER %s (...)", attr, body);
        } else {
          return H.format("  %s: VALUEERROR", attr);
        }
      }

      switch (typeof o[a]) {

        case "string":
        case "number":
        case "undefined":
        case "boolean":   
          return H.format("  %s: %s (%s)", attr, (typeof o[a]).toUpperCase(), o[a] + "");

        case "object":

          if (Array.isArray(o[a])){
            return H.format("  %s: ARRAY [%s](%s, ...)", attr, o[a].length, o[a].map(toString).slice(0, 5).join(", "));

          } else if (o[a] instanceof Map) {
            keys = [...o[a].keys()];
            return H.format("  %s: MAP [%s](%s, ...)", attr, keys.length, keys.slice(0, 5).join(", "));

          } else if (o[a] === null) {
            return H.format("  %s: NULL", attr);

          } else {
            keys = Object.keys(o[a]);
            return H.format("  %s: OBJECT [%s](%s, ...)", attr, keys.length, keys.slice(0, 5).join(", "));

          }
          break;

        case "function":
          body = toFunc(o[a].toString());
          return H.format("  %s: FUNCTION %s (...)", attr, body);

        default: 
          H.throw("UNKNOWN TYPE '%s' in getAttribType", typeof o[a]);
      }

      return "WTF";
    },

  });


return H; }(HANNIBAL));


// used in JSON Export
// function logg(){
//   var args = arguments;
//   if (args.length === 0) {args = ["//"];}
//   if (args.length === 1) {args = ["%s", args[0]];}
//   print(HANNIBAL.format.apply(HANNIBAL, args) + "\n");
// }



// var debTable = function (header, table, sort){
//   // has dependencies
//   var 
//     H = HANNIBAL,
//     line, lengths = [],
//     cols = table[0].length,
//     space = H.mulString(" ", 100);

//   H.loop(cols, () => lengths.push(0));

//   table.forEach(row => {
//     H.loop(cols, col => {
//       var str = String(row[col -1]);
//       if (str.length > lengths[col -1]){lengths[col -1] = str.length;}
//     });
//   });

//   deb("------: start %s", header || "table");
//   table
//     .sort((a,b) => a[sort] < b[sort] ? -1 : 1)
//     .forEach((row, i) => {
//       line = H.format("      : %s ", H.tab(i, 4));
//       row.forEach((item, col) => line += (item + space).slice(0, lengths[col] + 1));
//       deb(line);
//     });

//   deb("------: %s ", header || "table");


// };

// function exportJSON (obj, filename){

//   var 
//     H = HANNIBAL,
//     file  = H.format("/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/%s.export", filename),
//     lines = JSON.stringify(obj, null, "  ").split("\n"),
//     count = lines.length;

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();
//   deb("EXPORT: ", filename);
//   deb("EXPORT: %s", file);

//   print(H.format("#! open 0 %s\n", file));
//   logg("// EXPORTED %s at %s", filename, new Date());

//   lines.forEach(line => logg(line));
//   // lines.forEach(logg);
  
//   logg("// Export end of %s", filename);
//   print("#! close 0\n");
//   deb("EXPORT: Done");

//   return count;

// }

// function logPrettyJSON(obj, header){

//   var attr, json;

//   if(header){deb(header);}

//   json = JSON.stringify(obj);

//   if (json.length < 80){
//     deb(json);
//   } else {
//     Object.keys(obj).sort().forEach(attr => {
//       logPrettyJSON(obj[attr]);
//     });
//   }

// }


// function logJSON(obj, header){
//   var lines = JSON.stringify(obj, null, "  ").split("\n");
//   deb("   LOG: JSON: %s", header);
//   lines.forEach(line => deb("      " + line));
//   deb("   LOG: ----------");
// }


// function exportTemplates (tpls){

//   var 
//     H = HANNIBAL,
//     filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/templates-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();
//   deb("EXPORT: templates");
//   deb("EXPORT: %s", filePattern);

//   print(H.format("#! open 0 %s\n", filePattern));
//   logg("// EXPORTED templates at %s", new Date());
//   JSON.stringify(tpls, null, "  ")
//     .split("\n")
//     .forEach(line => {
//       logg(line);
//     });
//   logg("// Export end of templates");
//   print("#! close 0\n");
//   deb("EXPORT: Done");

// }

// function exportTechTemplates (tpls){

//   var 
//     H = HANNIBAL,
//     filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/techtemplates-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();
//   deb("EXPORT: techtemplates");
//   deb("EXPORT: %s", filePattern);

//   print(H.format("#! open 0 %s\n", filePattern));
//   logg("// EXPORTED techtemplates at %s", new Date());
//   JSON.stringify(tpls, null, "  ")
//     .split("\n")
//     .forEach(line => {
//       logg(line);
//     });
//   logg("// Export end of techtemplates");
//   print("#! close 0\n");
//   deb("EXPORT: Done");

// }

// function exportTree (tree) {

//   var 
//     t, procs, prods,
//     tt = this.nodes, tpls = H.attribs(this.nodes),
//     filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }   

//   deb("  TREE: Export start ...");
//   print(H.format("#! open 0 %s\n", H.format(filePattern, this.civ)));
//   logg("// EXPORTED tree '%s' at %s", this.civ, new Date());

//   tpls.sort((a, b) => tt[a].order - tt[b].order);

//   tpls.forEach(function(tpln){

//     t = tt[tpln];

//     logg("     T:   %s %s %s %s", t.order, t.type, t.phase, t.name);
//     logg("     T:        d: %s,  o: %s", H.tab(t.depth, 4), H.tab(t.operations, 4));
//     logg("     T:        %s", t.key);
//     logg("     T:        reqs: %s", t.requires || "none");
//     logg("     T:        flow: %s", t.flow ? JSON.stringify(t.flow) : "none");

//     logg("     T:        verb: %s", t.verb || "none");
//     prods = H.attribs(t.producers);
//     if (prods.length){
//       prods.forEach(p => logg("     T:          %s", p));
//     } else {
//       logg("     T:        NO PRODUCER");
//     }

//     logg("     T:        products: %s", t.products.count);
//     if (t.products.count){
//       ["train", "build", "research"].forEach(verb => {
//         procs = H.attribs(t.products[verb]);
//         if (procs.length){
//           logg("     T:          %s", verb);
//           procs.forEach(p => logg("     T:            %s", p));
//         }
//       });
//     }

//   });

//   print("#! close 0\n");
//   deb("  TREE: Export Done ...");

// }


// function exportStore(civs){

//   // log history > 3,000 per civ, athens~2500, CRs not enforced.

//   var filePattern = "/home/noiv/.local/share/0ad/mods/public/simulation/ai/hannibal/explorer/data/%s-01-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();deb();deb("EXPORT: %s", civs);

//   civs.forEach(function(civ){
//     print(H.format("#! open 0 %s\n", H.format(filePattern, civ)));
//     logg("// EXPORTED culture '%s' at %s", civ, new Date());
//     var culture = new H.Culture(civ), store = culture.store;
//     culture.loadDataNodes();           // from data to triple store
//     culture.readTemplates();           // from templates to culture
//     culture.loadTechTemplates();       // from templates to triple store
//     culture.loadTemplates();           // from templates to triple store
//     culture.finalize();                // clear up
//     logg("var store_%s = {", civ);
//       logg("  verbs: %s,", JSON.stringify(store.verbs));
//       logg("  nodes: {");
//       H.each(store.nodes, function(name, value){
//         delete value.template;
//         logg("    '%s': %s,", name, JSON.stringify(value));
//       });
//       logg("  },");
//       logg("  edges: [");
//       store.edges.forEach(function(edge){
//         logg("    ['%s', '%s', '%s'],", edge[0].name, edge[1], edge[2].name);
//       });
//       logg("  ],");
//     logg("};");
//     logg("// Export end of culture %s", civ);
//     print("#! close 0\n");
//   });


// }

  // if (head === "ERROR :" && level > 0){
  //   print(msg);
  // } else if (head === "WARN  :" && level > 1){
  //   print(msg);
  // } else if (head === "INFO  :" && level > 1){
  //   print(msg);
  // } else if (level > 2){
  //   print(msg);
  // } else {
  //   // do nothing
  // }


// function debug(){
//   if (HANNIBAL.Config.debug){
//     warn(H.format.apply(H, H.toArray(arguments)));
//   }
// }
// function debugE(){
//   if (HANNIBAL.Config.debug){
//     error(H.format.apply(H, H.toArray(arguments)));
//   }
// }




// var debTemplates = function(templates){

//   var counter = 0;

//   deb(" TEMPL: %s ----------------------", H.attribs(templates).length);

//   // function getAttr(o){
//   //   if (o["Armour"] && o["Armour"]["Hack"] && ~~o["Armour"]["Hack"] > 7){
//   //     return(H.format("Armour.Hack: %s", o["Armour"]["Hack"]));
//   //   } else {
//   //     return false;
//   //   }

//   // }

//   // logObject(templates, "templates");

//     // Object [unidentified] : templates  ---------------
//     // Object  constructor: function Object() {[native code]}
//       // campaigns/army_mace_hero_alexander: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]
//       // campaigns/army_mace_standard: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[26]
//       // campaigns/army_spart_hero_leonidas: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]


//   var props = {};

//   H.each(templates, function(key, tpl){

//     if (counter < 30) {
//       // logObjectShort(tpl);
//       // if (getAttr(tpl)){
//       //   deb("  > %s", key);
//       //   deb("      @%s", tpl["@parent"]);
//       //   deb("      ", getAttr(tpl))
//       //   counter += 1;
//     }

//     H.attribs(tpl).forEach(function(attr){

//       if (props[attr] === undefined) {
//         props[attr]  = 0;
//       } else {
//         props[attr]  += 1;        
//       }

//     });



//   });

//   var sorted = H.attribs(props).sort(function(a, b){return props[b] > props[a]; });

//   sorted.forEach(function(attr){
//     deb("  %s: %s", attr, props[attr]);
//   });

//   deb(" TEMPL: ----------------------");

// };



// var logError = function(e, msg){
//   // used in try/catch
//   deb("  ");
//   deb(" Error: %s | %s", msg||"", e.message);
//   deb("      : %s [%s]", e.fileName, e.lineNumber);
//   deb("  ");

// };

// // loggable functions
// function logFn(fn){return fn.toString().split("\n").join("").slice(0, 80);}

// // from events
// var logDispatcher = function (){
//   deb("  "); deb("      : Dispatcher");
//   H.each(H.Dispatcher, function(id, ar){
//     var tpl = H.Entities[id] ? H.Entities[id]._templateName : "???";
//     deb("  %s: len: %s, tpl: %s", H.tab(id, 4), ar.length, tpl);
//   });
//   deb("  "); 
// };


// var dumpPassability = function(mapname, passability){

//   // dumps all bits into single files
//   // works nicely with Gimp's File > open as Layers

//   var 
//     i, b, w = passability.width, h = passability.height, 
//     pass = passability.data, len = pass.length;

//   deb(); deb("DUMP  : passability %s, %s, %s", mapname, w, h);

//   [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512].forEach(b => {

//     var data = [];
//     i = len;
//     while (i--){
//       data[i] = pass[i] & b ? 128 : 255; // set bits are grey, not set white
//     }
//     data.length = len;
//     Engine.DumpImage(mapname + "-passability-" + b + ".png", data, w, h, 255);    

//   });

// };






// /* play area */

// try {

//   // deb("------: Techs");
//   // H.each(H.TechTemplates, function(name, tech){
//   //   if (tech.modifications){
//   //     var aff = tech.affects ? uneval(tech.affects) : "";
//   //     var req = tech.requirements ? uneval(tech.requirements) : "";
//   //     var mod = tech.modifications ? uneval(tech.modifications) : "";
//   //     deb("%s;%s;%s;%s;%s", name, tech.genericName||"", req, aff, mod);
//   //   }
//   // });
//   // deb("------: Techs end");


// } catch(e){logError(e, "play area");} 

/* end play area */

// /* Export functions */

// if (false){
//   // activate to log tech templates
//   deb("-------- _techTemplates");
//   deb("var techTemplates = {");
//   H.attribs(ss._techTemplates).sort().forEach(function(tech){
//     deb("'%s': %s,", tech, JSON.stringify(ss._techTemplates[tech]));
//   });
//   deb("};");
//   deb("-------- _techTemplates");
//   H.Config.deb = 0;
// }

// /* list techs and their modifications */

// if (false){

//   deb();deb();deb("      : Technologies ---------");
//   var affects, modus, table = [];
//   H.each(H.Technologies, function(key, tech){
//     if (tech.modifications){
//       tech.modifications.forEach(function(mod){
//         modus = (
//           mod.add      !== undefined ? "add"      :
//           mod.multiply !== undefined ? "multiply" :
//           mod.replace  !== undefined ? "replace"  :
//             "wtf"
//         );
//         affects = tech.affects ? tech.affects.join(" ") : mod.affects ? mod.affects : "wtf";
//         table.push([H.saniTemplateName(key), mod.value, modus, mod[modus], affects]);
//       });
//     }
//   });
//   debTable("TEX", table, 1);
//   deb("      : end ---------");
//   H.Config.deb = 0;

// }

// /* end techs and their modifications */










// Object: playersData(me)  ---------------
//   cheatsEnabled: BOOLEAN (false)
//   civ: STRING (athen)
//   classCounts: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]
//   colour: OBJECT (r, g, b, a, ...)[4]
//   entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//   entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//   heroes: ARRAY (, ...)[0]
//   isAlly: ARRAY (false, true, false, ...)[3]
//   isEnemy: ARRAY (true, false, true, ...)[3]
//   isMutualAlly: ARRAY (false, true, false, ...)[3]
//   isNeutral: ARRAY (false, false, false, ...)[3]
//   name: STRING (Player 1)
//   phase: STRING (village)
//   popCount: NUMBER (17)
//   popLimit: NUMBER (20)
//   popMax: NUMBER (300)
//   researchQueued: OBJECT (, ...)[0]
//   researchStarted: OBJECT (, ...)[0]
//   researchedTechs: OBJECT (phase_village, ...)[1]
//   resourceCounts: OBJECT (food, wood, metal, stone, ...)[4]
//   state: STRING (active)
//   statistics: OBJECT (unitsTrained, unitsLost, unitsLostValue, enemyUnitsKilled, enemyUnitsKilledValue, ...)[21]
//   team: NUMBER (-1)
//   teamsLocked: BOOLEAN (false)
//   techModifications: OBJECT (, ...)[0]
//   trainingBlocked: BOOLEAN (false)
//   typeCountsByClass: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]


// keep that 
// logObject(API3, "API3");
// logObject(HANNIBAL, "HANNIBAL");
// logObject(gameState, "gameState");
// logObject(global, "global");
// logObject(Map, "Map");
// logObject(global.Engine, "Engine");
// logObject(this.entities, "entities");


// logObject(ss.resourceMaps['food'].map, "ss.resourceMaps['food'].map");
// logObject(ss.resourceMaps['food'], "ss.resourceMaps['food']");

// logObject(H.Bot.gameState.ai.territoryMap, "H.Bot.gameState.ai.territoryMap");

// logObject(ss._techTemplates['phase_city'], "phase_city");
// logObject(ss._techTemplates['phase_town_athen'], "phase_town_athen");
// logObject(ss._techTemplates['pair_gather_01'], "pair_gather_01");
// logObject(ss._techTemplates['heal_range'], "heal_range");
// logObject(ss._techTemplates['heal_temple'], "heal_temple");

 // logObject(H.Templates["units/athen_support_female_citizen"], "units/athen_support_female_citizen");

// logObject(ss._techTemplates, "ss._techTemplates");
// logObject(sharedScript, "sharedScript");
// logObject(sharedScript.gameState, "sharedScript.gameState");
// logObject(sharedScript.events, "events");
// logObject(sharedScript.playersData, "playersData");
// logObject(sharedScript.playersData[this.id], "playersData(me)");
// logObject(sharedScript.playersData[this.id], "Hannibal");
// logObject(sharedScript.playersData[this.id].statistics, "Statistics");
// logObject(EntityCollection, "EntityCollection"); // that's strange
// logObject(new Entity(sharedScript, entity), "EntityTemplate");
// logObject(sharedScript.passabilityClasses, "sharedScript.passabilityClasses");
// logObject(sharedScript.passabilityMap, "sharedScript.passabilityMap");
// logObject(sharedScript.territoryMap, "sharedScript.territoryMap");


// H.QRY("PAIR DISTINCT").execute("metadata", 5, 10, "paired techs");
// H.QRY("TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");

// H.QRY("gather.lumbering.ironaxes").execute("metadata", 5, 10, "check");

// new H.HCQ(ts, "INGAME WITH metadata.opname = 'none'").execute("metadata", 5, 10, "all ingame entities");
// new H.HCQ(ts, "INGAME WITH id = 44").execute("metadata", 5, 10, "entity with id");
// new H.HCQ(ts, "INGAME").execute("position", 5, 10, "ingames with position");

// new H.HCQ(ts, "INGAME SORT < id").execute("metadata", 5, 80, "ingames with metadata");

// new H.HCQ(ts, "TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");
// new H.HCQ(ts, "stone ACCEPTEDBY INGAME").execute("metadata", 5, 20, "stone drop");

// new H.HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food MEMBER DISTINCT HOLDBY INGAME").execute("json", 5, 10, "optional update test");

// new H.HCQ(ts, "civilcentre CONTAIN").execute("node", 5, 10, "civilcentre via class");
// new H.HCQ(ts, "food.grain PROVIDEDBY").execute("node", 5, 10, "civilcentre via class");
// new H.HCQ(ts, "food.grain PROVIDEDBY").execute("node", 5, 10, "civilcentre via class");

// new H.HCQ(ts, "structures.athen.civil.centre MEMBER").execute("node", 5, 10, "classes of civilcentre");

// new H.HCQ(ts, "food.grain PROVIDEDBY").execute("costs", 5, 10, "entities providing food.grain");
// new HCQ(ts, "HOLD CONTAIN").execute("node", 5, 10, "all garissonable entities");
// new HCQ(ts, "infantry HOLDBY").execute("node", 5, 10, "entities holding infantry");
// new HCQ(ts, "support, infantry HOLDBY").execute("node", 5, 10, "entities holding infantry, support");
// new HCQ(ts, "healer, hero").execute("", 5, 10, "classes: healer, hero");
// new HCQ(ts, "healer, hero CONTAIN").execute("costs", 5, 10, "entities from classes: healer, hero");
// new HCQ(ts, "healer, hero CONTAIN SORT > costs.metal").execute("costs", 5, 10, "entities from classes: healer, hero");
// new HCQ(ts, "infantry CONTAIN SORT > costs.metal").execute("costs", 5, 20, "entities from classes: healer, hero, sorted by metal");
// new HCQ(ts, "support, infantery HOLDBY SORT > capacity").execute("capacity", 5, 10, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.wood = 0").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "food.grain PROVIDEDBY WITH civ = athen").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.wood = 0 MEMBER HOLDBY").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "units.athen.support.female.citizen.house REQUIRE", 2).execute("node", 5, 10, "testing for required tech");
// new HCQ(ts, "DESCRIBEDBY").execute("node", 5, 10, "trainer for");
// new HCQ(ts, "INGAME").execute("node", 5, 10, "trainer for");
// new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY").execute("node", 5, 10, "trainer for");
// new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY INGAME").execute("node", 5, 10, "in game trainer for");
// new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY DESCRIBEDBY").execute("node", 5, 10, "in game trainer for");
// new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food").execute("costs", 5, 10, "in game trainer for");
