/*jslint bitwise: true, browser:true, todo:true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- N U M E R U S  ----------------------------------------------

  a statistic extension, interacts with launcher



  V: 0.1, agentx, CGN, Feb, 2014


*/

HANNIBAL = (function(H){

  var self, ss, key = 0;

  function tickData(id){
    var pd = ss.playersData[id],
        data  = {
          player: id,
          name:   pd.name,
          team:   pd.team,
          civ:    pd.civ,
          color:  pd.color,
        };
     return JSON.stringify(data);
  }

  function tickLine(id, what){

    var pd = ss.playersData[id], 
        st = pd.statistics, data;

    data = {
      key:        key,
      secs:       (H.GameState.timeElapsed/1000).toFixed(1),
      pid:        id,
      phase:      pd.phase,
      food:       pd.resourceCounts.food,
      wood:       pd.resourceCounts.wood,
      stone:      pd.resourceCounts.stone,
      metal:      pd.resourceCounts.metal,
      tresaure:   st.treasuresCollected,
      unitsLost:  st.unitsLost.total,
      unitsTrai:  st.unitsTrained.total,
      bldgsCons:  st.buildingsConstructed.total,
      bldgsLost:  st.buildingsLost.total,
      kills:      st.enemyUnitsKilled.total,
      popcnt:     pd.popCount,
      popcap:     pd.popLimit,
      popmax:     pd.popMax,
      explored:   st.percentMapExplored,
      techs:      Object.keys(pd.researchedTechs).length,
    };

    key += 1;

    return ( what === "row" ? 
      Object.keys(data).map(a => data[a]).join(";") + "\n" :
      Object.keys(data).join(";") + "\n"
    );

  }      

  H.Numerus = (function(){
    return {
      boot: function(){return self = this;},
      init: function(){
        ss = H.SharedScript;
        print("#! open 1 /home/noiv/Desktop/0ad/stats.csv\n");
        print("#! append 1 :# Numerus Log from: " + new Date()  + "\n");
        H.each(ss.playersData, function(id){
          id = ~~id;
          if (id){self.append("# " + tickData(id, "row"));}
        });
        print("#! append 1 :" + tickLine(1, "head") + "\n");
      },
      append: function(data){
        print("#! append 1 :" + data + "\n");
      },
      tick: function(secs, ticks){

        if (!(~~ticks % 10)) { // 10 = 16 secs
          H.each(ss.playersData, function(id){
            id = ~~id;
            if (id){self.append(tickLine(id, "row"));}
          });
        }    

      }

    };

  }()).boot();


return H; }(HANNIBAL));
