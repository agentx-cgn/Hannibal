/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- C O N T E X T  ----------------------------------------------

  Hannibal's Bots can run in 3 different contexts: a) the game, b) a simulator and 
  c) the Explorer. Most importantly contexts differ in sensors and effectors,
  0AD saves and loads serialized contexts.

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.LIB.Context = function(name){

    this.defaults = {                                    // all primitive data
      name:           name,                              // used in logs
      connector:      "",                                // set by connecting
      time:           Date.now(),                        // time game created/saved 
      timeElapsed:    0,                                 // API data
      idgen:          1,                                 // seed for unique object ids
      turn:           0,                                 // increments on API tick
      tick:           0,                                 // increments on BOT tick
    };

    // stateful support objects, ordered, no dependencies to following objects
    this.serializers = [
      "events", 
      "culture",     // store, tree, phases
      "map",         // grids
      "resources",   // after map
      "villages", 
      "scanner",     // scanner after map, before groups
      "groups",      // assets
      "economy",     // stats, producers, orderqueue
      "military", 
      "brain", 
      // "bot", 
    ];

    // action sequence to launch serializers
    this.sequence = [
      "create",         // either new Obj or Obj.clone
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
      // "map",         // grids
      // "resources",   // after map
      // "villages", 
      // "scanner",     // scanner after map, before groups
      "groups",      // assets
      "economy",     // stats, producers, orderqueue
      // "military", 
      // "brain", 
      // "bot", 
    ];

    // set initial properties
    H.extend(this, this.defaults, {data: {}});
    this.serializers.forEach(s => this.data[s] = null);

  };

  H.LIB.Context.prototype = {
    constructor: H.LIB.Context,
    log: function(){
      var data = {};
      H.each(this.defaults, name => data[name] = this[name]);
      deb("   CTX: %s", uneval(data));
    },
    runSequence: function(fn){
      this.sequence.forEach( action => {
        this.serializers.forEach( serializer => {
          fn(action, serializer);
        });      
      });      
    },
    createBot: function(){
      return (this.bot = new H.LIB.Bot(this).import().initialize());
    },
    serialize: function(){

      var data = {
        name:          this.name,
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

      // add helper, still confusing here
      H.extend(ctxClone, {
        query:      function(hcq, debug){
          return new H.LIB.Query(ctxClone.culture.store, hcq, debug);
        },
        class2name: function(klass){
          return new H.LIB.Query(ctxClone.culture.store, klass + " CONTAIN").first().name;
        },
      });

      // launch serializers
      this.runSequence( (action, serializer) => {

        var obj = ctxClone[serializer];

        if (action === "create"){
          ctxClone[serializer] = this[serializer].clone(ctxClone);

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          ( obj[action]  && obj[action]() );

        } else {
          deb("   IGN: logger: %s", serializer);
        }

      });

      return ctxClone;

    },
    initialize: function(config){

      H.extend(this, {

        config:              config,

        query:               (hcq, debug) => {
          return new H.LIB.Query(this.culture.store, hcq, debug);
        },
        class2name:          klass => {
          return new H.LIB.Query(this.culture.store, klass + " CONTAIN").first().name;
        },

        operators:           H.HTN.Economy.operators,
        methods:             H.HTN.Economy.methods,
        planner:             new H.HTN.Planner(this, {
          name:      "eco.planner",
          verbose:   1
        }),

      });

      this.runSequence( (action, serializer) => {

        var obj = this[serializer];

        // deb("   CTX: %s initialize: a: %s.%s", this.name, serializer, action);

        if (action === "create"){ 
          this[serializer] = new H.LIB[H.noun(serializer)](this);

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          ( obj[action] && obj[action]() );

        } else {
          // logging for serializer disabled

        }

      });

      deb("   CTX: %s initialized", this.name);

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

      var self = this;

      this.connector = "engine";

      H.extend(this, {

        params:              H.toArray(arguments),
        launcher:            launcher,

        id:                  settings.player,                   // bot id, used within 0 A.D.
        difficulty:          settings.difficulty,               // Sandbox 0, easy 1, or nightmare or ....

        phase:               gameState.currentPhase(),          // num
        cellsize:            gameState.cellSize, 
        width:               sharedScript.passabilityMap.width  *4, 
        height:              sharedScript.passabilityMap.height *4, 
        circular:            sharedScript.circularMap,
        territory:           sharedScript.territoryMap,
        passability:         sharedScript.passabilityMap,

        // API read/write
        metadata:            H.Proxies.MetaData(sharedScript._entityMetadata[settings.player]),

        // API read only, static
        templates:           settings.templates,
        techtemplates:       sharedScript._techTemplates, 

        // API read only, dynamic
        states:              H.Proxies.States(gameState.entities._entities),
        entities:            gameState.entities._entities,
        modifications:       sharedScript._techModifications,
        player:              sharedScript.playersData[settings.player],
        players:             sharedScript.playersData,

        unitstates:          new Proxy({}, {  // sanitize UnitAI state
          get: function (proxy, id) {
            return (
              self.entities[id] && self.entities[id]._entity.unitAIState ? 
                H.replace(self.entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
                undefined
            ); 
          }
        }),

        technologies:       new Proxy({}, {
          get: function (proxy, name){
            return (
              name === "available" ? tech => Object.keys(self.modifications).map(H.saniTemplateName).some(t => t === tech) :
                undefined
            );
          }
        }),



      });

      this.effector = new H.LIB.Effector(this).import();


    },


  };

return H; }(HANNIBAL));  
