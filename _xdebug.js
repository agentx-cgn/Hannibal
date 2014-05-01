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
  var H = HANNIBAL,
      args = arguments, al = args.length,
      msg = (
        (al === 0) ? "**" :
        (al === 1) ? args[0] :
          H.format.apply(H, args)
        ) + "\n",
      level = H.Config.deb,
      head = msg.substr(0, 7).toUpperCase();

  if (head === "ERROR :" && level > 0){
    print(msg);
  } else if (head === "WARN  :" && level > 1){
    print(msg);
  } else if (level > 2){
    print(msg);
  } else {
    // do nothing
  }
}


function debug(){
  if (HANNIBAL.Config.debug){
    warn(H.format.apply(H, H.toArray(arguments)));
  }
}
function debugE(){
  if (HANNIBAL.Config.debug){
    error(H.format.apply(H, H.toArray(arguments)));
  }
}

var logObject = function(o, msg){
  var inst = "unidentified";
  msg = msg || "";
  deb();
  deb("Object [%s] : %s  ---------------", inst, msg);
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

var logCollection = function(col, msg){

  var counter = 0;

  deb(" ECOLL: %s (%s) ----------------------", msg, col.length);

  col.toEntityArray().forEach(function(ent){

    // if (counter++ < 5){

      // logObjectShort(ent);
      deb("        Template: %s", ent._templateName);

    // }


  });

  // deb(" ECOLL: ------------------------------");

};

var logEvent = function(event){

  var et = event.type.toUpperCase(),
      mg = event.msg,
      at = H.attribs(mg).join(", ");

  function logMeta(meta){
    H.each(meta, function(attr) {
      deb("      metadata.%s: {%s}", attr, getAttribType(attr, meta[attr]));
    });
  }

  switch (event.type){

    case "Create":
      deb("    %s: {%s} {%s}", et, getAttribType("entity", mg.entity), at);
      // logObject(mg);
    break;
    
    case "TrainingFinished":
      deb("    %s: owner: %s, ents: [%s] , {%s}", et, mg.owner, mg.entities.join(", "), at);
    break;

    case "Destroy":
      deb("    %s: %s {%s}", et, getAttribType("entity", mg.entity), at);
      deb("      entityObj: {%s}", getAttribType("entityObj", mg.entityObj));
      // logObject(mg);
    break;
    
    case "EntityRenamed":
      deb("    %s: ent:{%s}, newentity:{%s}", et, getAttribType("entity", mg.entity), getAttribType("newentity", mg.newentity));
    break;

    case "ConstructionFinished":
      deb("    %s: ent:{%s}, newentity:{%s}", et, getAttribType("entity", mg.entity), getAttribType("newentity", mg.newentity));
    break;

    case "AIMetadata":
      deb("    %s: owner: %s, id: %s {%s}", et, mg.owner, mg.id, at);
    break;

    case "Attacked":
      deb("    %s: attacker: %s, damage: %s, target: %s, type: %s", et, mg.attacker, mg.damage.toFixed(1), mg.target, mg.type);
    break;

    default:
      deb("    %s unknown {%s}", event.type, at);
      logObject(event.msg);
      // deb("    %s: %s", et, getAttribType("entity", event.entity));

    break;

  }

  logMeta(mg.metadata);

};

var logEvents = function(events){

  var i;

  if (events.length){

    // deb("  ");
    deb("EVENTS: %s ----------------------", events.length);

    for (i in events){
      logEvent(events[i]);
    }
    // deb("  ");

  }

};




var logError = function(e, msg){
  // used in try/catch
  deb("  ");
  deb(" Error: %s | %s", msg||"", e.message);
  deb("      : %s [%s]", e.fileName, e.lineNumber);
  deb("  ");

};

