/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Hannibal, H, deb, getAttribType, warn, error, print */

/*--------------- D E B U G  --------------------------------------------------

  global functions for debugging, mainly to output to STD/dbgView
  http://trac.wildfiregames.com/wiki/Logging

  
  V: 0.1, agentx, CGN, Feb, 2014


*/

// var H = HANNIBAL;

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
      (al === 0) ? "**" :
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
  HANNIBAL.attribs(o).sort().map(function(a){
    return getAttribType(a, o[a]);
  }).forEach(function(line){deb(line);});
};

var getAttribType = function(name, value){

  var H = HANNIBAL;

  function toString(value){
    return value.toString ? value.toString() : value+"";
  }

  switch (typeof value) {
    case "string":
    case "number":
    case "undefined":
    case "boolean":
      return H.format("  %s: %s (%s)", name, (typeof value).toUpperCase(), value);
    break;
    case "object":
      if (Array.isArray(value)){
        return H.format("  %s: ARRAY [%s](%s, ...)", name, value.length, value.map(toString).slice(0, 5).join(", "));
      } else if (value === null) {
        return H.format("  %s: NULL", name);
      } else {
        return H.format("  %s: OBJECT [%s](%s, ...)", name, H.attribs(value).length, H.attribs(value).slice(0, 5).join(", "));
      }
    break;
    case "function":
      return H.format("  %s: %s", name, value.toSource().split("\n").join("").slice(0, 60));
    break;
  }
  return "WTF";
};


var debTemplates = function(templates){

  var counter = 0;

  deb(" TEMPL: %s ----------------------", H.attribs(templates).length);

  function getAttr(o){
    if (o["Armour"] && o["Armour"]["Hack"] && ~~o["Armour"]["Hack"] > 7){
      return(H.format("Armour.Hack: %s", o["Armour"]["Hack"]));
    } else {
      return false;
    }

  }

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

    })



  });

  var sorted = H.attribs(props).sort(function(a, b){return props[b] > props[a]; });

  sorted.forEach(function(attr){
    deb("  %s: %s", attr, props[attr])
  });

  deb(" TEMPL: ----------------------");

}



// var logError = function(e, msg){
//   // used in try/catch
//   deb("  ");
//   deb(" Error: %s | %s", msg||"", e.message);
//   deb("      : %s [%s]", e.fileName, e.lineNumber);
//   deb("  ");

// };


var logStart = function(ss, ss, id, settings){

  var H = HANNIBAL, id = settings.player

  deb("------: HANNIBAL.CustomInit: Players: %s, PID: %s, difficulty: %s", H.count(ss.playersData), id, settings.difficulty);
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

  var H = HANNIBAL, tab = H.tab, msg = "", head, props, format, tabs,
      fmtAEN = function(item){return item.map(function(b){return b ? "1" : "0";}).join("");};

  deb("**");deb("**");

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

};