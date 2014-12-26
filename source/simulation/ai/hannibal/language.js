/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- D S L -------------------------------------------------------

  provides a grammar for the domain specific language used in groups



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){	


	H.LIB.Grammar = H.LIB.Grammar || {};	
	
	H.LIB.Language = function (context, corpus) {

		H.extend(this, {

			context:    context,
			corpus:     corpus,

			nouns:      null,
			verbs:      null,
			attributes: null,

		});

	};

	H.LIB.Language.prototype = H.mixin (
		H.LIB.Serializer, {
		constructor: H.LIB.Language,
		initialize: function(nouns, verbs, attributes){

		},
		noun: function(name, noun){

		}
	
	});


	H.LIB.Grammar.groups = {
		nouns: {},
		verbs: {},
		attributes: {},
	}
		




return H; }(HANNIBAL));
