/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- C O N T E X T  ----------------------------------------------

  Hannibal's Bots can run in 3 different contexts: a) the game, b) a simulator and 
  c) the Explorer. Most importantly contexts differ in sensors and effectors,
  0AD saves and loads serialized contexts.

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.LIB.Context = function(key, launcher){

    this.defaults = {                                    // all primitive data
      key:            key,                               // used in logs
      connector:      "",                                // set by connecting
      time:           Date.now(),                        // time game created/saved 
      timeElapsed:    0,                                 // API data
      idgen:          1,                                 // seed for unique object ids
      turn:           0,                                 // increments on API tick
      tick:           0,                                 // increments on BOT tick
    };

    this.klass    = "context";
    this.launcher = launcher;
    this.parent   = launcher;
    this.id       = launcher.id;
    this.name     = launcher.name + ":" + key;
    this.deb      = launcher.deb;

    // stateful support objects, ordered, no dependencies to following objects
    this.serializers = [
      "events", 
      "culture",     // has childs: store, tree, phases
      "map",         // grids
      "resources",   // after map
      "claims",      // after map
      "villages",    // after claims
      "scanner",     // scanner after map, before groups
      "groups",      // assets
      "stats",       // located in eco
      "orderqueue",  // located in eco
      "producers",   // located in eco
      "economy",     // stats, producers, orderqueue
      "military",    // attack groups and support buildings
      "comms",       // range query units for group radio
      "diplomacy",   // 
      "brain",       // keep information uptodate
      "scripter",    // boot up groups
      "bot",         // make decisions
    ];

    // this props need an update each tick, because sharedscript changed
    // this.updates = [
    //   "timeElapsed",
    //   "territory",
    //   "passability",
    //   "passabilityClasses",
    //   "techtemplates",
    //   "player",
    //   "players",
    // ];

    // action sequence to launch serializers
    this.sequence = [
      "create",        // either new Obj or Obj.clone
      "import",        // import properties from context
      "deserialize",   // if context contains data 
      "initialize",    // otherwise init from game data
      "finalize",      // 
      "activate",      // subsribe to events
      "log",           // 
    ];

    // debug, avoid noisy logs during sequence
    this.logger = [
      // "events", 
      "culture",     // store, tree, phases
      "map",         // grids
      "resources",   // after map
      "villages", 
      // "scanner",     // scanner after map, before groups
      "groups",      // assets
      "economy",     // stats, producers, orderqueue
      "diplomacy",   // policies
      "comms",       // policies
      // "military", 
      // "brain", 
      "bot", 
    ];

    // importer register here to update later on ticks
    this.importer = new Set();

    // set initial properties
    H.extend(this, this.defaults, {data: {}});
    this.serializers.forEach(s => this.data[s] = null);

  };

  H.LIB.Context.prototype = H.mixin(
    H.LIB.Tools.prototype, 
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Context,
    log: function(){
      var data = {};
      H.each(this.defaults, name => data[name] = this[name]);
      this.deb();
      this.deb("   CTX: %s", uneval(data));
    },
    runSequence: function(fn){
      this.sequence.forEach( action => {
        this.serializers.forEach( serializer => {
          fn(serializer, action);
        });      
      });      
    },
    createBot: function(){
      return (this.bot = new H.LIB.Bot(this).import().initialize());
    },
    serialize: function(){

      var data = {
        key:           this.key,
        connector:     this.connector,
        time:          Date.now(),
        timeElapsed:   this.timeElapsed,
        idgen:         this.idgen,
        id:            this.id,
        turn:          this.turn,
        tick:          this.tick,
        difficulty:    this.difficulty,
        data:          {},
      };

      this.serializers.forEach(serializer => {
        data.data[serializer] = this[serializer].serialize();
      });

      return data;

    },
    deserialize: function(data){
      var name = this.name;
      H.extend(this, data);
      this.name = name;
    },
    clone: function(name){

      // prepares a new context by de/serializing this one

      var ctxClone;

      name = name || this.name + ".copy";

      ctxClone = new H.LIB.Context(name);

      // copy primitive default data
      H.each(this.defaults, name => ctxClone[name] = this[name]);

      // reset id generator
      ctxClone.idgen = 1;  /// ????

      // launch serializers
      this.runSequence( (serializer, action) => {

        var obj = ctxClone[serializer];

        if (action === "create"){
          ctxClone[serializer] = this[serializer].clone(ctxClone);
          ctxClone[serializer].klass   = serializer; 
          ctxClone[serializer].parent  = ctxClone;
          ctxClone[serializer].name    = ctxClone.name + ":" + serializer;

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          // ( obj[action] && obj[action]() );
          obj[action]();

        } else {
          this.deb("   IGN: logger: %s", serializer);
        }

      });

      return ctxClone;

    },
    initialize: function(config){


      H.extend(this, {

        config:              config,
        context:             this, // make tools.prototype work on it self
        operators:           H.HTN.Economy.operators,
        methods:             H.HTN.Economy.methods,
        planner:             new H.HTN.Planner(this, {
          name:      "eco.planner",
          verbose:   1
        }),

      });

      this.runSequence( (serializer, action) => {

        var obj = this[serializer];

        // this.deb("   CTX: %s initialize: a: %s.%s, type: %s", this.name, serializer, action, (obj && typeof obj[action]));

        if (action === "create"){ 
          this[serializer] = new H.LIB[H.noun(serializer)](this);
          this[serializer].klass   = serializer; 
          this[serializer].parent  = this;
          this[serializer].name    = this.name + ":" + serializer;

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          if (typeof obj[action] !== "function"){
            H.logObject(obj, "obj");
          }
          obj[action]();

        } else {
          // logging for this serializer disabled

        }

      });

    },
    connectExplorer:  function(launcher){

      this.connector = "explorer";

      H.extend(this, {
        params:              H.toArray(arguments),
        launcher:            launcher,
        effector:            new H.LIB.Effector(this).import(),
      });

    },
    connectSimulator: function(launcher){

      this.connector = "simulator";

      H.extend(this, {
        params:              H.toArray(arguments),
        launcher:            launcher,
        effector:            new H.LIB.Effector(this).import(),
      });

    },
    connectEngine: function(launcher, gameState, sharedScript, settings){

      var 
        t0, item,
        ss = sharedScript,
        gs = gameState, 
        entities = gs.entities._entities,
        sanitize = H.saniTemplateName;

      this.updateEngine = (sharedScript, secs) => {

        t0 = Date.now();

        // this.updates is here relevant

        ss = sharedScript;

        this.secs = secs;

        this.sharedscript       = sharedScript; // tmp for map
        this.gamestate          = sharedScript.gameState[this.id]; // tmp for map

        this.timeElapsed        = sharedScript.timeElapsed;
        this.territory          = sharedScript.territoryMap;
        this.passability        = sharedScript.passabilityMap;
        this.passabilityClasses = sharedScript.passabilityClasses;
        this.techtemplates      = sharedScript._techTemplates;
        this.player             = sharedScript.playersData[this.id];
        this.players            = sharedScript.playersData;
        this.resourcemaps       = sharedScript.resourceMaps;
        
        // this.metadata           = ss._entityMetadata[this.id];

        // H.logObject(ss.playersData[this.id], "ss.playersData[this.id]");

        this.entities = new Proxy(sharedScript._entities, {
          get: (proxy, attr) => {
            return (
              H.isInteger(+attr)        ? proxy.get(+attr) :
              proxy[attr] !== undefined ? proxy[attr]      :
                H.throw("entities no attr: '%s'", uneval(attr))
            );
          }
        });

        // escalate down
        // for (item of this.importer){
        H.each(this.importer, (index, item) => {
          // this.deb("   CTX: import %s %s", item.name, item.imports.sort());
          if (!item.name || !item.klass){
            this.deb("   CTX: update import, unknown: n: '%s', k: '%s', props: %s", item.name || "", item.klass || "", H.attribs(item));
          }
          item.import();
        });

        // if (this.map){
        //   (new H.LIB.Grid(this))
        //     .import()
        //     .initialize({label: "pass",  data: H.lowerbyte(this.passability.data})
        //     .process((i, x, z, v) => (v & 2) ? 255 : 0)
        //     .dump("sync" + this.tick, 255)
        //     .release()
        //   ;
        // }

      };

      H.extend(this, {

        connector:           "engine",

        params:              H.toArray(arguments),
        launcher:            launcher,

        // id:                  settings.player,                   // bot id, used within 0 A.D.
        difficulty:          settings.difficulty,               // Sandbox 0, easy 1, or nightmare or ....

        phase:               gs.currentPhase(),          // num
        cellsize:            gs.cellSize, 
        width:               ss.passabilityMap.width  *4, 
        height:              ss.passabilityMap.height *4, 
        circular:            ss.circularMap,
        territory:           ss.territoryMap,
        passability:         ss.passabilityMap,

        // API read only, static
        templates:           settings.templates,
        techtemplates:       ss._techTemplates, 

        // API read only, dynamic
        modifications:       ss._techModifications[settings.player],
        player:              ss.playersData[settings.player],
        players:             ss.playersData,

        // entities:            new Proxy({}, {get: (proxy, id) => {
        //   return ss._entities.get(~~id);
        // }}),

        // API read/write
        metadata:            new Proxy({}, {get: (proxy, id) => {

          var meta = ss._entityMetadata[this.id];
          
          if (H.isInteger(~~id)){
            if (!meta[id]){meta[id] = {};}
            return meta[id];
          } else {
            return undefined;
          }

        }}),

        // API ro/dynamic
        // sanitize UnitAI state // TODO: check if function works too
        // unitstates:          new Proxy({}, {get: (proxy, id) => {

        //   // print("unitstates: " + id);
        //   // this.deb("   CTX: unitstates of id: %s, %s", id, entities[id]._templateName || "no template");

        //   return (
        //     entities[id] && entities[id]._entity.unitAIState ? 
        //       H.replace(entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
        //         undefined
        //   );}
        // }),


        // API ro/dynamic
        // try to get all tech funcs here
        technologies:       new Proxy({}, {get: (proxy, name) => { return (
          name === "available" ? techname => {
            return Object.keys(this.modifications).map(sanitize).some(t => t === techname);
          } :
          name === "templates" ? techname => ss._techTemplates[sanitize(techname)] :
              undefined
        );}}),

        // API ro/dynamic
        // 
        // health: function(ids){

        //   // calcs health of an array of ent ids as percentage

        //   var curHits = 0, maxHits = 0;

        //   ids.forEach(function(id){
        //     if (!entities[id]){
        //       this.deb("WARN  : Tools.health: id: %s in ids, but not in entities, type: %s", id, typeof id);
        //     } else {
        //       curHits += entities[id]._entity.hitpoints;
        //       maxHits += entities[id].maxHitpoints();
        //     }
        //   });

        //   return ids.length ? (curHits / maxHits * 100).toFixed(1) : NaN;

        // },


      });
  
      this.updateEngine(sharedScript);
      this.effector = new H.LIB.Effector(this).import();

    },

  });

return H; }(HANNIBAL));  
