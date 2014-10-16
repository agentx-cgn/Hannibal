/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures and units around civic centres
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var self;

  function isShared (ent){
    var klasses = ent.classes().map(String.toLowerCase);
    return H.Config.data.sharedBuildingClasses.some(function(klass){
      // return (klasses.indexOf(klass) !== -1);
      return H.contains(klasses, klass);
    });
  }

  H.Villages = (function(){

    return {
      Centre: {
        id: null
      },
      log:  function(){},
      boot: function(){self = this; return this;},
      init: function(){
        self.organizeVillage();
        self.prepareMeta();
        self.appointOperators();        
      },
      tick: function(){},
      activate: function(){

        H.Events.on("ConstructionFinished", function (msg){

          var order = H.Objects(H.MetaData[msg.id].order);

          if (order.ccid){
            H.MetaData[msg.id].ccid = order.ccid;
            // deb("  VILL: set ccid: %s of %s %s", order.ccid, msg.id, H.Entities[msg.id]._templateName);
          }

        });

      },
      getPhaseNecessities: function(options){ // phase, centre, tick
        
        var 
          cls = H.class2name,
          cc  = options.centre,
          housePopu = H.QRY(cls("house")).first().costs.population * -1,

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
          technologies: [],
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

        // new H.HCQ(H.Bot.culture.store, "civcentre CONTAIN INGAME").execute("metadata", 5, 20, "ingame cc at init");
        // new H.HCQ(H.Bot.culture.store, "INGAME").execute("metadata", 5, 40, "ingame cc at init");

        nodesCics = H.QRY("civcentre CONTAIN INGAME").forEach(function(node){
          cics[node.id] = 0;
        });

        if (!nodesCics.length){
          deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
        }

        deb();deb();
        deb("  VILL: organize villages for %s civic centres [%s]", nodesCics.length, nodesCics.map(function(c){return c.id;}).join(", "));
        
        H.QRY("INGAME").forEach(function(node){

          var name = node.name.split("#")[0],
              posNode = node.position,
              posCic, dis, distance = 1e7;

          H.MetaData[node.id] = H.MetaData[node.id] || {};

          // the path for non CC
          if (H.QRY(name + " MEMBER WITH name = 'civcentre'").execute().length === 0){

            nodesCics.forEach(function(cic){
              posCic = cic.position;
              dis = H.Map.distance(posCic, posNode);
              if (dis < distance){
                H.MetaData[node.id].ccid = cic.id;
                distance = dis;
              }
            });

            // deb("     I: chosing cc: %s at %s for [%s %s] at %s", 
            //   H.MetaData[node.id].ccid, H.toFixed(posCic), name, node.id, H.toFixed(posNode));

            cics[H.MetaData[node.id].ccid] += 1;


          // CCs have themself as cc
          } else {
            H.MetaData[node.id].ccid = node.id;

          }

        });

        main = getMain();

        H.each(cics, function(id, amount){
          deb("     V: CC [%s] has %s entities, main: %s", id, amount, (~~id === main ? "X" : ""));
        });

        H.Villages.Centre.id = main;

      },    
      prepareMeta: function (){

        deb("     V: setting operators for shared buildings and Main CC in metadata");

        //TODO: test for multiple villages

        H.each(H.Entities, function(id, ent){

          if (ent.owner() === H.Bot.id){

            if (ent.hasClass("Unit")){
              H.MetaData[id].opname = "none";
              // ent.setMetadata(H.Bot.id, "opname", "none");
              deb("     V: set opname to 'none' %s", ent);

            } else if (ent.hasClass("Structure")){

              if (ent.id() === H.Villages.Centre.id){
                H.MetaData[id].opname = "g.mayor";
                // ent.setMetadata(H.Bot.id, "opname", "g.mayor");
                deb("     V: set opname to 'g.mayor' for %s", ent);

              } else if (isShared(ent)){
                H.MetaData[id].opname = "g.custodian";
                // ent.setMetadata(H.Bot.id, "opname", "g.custodian");
                deb("     V: set opname to 'g.custodian' for %s", ent);
              

              } else {
                H.MetaData[id].opname = "none";
                // ent.setMetadata(H.Bot.id, "opname", "none");
                deb("     V: set opname to 'none' for %s", ent);
              
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

        H.QRY("INGAME").forEach(function(node){

          opname = node.metadata.opname;

          deb("     V: 1 %s %s", node.name, uneval(node.metadata));
          
          if (opname === 'none'){
            // deb("     V: 2 %s %s", node.name, opname);
            // do nothing, is unit

          } else if (opname === "g.custodian"){
            deb("     V: 2 %s %s", node.name, opname);
            H.Groups.appoint(node.id, {name: "g.custodian", cc: H.MetaData[node.id].ccid});

          } else if (opname === "g.mayor"){
            deb("     V: 2 %s %s", node.name, opname);
            H.Groups.appoint(node.id, {name: "g.mayor", cc: H.MetaData[node.id].ccid});
            // H.Groups.appoint("g.mayor", node.id, {});

          } else {
            H.throw("huhu");
            deb("ERROR : appointOperators: don't know to handle %s as operator for %s", opname, node.name);

          }

        });

      }

    };

  }()).boot();

return H; }(HANNIBAL));  
