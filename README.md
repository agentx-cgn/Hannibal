# Hannibal #

## An AI/Bot for 0 A.D. ##

### Intro ###

Hannibal is a new approach to reduce the complexity of programming a bot for 0 A.D., a free, open-source, cross-platform real-time strategy game under development by Wildfire Games. Development started in February 2014 by agentx. This git will be updated once a week until the project technically matured enough to support full git based development.

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
  
### Try Out ###

**Prerequisites**

* Locate \binaries\data\mods\public\ folder within 0 A.D. installation
* Create \simulation\ai\hannibal within \public
* Extract all files into \hannibal keeping directory structure intact

**Play**

* Start 0 A.D., select single player new game, select Hannibal as bot

**Test**

* Copy the maps to the map folder
* start 0 A.D. with params: -quickstart -autostart=aitest03 -autostart-ai=1:hannibal

**HTML Explorer**

* Open \hannibal\explorer\hannibal.html

### Progress ###

* The web interface generates basic plans

### Roadmap ###

**A17**

* Saved games, given engine support
* Shared, dynamic and exclusive buildings
* plan based economy taking resource availability into account
* Advanced map analysis
* Fortified cities (towers, walls?) 
* Take advantage of all available technologies 
* Basic attack plans and execution

**A18**

* Walls, palisades
* Advanced attack plans
* Policies via SWOT analysis

**A19**

* Seafaring, naval operation

### Technology ###

* SpiderMonkey 29
* Javascript 1.85 + partially ES6

### Project Links ###

* Web based development
  http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html


### Further Readings and Links ###

* 0 A.D. http://play0ad.com/
* 0 A.D. http://en.wikipedia.org/wiki/0_A.D._%28video_game%29
* pyhop https://bitbucket.org/dananau/pyhop
* SHOP http://www.cs.umd.edu/projects/shop/


## License ##

tbd