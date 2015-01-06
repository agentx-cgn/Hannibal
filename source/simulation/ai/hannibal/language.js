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

      verbs:         null,

      world:         null,
      worlds:        null,

      scriptname:    ""

    });

    this.name = H.format("language:%s", corpus);
    this.deb("  LANG: loaded corpus: %s", this.corpusname);

  };

  H.DSL.Language.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.DSL.Language,
    initialize: function(){

      this.worlds = new Map();
      this.verbs = {};

      // prepare nouns
      // H.each(this.corpus.nouns, (noun, obj) => this.nouns[noun] = obj);

      return this;
    },
    createWorld: function(actor){

      var self = this, world = {actor: actor};

      // this.deb("   DSL: createActor");
      
      H.extend(world, {

        execute:  false,
        proceed:  false,

        nouns:      {},
        // attributes:{},
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
            world.deb("      :    actor: %s, script: %s", world.actor, self.scriptname);
            world.deb("      :  subject: %s, object: %s", world.subject, world.object);
            world.deb("      : sentence: %s", world.sentence);
            H.each(self.corpus.nouns, noun => {
              if (world[noun]){
                world.deb("      : %s -> %s", noun, world[noun]);
              }
            });
            world.deb("------: ");
          }
          return world;
        },

        reset: () => {
          this.deb("   DSL: world reset from sentence: %s", world.sentence);
          world.sentence = [];
          world.proceed  = true;
          world.execute  = true;
          world.subject  = null;
          world.object   = null;
          H.each(this.corpus.nouns, noun => {
            ( world.nouns[noun] && world.nouns[noun].update && world.nouns[noun].update() );
          });

        },

        objectify:  (name, obj) => {

          this.deb("   DSL: objectifying: %s for %s", name, world.actor);
          this.setnoun(world, name, new this.corpus.nouns[name](obj, name));

        },
        nounify:  () => {

          H.toArray(arguments).forEach( noun => {

            this.deb("   DSL: nounifying: %s for %s", noun, world.actor);
            
            var host = this.handler.nounify(world, actor, noun);
            this.setnoun(world, noun, new this.corpus.nouns[noun](host, noun));

          });
        }

      });
  
      // on, off, do
      H.each(H.DSL.Corpora.globals.meta, (name, fn) => {
        Object.defineProperty(world, name, {
          get: fn, enumerable: true
        });
      });

      // reset, end, member, lt, gt, match
      H.each(
        H.DSL.Corpora.globals.modifier, 
        this.corpus.modifier, 
        (name, fn) => this.setverb(world, name, fn)
      );

      // count, size, position, health
      H.each(
        this.corpus.attributes, 
        (name, fn) => this.setattribute(world, name, fn)
      );      

      this.worlds.set(actor, world);
      
      return world;

    },
    runScript: function(world, actor, script, params){
      this.world = world;
      this.scriptname = script.name;
      world.actor = actor;
      world.reset();
      params.unshift(world);
      script.apply(actor, params);
    },
    setverbs: function(world, verbs){
      H.each(verbs, (verb, fn) => this.setverb(world, verb, fn));
    },
    setnoun:  function(world, noun, obj){
      this.deb("   DSL: setnoun: %s", noun);
      world.nouns[noun] = obj;
      Object.defineProperty(world, noun, {
          configurable: true, enumerable: true, 
          get: function () {
            if (this.execute){
              this.sentence.push(["o:", noun]);
              this.object = obj;
              this.deb("   DSL: setobject: %s", noun);
            } else {
              this.deb("   DSL: ignored setobject: %s", noun);
            }
            return this;
          }
      });
    },
    setverb:  function(world, verb, fn){
      this.deb("   DSL: setverb: %s", verb);
      world[verb] = () => {
        var args = H.toArray(arguments);
        if (world.execute && world.proceed){
          world.sentence.push(["v:", verb]);
          args.unshift(world.actor, world.subject, world.object);
          fn.apply(world, args);
          this.deb("   DSL: applied verb '%s' args: %s", verb, args);
        } else {
          this.deb("   DSL: ignored: verb '%s' pro: %s, exe: %s", verb, world.proceed, world.execute);
        }
        return world;
      };
    },
    setattribute:  function(world, attribute, fn){
      this.deb("   DSL: setattribute: %s", attribute);
      Object.defineProperty(world, attribute, {
          configurable: true, enumerable: true, 
          get: function () {
            this.sentence.push(["a:", attribute]);
            if (this.execute && this.proceed){
              this.deb("   DSL: read attribute '%s'", attribute);
              return fn.call(this, this.object);
            } else {
              this.deb("   DSL: ignored attribute '%s' pro: %s, exe: %s", attribute, this.proceed, this.execute);
              return null;
            }
          }
      });
    },
    deleteWorld: function(actor){
      this.worlds.delete(actor);
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
            this.object  = null;
            this.execute = false; 
            this.proceed = false; 
          }
          return this;
        },
      },
      modifier: {
        match:  function(act, sub, obj, a, b){
          if (this.execute && this.proceed){
            if (a === undefined && b === undefined){
              this.proceed = false;
            } else if (a !== undefined && b === undefined){
              this.proceed = !!a;
              // pass on single param valid
            } else if (a !== b){
              this.proceed = false;
            }
          }
          return this;
        },
        gt:     function(act, sub, obj, a, b){
          if (this.execute && this.proceed){
            if (a !== undefined && b !== undefined && ( a <= b)){
              this.proceed = false;
            }
          }
          // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
          return this;
        },
        lt:     function(act, sub, obj, a, b){
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
        "field":       H.DSL.Nouns.Entities,   
        "dropsite":    H.DSL.Nouns.Entities,   
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
        member: function(act, s, o){

          // H.logObject(s, "member.s");

          this.deb("   DSL: member.in: s: %s, o: %s, pro: %s, exe: %s", s, o, this.proceed, this.execute);

          this.proceed = this.proceed ? (
            s && o && s.list && o.list && 
            s.list.length && o.list.length &&
            o.list.every(r => s.list.indexOf(r) !== -1)
          ) : false;

          this.deb("   DSL: member.out: s: %s, o: %s, pro: %s, exe: %s", s, o, this.proceed, this.execute);

          return this;
        },
      }
    }
  };

return H; }(HANNIBAL));
