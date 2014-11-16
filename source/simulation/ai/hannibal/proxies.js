/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- P R O X I E S -----------------------------------------------

  simplyfies API access

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.Proxies = {

    Entities : function(entities){
      return Proxy.create({
        get: function(proxy, id){
          return entities[id];
        }
      });
    },

    Templates : function(templates){
      return Proxy.create({
        get: function(proxy, id){
          return templates[id];
        }
      });
    },

    TechTemplates : function(techtemplates){
      return Proxy.create({
        get: function(proxy, id){
          return techtemplates[id];
        }
      });
    },

    Technologies: function(technologies){
      var mapper = {};
      H.each(technologies, function(key){
        mapper[H.saniTemplateName(key)] = key;
      });
      return Proxy.create({  
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
          if (!meta[id]){meta[id] = {};}
          return meta[id];
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
