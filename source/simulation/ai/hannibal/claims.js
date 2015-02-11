/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- C L A I M S -------------------------------------------------

  reservers village space for important structures
  village->claims->classes
  village->[reserved, ...]-> slot

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

HANNIBAL = (function (H){

  const 
    PI     = Math.PI,
    TAU    = Math.PI * 2,
    PI2    = Math.PI / 2,
    RADDEG = Math.PI / 180,
    DEGRAD = 1 / RADDEG,
    SQRT2  = Math.sqrt(2);

  H.LIB.Claim  = function (context, config){

  };
  
  H.LIB.Claims = function (context){

    H.extend(this, {

      context:  context,

      klass:    "claims",
      parent:   context,
      name:     context.name + ":claims",

      imports:  [
        "map",
        "query",
        "templates",
      ],

      classes : {
        "house":     {
          "block4" : {prio: 0, radius: NaN, position: [], slots: [ [], [], [], [] ]}  // prio 0 = top
        },
        "field":     {},
        "farmstead": {},
        "barracks":  {},
        "tower":     {},
      },

      reserved : [],

    });

  };
  H.LIB.Claims.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    log: function(){},
    serialize: function(){
      return {
        classes: H.deepcopy(this.classes),
        reserved: H.deepcopy(this.reserved),
      };
    },
    deserialize: function(data){
      if(data){
        this.reserved = data.reserved;
        this.classes  = data.classes;
      }
    },
    initialize: function(){

      // try out 4 houses

      var nodes, tpln, template, size, r, radius;

      this.map.claims.set(0xFF); // 255

      if (this.reserved.length){
        this.reserved.forEach(claim => {
          this.map.claims.processCircle(claim.coords, claim.radius, () => 0);
        });

      } else {

        // prep claims w/ metrics of culture
        nodes = this.query("house CONTAIN")
          .filter(node => node.key.contains("house")) // get rid of tavern, etc
        ;

        tpln = nodes[0].key;
        template = this.templates[tpln];
        size = H.test(template, "Obstruction.Static");
        r = Math.max(+size["@width"], +size["@depth"]);
        radius = SQRT2 * r; // 4 block

        this.classes["house"]["block4"].radius = radius;

        this.deb("  CLIM: rad for house.block4: %s", radius);


      }

      return this;

    },
    isToClaim: function(nodename){

      var 
        nodes = this.query(nodename + " MEMBER").execute(),
        classes = H.attribs(this.classes);

      return nodes.some(node => {
        return H.contains(classes, node.name);
      });

    },



  });

return H; }(HANNIBAL));  
