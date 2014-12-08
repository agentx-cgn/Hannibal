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
        "entities", // hasClass
        "metadata",
      ],

      main:      0,
      centres:   null, 

      counter: {
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
      deb("VILLGE:    main: %s, counts: %s", this.main, JSON.stringify(this.counter));
      deb("     V: centres: %s", JSON.stringify(this.centres));
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

    organizeVillages: function () {

      var 
        ccNodes, ccId, getMain = () => {
          var max = -1, cic;
          H.each(this.centres, (id, list) => {
            if (list.length > max){cic = id; max = list.length;}
          });
          return ~~cic;
        };

      // find all CC
      ccNodes = this.query("civcentre CONTAIN INGAME").forEach( node => {
        this.centres[node.id] = [];
      });

      if (!ccNodes.length){
        deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
      }

      // deb();
      // deb("  VILL: organize villages for %s civic centres [%s]", ccNodes.length, ccNodes.map(c => c.id).join(", "));
      
      this.query("INGAME").forEach( node => {

        var dis, distance = 1e7;

        // is not cc
        if (!this.centres[node.id]){

          // find nearest CC
          ccNodes.forEach( cc => {
            dis = this.map.distance(cc.position, node.position);
            if (dis < distance){
              ccId = cc.id;
              this.metadata[node.id].cc = cc.id;
              distance = dis;
            }
          });

          // keep building to find largest village
          if (this.entities[node.id].hasClass("Structure")){
            this.centres[ccId].push(node.id);
          }

        } else {
          // CCs have themself as cc
          this.metadata[node.id].cc = node.id;

        }

      });

      this.main = getMain();

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
            // happens in cloned bot
            // deb("WARN  : prepareMeta unhandled entity: %s classes: %s", ent, uneval(this.metadata[id]));

          }

        }

      });


    },

  };

return H; }(HANNIBAL));  
