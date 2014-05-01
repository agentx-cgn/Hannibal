/*jslint bitwise: true, browser:true, todo:true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- F R A M E S  ------------------------------------------------

  Here behaviour.process() executes in a common closure,
  the goal is to use only high level code here, like a DSL

  V: 0.1, agentx, CGN, Feb, 2014


*/

HANNIBAL = (function(H){

H.Hannibal.Frames = (function(){

  var self, bot, ctx;

  function Frame(name, entryConds, exitConds, action){
    this.name        = name;
    this.entryConds  = entryConds;  // array of strings, resolving to Context properties
    this.exitConds   = exitConds;
    this.action      = action;      // executed by process()
    this.caller      = null;        // keeps track of previous frames
    this.done        = "";          // collects debug info
  }

  Frame.prototype = {
    constructor: Frame,
    toString:   function(){return "[Frame " + this.name + "]";},
    process:    function(me, args){this.action.apply(me, args); return this;},
    checkEnter: function(){
      return this.entryConds.every(function(cond){
        return ctx[cond];
      });
    },
    checkExit: function(){
      return this.exitConds.some(function(cond){
        return ctx[cond];
      });
    }
  };

  return {

    // probably not needed in this case
    boot: function(){
      self = this;
      return this;
    },

    initialize: function (ai, context){

      var frames;
      bot = ai;
      ctx = context;

      function argify(a){return Array.prototype.slice.call(a);}


      // TODO: simplify this c/p stuff
      frames = {

        "ai:ai.whiteflag": new Frame("whiteflag", [], [], function(/* arguments */){
          // the AI starts here and remain or comes back if it can not do anything
          var args = argify(arguments);
          deb(" FRAME: whiteflag.process.in " + this.name);
        }),

        // "ai:ai.g.test": new Frame("g.test", ["isTrue"], ["hasLost"], function(/* arguments */){

        //   // deb(" FRAME: g.test.process.in " + this.name);

        //   // // logObject(bot.groups.groups, "bot.groups.groups");

        //   // if (!bot.groups.groups["g.test"]){
        //   //   this.bot.groups.launch(this.bot.getid(), "g.test");
        //   // }


        // }),
        "ai:ai.village": new Frame("village", ["canTrain"], ["hasLost"], function(/* arguments */){

          // deb(" FRAME: village.process.in " + this.name);

        }),
        "ai:ai.town": new Frame("town", ["isTown"], ["hasLost"], function(/* arguments */){}),
        "ai:ai.city": new Frame("city", ["isCity"], ["hasLost"], function(/* arguments */){}),
        "ai:ai.populate": new Frame("populate", ["canTrain"], ["hasLost"], function(/* arguments */){
        }),
        "ai:ai.technology": new Frame("technology", ["canTrain"], ["hasLost"], function(/* arguments */){}),
        "ai:ai.defense": new Frame("defense", ["canTrain"], ["hasLost"], function(/* arguments */){}),
        "ai:ai.attack": new Frame("attack", ["canTrain"], ["hasLost"], function(/* arguments */){}),
        "ai:ai.victory": new Frame("victory", ["hasWon"], [], function(/* arguments */){}),

        // "food", "wood", "houses", "technology", "defense"
        "ai:mayor:main.build": new Frame("build", [], [], function(/* arguments */){

          var self = this, id;

          // deb(" FRAME: ai:mayor:main.build " + this.name);

          // logObject(this.groups, "this.groups");
          // logObject(this.cfg.groups, "this.cfg.groups");

          // if (H.isEmpty(this.groups) && this.cfg.groups){
          //   H.each(this.cfg.groups, function(name, cfg){
          //     H.range(cfg.amount).forEach(function(){
          //       self.launchGroup(name);
          //     });
          //   });
          // }



        }),
        "ai:mayor:main.food": new Frame("food", [], [], function(/* arguments */){

          if (ctx.cntFood < 1000) {

            // this.launch


          }


        }),
        "ai:mayor:main.wood": new Frame("wood", ["isFalse"], [], function(/* arguments */){}),
        "ai:mayor:main.houses": new Frame("houses", ["isFalse"], [], function(/* arguments */){}),
        "ai:mayor:main.expand": new Frame("expand", ["isFalse"], [], function(/* arguments */){}),
        "ai:mayor:main.technology": new Frame("technology", ["isFalse"], [], function(/* arguments */){}),
        "ai:mayor:main.defense": new Frame("defense", ["isFalse"], [], function(/* arguments */){}),
        

        "mayor:grainpicker.gather": new Frame("gather", ["isFalse"], [], function(/* arguments */){
          // units gather automatically
        }),
        "mayor:grainpicker.sustain": new Frame("sustain", ["isTrue"], [], function(/* arguments */){

          if (this.members.length + this.membersRequested < this.cfg.max) {
            this.requestUnits(1); // this requests default type, TODO: mobile dropsites
            deb(" FRAME: mayor:grainpicker.sustain: 1 member requested");
          }

          if (this.members.length){
            this.createOrFindResource(this.resource);
          }

        }),
        "mayor:grainpicker.find": new Frame("find", ["isTrue"], [], function(/* arguments */){

          var self = this;

          this.members.forEach(function(member){
            if (member.isIdle()) {
              self.instruct(member);
            }
          });

        })

      }; // frames

      deb("**");deb("**");
      deb("FRAMES: have %s frames [%s]", H.attribs(frames).length, H.attribs(frames).sort().join(", "));

      return frames;

    } // init


  };

}()).boot();


return H; }(HANNIBAL));
