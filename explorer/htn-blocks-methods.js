/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L A N N E R -----------------------------------------------

  Port of the file: blocks_world_operators.py



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Blocks = H.HTN.Blocks || {};

  // In each Pyhop planning method, the first argument is the current state (this is analogous to Python methods, in which the first argument is the class instance). The rest of the arguments must match the arguments of the task that the method is for. For example, ('pickup', b1) has a method get_m(state,b1), as shown below.

  var allBlocks, isDone, status, findIf;

  H.HTN.Blocks.init = function(){
    allBlocks = H.HTN.Blocks.helper.allBlocks;
    isDone    = H.HTN.Blocks.helper.isDone;
    status    = H.HTN.Blocks.helper.status;
    findIf    = H.HTN.Blocks.helper.findIf;
  };

  H.HTN.Blocks.methods = {

    move_blocks: function(state, goal){
      /*
      This method implements the following block-stacking algorithm:
      If there's a block that can be moved to its final position, then
      do so and call move_blocks recursively. Otherwise, if there's a
      block that needs to be moved and can be moved to the table, then 
      do so and call move_blocks recursively. Otherwise, no blocks need
      to be moved.
      */

      var b1, s, all = allBlocks(state);

      for (b1 of all){
        s = status(b1, state, goal);
        if (s === 'move-to-table') {
          return [['move_one', b1, 'table'], ['move_blocks', goal]];
        } else if (s === 'move-to-block') {
          return [['move_one', b1, goal.pos[b1]], ['move_blocks', goal]];
        }
      } 

      // if we get here, no blocks can be moved to their final locations

      b1 = findIf(allBlocks(state), function(x){
        return status(x, state, goal) === 'waiting';}
      );

      if (b1 !== null) {
        return [['move_one', b1, 'table'], ['move_blocks', goal]];
      }

      // if we get here, there are no blocks that need moving
      return [];

    },

    // def move1(state,b1,dest):
    //     """
    //     Generate subtasks to get b1 and put it at dest.
    //     """
    //     return [('get', b1), ('put', b1,dest)]
    // pyhop.declare_methods('move_one',move1)

    move_one: function(state, b1, dest){
      return [['get', b1], ['put', b1, dest]];
    },


    // def get_m(state,b1):
    //     """
    //     Generate either a pickup or an unstack subtask for b1.
    //     """
    //     if state.clear[b1]:
    //         if state.pos[b1] == 'table':
    //                 return [('pickup',b1)]
    //         else:
    //                 return [('unstack',b1,state.pos[b1])]
    //     else:
    //         return False
    // pyhop.declare_methods('get',get_m)

    get: function(state, b1){
      if (state.clear[b1]) {
        if (state.pos[b1] === 'table') {
          return [['pickup', b1]];
        } else {
          return [['unstack', b1, state.pos[b1]]];
        }
      } else {
        return null;
      }
    },


    // def put_m(state,b1,b2):
    //     """
    //     Generate either a putdown or a stack subtask for b1.
    //     b2 is b1's destination: either the table or another block.
    //     """
    //     if state.holding == b1:
    //         if b2 == 'table':
    //                 return [('putdown',b1)]
    //         else:
    //                 return [('stack',b1,b2)]
    //     else:
    //         return False
    // pyhop.declare_methods('put',put_m)

    put: function(state, b1, b2){
      if (state.holding === b1) {
        if (b2 === 'table') {
          return [['putdown', b1]];
        } else {
          return [['stack', b1, b2]];
        }
      } else {
        return null;
      }
    }

  };

return H; }(HANNIBAL)); 