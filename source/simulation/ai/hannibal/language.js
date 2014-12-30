/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- D S L -------------------------------------------------------

  builds a DSL with a fluent interface used in e.g. groups, 
  based on method chaining/cascading


  V: 0.1, agentx, CGN, Feb, 2014

*/

/*
  Intro: 

    DSL      :  The language module
    Corpus   :  A set of nouns, verbs and attributes [e.g. groups]
    World    :  An environment an actor can change via the language 
                [all groups share same world]. world is usually the first 
                parameter (w) in a script call function.
    Actor    :  Sets the meaning of nouns, verbs, attributes, at each time only 
                one actor is in a world. In the groups world each group instance 
                maps onto an actor.
    Sentence :  JS code written in DSL, to describe the behaviour of the world
    Noun     :  Each sentence consist (minimum) of the world, noun and a verb,
                The world acts also as a noun, so w.log() is a valid sentence.
                Nouns are not followed by parenthesis in opposite to verbs.
    Subject   : The currently selected noun.
    Verbs     : Assuming the nouns: units, resources + verbs: gather, move
                w.units.move(xy), or w.units.gather(w.resources) are correct.
    Modifiers : Stop sentence execution thus allowing flow control. The remainder
                of a sentence remains unheard.

                  .exists(a)   // breaks on a === undefined
                  .match(a, b) // on a !== b
                  .gt(a, b)    // on a < b
                  .lt(a, b)    // on a > b

                These are global modifiers, groups have:

                  .member(a, b)   // breaks if a is not completely member of b


    Example   : 
                  var assign = function(w, asset){
                    
                    // keep requesting units until size
                    w.units
                      .member(asset, g.units)
                      .lt(g.units.count, g.size)
                      .request()
                    ;

                  };

*/


HANNIBAL = (function(H){  

  H.DSL.Nouns.Group = function(host){
    this.host = host;
    this.verbs = [
      "dissolve",
    ];
    this.update();
  };
  H.DSL.Nouns.Group.prototype = {
    constructor: H.DSL.Nouns.Group,
    update: function(){
    }
  };

  H.DSL.Nouns.Entities = function(host){
    this.host  = host;
    this.list  = [];
    this.verbs = [
      "attack",
      "gather",
      "request",
      "repair",
    ];
    this.update();
  };
  H.DSL.Nouns.Entities.prototype = {
    constructor: H.DSL.Nouns.Entities,
    update: function(){
      this.list = this.host.resources.slice();
    }
  };


  H.DSL.Nouns.Entity = function(host){
    this.host = host;
    this.verbs = new H.DSL.Nouns.Entities().verbs;
    this.list = [];
    this.update();
  };
  H.DSL.Nouns.Entity.prototype = {
    constructor: H.DSL.Nouns.Entity,
    update: function(){
      this.list = this.host.resources.slice();
    }
  };


  H.DSL.Nouns.Village = function(host){
    this.host = host;
    this.verbs = new H.DSL.Nouns.Entities().verbs;
    this.list = [];
  };
  H.DSL.Nouns.Village.prototype = H.mixin (
    H.DSL.Nouns.Entities.prototype, {
    constructor: H.DSL.Nouns.Village
  });

  H.DSL.Nouns.Scanner = function(device){
    this.device = device;
    this.verbs = [
      "scan",
    ];
  };


  H.DSL.Language = function (context, handler, corpus) {

    H.extend(this, {

      context:       context,
      corpusname:    corpus,
      corpus:        H.DSL.Corpora[corpus],
      handler:       handler,  

      nouns:         null,
      verbs:         null,
      attributes:    null,

      world:         null,
      actors:        null,

      execute:       false,
      proceed:       false,

    });

    // Object.defineProperties(this, {
    //   "noun": {get: () => this.world.noun},
    // });

  };

  H.DSL.Language.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.DSL.Language,
    initialize: function(){

      this.deb("   DSL: initialize");

      var host;
      
      this.nouns = {};
      this.verbs = {};
      this.attributes = {};
      this.actors = new Map();

      this.world = {
        subject:  null,
        verbs:    {},
        actor:    null,
        log:      () => this.deb.apply(this, arguments),
        toString: () => H.format("[world %s]", this.corpusname),

        objectify:  (name, obj) => {

          this.deb("   DSL: objectifying: %s for %s", name, this.world.actor.instance);

          var noun = obj.name;
          this.world.actor[noun] = new H.DSL.Nouns.Entity(obj);
          this.setnoun(noun, this.world.actor[noun]);

        },
        nounify:  () => {

          H.toArray(arguments).forEach(noun => {

            this.deb("   DSL: nounifying: %s for %s", noun, this.world.actor.instance);
            
            host = this.handler.nounify(this.world, this.world.actor.instance, noun);
            this.world.actor[noun] = new this.world.actor[noun](host);
            this.setnoun(noun, this.world.actor[noun]);

          });
        }

      };

      // enhance world with global modifiers
      H.each(H.DSL.Corpora.globals, (verb, fn) => {
        this.world[verb] = () => {
          fn.apply(this.world, arguments);
          return this.world;
        };
      });

      // enhance world with corpus modifiers
      H.each(this.corpus.modifier, (verb, fn) => {
        this.world[verb] = () => {
          fn.apply(this.world, arguments);
          return this.world;
        };
      });

      this.deb("  LANG: loaded corpus: %s", this.corpusname);

      return this;

    },
    select: function(instance){

      // loads a group from Map
      // updates all registered nouns

      var 
        t0 = Date.now(),
        nouns = [],
        actor = this.actors.get(instance) || this.createActor(instance);

      H.each(this.corpus.nouns, noun => {
        

        if (actor[noun] && actor[noun].update){
          actor[noun].update();
          nouns.push(noun);

        } else {
          // non existing nouns don't need updates
          // this.deb("ERROR : DSL.select: can't update noun: %s", noun);

        }

      });

      this.world.actor = actor;

      this.deb("   DSL: selected: %s in %s msecs with %s nouns, [%s]", instance, Date.now() - t0, nouns.length, nouns);

    },
    deleteActor: function(instance){
      this.actors.delete(instance);
    },
    createActor: function(instance){
      
      var actor = {instance: instance};
      
      H.each(this.corpus.nouns, (noun, obj) => {
        actor[noun] = obj; 
      });

      this.actors.set(instance, actor);

      return actor;

    },
    reset: function(){
      this.world.continue = true;
      this.world.ecexute  = true;
    },
    setnouns: function(nouns){
      H.each(nouns, this.setnoun.bind(this));
    },
    setverbs: function(verbs){
      H.each(verbs, this.setverb.bind(this));
    },
    setnoun: function(name, obj){
      this.nouns[name] = obj;
      Object.defineProperty(this.world, name, {get: () => {
        this.world.subject = this.nouns[name];
        return this.world;
      }});
    },
    setverb: function(verb, fn){
      this.deb("   DSL: setverb: %s", verb);
      this.verbs[verb] = fn;
      this.world[verb] = () => {
        this.verbs[verb].apply(null, arguments);
        return this.world;
      };
    },
  
  });


  function member (a, b) {
    return a.resources.every(r => !~b.resources.indexOf(r));
  }

  H.DSL.Helper = {
    health: function(){},
    vision: function(){},
  };

  H.DSL.Corpora = {
    globals: {
      start:  function(){this.execute = true;},
      end:    function(){this.execute = false;},
      on:     function(){this.proceed = true;},
      off:    function(){this.proceed = false;},
    },
    groups: {
      name: "groups",
      // verbs are defined in groups.js
      nouns : {
        "group":       H.DSL.Nouns.Group,
        "centre":      H.DSL.Nouns.Entity, 
        "buildings":   H.DSL.Nouns.Entities, 
        "village":     H.DSL.Nouns.Village, 
        "units":       H.DSL.Nouns.Entities,   
        "item":        H.DSL.Nouns.Entity,   
        "attacker":    H.DSL.Nouns.Entity,   
        "scanner":     H.DSL.Nouns.Scanner,   
        "resources":   H.DSL.Nouns.Entities,   
      },
      attributes: {
        "position": () => H.Map.getCenter(this.list), 
        "health":   () => H.DSL.Helper.health(this.list), 
        "vision":   () => H.DSL.Helper.vision(this.list), 
        "count":    () => this.list.length, 
        "size":     () => this.size, 
      },
      modifier: {
        lt:     function(a, b){this.proceed = this.proceed ? (a  <  b) : false; return this;},
        gt:     function(a, b){this.proceed = this.proceed ? (a  >  b) : false; return this;},
        match:  function(a, b){this.proceed = this.proceed ? (a === b) : false; return this;},
        member: function(a, b){
          this.proceed = (this.proceed ? (
            a && b && a.list && b.list && 
            a.list.length && b.list.length &&
            member(a, b)
          ) : false );
          return this;
        },
      }
    }
  };

return H; }(HANNIBAL));
