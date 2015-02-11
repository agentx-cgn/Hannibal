/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

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

  // H.LIB.Centre = function (context){  };

  H.LIB.Villages = function (context){

    H.extend(this, {

      context:  context,

      imports:  [
        "id",
        "map",
        "query",
        "claims",
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
      angle:     NaN,        // theta in degrees
      orient:    NaN,        // rads of main on map (missing on API?)

      claimed:    null,

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
      },

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
    // import: function () {
    //   this.imports.forEach(imp => this[imp] = this.context[imp]);
    //   return this;
    // },
    // clone: function (context){
    //   context.data[this.name] = this.serialize();
    //   return new H.LIB[H.noun(this.name)](context);
    // },
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
        centres: H.deepcopy(this.centres),
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

      var sizeBuilder = tpl => {
        // something between 1 and 20
        return Math.min(20, ~~(H.test(this.templates[tpl], "Cost.BuildTime") / 20) +1);
      };

      this.events.on("ConstructionFinished", msg => {
        if (this.isShared(msg.data.classes)){
          this.entities[msg.id].opmode = "shared";
          this.deb("  VILL: ConstructionFinished: classes: %s, meta: %s", msg.data.classes, uneval(this.metadata[msg.id]));
        }
      });

      this.events.on("StructureDestroyed", msg => {
        // launch group to rebuild, if shared and not foundation
        this.deb("  VILL: StructureDestroyed: msg: %s", uneval(msg));
        if (this.isShared(msg.data.classes) && !msg.data.foundation){
          this.groups.launch({
            groupname: "g.builder", 
            cc: this.main, 
            building: H.saniTemplateName(msg.data.templatename), 
            quantity: 1, 
            size: sizeBuilder(msg.data.templatename)
          });
          this.deb("  VILL: StructureDestroyed: %s, classes: %s, meta: %s, time: %s", 
            msg.data.templatename,
            msg.data.classes, 
            uneval(this.metadata[msg.id]),
            H.test(this.templates[msg.data.templatename], "Cost.BuildTime")
          );
        }
      });

    },
    tick: function(secs, tick){

      var t0 = Date.now();
      this.ticks = tick; this.secs = secs;
      return Date.now() - t0;

    },    
    isShared: function (klasses){
      return this.config.villages.sharedBuildingClasses.some(function (klass){
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
        .forEach( node => {
          this.centres[node.id] = [];
          this.deb("  VILL: organizeVillages centre id: %s, pos: %s", node.id, node.position);
        })
      ;

      if (!ccNodes.length){
        this.deb("WARN  : organizeVillage No CC found with: civcentre CONTAIN INGAME");
        return;
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

            } else if (this.isShared(ent.classes().map(String.toLowerCase))){
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

    findPosFromClaim: function(name) {

      this.deb("  VILL: got order for claimed structure: %s", name);

      return null;


    },
    findPosForOrder: function(order) {

      // general method to find a possible place for a structure defined by tpl
      // uses terrain, territory and buildind restriction
      // check blur terrain border needed

      var 
        t0 = Date.now(),
        index, value, position, coords, obstructions,
        pos = [order.x, order.z],
        tpln = order.product.key,
        name = H.saniTemplateName(order.product.key),
        template = this.templates[tpln],
        // building radius from template's longest side
        size = H.test(template, "Obstruction.Static"),
        r = Math.max(+size["@width"], +size["@depth"]),
        // radius = Math.sqrt(2 * r * r) / 2,
        radius = SQRT2 * r / 2,
        posCentre = this.entities[order.cc].position();

      if (this.claims.isToClaim(name)){
        position = this.findPosFromClaim(order);
        if(position){return position;}
      }

      // derive grid [0|32] with cells removed by building restrictions
      obstructions = this.map.templateObstructions(tpln);

      // convert pos
      coords = this.map.mapPosToGridCoords(pos, obstructions);

      // -1 very tight, 0 good, +1 generous
      radius = Math.ceil(radius / obstructions.cellsize) + 0;
      this.map.danger.dump("vill 0", 255);
      
      // remove cells by radius, danger, priotize by pos
      obstructions
        // .dump("obst 0", 255)
        .blur(radius)
        // .dump("obst 1", 255)
        .processValue(v => v < 32 ? 0 : v)
        // .dump("obst 2", 255)
        .subtract(this.map.danger)
        // .dump("obst 3", 255)
        .addInfluence(coords, 224)
        // .dump("obst 4", 255)
      ;

      // get best index
      [index, value] = obstructions.maxIndex();

      // center x, z in cell
      position = this.map.gridIndexToMapPos(index, obstructions);

      // add angle

      // random
      // position.push(Math.random() * Math.PI * 2);  

      // entrance points north
      // position.push(-(this.angle * RADDEG - PI2));
      // position.push(-(this.theta - PI2));

      // entrance points to civil centre
      // theta = this.map.getTheta(posCentre, position);
      // position.push(-(theta + PI2));

      // entrance points to map centre
      position.push(this.map.getTheta(this.map.center(), position));          

      // debug
      // obstructions.debIndex(index);
      // obstructions.dump("obst 4", 255);

      this.deb("  VILL: findPosForOrder: #%s, val: %s, idx: %s, rad: %s, %s, %s msec | %s", 
        order.id, 
        value,
        index, 
        radius,
        position.map(n => n.toFixed(1)).join("|"), 
        Date.now() - t0,
        tpln
      );

      // everything above 0 is good
      return value ? position : null;

    }    

  });

return H; }(HANNIBAL));  
