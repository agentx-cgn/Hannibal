/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- P L A N N E R -----------------------------------------------

  Port of the file: blocks_world_operators.py



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};
  H.HTN.Blocks = H.HTN.Blocks || {};

  H.HTN.Blocks.operators = {

    // def pickup(state,b):
    //     if state.pos[b] == 'table' and state.clear[b] == True and state.holding == False:
    //         state.pos[b] = 'hand'
    //         state.clear[b] = False
    //         state.holding = b
    //         return state
    //     else: return False


    pickup: function(state, b){

      if (state.pos[b] === 'table' && state.clear[b] === true && state.holding === false){

        state.pos[b]    = 'hand';
        state.clear[b]  = false;
        state.holding   = b;
        return state;

      } else {return null;}

    },

    unstack: function(state, b, c){

      if (state.pos[b] === c && c !== 'table' && state.clear[b] === true && state.holding === false){

        state.pos[b]    = 'hand';
        state.clear[b]  = false;
        state.holding   = b;
        state.clear[c]  = true;
        return state;
      
      } else {return null;}

    },

    putdown: function(state, b){

      if (state.pos[b] === 'hand'){

        state.pos[b]    = 'table';
        state.clear[b]  = true;
        state.holding   = false;
        return state;
      
      } else {return null;}

    },

    stack: function(state, b, c){

      if (state.pos[b] === 'hand' & state.clear[c]) {
        
        state.pos[b]    = c;
        state.clear[b]  = true;
        state.holding   = false;
        state.clear[c]  = false;
        return state;
      
      } else {return null;}

    }

  };

return H; }(HANNIBAL)); 