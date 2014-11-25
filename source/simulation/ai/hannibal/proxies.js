/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- P R O X I E S -----------------------------------------------

  simplyfies accesing and switching API

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.Proxies = {

    Player : function(source){
      return new Proxy(source, {
        ownKeys: function () {return Object.keys(source)},
        get: function(proxy, id){
          return source[id];
        },
      });
    },

    Players : function(source){
      return new Proxy(source, {
        ownKeys: function () {return Object.keys(source)},
        get: function(proxy, id){
          return source[id];
        }
      });
    },

    Entities : function(source){
      return new Proxy(source, {
        ownKeys: function () {return Object.keys(source)},
        get: function(proxy, id){
          return source[id];
        }
      });
    },

    Templates : function(source){
      return new Proxy(source, {
        ownKeys: function (target) {return Object.keys(target)},
        get: function(proxy, id){
          return source[id];
        }
      });
    },

    // TechTemplates : function(source){
    //   return new Proxy(source, {
    //     ownKeys: function () {return Object.keys(source)},
    //     get: function(proxy, id){
    //       return source[id];
    //     }
    //   });
    // },

    TechModifications : function(techmodifications){
      return new Proxy(techmodifications, {
        ownKeys: function () {return Object.keys(techmodifications)},
        get: function(proxy, id){
          return techmodifications[id];
        }
      });
    },

    Technologies: function(technologies){
      var mapper = {};
      H.each(technologies, function(key){
        mapper[H.saniTemplateName(key)] = key;
      });
      return new Proxy(technologies, {
        ownKeys: function () {return Object.keys(technologies)},
        get: function(proxy, attr){
          var tpln = mapper[attr] || undefined;
          return (
            proxy[attr] !== undefined ? proxy[attr] : 
            proxy[tpln] !== undefined ? proxy[tpln] : 
            attr === "available"      ? function (techs){
              // deb("  HPT: checking %s against %s", techs, H.attribs(H.Player.researchedTechs));
              return techs.map(t => mapper[t]).every(t => !!H.Player.researchedTechs[t]); } :
            undefined
          );
        }
      });
    },
    MetaData: function(meta){
      return Proxy.create({  
        get: function(proxy, id){
          if (H.isInteger(~~id)){
            if (!meta[id]){meta[id] = {};}
            return meta[id];
          } else {
            return undefined;
          }
        }
      });
    },
    States : function(entities){
      return Proxy.create({  // sanitize UnitAI state
        get: function (proxy, id) {
          return (
            entities[id] && entities[id]._entity.unitAIState ? 
              H.replace(entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
              undefined
          ); 
        }
      });  
    }
  };

return H; }(HANNIBAL));  
