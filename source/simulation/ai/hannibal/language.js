/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- D S L -------------------------------------------------------

  builds a DSL with a fluent interface used in e.g. groups, 
  based on method chaining/cascading


  V: 0.1, agentx, CGN, Feb, 2014

*/

/*
  Intro: 

    WARNING  :  The language introduced here, looks like JavaScript and meets its
                syntax. However, e.g. a variable (object) does not hold a value, 
                instead it changes the state of the world, same do methods.

    DSL      :  The language module
    Corpus   :  A set of nouns, verbs and attributes [e.g. groups]
    World    :  An environment an actor can change via the language 
                [all groups share same world]. world is usually the first 
                parameter (w) in a script call function.
    Actor    :  Sets the meaning of nouns, verbs, attributes, at each time only 
                one actor is in a world. In the groups world each group instance 
                maps onto an actor.
    Sentence :  JS code written in DSL to describe the behaviour of the world
    Noun     :  Each sentence consist (minimum) of the world, noun and a verb,
                The world acts also as a noun, so w.log() is a valid sentence.
                Nouns are not followed by parenthesis in opposite to verbs.
    Subject   : The currently selected noun.
    Object    : The currently active noun.
    Verbs     : Assuming the nouns: units, resources + verbs: gather, move
                w.units.move(xy), or w.units.gather(w.resources) are correct.
    Modifiers : Stop sentence execution thus allowing flow control. The remainder
                of a sentence remains unheard.

                  .exists(a)   // breaks on a === undefined
                  .match(a, b) // on a !== b
                  .gt(a, b)    // on a < b
                  .lt(a, b)    // on a > b

                Above are global modifiers, groups have:

                  .member(a, b)   // breaks if a is not completely member of b


    Example   : 
                  var assign = function(w, item){
                    
                    // make item available as object
                    w.objectify("item", item);
                    
                    // keep requesting units until size
                    w.units.on                          // set units as subject
                      .member(item)                     // proceed if item is member of units
                      .lt(w.units.count, w.units.size)  // proceed if count < size
                      .request()                        // order 1 unit from economy
                    ;

                  };

*/


HANNIBAL = (function(H){  

  H.DSL.Language = function (context, handler, corpus) {

    H.extend(this, {

      klass:         "dsl:language",
      context:       context,
      corpusname:    corpus,
      corpus:        H.DSL.Corpora[corpus],
      handler:       handler,  

      nouns:         null,
      verbs:         null,
      attributes:    null,

      world:         null,
      actors:        null,

      scriptname:    ""

    });

    this.name = H.format("language:%s", corpus);

  };

  H.DSL.Language.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.DSL.Language,
    initialize: function(){

      var world, host, self = this;
      
      this.nouns = {};
      this.verbs = {};
      this.attributes = {};
      this.actors = new Map();

      world = this.world = {

        execute:  false,
        proceed:  false,

        actor:    null,   // an external
        subject:  null,   // currently active subject
        object:   null,   // temporarely active object

        // debug
        sentence: [],
        toString: () => H.format("[world %s]", this.corpusname),
        deb:      function(){
          self.deb.apply(self, arguments);
          return world;
        },
        log:      function(){
          var msg = H.format.apply(null, arguments);
          if (world.execute && world.proceed){
            world.deb("------: ");
            world.deb("      : " + msg);
            world.deb("      :    actor: %s, script: %s", world.actor.instance, self.scriptname);
            world.deb("      :  subject: %s, object: %s", this.subject, this.object);
            world.deb("      : sentence: %s", world.sentence);
            H.each(self.nouns, function(noun, obj){
              world.deb("      : %s -> %s", noun, obj);
            });
            world.deb("------: ");
          }
          return world;
        },

        reset: () => {
          var w = this.world;
          w.sentence = [];
          w.proceed  = true;
          w.execute  = true;
        },

        objectify:  (name, obj) => {

          // this.deb("   DSL: objectifying: %s for %s", name, this.world.actor.instance);
          this.setnoun(name, new this.corpus.nouns[name](obj, name));

        },
        nounify:  () => {

          H.toArray(arguments).forEach(noun => {

            // this.deb("   DSL: nounifying: %s for %s", noun, this.world.actor.instance);
            
            host = this.handler.nounify(this.world, this.world.actor.instance, noun);
            this.world.actor[noun] = new this.world.actor[noun](host, noun);
            this.setnoun(noun, this.world.actor[noun]);

          });
        }

      };

      // on, off, do
      H.each(H.DSL.Corpora.globals.meta, (name, fn) => {
        Object.defineProperty(this.world, name, {
          get: fn, enumerable: true
        });
      });

      // reset, end, member, lt, gt, match
      H.each(
        H.DSL.Corpora.globals.modifier, 
        this.corpus.modifier, 
        this.setverb.bind(this)
      );

      // count, size, position, health
      H.each(
        this.corpus.attributes, 
        this.setattribute.bind(this)
      );

      this.deb();
      this.deb("  LANG: loaded corpus: %s", this.corpusname);

      return this;

    },
    run: function(world, actor, script, params){
      world.reset();
      this.selectActor(actor);
      this.scriptname = script.name;
      params.unshift(world);
      script.apply(actor, params);
    },
    setnouns: function(nouns){H.each(nouns, this.setnoun.bind(this));},
    setverbs: function(verbs){H.each(verbs, this.setverb.bind(this));},
    setnoun:  function(name, obj){
      // this.deb("   DSL: setnoun: %s", name);
      this.nouns[name] = obj;
      Object.defineProperty(this.world, name, {
          configurable: true, enumerable: true, 
          get: () => {
            if (this.world.execute){
              this.world.sentence.push(["o:", name]);
              this.world.object = this.nouns[name];
              // this.deb("   DSL: setobject: %s", name);
            }
            return this.world;
          }
      });
    },
    setverb:  function(verb, fn){
      // this.deb("   DSL: setverb: %s", verb);
      this.verbs[verb] = fn;
      this.world[verb] = () => {
        var args = H.toArray(arguments);
        if (this.world.execute && this.world.proceed){
          args.unshift(this.world.object);
          args.unshift(this.world.subject);
          this.world.sentence.push(["v:", verb]);
          this.verbs[verb].apply(this.world, args);
          // this.deb("   DSL: applied verb '%s' args: %s", verb, args);
        } else {
          // this.deb("   DSL: ignored: verb '%s' proceed: %s, execute: %s", verb, this.world.proceed, this.world.execute);
        }
        return this.world;
      };
    },
    setattribute:  function(name, fn){
      // this.deb("   DSL: setattribute: %s", name);
      this.attributes[name] = fn;
      Object.defineProperty(this.world, name, {
          configurable: true, 
          enumerable: true, 
          get: () => {
            if (this.world.execute && this.world.proceed){
              return fn.call(this.world, this.world.object);
            } else {
              return null;
            }
          }
      });
    },
    createActor: function(instance){
      var actor = {instance: instance};
      // this.deb("   DSL: createActor");
      H.each(this.corpus.nouns, (noun, obj) => actor[noun] = obj);
      this.actors.set(instance, actor);
      return actor;
    },
    selectActor: function(instance){

      // loads a group from Map
      // updates all registered nouns

      var actor = this.actors.get(instance) || this.createActor(instance);

      H.each(this.corpus.nouns, noun => {
        ( actor[noun] && actor[noun].update && actor[noun].update() );
      });

      this.world.actor = actor;

    },
    deleteActor: function(instance){
      this.actors.delete(instance);
    },
  
  });


  // Must be before corpus

  H.DSL.Nouns.Group = function(host, name){
    this.name = name;
    this.host = host;
    this.verbs = [
      "dissolve",
    ];
    this.update();
  };
  H.DSL.Nouns.Group.prototype = {
    constructor: H.DSL.Nouns.Group,
    toString: function(){return H.format("[noun:group %s]", this.name);},
    update: function(){
    }
  };


  // a generic, represents an asset with a list of entities
  
  H.DSL.Nouns.Entities = function(host, name){
    this.name = name;
    this.host = host;
    this.update();
  };
  H.DSL.Nouns.Entities.prototype = {
    constructor: H.DSL.Nouns.Entities,
    toString: function(){return H.format("[noun:entities %s[%s]]", this.name, this.list.join("|"));},
    update: function(){
      this.list = this.host.resources.slice();
      this.size = this.host.size;
      this.position = this.host.position;
      this.foundation = this.host.foundation || false;
    }
  };

  H.DSL.Nouns.Village = function(host, name){
    this.name = name;
    this.host = host;
    this.verbs = new H.DSL.Nouns.Entities().verbs;
    this.list = [];
  };
  H.DSL.Nouns.Village.prototype = H.mixin (
    H.DSL.Nouns.Entities.prototype, {
    constructor: H.DSL.Nouns.Village,
    toString: function(){return H.format("[noun:village  %s[%s]]", this.name, this.list.join("|"));},
  });

  H.DSL.Nouns.Scanner = function(device, name){
    this.name = name;
    this.device = device;
    this.verbs = [
      "scan",
    ];
  };
  H.DSL.Nouns.Scanner.prototype = {
    constructor: H.DSL.Nouns.Scanner,
    toString: function(){return H.format("[noun:scanner  %s[%s]]", this.name, this.list.join("|"));},
  };

  H.DSL.Helper = {
    health: function(){},
    vision: function(){},
  };

  H.DSL.Corpora = {
    globals: {
      meta: {
        on: function(){
          if (this.execute){
            this.proceed = true;  
            this.sentence = ["s:", this.object.name];
            this.subject = this.object;
            // this.deb("   DSL: on setsubject: %s", this.subject);
          }
          return this;
        },
        do: function(){
          if (this.execute && this.proceed){
            this.sentence.push(["s:", this.object.name]);
            this.subject = this.object;
            // this.deb("   DSL: do setsubject: %s", this.subject);
          }
          return this;          
        },
        off: function(){
          if (this.execute && this.proceed){
            this.subject = null;
            this.object = null;
            this.proceed = false; 
          }
          return this;          
        },
        exit:    function(){
          if (this.proceed){
            this.subject = null;
            this.object = null;
            this.execute = false; 
            this.proceed = false; 
          }
          return this;
        },
      },
      modifier: {
        match:  function(s, o, a, b){
          if (this.execute && this.proceed){
            if (a === undefined && b === undefined){
              this.proceed = false;
            } else if (!!a && b === undefined){
              // pass on single param valid
            } else if (a !== b){
              this.proceed = false;
            }
          }
          return this;
        },
        gt:     function(s, o, a, b){
          if (this.execute && this.proceed){
            if (a !== undefined && b !== undefined && ( a <= b)){
              this.proceed = false;
            }
          }
          // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
          return this;
        },
        lt:     function(s, o, a, b){
          if (this.execute && this.proceed){
            if (a !== undefined && b !== undefined && ( a >= b)){
              this.proceed = false;
            }
          }
          // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
          return this;
        }
      },
    },
    groups: {
      name: "groups",
      // verbs are defined in groups.js
      nouns : {
        "group":       H.DSL.Nouns.Group,
        "village":     H.DSL.Nouns.Village, 
        "scanner":     H.DSL.Nouns.Scanner,   
        "centre":      H.DSL.Nouns.Entities, 
        "buildings":   H.DSL.Nouns.Entities, 
        "units":       H.DSL.Nouns.Entities,   
        "item":        H.DSL.Nouns.Entities,   
        "attacker":    H.DSL.Nouns.Entities,   
        "resources":   H.DSL.Nouns.Entities,   
      },
      attributes: {
        position:     function(o){return H.Map.getCenter(o.list);}, 
        health:       function(o){return H.DSL.Helper.health(o.list);}, 
        vision:       function(o){return H.DSL.Helper.vision(o.list);}, 
        count:        function(o){return o.list.length;}, 
        size:         function(o){return o.size;}, 
        foundation:   function(o){return o.foundation;}, 
      },
      modifier: {
        member: function(s, o){

          // H.logObject(s, "member.s");

          // this.log("   DSL: member.in: s: %s, o: %s, proceed: %s", s, o, this.proceed);

          this.proceed = this.proceed ? (
            s && o && s.list && o.list && 
            s.list.length && o.list.length &&
            o.list.every(r => s.list.indexOf(r) !== -1)
          ) : false;

          // this.log("   DSL: member.out: s: %s, o: %s, proceed: %s", s, o, this.proceed);

          return this;
        },
      }
    }
  };

return H; }(HANNIBAL));
