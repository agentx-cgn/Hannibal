/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject */

/*--------------- I N I T -----------------------------------------------------

  Called at game start, organizes villages, shared buildings, etc
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var main;

  function isShared (ent){
    var klasses = ent.classes().map(String.toLowerCase);
    return H.Config.data.sharedBuildingClasses.some(function(klass){
      return (klasses.indexOf(klass) !== -1);
    });
  }


  /*
    Organize Villages by distance to CC
  */

  function organizeVillage(){

    var cics = {}, nodesCics;

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
      deb("ERROR : No CC found with: civcentre CONTAIN INGAME");
    }

    deb();deb();
    deb("  INIT: organize villages for civic centres [%s]", nodesCics.map(function(c){return c.id;}).join(", "));
    
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
      deb("  INIT: CC [%s] has %s entities, main: %s", id, amount, (~~id === main ? "X" : ""));
    });

    H.Centre.id = main;

  }


  /*
    Connect plugins/groups to Buildings
  */

  function prepareMeta(){

    deb();
    deb("  INIT: setting operators for shared buildings and Main CC in metadata");

    H.each(H.Entities, function(id, ent){

      if (ent.owner() === H.Bot.id){

        if (ent.hasClass("Unit")){
          ent.setMetadata(H.Bot.id, "opname", "none");
          // deb("     I: set opname to 'none' %s", ent);

        } else if (ent.hasClass("Structure")){

          if (ent.id() === main){
            ent.setMetadata(H.Bot.id, "opname", "g.mayor");
            // deb("     I: set opname to 'g.mayor' for %s", ent);

          } else if (isShared(ent)){
            ent.setMetadata(H.Bot.id, "opname", "g.custodian");
            // deb("     I: set opname to 'g.custodian' for %s", ent);
          

          } else {
            ent.setMetadata(H.Bot.id, "opname", "none");
            // deb("     I: set opname to 'none' for %s", ent);
          
          }

        } else {
          deb("WARN  : loadEntities unhandled entity: %s classes: %s", ent, ent.classes());

        }

      }

    });


  }


  /*
    Connect plugins/groups to Buildings
  */

  function appointOperators(){

    deb();
    deb("  INIT: appointing operators for structures");

    H.QRY("INGAME").forEach(function(node){
      if (H.Groups.isLaunchable(node.metadata.opname)){
        deb("     I: -- %s", node.name);
        H.Groups.appoint(node.metadata.opname, node.id);
      }
    });
    deb();

  }


  H.initVillage = function(){

    organizeVillage();
    prepareMeta();
    appointOperators();

    /*
      Check
    */

    // new H.HCQ(H.Bot.culture.store, "INGAME SORT < id").execute("metadata", 5, 50, "ingames with metadata");
    // H.Groups.log();

  };


return H; }(HANNIBAL));

