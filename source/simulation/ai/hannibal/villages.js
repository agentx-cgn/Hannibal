/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function (H){

  H.LIB.Villages = function (context){

    H.extend(this, {

      context:  context,

      imports:  [
        "id",
        "map",
        "query",
        "events",
        "groups",
        "config",
        "objects",
        "entities",      // hasClass
        "templates",     // obstructionRadius
        "metadata",
      ],

      main:      NaN,        // id of first centre
      centres:   null,       // list of centres
      theta:     NaN,        // rads of main to center of map
      angle:     NaN,        // angle (degrees)

      counter: {
        units:  0,
        mayors: 0,
        shared: 0,
        other:  0,
      },

      layout: {
        farming:  {},
        housing:  {},
        barracks: {},
        temple:   {},
        market:   {},
        walls:    {},
      }
      
   });

  };

  H.LIB.Villages.prototype = H.mixin( 
    H.LIB.Serializer.prototype, {
    contructor: H.LIB.Villages,
    log: function () {
      this.deb();
      this.deb("  VILL:    main: %s, angle: %s, theta: %s, counts: %s", this.main, this.angle.toFixed(1), this.theta, JSON.stringify(this.counter));
      this.deb("     V: centres: %s", JSON.stringify(this.centres));
    },
    import: function () {
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function (context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    deserialize: function () {
      var data;
      if (this.context.data[this.name]){
        data = this.context.data[this.name];
        this.main    = data.main;
        this.centres = data.centres;
      }
      // deb("  VILL: deserialized: %s", uneval(data));
    },
    serialize: function () {
      return {
        main:    this.main,
        centres: H.deepcopy(this.centres)
      };
    },
    initialize: function () {
      // deb("  VILL: initializing: %s", uneval(this.centres));
      if (this.centres === null){
        this.centres = {};
        this.organizeVillages(); // set metadata.cc to nearest cc
        this.initializeMeta();
      }
      return this;
    },
    activate: function () {

      this.events.on("ConstructionFinished", msg => {

        // var order = this.objects(this.metadata[msg.id].order);

        // if (order.cc){
        //   this.metadata[msg.id].cc = order.cc;
        //   // deb("  VILL: set cc: %s of %s %s", order.cc, msg.id, H.Entities[msg.id]._templateName);
        // }

      });

      this.events.on("BroadCast", msg => {

        if (msg.data.group === "g.builder"){

        }

      });

    },
    isShared: function (ent){
      var klasses = ent.classes().map(String.toLowerCase);
      // deb(klasses + "//" + this.config.data.sharedBuildingClasses);
      return this.config.data.sharedBuildingClasses.some(function (klass){
        return H.contains(klasses, klass);
      });
    },
    getPhaseNecessities: function (options){ // phase, centre, tick
      
      var 
        cls = H.class2name,
        cc  = options.centre,
        housePopu = this.query(cls("house")).first().costs.population * -1,

        messages = [],
        technologies = [],
        launches = {

          "phase.village": [

             //  tck, amount,       group,        params
             [  3, [1, "g.mayor",       {cc: cc, size: 0}]],
             [  3, [1, "g.custodian",   {cc: cc, size: 0}]],

          ],
          "phase.town" :   [],
          "phase.city" :   [],
        };

      return {
        launches: launches,
        technologies: technologies,
        messages: messages,
      };

    },      
    findMain: function(){

      var max = -1, cic;

      H.each(this.centres, (id, list) => {
        if (list.length > max){cic = id; max = list.length;}
      });
      return ~~cic;

    },
    organizeVillages: function () {

      var 
        ccNodes, ccId, posMain, posCenter;

      // first find all CC
      ccNodes = this
        .query("civcentre CONTAIN INGAME")
        .forEach( node => this.centres[node.id] = []);

      if (!ccNodes.length){
        this.deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
      } else {
        this.deb("  VILL: organizeVillage CCs found: %s", uneval(this.centres));
      }

      // update metadata with closest CC id
      this.query("structure CONTAIN INGAME")
        .parameter({fmt: "metadata", deb: 5, max: 80, cmt: "organizeVillages: ingame structures"})
        .forEach( node => {

          var dis, distance = 1e7;

          // is not cc
          if (!this.centres[node.id]){

            // find nearest CC
            ccNodes.forEach( cc => {

              // this.deb("  VILL: distances: %s, %s", cc.position, node.position);
              dis = this.map.distance(cc.position, node.position);
              if (dis < distance){
                ccId = cc.id;
                this.metadata[node.id].cc = cc.id;
                distance = dis;
              }
            });

            // store building to find largest village
            this.centres[ccId].push(node.id);

          } else {
            // CCs have themself as cc
            this.metadata[node.id].cc = node.id;

          }

      });

      this.main  = this.findMain();
      posMain    = this.entities[this.main].position();
      posCenter  = this.map.center();
      this.theta = Math.atan2(posCenter[1] - posMain[1], posCenter[0] - posMain[0]);
      this.angle = this.theta * 180 / Math.PI;

      H.each(this.centres, (id, amount) => {
        // deb("     V: CC [%s] has %s entities, main: %s", id, amount, (~~id === this.main ? "X" : ""));
      });

    },    

    initializeMeta: function () {

      // deb("     V: setting operators for shared buildings and Main CC in metadata");

      //TODO: test for multiple villages
      // find units and buildings not belonging to a group and
      // set opname to "none", should only happen in a fresh game

      H.each(this.entities, (id, ent) => {

        if (ent.owner() === this.id){

          if (ent.hasClass("Unit") && !this.metadata[id].opname){
            this.metadata[id].opname = "none";
            this.counter.units += 1;
            // deb("     V: set opname to 'none' %s", ent);

          } else if (ent.hasClass("Structure") && !this.metadata[id].opname){

            // deb("     V: id: %s, entid: %s mainid: %s", id, ent.id(), this.main);

            if (~~id === this.main){
              this.counter.mayors += 1;
              this.counter.shared += 1;
              this.metadata[id].opname = "g.mayor";
              this.metadata[id].opmode = "shared";
              // deb("     V: set opname to 'g.mayor' for %s", ent);

            } else if (this.isShared(ent)){
              this.counter.shared += 1;
              this.metadata[id].opname = "g.custodian";
              this.metadata[id].opmode = "shared";
              // deb("     V: set opname to 'g.custodian' for %s", ent);

            } else {
              this.counter.other += 1;
              this.metadata[id].opname = "none"; // there is a group for that
              // deb("     V: set opname to 'none' for %s", ent);
            
            }

          } else {
            // happens in cloned bot
            // deb("WARN  : prepareMeta unhandled entity: %s classes: %s", ent, uneval(this.metadata[id]));

          }

        }

      });


    },

    findPosForOrder: function(order) {

      // general method to find a possible place for a structure defined by tpl
      // uses terrain, territory and buildind restriction

      var 
        t0 = Date.now(), size, w, h, radius,
        index, value, position, coords, obstructions,
        tpl = order.product.key,
        template = this.templates[tpl],
        pos = [order.x, order.z],
        label = "O" + order.id;

      // building radius from template
      size = H.test(template, "Obstruction.Static");
      w = +size["@width"];
      h = +size["@depth"];
      radius = Math.sqrt(w * w + h * h) / 2;

      // get land cells in own territory
      this.map.updateGrid("buildable"); // needs neutral, enemy, etc
      // this.map.buildable.dump("0", 255);

      // derive grid with cells removed by building restrictions
      obstructions = this.map.templateObstructions(tpl);
      // obstructions.dump("1", 255);

      // lower border cells
      radius = ~~(radius / obstructions.cellsize);
      obstructions.blur(radius);
      // obstructions.dump("2", 255);

      // flood with pos distance
      coords = this.map.mapPosToGridCoords(pos, obstructions);
      obstructions.addInfluence(coords, 224);

      // get best index, below distance
      [index, value] = obstructions.maxIndex(250 - radius);

      // put x, z, angle in array
      position = this.map.gridIndexToMapPos(index, obstructions);
      position.push(this.angle);

      // debug
      obstructions.debIndex(index);
      obstructions.dump(label, 255);

      this.deb("  VILL: findPosForOrder: #%s, idx: %s, val: %s, %s, %s msec", 
        order.id, 
        index, 
        value,
        position.map(n => n.toFixed(1)), 
        Date.now() - t0
      );

      return position;

    }    

  });

return H; }(HANNIBAL));  

// "structures/athen_wallset_stone": {
//   "@parent": "template_structure_defense_wallset",
//   "Identity": {
//     "Civ": "athen",
//     "Classes": {
//       "@datatype": "tokens",
//       "_string": "Town StoneWall"
//     },
//     "GenericName": "City Wall",
//     "History": "All Hellenic cities were surrounded by stone walls for protection against enemy raids. Some of these fortifications, like the Athenian Long Walls, for example, were massive structures.",
//     "Icon": "structures/wall.png",
//     "RequiredTechnology": "phase_town",
//     "SpecificName": "TeÃ®khos",
//     "Tooltip": "Wall off your town for a stout defense."
//   },
//   "WallSet": {
//     "MaxTowerOverlap": "0.90",
//     "MinTowerOverlap": "0.05",
//     "Templates": {
//       "Gate": "structures/athen_wall_gate",
//       "Tower": "structures/athen_wall_tower",
//       "WallLong": "structures/athen_wall_long",
//       "WallMedium": "structures/athen_wall_medium",
//       "WallShort": "structures/athen_wall_short"
//     }
//   }
// },