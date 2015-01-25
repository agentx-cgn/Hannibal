

// Helper object for Hannibal's RMG

"use strict";

var H = {

  fmt:     function (){var a=H.toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join("");},
  toArray: function (a){return Array.prototype.slice.call(a);},
  deb:     function (){var s = H.fmt.apply(null, arguments); print("RMG   : " + s + "\n");},

  biomes: {
    "1" : "temperate",
    "2" : "snowy",
    "3" : "desert",
    "4" : "alpine",
    "5" : "medit",
    "6" : "savanah",
    "7" : "tropic",
    "8" : "autumn",
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
      .forEach(a => H.deb(this.getAttribType(a, o[a])));
  },
  getAttribType: function(name, value){

    var keys, body;

    function toString(value){
      return value.toString ? value.toString() : value+"";
    }

    switch (typeof value) {
      case "string":
      case "number":
      case "undefined":
      case "boolean":   
        return H.format("  %s: %s (%s)", name, (typeof value).toUpperCase(), value);
      case "object":
        
        if (Array.isArray(value)){
          return H.format("  %s: ARRAY [%s](%s, ...)", name, value.length, value.map(toString).slice(0, 5).join(", "));
        
        } else if (o instanceof Map) {
          keys = o.entries();
          return H.format("  %s: MAP [%s](%s, ...)", name, keys.length, keys.slice(0, 5).join(", "));
        
        } else if (value === null) {
          return H.format("  %s: NULL", name);
        
        } else {
          keys = Object.keys(value);
          return H.format("  %s: OBJECT [%s](%s, ...)", name, keys.length, keys.slice(0, 5).join(", "));
        
        }
      break;
      case "function":
        body = value.toString()
          .split("\n").join("")
          .split("\r").join("")
          .split("\t").join(" ")
          .split("     ").join(" ")
          .split("    ").join(" ")
          .split("   ").join(" ")
          .split("  ").join(" ")
          .slice(0, 100);
        return H.format("  %s: FUNCTION %s (...)", name, body);
    }
    return "WTF";
  },

};