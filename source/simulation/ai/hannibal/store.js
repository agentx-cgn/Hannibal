/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- S T O R E  --------------------------------------------------

  A triple store with verbs, edges, nodes and a query language


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Store = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "culture"
      ],

      verbs:    null,
      nodes:    null,
      edges:    null,

      capverbs:    null,
      keywords:   "DISTINCT, WITH, SORT, LIMIT, RAND".split(", "),

      cntNodes:    0,
      cntQueries:  0,

      cache:      {},
      cacheHit:    0,
      cacheMiss:   0,
      cacheSlots:  100,

    });

  };

  H.LIB.Store.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Store,
    log: function(){
      this.deb();
      this.deb(" STORE: %s verbs, %s nodes, %s edges", this.verbs.length, H.count(this.nodes), this.edges.length);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    serialize: function(){
      var nodes = {};
      H.each(this.nodes, (name, node) => nodes[name] = this.culture.delNodeDynaProps(node));
      return {
        verbs: H.deepcopy(this.verbs),
        nodes: H.deepcopy(nodes),
        edges: this.edges.map(e => [e[0].name, e[1], e[2].name]),
      };
    },
    deserialize: function(data){
      this.verbs = data.verbs;
      this.nodes = data.nodes;
      this.edges = data.edges.map(e => [this.nodes[e[0]], e[1], this.nodes[e[2]]]);
      return this;
    },
    initialize: function(){
      if (!this.verbs){
        this.verbs    = this.culture.verbs;
        this.capverbs = this.culture.verbs.map(String.toUpperCase);
        this.nodes    = {};
        this.edges    = [];
      }
      return this;
    },
    finalize: function(){
      this.cntNodes = H.count(this.nodes);
    },
    addNode: function(node){
      if (!this.nodes[node.name]){
        this.nodes[node.name] = node;
        this.cntNodes += 1;
      } else {
        this.deb("WARN  : store.addNode: already exists in store: %s, %s ", this.name, node.name);
      }
    },
    delNode: function(name){  // TODO: speed up

      if (this.nodes[name]){
        H.delete(this.edges, edge => edge[0].name === name || edge[2].name === name);
        delete this.nodes[name];
        this.cntNodes -= 1;

      } else {
        this.deb("WARN  : store.delNode: can't delete '%s' unknown", name);
      }

    },
    addEdge: function(source, verb, target){
      if (!source)                      {this.deb("ERROR : addEdge: source not valid: %s", source);} 
      else if (!target)                 {this.deb("ERROR : addEdge: target not valid: %s", target);} 
      else if (!this.nodes[source.name]){this.deb("ERROR : addEdge: no source node for %s", source.name);}
      else if (!this.nodes[target.name]){this.deb("ERROR : addEdge: no target node for %s", target.name);}
      else if (this.verbs.indexOf(verb) === -1){this.deb("ERROR : not a verb %s, have: %s", verb, H.prettify(this.verbs));}
      else {
        this.edges.push([source, verb, target]);
      }
    },

  });

  H.LIB.Query = function(store, query){

    H.extend(this, {

      context: store.context,

      // timing
      t0:         Date.now(),
      t1:         0,

      results:    null,
      ops:        NaN,

      fromCache:  false,
      store:      store,
      verbs:      store.capverbs,
      keys:       store.keywords,
      params:     {deb: 0, max: 10, cmt: "no comment", fmt: ""},

    });

    this.query = this.sanitize(query);
    this.tree  = this.parse(this.query);

    this.store.cntQueries += 1;

  };

  H.LIB.Query.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Query,
    logNodes: function (){
      var deb = this.params.deb;
      if (deb > 0 && this.fromCache){this.deb("     Q: %s recs from cache: %s", this.results.length, this.query);}
      if (deb > 0){this.deb("     Q: executed: msecs: %s, records: %s, ops: %s", this.t1, this.results.length, this.ops);}
      if (deb > 1){this.logResult(this.results, this.params.fmt, this.params.max);}
    },
    sanitize: function(phrase){
      phrase = H.replace(phrase, "\n", " ");
      phrase = H.replace(phrase, "\t", " ");
      phrase = H.replace(phrase, " ,", ",");
      return phrase.split(" ").filter(function(s){return !!s;}).join(" ");
    },

    parameter: function(params){
      // takes fmt, deb, max, cmt,      
      H.extend(this.params, params);
      return this;
    },
    count: function(){
      this.results = this.results || this.execute();
      return this.results.length;
    },
    first: function(){
      this.results = this.results || this.execute();
      return this.results.length ? this.results[0] : null;
    },
    filter: function(fn, that){
      this.results = this.results || this.execute();
      return this.results.filter(fn, that);
    },
    forEach: function(fn, that){
      this.results = this.results || this.execute();
      this.results.forEach(fn, that);
      return this.results;
    },
    map: function(fn, that){
      this.results = this.results || this.execute();
      return this.results.map(fn, that);
    },

    checkCache: function(){

      var 
        results = null, 
        check = (
          this.query.indexOf("INGAME") === -1 &&
          this.query.indexOf("TECHINGAME") === -1 &&
          !!this.store.cache[this.query]
      );

      if (check){
        results = this.store.cache[this.query].results;
        this.fromCache = true;
        this.store.cache[this.query].hits += 1;
        this.store.cacheHit += 1;

      } else {
        this.store.cacheMiss += 1;

      }

      return results;

    },

    isVerb: function (t){return this.verbs.indexOf(t) !== -1;},
    isKey: function (t){return this.keys.indexOf(t) !== -1;},
    isString : function (t){return typeof t === "string";},
    sample: function (a,n){
      var l=a.length; 
      return H.range(n||1).map(function(){return a[~~(H.Hannibal.entropy.random()*l)];});
    },

    get: function(node, dotlist){
      var p = dotlist.split("."), l = p.length;
      return  (
        l === 0 ? undefined :
        l === 1 && node[p[0]] !== undefined  ? node[p[0]] :
        l === 2 && node[p[0]] !== undefined && node[p[0]][p[1]] !== undefined ? node[p[0]][p[1]] : 
        l === 3 && node[p[0]] !== undefined && node[p[0]][p[1]] !== undefined && node[p[0]][p[1]][p[2]] !== undefined ? node[p[0]][p[1]][p[2]] : 
          undefined
      );
    },
    prepResults: function(results){
      Object.defineProperty(results, "stats", {
        enumerable:   false,
        configurable: false,
        writable:     true,
        value: {
          ops:     this.ops,
          msecs:   this.t1,
          length:  results.length,
          cached:  this.fromCache,
          hits:    this.store.cache[this.query].hits,
          nodes:   this.store.cntNodes,
          edges:   this.store.edges.length,
          verbs:   this.store.verbs.length
        }
      });
      return results;
    },

    parse: function(query){

      var 
        subClauses, out = [], error,
        verbs   = this.verbs,
        keys    = this.keys,
        clauses = this.partition([query], verbs),
        push = item => out.push(item);

      clauses.forEach( clause => {

        if (this.isString(clause) || clause.length === 1){

          push(clause);

        } else if (this.isVerb(clause[0])) {

          subClauses = this.partition([clause[1]], keys);

          if (this.isString(subClauses[0])) {
            push([clause[0]].concat(subClauses.shift()));
          } else {
            push([clause[0]]);
          }

          subClauses.forEach(push);

        } else {
          this.deb("ERROR :  store.parse: unknown keyword '%s' in clause: %s", clause, clause[0]);

        }

      });

      return error ? undefined : out;

    },
    execute: function(){

      var
        ops     = this.ops = 0,
        cacheDrop = "",
        self    = this,
        tree    = this.tree,

        edges   = this.store.edges,     //  = [source, verb, target]
        nodes   = this.store.nodes,     //  = {name:{}}
        cache   = this.store.cache,
        
        // returns always an array
        results = [],               

        // return strings without quotes
        parse =    v => {
          var f = parseFloat(v);
          return Array.isArray(v) ? v : isNaN(f) ? v.slice(1, -1) : f;
        };

      // Cached ?
      if (( results = this.checkCache() )){
        this.t1 = Date.now() - this.t0;
        this.logNodes();
        return this.prepResults(results, ops, this.t1);

      } else {
        // we start with all nodes as result
        results = Object.keys(nodes).map(key => nodes[key]);
        ops     = results.length;

      }


      if (this.params.deb > 1){
        this.deb("      :");
        this.deb("     Q: q: '%s'", self.query);
        this.deb("      : c: '%s'", this.params.com || "no comment");
      }

      tree.forEach( clause => {

        var 
          first  = clause[0],
          verb   = first.toLowerCase(),
          rest   = !!clause[1] ? clause[1]  : undefined, 
          params = !!rest ? rest.split(" ") : undefined, 
          attr, oper, filters;

        // expecting node NAMES, the optional first clause

        if (this.isString(clause)){

          // convert the names into nodes, remove unknown
          results = clause.split(", ")
            .map(function(name){ops++; return nodes[name] !== undefined ? nodes[name]: undefined;})
            .filter(function(node){ops++; return node !== undefined;});


        // a VERB

        } else if (this.isVerb(first)) {
          
          // find all edges from source node, with given verb, collect target node

          [ops, results] = self.reduceByVerb(verb, edges, results, ops);



        // a KEYWORD

        } else if (this.isKey(first)) {

          switch (first){

            case "LIMIT"    : ops += ~~rest; results = results.slice(0, ~~rest); break;
            case "RAND"     : ops += ~~rest; results = this.sample(results, ~~rest);  break;
            case "DISTINCT" : ops += results.length; results = [...Set(results)]; break;

            case "SORT" :

              oper = params[0]; attr = params[1];
              [ops, results] = self.sortResults(oper, attr, results, ops);
            
            break;

            case "WITH" :

              filters = clause[1].split(", ");
              filters.forEach( filter => {

                var attr, oper, queryValue;

                filter = filter.split(" ");
                
                attr = filter[0]; 
                oper = filter[1] ? filter[1] : "e"; 
                queryValue = (filter[2] !== undefined) ? parse(filter[2]) : undefined;

                results = results.filter( node => {
                  
                  var nodeValue = this.get(node, attr); ops++;

                  return (
                    oper === "e"  ? nodeValue !== undefined  : // exists ?
                    oper === "="  ? nodeValue === queryValue :
                    oper === "<"  ? nodeValue <   queryValue :
                    oper === ">"  ? nodeValue >   queryValue :
                    oper === "!=" ? nodeValue !== queryValue :
                    oper === "<=" ? nodeValue <=  queryValue :
                    oper === ">=" ? nodeValue >=  queryValue :
                      this.deb("ERROR : unknown operator in WITH: %s", oper)
                  );

                });

              });

            break;
          }

        } else {
          this.deb("ERROR : clause starts with invalid KEYWORD: %s", first);

        }

      });

      // from here there is a result set of nodes
      this.results = results;

      this.t1 = Date.now() - this.t0;

      // put in cache
      if (cache.length > this.store.cacheSlots){
        cacheDrop = Object.keys(cache).sort(function(a, b){
          return cache[a].hits - cache[b].hits;
        })[0];
        if (this.debug > 0){this.deb("     Q: cache drop: hits: %s, qry: %s", cache[cacheDrop].hits, cache[cacheDrop]);}
        delete cache[cacheDrop];
      }
      cache[this.query] = {hits: 0, results: results};

      this.logNodes();

      return this.prepResults(results, ops, this.t1);

    },
    sortResults: function (oper, attr, results, ops){

      var anValue, bnValue, get = this.get, out = results.sort((an, bn) => { 
        anValue = this.get(an, attr); 
        bnValue = get(bn, attr); ops++;
        return (
          oper === "<" ? bnValue < anValue :
          oper === ">" ? bnValue > anValue :
            this.deb("ERROR : unknown operator in SORT: %s", oper)
        );
      });

      return [ops, out];

    },
    reduceByVerb: function (verb, edges, results, ops){

      // this has to be VERY fast

      var e = 0|0, out = [], r = results.length|0, eLen = edges.length|0;

      while(r--){
        e = eLen;
        while(e--){
          if (edges[e][0] === results[r] && edges[e][1] === verb){
            ops++; 
            out.push(edges[e][2]);
          }
        }
      }
      
      return [ops, out];

    },
    logResult: function (result, format, debmax){

      var i, meta, node, c, p, t = H.tab, deb = this.deb.bind(this);

      debmax = debmax || 20;
      format = format || "";

      deb();
      deb("     D: showing %s/%s format: '%s'", debmax, result.length, format);

      switch (format){
        case "position":  deb("     H:      X      Z | node"); break;
        case "costs":     deb("     H:    F    W    M    S | node"); break;
        case "capacity":  deb("     H:  Cap | node"); break;
        case "metadata":  deb("     H:  ID   Meta | node"); break;
        case "json":      deb("     H:  ID   node | JSON"); break;
        default:
      }
      for (i=0; i<debmax; i++) {
        node = result[i];
        if (node){
          switch (format){
            case "position":
              p = node.position;
              deb("   %s: %s %s | %s", t(i+1,3),
                t(p.x.toFixed(1), 6), t(p.z.toFixed(1), 6), node.name);
            break;
            case "costs":
              c = node.costs;
              deb("   %s: %s %s %s %s | %s", t(i+1,3),
                t(c.food, 4), t(c.wood, 4), t(c.metal, 4), t(c.stone, 4), node.name);
            break;
            case "capacity":
              c = node.capacity;
              deb("   %s: %s | %s", t(i+1,3),
                t(c, 4), node.name);
            break;
            case "metadata":
              meta = H.prettify(node.metadata || {});
              deb("     n: %s | %s | %s", t(node.id || "T", 3), meta, node.name);
            break;
            case "json":
              deb("     n: %s | %s", t(node.id || "T", 3), node.name);
              H.each(node, function(prop, value){
                deb("      : p:  %s: %s", prop, H.prettify(value));
              });

            break;
            default:
              deb("     n: %s", node.name);

          }
        }
      }

    },
    partition: function (list, keywords){
     
      var t, tokens, pointer = 0, clause = 0, found = false, out = [];

      // reject
      if (!list.length || list.length > 1 || list[0] === ""){return undefined;}

      function peek()     {return tokens[pointer] === undefined ? undefined : tokens[pointer];}
      function consume()  {pointer += 1;}
      function isStop(t)  {if (keywords.indexOf(t) !== -1) {found = true; return true;} return false;}
      function append(t)  {
        if (!found) {
          out[clause] = (out[clause] === undefined) ? t : out[clause] + " " + t;
        } else {
          out[clause][1] = (out[clause][1] === undefined) ? t : out[clause][1] + " " + t;
        }
      }
      
      tokens = list[0].split(" "); t = peek();

      while (t){
        if (isStop(t) && out[clause] === undefined){
          out[clause] = [t];
        } else if (isStop(t)){
          clause += 1; 
          out[clause] = [t];
        } else {
          append(t);
        }
        consume(t); t = peek();
      }

      return out;

    },

  });  


return H; }(HANNIBAL)); 
