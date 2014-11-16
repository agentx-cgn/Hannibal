/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Villages = function(context){

    this.name = "villages";
    this.context = context;

    H.extend(this, {
      centre: {id: 0},
      centres: [],
      buildings: [],
    },
    context.saved.villages);

  };

  H.LIB.Villages.prototype = {
    contructor: H.LIB.Villages,
    import: function(){
      this.id       = this.context.id;
      this.map      = this.context.map;
      this.query    = this.context.query;
      this.events   = this.context.events;
      this.groups   = this.context.groups;
      this.config   = this.context.config;
      this.objects  = this.context.objects;
      this.entities = this.context.entities;
      this.metadata = this.context.metadata;
    },
    clone: function(context){
      H.extend(context.saved, {villages: this.serialize()});
      return new H.LIB.Villages(context);
    },
    serialize: function(){
      return {
        centre:    H.deepcopy(this.centre),
        centres:   H.deepcopy(this.centres),
        buildings: H.deepcopy(this.buildings),
      };
    },
    log: function(){},
    initialize: function(){
      this.organizeVillage();
      this.prepareMeta();
      this.appointOperators();        
    },
    activate: function(){

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
      return this.config.data.sharedBuildingClasses.some(function(klass){
        return H.contains(klasses, klass);
      });
    },
    getPhaseNecessities: function(options){ // phase, centre, tick
      
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

    organizeVillage: function (){

      var cics = {}, nodesCics, main;

      function getMain(){
        var max = 0, cic;
        H.each(cics, function(id, amount){
          if (amount > max){cic = id; max = amount;}
        });
        return ~~cic;
      }

      nodesCics = this.query("civcentre CONTAIN INGAME").forEach( node => {
        cics[node.id] = 0;
      });

      if (!nodesCics.length){
        deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
      }

      deb();deb();
      deb("  VILL: organize villages for %s civic centres [%s]", nodesCics.length, nodesCics.map(c => c.id).join(", "));
      
      this.query("INGAME").forEach(function(node){

        var 
          name = node.name.split("#")[0],
          posNode = node.position,
          posCic, dis, distance = 1e7;

        if (this.query(name + " MEMBER WITH name = 'civcentre'").execute().length === 0){

          // find nearest CC
          nodesCics.forEach( cic => {
            posCic = cic.position;
            dis = this.map.distance(posCic, posNode);
            if (dis < distance){
              this.metadata[node.id].cc = cic.id;
              distance = dis;
            }
          });

          cics[this.metadata[node.id].cc] += 1;

        } else {
          // CCs have themself as cc
          this.metadata[node.id].cc = node.id;

        }

      });

      main = getMain();

      H.each(cics, function(id, amount){
        deb("     V: CC [%s] has %s entities, main: %s", id, amount, (~~id === main ? "X" : ""));
      });

      this.centre.id = main;

    },    

    prepareMeta: function (){

      deb("     V: setting operators for shared buildings and Main CC in metadata");

      //TODO: test for multiple villages

      H.each(this.entities, function(id, ent){

        if (ent.owner() === this.id){

          if (ent.hasClass("Unit")){
            this.metadata[id].opname = "none";
            // deb("     V: set opname to 'none' %s", ent);

          } else if (ent.hasClass("Structure")){

            if (ent.id() === this.centre.id){
              this.metadata[id].opname = "g.mayor";
              // deb("     V: set opname to 'g.mayor' for %s", ent);

            } else if (this.isShared(ent)){
              this.metadata[id].opname = "g.custodian";
              // deb("     V: set opname to 'g.custodian' for %s", ent);

            } else {
              this.metadata[id].opname = "none";
              // deb("     V: set opname to 'none' for %s", ent);
            
            }

          } else {
            deb("WARN  : prepareMeta unhandled entity: %s classes: %s", ent, ent.classes());

          }

        }

      });


    },

    appointOperators: function (){

      var opname;

      deb("     V: appointing operators for structures");

      this.query("INGAME").forEach(function(node){

        opname = node.metadata.opname;

        // deb("     V: 1 %s %s", node.name, uneval(node.metadata));
        
        if (opname === "none"){
          // do nothing, is unit

        } else if (opname === "g.custodian"){
          deb("     V: 2 %s %s", node.name, opname);
          this.groups.appoint(node.id, {name: "g.custodian", cc: this.metadata[node.id].cc});

        } else if (opname === "g.mayor"){
          deb("     V: 2 %s %s", node.name, opname);
          this.groups.appoint(node.id, {name: "g.mayor", cc: this.metadata[node.id].cc});
          // H.Groups.appoint("g.mayor", node.id, {});

        } else {
          H.throw("huhu");
          deb("ERROR : appointOperators: don't know to handle %s as operator for %s", opname, node.name);

        }

      });

    }

  };

return H; }(HANNIBAL));  
