/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject */

/*--------------- S T O R E  --------------------------------------------------

  A triple store with verbs, edges, nodes and a query language


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Store = function(context){

    H.extend(this, {

      name:    "store",
      context: context,
      imports: [
        "culture"
      ],

      verbs:  null,
      nodes:  null,
      edges:  null,

      cntNodes:    0,
      cntQueries:  0,
      cache:      {},
      cacheHit:    0,
      cacheMiss:   0,
      cacheSlots:  100,

    });

  };

  H.LIB.Store.prototype = {
    constructor: H.LIB.Store,
    log: function(){
      deb();
      deb(" STORE: %s verbs, %s nodes, %s edges", this.verbs.length, H.count(this.nodes), this.edges.length);
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
        this.verbs = this.culture.verbs;
        this.nodes = {};
        this.edges = [];
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
        deb("ERROR : node already exists in store: %s, %s ", this.name, node.name);
      }
    },
    delNode: function(name){  // TODO: speed up

      if (this.nodes[name]){
        H.delete(this.edges, edge => edge[0].name === name || edge[2].name === name);
        delete this.nodes[name];
        this.cntNodes -= 1;

      } else {
        deb("WARN  : store.delNode: can't delete '%s' unknown", name);
      }

    },
    addEdge: function(source, verb, target){
      if (!source)                      {deb("ERROR : addEdge: source not valid: %s", source);} 
      else if (!target)                 {deb("ERROR : addEdge: target not valid: %s", target);} 
      else if (!this.nodes[source.name]){deb("ERROR : addEdge: no source node for %s", source.name);}
      else if (!this.nodes[target.name]){deb("ERROR : addEdge: no target node for %s", target.name);}
      else if (this.verbs.indexOf(verb) === -1){deb("ERROR : not a verb %s, have: %s", verb, H.prettify(this.verbs));}
      else {
        this.edges.push([source, verb, target]);
      }
    },

  };

  // H.Store = function(name){
  //   this.name  = name;
  //   this.verbs = [];
  //   this.nodes = {};
  //   this.edges = [];
  //   this.cntNodes = 0;
  //   this.cntQueries = 0;
  //   this.cache = {};
  //   this.cacheHit   =   0;
  //   this.cacheMiss  =   0;
  //   this.cacheSlots = 100;
  // };

  // H.Store.prototype = {
  //   addVerb: function(verb){
  //     this.verbs.push(verb);
  //   },
  //   addNode: function(node){
  //     if (!this.nodes[node.name]){
  //       this.nodes[node.name] = node;
  //       this.cntNodes += 1;
  //     } else {
  //       deb("ERROR : node already exists in store: %s, %s ", this.name, node.name);
  //     }
  //   },
  //   addEdge: function(source, verb, target){

  //     if (!source)                      {deb("ERROR : addEdge: source not valid: %s", source);} 
  //     else if (!target)                 {deb("ERROR : addEdge: target not valid: %s", target);} 
  //     else if (!this.nodes[source.name]){deb("ERROR : addEdge: no source node for %s", source.name);}
  //     else if (!this.nodes[target.name]){deb("ERROR : addEdge: no target node for %s", target.name);}
  //     else if (this.verbs.indexOf(verb) === -1){deb("ERROR : not a verb %s, have: %s", verb, H.prettify(this.verbs));}
  //     else {
  //       this.edges.push([source, verb, target]);
  //     }

  //     // if (source && this.nodes[source.name] && this.nodes[target.name] && this.verbs.indexOf(verb) !== -1){
  //     //   this.edges.push([source, verb, target]);
  //     // } else {
  //     //   if (!source){}
  //     //   else if (!this.nodes[source.name]){deb("ERROR: addEdge: no source node for %s", source.name);}
  //     //   else {deb("ERROR : edge not valid: verb: %s, source: %s, target: %s", verb, source.name, target.name);}
  //     // }
  //   },
  //   delNode: function(name){  // TODO: speed up

  //     var idx, dels = [], self = this;
      
  //     this.edges.forEach(function(edge){
  //       if (edge[0].name === name || edge[2].name === name){
  //         dels.push(edge);
  //       }
  //     });
      
  //     dels.forEach(function(edge){
  //       idx = self.edges.indexOf(edge);
  //       if (idx !== -1){
  //         this.cntNodes -= 1;
  //         self.edge.splice(idx, 1);
  //       }
  //     });

  //     this.cntNodes -= 1;
  //     delete this.nodes[name];

  //   },
  //   importFromJSON: function(json){
  //     var self = this;
  //     this.verbs = json.verbs;
  //     this.nodes = json.nodes;
  //     this.cntNodes = H.count(this.nodes);
  //     json.edges.forEach(function(edge){
  //       var src = self.nodes[edge[0]],
  //           tgt = self.nodes[edge[2]];
  //       self.addEdge(src, edge[1], tgt);
  //     });
  //   },
  //   export: function(civs){

  //     // log history > 3,000 per civ, athens~2500, CRs not enforced.

  //     var filePattern = "/home/noiv/.local/share/0ad/mods/public/simulation/ai/hannibal/explorer/data/%s-01-json.export";

  //     function logg(){
  //       print ( arguments.length === 0 ? 
  //         "#! append 0 ://\n" : 
  //         "#! append 0 :" + H.format.apply(H, arguments) + "\n"
  //       );
  //     }    

  //     deb();deb();deb("EXPORT: %s", civs);

  //     civs.forEach(function(civ){
  //       print(H.format("#! open 0 %s\n", H.format(filePattern, civ)));
  //       logg("// EXPORTED culture '%s' at %s", civ, new Date());
  //       var culture = new H.Culture(civ), store = culture.store;
  //       culture.loadDataNodes();           // from data to triple store
  //       culture.readTemplates();           // from templates to culture
  //       culture.loadTechTemplates();       // from templates to triple store
  //       culture.loadTemplates();           // from templates to triple store
  //       culture.finalize();                // clear up
  //       logg("var store_%s = {", civ);
  //         logg("  verbs: %s,", JSON.stringify(store.verbs));
  //         logg("  nodes: {");
  //         H.each(store.nodes, function(name, value){
  //           delete value.template;
  //           logg("    '%s': %s,", name, JSON.stringify(value));
  //         });
  //         logg("  },");
  //         logg("  edges: [");
  //         store.edges.forEach(function(edge){
  //           logg("    ['%s', '%s', '%s'],", edge[0].name, edge[1], edge[2].name);
  //         });
  //         logg("  ],");
  //       logg("};");
  //       logg("// Export end of culture %s", civ);
  //       print("#! close 0\n");
  //     });


  //   }

  // };

  H.LIB.Query = function(store, query, debug){

    this.debug = debug || 0;

    if(this.debug > 0){
      deb();
      deb("PARSER: i '%s'", query);
    }

    this.fromCache = false;
    this.store = store;
    this.verbs = store.verbs.map(String.toUpperCase);
    this.keys  = "DISTINCT, WITH, SORT, LIMIT, RAND".split(", ");
    this.query = this.sanitize(query);
    this.tree  = this.parse(this.query);

    if(this.debug > 0){
      deb("     P: o: %s", JSON.stringify(this.tree));
      deb();
    }

  };

  H.LIB.Query.prototype = {
    constructor: H.LIB.Query,
    checkCache: function(){

      var result, 
          useCache = (
            this.query.indexOf("INGAME") === -1 &&
            this.query.indexOf("TECHINGAME") === -1 &&
            !!this.store.cache[this.query]
      );

      if (useCache){
        result = this.store.cache[this.query].result;
        this.fromCache = true;
        this.store.cache[this.query].hits += 1;
        this.store.cacheHit += 1;
      } else {
        result = undefined;
        this.store.cacheMiss += 1;
      }

      return result;

    },
    parse: function(query){

      var self    = this, 
          verbs   = this.verbs,
          keys    = this.keys,
          clauses = this.partition([query], verbs),
          subClauses, out = [], error;

      function isVerb(t){return verbs.indexOf(t) !== -1;}
      function isString(t){return typeof t === "string";}

      clauses.forEach(function(clause){

        if (isString(clause) || clause.length === 1){
          out.push(clause);

        } else if (isVerb(clause[0])) {

          subClauses = self.partition([clause[1]], keys);

          if (isString(subClauses[0])) {
            out.push([clause[0]].concat(subClauses.shift()));
          } else {
            out.push([clause[0]]);
          }
          subClauses.forEach(function(clause){
            out.push(clause);
          });

        } else {
          error = H.format("unknwon clause keyword: %s, ''", clause[0], clause);
          deb("     P: %s", error);

        }

      });

      return error ? undefined : out;

    },
    count: function(format, debug, debmax, comment){
      return this.execute(format, debug, debmax, comment).length;
    },
    first: function(format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      // return nodes.length ? nodes[0] : undefined;
      return nodes.length ? nodes[0] : null;
    },
    forEach: function(fn, format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      nodes.forEach(fn);
      return nodes;
    },
    filter: function(fn, format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      return nodes.filter(fn);
    },
    map: function(fn, format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      return nodes.map(fn);
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
    execute: function(format, debug, debmax, comment){

      var t1, t0 = Date.now(), 
          self    = this,
          tree    = this.tree,
          verbs   = this.verbs,
          keys    = this.keys,
          edges   = this.store.edges, //  = [source, verb, target]
          nodes   = this.store.nodes, //  = {name:{}}
          cache   = this.store.cache,
          results = [],               // returns always an array
          ops     = 0,
          cacheDrop = "";

      function isKey(t)   {return keys.indexOf(t) !== -1;}
      function isVerb(t)  {return verbs.indexOf(t) !== -1;}
      function isString(t){return typeof t === "string";}
      function sample(a,n){var l=a.length; return H.range(n||1).map(function(){return a[~~(H.Hannibal.entropy.random()*l)];});}
      function parse(v)   { // float or string
        var f = parseFloat(v); 
        return (
          Array.isArray(v) ? v :                  // don't touch arrays
          isNaN(f)         ? v.slice(1, -1) : f   // return strings without quotes
        );
      } 
      function prepResults(ress){
        Object.defineProperty(ress, "stats", {
          enumerable: false,
          configurable: false,
          writable: true,
          value: {
            ops: ops,
            msecs: t1,
            length: results.length,
            cached: self.fromCache,
            hits: cache[self.query].hits,
            nodes: self.store.cntNodes,
            edges: edges.length,
            verbs: verbs.length
          }
        });
        return results;
      }
      function logNodes(){
        // debug
        if (self.debug > 0 && self.fromCache){deb("     Q: %s recs from cache: %s", results.length, self.query);}
        if (self.debug > 0){deb("     Q: executed: msecs: %s, records: %s, ops: %s", t1, results.length, ops);}
        if (self.debug > 1){self.logResult(results, format, debmax);}
      }

      this.debug  = debug || 0;

      this.store.cntQueries += 1;

      // Cached ?
      results = this.checkCache();
      if (results){
        t1 = Date.now() - t0;
        logNodes();
        return prepResults(results);

      } else {
        // we start with all nodes as result
        // results = Object.keys(nodes).map(function (key){return nodes[key];});
        results = Object.keys(nodes).map(key => nodes[key]);
        ops     = results.length;

      }


      if (this.debug > 1){
        deb();deb();
        deb("     Q: q: '%s'", self.query);
        deb("      : c: '%s'", comment || "no comment");
      }

      tree.forEach(function(clause){

        var first  = clause[0],
            verb   = first.toLowerCase(),
            rest   = !!clause[1] ? clause[1]  : undefined, 
            params = !!rest ? rest.split(" ") : undefined, 
            attr, oper, filters;

        if (!H.APP.isTicking && self.debug > 0){
          deb("      : i: ops: %s, nodes: %s, c: %s", H.tab(ops, 4), H.tab(results.length, 4), JSON.stringify(clause));
        }


        // expecting node NAMES, the optional first clause

        if (isString(clause)){

          // convert the names into nodes, remove unknown
          results = clause.split(", ")
            .map(function(name){ops++; return nodes[name] !== undefined ? nodes[name]: undefined;})
            .filter(function(node){ops++; return node !== undefined;});


        // a VERB

        } else if (isVerb(first)) {
          
          // find all edges from source node, with given verb, collect target node

          [ops, results] = self.reduceByVerb(verb, edges, results, ops);



        // a KEYWORD

        } else if (isKey(first)) {

          switch (first){

            case "LIMIT"    : ops += ~~rest; results = results.slice(0, ~~rest); break;
            case "RAND"     : ops += ~~rest; results = sample(results, ~~rest);  break;
            case "DISTINCT" : ops += results.length; results = [...Set(results)]; break;

            case "SORT" :
              oper = params[0]; attr = params[1];
              [ops, results] = self.sortResults(oper, attr, results, ops);

              // oper = params[0]; attr = params[1];
              // results = results.sort(function(an, bn){ 
              //   var anValue = get(an, attr), bnValue = get(bn, attr); ops++;
              //   return (
              //     oper === "<" ? bnValue < anValue :
              //     oper === ">" ? bnValue > anValue :
              //       deb("ERROR : unknown operator in SORT: %s", oper)
              //   );
              // });
            break;

            case "WITH" :

              filters = clause[1].split(", ");
              filters.forEach(function(filter){

                var attr, oper, queryValue;

                filter = filter.split(" ");
                
                attr = filter[0]; 
                oper = filter[1] ? filter[1] : "e"; 
                queryValue = (filter[2] !== undefined) ? parse(filter[2]) : undefined;

                results = results.filter(function(node){
                  
                  var nodeValue = self.get(node, attr); ops++;

                  return (
                    oper === "e"  ? nodeValue !== undefined  : // exists ?
                    oper === "="  ? nodeValue === queryValue :
                    oper === "<"  ? nodeValue <   queryValue :
                    oper === ">"  ? nodeValue >   queryValue :
                    oper === "!=" ? nodeValue !== queryValue :
                    oper === "<=" ? nodeValue <=  queryValue :
                    oper === ">=" ? nodeValue >=  queryValue :
                      deb("ERROR : unknown operator in WITH: %s", oper)
                  );

                });

              });

            break;
          }

        } else {
          deb("ERROR : clause starts with invalid KEYWORD: %s", first);

        }

      });

      // from here there is a result set of nodes

      t1 = Date.now() - t0;

      // put in cache
      if (cache.length > this.store.cacheSlots){
        cacheDrop = Object.keys(cache).sort(function(a, b){
          return cache[a].hits - cache[b].hits;
        })[0];
        if (this.debug > 0){deb("     Q: cache drop: hits: %s, qry: %s", cache[cacheDrop].hits, cache[cacheDrop]);}
        delete cache[cacheDrop];
      }
      cache[this.query] = {hits: 0, result: results};

      logNodes();

      return prepResults(results);

    },
    sortResults: function (oper, attr, results, ops){

      var anValue, bnValue, get = this.get, out = results.sort((an, bn) => { 
        anValue = this.get(an, attr); 
        bnValue = get(bn, attr); ops++;
        return (
          oper === "<" ? bnValue < anValue :
          oper === ">" ? bnValue > anValue :
            deb("ERROR : unknown operator in SORT: %s", oper)
        );
      });

      return [ops, out];

    },
    reduceByVerb: function (verb, edges, result, ops){

      // this has to be VERY fast

      var e = 0|0, out = [], r = result.length|0, eLen = edges.length|0;

      while(r--){
        e = eLen;
        while(e--){
          if (edges[e][0] === result[r] && edges[e][1] === verb){
            ops++; 
            out.push(edges[e][2]);
          }
        }
      }
      
      return [ops, out];

    },
    logResult: function (result, format, debmax){

      var i, meta, node, c, p, t = H.tab;

      function saniJson(node){
        node = H.deepcopy(node);
        node.template = "...";
        return H.prettify(node);
      }

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
      deb();

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
    sanitize: function(phrase){
      phrase = H.replace(phrase, "\n", " ");
      phrase = H.replace(phrase, "\t", " ");
      phrase = H.replace(phrase, " ,", ",");
      return phrase.split(" ").filter(function(s){return !!s;}).join(" ");
    }

  };  


return H; }(HANNIBAL)); 
