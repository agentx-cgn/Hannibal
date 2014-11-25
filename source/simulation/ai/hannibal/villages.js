/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function (H){

  H.LIB.Villages = function (context){

    H.extend(this, {

      name:  "villages",
      context:  context,
      imports:  [
        "id",
        "map",
        "query",
        "events",
        "groups",
        "config",
        "objects",
        "entities",
        "metadata",
      ],

      main: {id: 0},
      centres:   {},
      buildings: [],

      counter: {
        ccs:    0,
        units:  0,
        mayors: 0,
        shared: 0,
        other:  0,
      }
      
   });

  };

  H.LIB.Villages.prototype = {
    contructor: H.LIB.Villages,
    log: function () {
      deb();
      deb("VILLGE:  counts: %s", JSON.stringify(this.counter));
      deb("     V: centres: %s", JSON.stringify(this.centres));
      deb("     V:    main: %s", JSON.stringify(this.main));
    },
    import: function () {
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function (context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function () {
      return {
        main:      H.deepcopy(this.main),
        centres:   H.deepcopy(this.centres),
        buildings: H.deepcopy(this.buildings),
      };
    },
    initialize: function () {
      if (this.main === null){
        this.organizeVillage();
      }
      this.prepareMeta();
      this.appointOperators();        
      return this;
    },
    activate: function () {

      this.events.on("ConstructionFinished", function (msg){

        var order = this.objects(this.metadata[msg.id].order);

        if (order.cc){
          this.metadata[msg.id].cc = order.cc;
          // deb("  VILL: set cc: %s of %s %s", order.cc, msg.id, H.Entities[msg.id]._templateName);
        }

      });

      this.events.on("BroadCast", function (msg){

        if (msg.data.group === "g.builder"){

        }

      });

    },
    isShared: function (ent){
      var klasses = ent.classes().map(String.toLowerCase);
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

    organizeVillage: function () {

      var ccNodes, ccId, main;

      function getMain() {
        var max = 0, cic;
        H.each(this.centres, (id, amount) => {
          if (amount > max){cic = id; max = amount;}
        });
        return ~~cic;
      }

      // find all CC
      ccNodes = this.query("civcentre CONTAIN INGAME").forEach( node => {
        this.counter.ccs += 1;
        this.centres[node.id] = 0;
      });

      if (!ccNodes.length){
        deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
      }

      deb();
      deb("  VILL: organize villages for %s civic centres [%s]", ccNodes.length, ccNodes.map(c => c.id).join(", "));
      
      this.query("INGAME").forEach( node => {

        var posCic, dis, distance = 1e7;

        if (!this.centres[node.id]){

          // find nearest CC
          ccNodes.forEach( cc => {
            posCic = cc.position;
            dis = this.map.distance(posCic, node.position);
            if (dis < distance){
              ccId = cc.id;
              this.metadata[node.id].cc = cc.id;
              distance = dis;
            }
          });

          this.centres[ccId] += 1;

        } else {
          // CCs have themself as cc
          this.metadata[node.id].cc = node.id;

        }

      });

      main = getMain();

      H.each(this.centres, function (id, amount){
        deb("     V: CC [%s] has %s entities, main: %s", id, amount, (~~id === this.main ? "X" : ""));
      });

      this.main.id = main;

    },    

    prepareMeta: function () {

      deb("     V: setting operators for shared buildings and Main CC in metadata");

      //TODO: test for multiple villages

      H.each(this.entities, (id, ent) => {

        if (ent.owner() === this.id){

          if (ent.hasClass("Unit")){
            this.metadata[id].opname = "none";
            this.counter.units += 1;
            // deb("     V: set opname to 'none' %s", ent);

          } else if (ent.hasClass("Structure")){

            deb("     V: entid: %s mainid: %s", ent.id(), this.main.id);

            if (ent.id() === this.main.id){
              this.counter.mayors += 1;
              this.metadata[id].opname = "g.mayor";
              // deb("     V: set opname to 'g.mayor' for %s", ent);

            } else if (this.isShared(ent)){
              this.counter.shared += 1;
              this.metadata[id].opname = "g.custodian";
              // deb("     V: set opname to 'g.custodian' for %s", ent);

            } else {
              this.counter.other += 1;
              this.metadata[id].opname = "none"; // there is a group for that
              // deb("     V: set opname to 'none' for %s", ent);
            
            }

          } else {
            deb("WARN  : prepareMeta unhandled entity: %s classes: %s", ent, ent.classes());

          }

        }

      });


    },

    appointOperators: function () {

      var opname;

      deb("     V: appointing operators for structures");

      this.query("INGAME").forEach(node => {

        opname = node.metadata.opname;

        // deb("     V: 1 %s %s", node.name, uneval(node.metadata));
        
        if (opname === "none"){
          // do nothing, is unit or other building

        } else if (opname === "g.custodian"){
          deb("     V: 2 %s %s", node.name, opname);
          this.groups.appoint(node.id, {name: "g.custodian", cc: this.metadata[node.id].cc});

        } else if (opname === "g.mayor"){
          deb("     V: 2 %s %s", node.name, opname);
          this.groups.appoint(node.id, {name: "g.mayor", cc: this.metadata[node.id].cc});

        } else {
          deb("ERROR : appointOperators: don't know to handle %s as operator for %s", opname, node.name);

        }

      });

    }

  };

return H; }(HANNIBAL));  
