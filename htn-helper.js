/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- H T N _ H E L P E R -----------------------------------------

  mostly logging html



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  // helper
  var mul  = function(n){return new Array(n || 2).join(" ");},
      tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");};


  H.HTN = H.HTN || {};
  H.HTN.Helper = H.HTN.Helper || {};

  H.extend(H.HTN.Helper, {

    pritObj: function (o, depth){

      // makes pretty html from states and goals

      var html   = "",
          lf     = "</td></tr>",
          indent = "<tr><td>&nbsp;&nbsp;";

      depth = depth || 0;

      "civ, ress, ents, tech, cost".split(", ").forEach(function(k){

        var v = o[k] || undefined, akku = [], cnt, ent, cost;

        if (!v){ return;

        } else if (k === 'name') {
          // do nothing, yet.
        
        } else if (k === 'civ') {
          html += indent + " civ: " + v + lf;

        } else if (k === 'ress') {

          H.each(v, function(k, v){
            akku.push(k + ": " + v);
          });
          html += indent + "ress: { " + akku.join(", ") + " }" + lf;

        } else if (k === 'tech') {

          cnt = v.length;

          if (cnt === 0) {
            html += indent + "tech: []" + lf;
          } else if (cnt === 1 ) {
            html += indent + "tech: [ " + v[0] + " ]" + lf;
          } else {
            html += indent + "tech: [" + lf;
            v.sort().forEach(function(tech){
              html += indent + "&nbsp;&nbsp;" + tech + lf;
            });
            html += indent + "]" + lf;
          }


        } else if (k === 'ents'){

            cnt = H.count(v);

            if (cnt === 0) {
              html += indent + "ents: {}" + lf;
            } else if (cnt === 1 ) {
              ent = H.attribs(v)[0];
              html += indent + "ents: { " + ent + " : " +  o.ents[ent] + " }" + lf;
            } else {
              html += indent + "ents: {" + lf;
              H.attribs(v).sort().forEach(function(ent){
                html += indent + "&nbsp;&nbsp;" + tab(o.ents[ent], 3) + " : " + ent + lf;
              });
              html += indent + "}" + lf;
            }

        } else if (k === 'cost'){

            cnt = H.count(v);

            if (cnt === 0) {
              html += indent + "cost: {}" + lf;
            } else if (cnt === 1 ) {
              cost = H.attribs(v)[0];
              html += indent + "ents: { " + cost + " : " +  o.cost[cost] + " }" + lf;
            } else {
              html += indent + "cost: {" + lf;
              "time, food, wood, stone, metal".split(", ").forEach(function(cost){
                if (o.cost[cost]){
                  html += indent + "&nbsp;&nbsp;" +  tab(cost, 5) + " : " + tab(o.cost[cost], 4) + lf;
                }
              })
              html += indent + "}" + lf;
            }

        } else {
          html += indent + H.mulString("&nbsp;", depth) + k + ": " + v + "" + lf;
        }

      });

      return html + "<tr></tr>";

    },

    logStart:    function(state, tasks, verbose){

      deb("   HTN:    name: %s, verbose: %s", state.name, verbose);
      deb("   HTN:   tasks: %s", H.prettify(tasks));
      deb("   HTN:   state: %s", H.prettify(state));

    },
    
    logFinish:   function(plan, state, msecs, cntIterate, maxDepth){

      var patSuccess  = "<b style='color: #383'>   HTN:  SUCCESS msecs: %s, actions: %s, iterations: %s, depth: %s</b>",
          patFailure  = "<b style='color: #833'>   HTN:  FAILURE plan: [%s], %s msecs, iterations: %s, depth: %s</b>",
          patOperator = "&nbsp;&nbsp;op: %s, <b style='color: #444'>%s</b> ( %s )";

      deb();

      if (Array.isArray(plan) && plan.length > 0){

        deb(patSuccess, msecs, plan.length, cntIterate, maxDepth);
        deb("<trenner>");

        deb("<b>new state:</b>");
        deb(H.HTN.Helper.pritObj(state));
        deb();
        
        plan.forEach(function(action, i){

          deb(patOperator, tab(i+1, 3), action[0], action.slice(1).join(", "));
          if (action[0] === 'wait_secs'){
            deb("<trenner>");
          }

        });
        deb();

      } else {
        deb();
        deb(patFailure, plan, msecs, cntIterate, maxDepth); 
        deb();
        deb("<b>   HTN:  state: %s</b>", H.HTN.Helper.pritObj(state));
        deb();
      }

    },





  })







return H; }(HANNIBAL));


