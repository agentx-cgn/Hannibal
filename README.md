# Hanninbal #

## An AI/Bot for 0 A.D ##

### Intro ###

The Hannibal AI/Bot is a new approach to reduce the complexity of programming a bot for 0 A.D., a free, open-source, cross-platform real-time strategy game under development by Wildfire Games. Hanninbal was started in February 2014 by agentx. This git will be updated once a week until the project technically matured enough to support full git based development.

### Features ###

* a state machine to handle game phases
  like village, town, city, attack, defense, reconstruction, etc. 

* a triple store to link features of the cultures,
  like who can gather fields, can a healer melee? 

* a simple query language to retrieve information from the triple store
  "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food" 

* a plugin system describing the behavior of groups of units
  (grain-picker, hunter, warrior, guerrilla, miner, etc) 

* a domain specific language used for the plugins
  to allow non programmer to define a group's behavior 

* an economy model with an order queue, a cost analyzer
  and a simple statistic module providing metrics based on resource flows. 

* a HTN PLanner to calculate economic development 
  and attack strategies
  
### Progress ###

* There is a web interface at 



### Roadmap ###

__ A17 __

* Saved games, given engine support
* Shared, dynamic and exclusive buildings
* Builds a plan based economy taking resource 
  availability into account
* Advanced map analysis
* Fortified cities (walls?) 
* Takes advantage of all available technologies 
* Basic attack plans

__ A18 __

* Walls, palisades
* Advanced attack plans

__ A19__

* Seafaring, naval operation

### Technology ###

* SpiderMonkey 29
* Javascript 1.85 + partially ES6

### Project Links ###

* web based development
  http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html


### Further Readings and Links ###

* pyhop https://bitbucket.org/dananau/pyhop
* SHOP http://www.cs.umd.edu/projects/shop/
* 0 A.D. http://en.wikipedia.org/wiki/0_A.D._%28video_game%29
* 0 A.D. http://play0ad.com/


## License ##