/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, TESTERDATA, warn, error, print */

/*--------------- D E B U G  --------------------------------------------------

  global functions for debugging, mainly to output to STD/dbgView
  http://trac.wildfiregames.com/wiki/Logging

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

// caller not allowed :( http://trac.wildfiregames.com/ticket/487
// var debC = new Function("print ('> ' + debC.caller.name); 
// print(H.format.apply(H, H.toArray(arguments)));");

// used in JSON Export
function logg(){
  var args = arguments;
  if (args.length === 0) {args = ["//"];}
  if (args.length === 1) {args = ["%s", args[0]];}
  print(HANNIBAL.format.apply(HANNIBAL, args) + "\n");
}

function deb(){
  var 
    H = HANNIBAL,
    args = arguments, al = args.length,
    msg = (
      (al === 0) ? "**\n**" :
      (al === 1) ? args[0] :
        H.format.apply(H, args)
      ) + "\n",
    prefix = msg.substr(0, 7).toUpperCase(),
    deblevel = H.Config.deb || 0,
    msglevel = (
      prefix === "ERROR :" ? 1 :
      prefix === "WARN  :" ? 2 :
      prefix === "INFO  :" ? 3 :
        4
    );

  if (msglevel <= deblevel){print(msg);}

}

var debTable = function (header, table, sort){
  // has dependencies
  var 
    H = HANNIBAL,
    line, lengths = [],
    cols = table[0].length,
    space = H.mulString(" ", 100);

  H.loop(cols, () => lengths.push(0));

  table.forEach(row => {
    H.loop(cols, col => {
      var str = String(row[col -1]);
      if (str.length > lengths[col -1]){lengths[col -1] = str.length;}
    });
  });

  deb("------: start %s", header || "table");
  table
    .sort((a,b) => a[sort] < b[sort] ? -1 : 1)
    .forEach((row, i) => {
      line = H.format("      : %s ", H.tab(i, 4));
      row.forEach((item, col) => line += (item + space).slice(0, lengths[col] + 1));
      deb(line);
    });

  deb("------: %s ", header || "table");


};

function exportJSON (obj, filename){

  var 
    H = HANNIBAL,
    file  = H.format("/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/%s.export", filename),
    lines = JSON.stringify(obj, null, "  ").split("\n"),
    count = lines.length;

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();
  deb("EXPORT: ", filename);
  deb("EXPORT: %s", file);

  print(H.format("#! open 0 %s\n", file));
  logg("// EXPORTED %s at %s", filename, new Date());

  lines.forEach(line => logg(line));
  // lines.forEach(logg);
  
  logg("// Export end of %s", filename);
  print("#! close 0\n");
  deb("EXPORT: Done");

  return count;

}



function exportTemplates (tpls){

  var 
    H = HANNIBAL,
    filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/templates-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();
  deb("EXPORT: templates");
  deb("EXPORT: %s", filePattern);

  print(H.format("#! open 0 %s\n", filePattern));
  logg("// EXPORTED templates at %s", new Date());
  JSON.stringify(tpls, null, "  ")
    .split("\n")
    .forEach(line => {
      logg(line);
    });
  logg("// Export end of templates");
  print("#! close 0\n");
  deb("EXPORT: Done");

}

function exportTechTemplates (tpls){

  var 
    H = HANNIBAL,
    filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/techtemplates-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();
  deb("EXPORT: techtemplates");
  deb("EXPORT: %s", filePattern);

  print(H.format("#! open 0 %s\n", filePattern));
  logg("// EXPORTED techtemplates at %s", new Date());
  JSON.stringify(tpls, null, "  ")
    .split("\n")
    .forEach(line => {
      logg(line);
    });
  logg("// Export end of techtemplates");
  print("#! close 0\n");
  deb("EXPORT: Done");

}

function exportTree (tree) {

  var 
    t, procs, prods,
    tt = this.nodes, tpls = H.attribs(this.nodes),
    filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }   

  deb("  TREE: Export start ...");
  print(H.format("#! open 0 %s\n", H.format(filePattern, this.civ)));
  logg("// EXPORTED tree '%s' at %s", this.civ, new Date());

  tpls.sort((a, b) => tt[a].order - tt[b].order);

  tpls.forEach(function(tpln){

    t = tt[tpln];

    logg("     T:   %s %s %s %s", t.order, t.type, t.phase, t.name);
    logg("     T:        d: %s,  o: %s", H.tab(t.depth, 4), H.tab(t.operations, 4));
    logg("     T:        %s", t.key);
    logg("     T:        reqs: %s", t.requires || "none");
    logg("     T:        flow: %s", t.flow ? JSON.stringify(t.flow) : "none");

    logg("     T:        verb: %s", t.verb || "none");
    prods = H.attribs(t.producers);
    if (prods.length){
      prods.forEach(p => logg("     T:          %s", p));
    } else {
      logg("     T:        NO PRODUCER");
    }

    logg("     T:        products: %s", t.products.count);
    if (t.products.count){
      ["train", "build", "research"].forEach(verb => {
        procs = H.attribs(t.products[verb]);
        if (procs.length){
          logg("     T:          %s", verb);
          procs.forEach(p => logg("     T:            %s", p));
        }
      });
    }

  });

  print("#! close 0\n");
  deb("  TREE: Export Done ...");

}


function exportStore(civs){

  // log history > 3,000 per civ, athens~2500, CRs not enforced.

  var filePattern = "/home/noiv/.local/share/0ad/mods/public/simulation/ai/hannibal/explorer/data/%s-01-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();deb();deb("EXPORT: %s", civs);

  civs.forEach(function(civ){
    print(H.format("#! open 0 %s\n", H.format(filePattern, civ)));
    logg("// EXPORTED culture '%s' at %s", civ, new Date());
    var culture = new H.Culture(civ), store = culture.store;
    culture.loadDataNodes();           // from data to triple store
    culture.readTemplates();           // from templates to culture
    culture.loadTechTemplates();       // from templates to triple store
    culture.loadTemplates();           // from templates to triple store
    culture.finalize();                // clear up
    logg("var store_%s = {", civ);
      logg("  verbs: %s,", JSON.stringify(store.verbs));
      logg("  nodes: {");
      H.each(store.nodes, function(name, value){
        delete value.template;
        logg("    '%s': %s,", name, JSON.stringify(value));
      });
      logg("  },");
      logg("  edges: [");
      store.edges.forEach(function(edge){
        logg("    ['%s', '%s', '%s'],", edge[0].name, edge[1], edge[2].name);
      });
      logg("  ],");
    logg("};");
    logg("// Export end of culture %s", civ);
    print("#! close 0\n");
  });


}

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

var logObject = function(o, msg){
  var inst = "unidentified";
  msg = msg || "";
  deb();
  deb("Object [%s] : c: %s, keys: %s  ---------------", inst, msg, Object.keys(o).length);
  if (o.constructor){
    deb("Object", getAttribType("constructor", o.constructor));
  }
  logObjectShort(o);
  deb("Object.__proto__");
  logObjectShort(o.__proto__);
  deb("Object.prototype");
  if (o.prototype){
    logObjectShort(o.prototype);
  }
  deb();
};

var logObjectShort = function(o){
  HANNIBAL.attribs(o)
    .sort()
    // .map(function(a){return getAttribType(a, o[a]);})
    // .forEach(function(line){deb(line);});
    .map(function(a){deb(getAttribType(a, o[a]));});
};

var getAttribType = function(name, value){

  var H = HANNIBAL, keys;

  function toString(value){
    return value.toString ? value.toString() : value+"";
  }

  switch (typeof value) {
    case "string":
    case "number":
    case "undefined":
    case "boolean":   return H.format("  %s: %s (%s)", name, (typeof value).toUpperCase(), value);
    case "object":
      if (Array.isArray(value)){
        return H.format("  %s: ARRAY [%s](%s, ...)", name, value.length, value.map(toString).slice(0, 5).join(", "));
      } else if (value === null) {
        return H.format("  %s: NULL", name);
      } else {
        keys = Object.keys(value);
        return H.format("  %s: OBJECT [%s](%s, ...)", name, keys.length, keys.slice(0, 5).join(", "));
      }
    break;
    case "function":
      return H.format("  %s: %s", name, value.toSource().split("\n").join("").slice(0, 60));
  }
  return "WTF";
};


var debTemplates = function(templates){

  var counter = 0;

  deb(" TEMPL: %s ----------------------", H.attribs(templates).length);

  // function getAttr(o){
  //   if (o["Armour"] && o["Armour"]["Hack"] && ~~o["Armour"]["Hack"] > 7){
  //     return(H.format("Armour.Hack: %s", o["Armour"]["Hack"]));
  //   } else {
  //     return false;
  //   }

  // }

  // logObject(templates, "templates");

    // Object [unidentified] : templates  ---------------
    // Object  constructor: function Object() {[native code]}
      // campaigns/army_mace_hero_alexander: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]
      // campaigns/army_mace_standard: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[26]
      // campaigns/army_spart_hero_leonidas: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]


  var props = {};

  H.each(templates, function(key, tpl){

    if (counter < 30) {
      // logObjectShort(tpl);
      // if (getAttr(tpl)){
      //   deb("  > %s", key);
      //   deb("      @%s", tpl["@parent"]);
      //   deb("      ", getAttr(tpl))
      //   counter += 1;
    }

    H.attribs(tpl).forEach(function(attr){

      if (props[attr] === undefined) {
        props[attr]  = 0;
      } else {
        props[attr]  += 1;        
      }

    });



  });

  var sorted = H.attribs(props).sort(function(a, b){return props[b] > props[a]; });

  sorted.forEach(function(attr){
    deb("  %s: %s", attr, props[attr]);
  });

  deb(" TEMPL: ----------------------");

};



// var logError = function(e, msg){
//   // used in try/catch
//   deb("  ");
//   deb(" Error: %s | %s", msg||"", e.message);
//   deb("      : %s [%s]", e.fileName, e.lineNumber);
//   deb("  ");

// };

// loggable functions
function logFn(fn){return fn.toString().split("\n").join("").slice(0, 80);}

// from events
var logDispatcher = function (){
  deb("  "); deb("      : Dispatcher");
  H.each(H.Dispatcher, function(id, ar){
    var tpl = H.Entities[id] ? H.Entities[id]._templateName : "???";
    deb("  %s: len: %s, tpl: %s", H.tab(id, 4), ar.length, tpl);
  });
  deb("  "); 
};


var dumpPassability = function(mapname, passability){

  // dumps all bits into single files
  // works nicely with Gimp's File > open as Layers

  var 
    i, b, w = passability.width, h = passability.height, 
    pass = passability.data, len = pass.length;

  deb(); deb("DUMP  : passability %s, %s, %s", mapname, w, h);

  [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512].forEach(b => {

    var data = [];
    i = len;
    while (i--){
      data[i] = pass[i] & b ? 128 : 255; // set bits are grey, not set white
    }
    data.length = len;
    Engine.DumpImage(mapname + "-passability-" + b + ".png", data, w, h, 255);    

  });

};


var logStart = function(ss, gs, settings){

  var H = HANNIBAL, id = settings.player;

  deb("------: LAUNCHER.CustomInit: Players: %s, PID: %s, difficulty: %s", H.count(ss.playersData), id, settings.difficulty);
  deb();
  deb("     A:    map from tester:  %s", TESTERDATA ? TESTERDATA.map : "unkown");
  deb("     A:                map: w: %s, h: %s, c: %s, cells: %s", ss.passabilityMap.width, ss.passabilityMap.height, ss.circularMap, gs.cellSize);
  deb("     A:          _entities: %s [  ]", H.count(ss._entities));
  deb("     A:         _templates: %s [  ]", H.count(ss._templates));
  deb("     A:     _techTemplates: %s [  ]", H.count(ss._techTemplates));
  deb("     H: _techModifications: %s [%s]", H.count(ss._techModifications[id]), H.attribs(ss._techModifications[id]));
  deb("     H:     researchQueued: %s [  ]", H.count(ss.playersData[id].researchQueued));
  deb("     H:    researchStarted: %s [  ]", H.count(ss.playersData[id].researchStarted));
  deb("     H:    researchedTechs: %s [%s]", H.count(ss.playersData[id].researchedTechs), H.attribs(ss.playersData[id].researchedTechs).join(", "));
  deb("     A:       barterPrices: %s", H.prettify(ss.barterPrices));

};

var logPlayers = function(players){

  var 
    H = HANNIBAL, tab = H.tab, msg = "", head, props, format, tabs,
    fmtAEN = item => item.map(b => b ? "1" : "0").join("");

  deb();

  head   = "name, team, civ, phase,      pop,   ally,    enmy,      neut".split(", ");
  props  = "name, team, civ, phase, popCount, isAlly, isEnemy, isNeutral".split(", ");
  tabs   = [  10,    6,   8,    10,        5,      6,       6,         6];
  format = {
    isAlly:    fmtAEN,
    isEnemy:   fmtAEN,
    isNeutral: fmtAEN
  };

  H.zip(head, tabs, function(h, t){msg += tab(h, t);});
  deb("PLAYER: " + msg);

  H.each(players, function(id, player){
    msg = "";
    H.zip(props, tabs, function(p, t){
      msg += (format[p]) ? tab(format[p](player[p]), t) : tab(player[p], t);
    });    
    deb("     %s: %s", id, msg);
  });

};

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
