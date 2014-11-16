> no game data
  tester-data.js  
  tester.js    
  config.js  
  data.js  
  _helper.js        
  _xdebug.js
  tools.js
  geometry.js  
  ai.js    
  grids.js     
  effector.js  
  simulator.js    
  culture.js 
  htn-planner.js  
  htn-eco-methods.js    
  htn-eco-operators.js  
  htn-helper.js       


_hannibal.js 

> simulation
  events.js       : no data
  brain.js        : plans
  villages.js     : buildings
  military.js     : plans
  map.js          : terrain, claims, etc
  resources.js    : resources
  scout.js        : visits
  economy.js      : orderqúeue, producer
  groups.js       : groups
  asset.js        : ents as resources and users, shared, dynamic
  store.js        : triples
  tree.js         : cache


> assets with resources, users
grp-harvester.js  
grp-template.js  
grp-builder.js    
grp-scouts.js  
grp-custodian.js  
grp-supplier.js  
grp-mayor.js      


















### Scout

  map size
  base coords
  add/remove Group
  add/remove Scout to group
  scan => returns treasure, mines fishs, and next target
  report attack

  deals with grids, 




### Simulation

http://trac.wildfiregames.com/wiki/XML.Entity.Traits.Armour

peirce is for arrows from archers, slingers, tc , towers, etc
crush is from seige weapons
hack is from inf and calv 

  unit
    team
    position
    vision
    range
    health
    speed
    <Armour>
      <Hack>10</Hack>
      <Pierce>12</Pierce>
      <Crush>10</Crush>
    </Armour>
    <Attack>
      <Ranged>
        <Hack>0</Hack>
        <Pierce>26.5</Pierce>
        <Crush>0</Crush>
        <MaxRange>48</MaxRange>
        <MinRange>0.0</MinRange>
        <ProjectileSpeed>50.0</ProjectileSpeed>
        <PrepareTime>1200</PrepareTime>
        <RepeatTime>2000</RepeatTime>
        <Spread>1.0</Spread>
      </Ranged>    
      <Melee>
        <Hack>3</Hack>
        <Pierce>6</Pierce>
        <MaxRange>8.0</MaxRange>
      </Melee>
      <Charge>
        <Hack>8.0</Hack>
        <Pierce>16.0</Pierce>
        <MaxRange>8.0</MaxRange>
      </Charge>    
      <Slaughter>
        <Hack>50.0</Hack>
        <Pierce>0.0</Pierce>
        <Crush>0.0</Crush>
        <MaxRange>4.0</MaxRange>
      </Slaughter>
    </Attack>    

  building
    width
    height
    <Armour>
      <Hack>10</Hack>
      <Pierce>25</Pierce>
      <Crush>3</Crush>
      <Foundation>
        <Hack>5</Hack>
        <Pierce>15</Pierce>
        <Crush>3</Crush>
      </Foundation>
    </Armour>
    <Attack>
      <Ranged>
        <Hack>0.0</Hack>
        <Pierce>20.0</Pierce>
        <Crush>0.0</Crush>
        <MaxRange>72.0</MaxRange>
        <MinRange>10.0</MinRange>
        <ProjectileSpeed>75.0</ProjectileSpeed>
        <PrepareTime>1200</PrepareTime>
        <RepeatTime>2000</RepeatTime>
        <Spread>1.5</Spread>
      </Ranged>
    </Attack>
    <BuildingAI>
      <DefaultArrowCount>3</DefaultArrowCount>
      <GarrisonArrowMultiplier>1</GarrisonArrowMultiplier>
    </BuildingAI>



### XMLHTTPRequest

https://github.com/cocos2d/cocos2d-js/blob/develop/frameworks/js-bindings/bindings/manual/network/XMLHTTPRequest.cpp
https://code.google.com/p/gpsee/source/browse/modules/xhr/xhr.js


### Paths

 For most data created during the game:
    ~/.local/share/0ad/

For user config and logs:
    ~/.config/0ad/ 

For cached data:
    ~/.cache/0ad/ 

#### Trunk 

  /Daten/Projects/Osiris/ps/trunk

#### Release

/home/noiv/.local/share/0ad/mods/public/simulation/ai/hannibal
/home/noiv/.local/share/0ad/saves/
/home/noiv/.local/share/0ad/screenshots/
/home/noiv/.local/share/0ad/mods/user/maps/scenarios

#### Maps

/home/noiv/.local/share/0ad/mods/hannibal/maps/scenarios

#### Maps Trunk

/Daten/Projects/Osiris/ps/trunk/binaries/data/mods/devmaps/maps/scenarios

  Abyss 7*.xml

/Daten/Projects/Osiris/ps/trunk/binaries/data/mods/public/maps/scenarios


#### Maps Home

/home/noiv/.local/share/0ad/mods/user/maps/scenarios

  brain0*.xml


#### Dropbox

/Daten/Dropbox/Projects/simulation/ai/hannibal


#### Explorer

  cd /home/noiv/.local/share/0ad/
  python -m SimpleHTTPServer 8080



### Abyss 

water road > 
  medit city tie dirt
  shoreline beach cliff 50 75
  medit dirt d

land grass
  medit grass shrubs  

### Launches

Brain
  vill 
    scouts
Military
  town
    scouts
Village
  vill
    builder
    mayor
    custodians
Economy
  vill
    supplier
    harvester


### wxgtk

libwxgtk3.0-0
libwxgtk3.0-dev

libwxgtk2.8-0
libwxgtk2.8-dev

### Hierarchie / Philosophie

Brain develops a plan to research next phase
Brain uses scouts to explore and gather information
Economy launches the right set of groups for this plan
Groups gather resources, construct buildings or dissolve

Brain develops attack plans
Military sets up attack groups
Economy launches attack groups
Groups attack

Brains makes a minimal plan to achieve next phase
Groups know helpful techs
Economy has basic actions for each phase
  village 
    houses      - popu
    farmstead   - 1
    storehouse  - 1
    barracks    - 1

init
  Brain inits
  Brain asks Economy for tech of phase
    Economy asks groups for tech
    Economy filter techs for phase
    Economy chooses buildings
    Economy returns techs and buildings 
  Brain adds eco techs, exists techs and build to plan
  Brain makes basic plan
    Economy analyses plan

### Group Tex
:  145 gather.lumbering.ironaxes            ResourceGatherer/Rates/wood.tree   multiply 1.25        Worker  
:  130 gather.capacity.wheelbarrow          ResourceGatherer/Capacities/food   add      5           Worker                
:  134 gather.wicker.baskets                ResourceGatherer/Rates/food.fruit  multiply 1.5         Worker                
?  135 celts.special.gather.crop.rotation   ResourceGatherer/Rates/food.grain  multiply 1.25        Worker                
:  136 gather.farming.plows                 ResourceGatherer/Rates/food.grain  multiply 1.25        Worker                
:  139 gather.mining.wedgemallet            ResourceGatherer/Rates/metal.ore   multiply 1.25        Worker                
:  140 gather.mining.silvermining           ResourceGatherer/Rates/metal.ore   multiply 1.25        Worker                
:  141 gather.mining.shaftmining            ResourceGatherer/Rates/metal.ore   multiply 1.25        Worker                
:  144 gather.mining.serfs                  ResourceGatherer/Rates/stone.rock  multiply 1.25        Worker                

### Balance Sheet

Fortification - Spreading/Claiming
Defense - Attacked
Exploitation - Barter

## http://superuser.com/questions/159379/convert-dds-to-png-using-linux-command-line
  convert test.dds test.png

  for file in *.dds
  do
      convert "$file" "$(basename "$file" .dds).png"
  done


 848 edges on pair: member|contain - Entities member/contain classes
 548 edges on pair: build|buildby - entities build entities
 330 edges on pair: gather|gatheredby - entities gather resources
 312 edges on pair: carry|carriedby - entities carry resourcetypes (ships, trader, gatherer)
 118 edges on pair: hold|holdby - entities hold classes
  92 edges on pair: require|enable - entities require/enable technologies
  88 edges on pair: pair|pairedby - pair pairs two techs
  52 edges on pair: train|trainedby - entities train entities
  82 edges on pair: research|researchedby - entities research technologies
  24 edges on pair: accept|acceptedby - entities accept resourcetypes (dropsites)
   6 edges on pair: heal|healedby - healer heal classes
   6 edges on pair: provide|providedby - entities provide resources



20:44:23 <WildfireBot> Who has actually played a full game in the last 2 weeks?
20:44:26 <scythetwirler> Me.
20:44:42 <erik_feneur> Not me.
20:44:43 <Pureon> Not me
20:44:43 <Gallaecio> Not me.
20:44:44 <MishFTW> Not me, OSX :/
20:44:50 <Spahbod> Me. Played some hours ago.
20:44:50 <mimo_> me
20:44:52 <sanderd17_> nope
20:45:08 <wraitii> (I haven't played in easily 1.5 years)
20:45:09 <historicbruno> not I
20:45:15 <fabio2> me not, also
20:45:25 <leper> I'm not sure if I have, but I just wanted to show something
20:45:53 <MishFTW> If the game compiles, I usually play

### http://trac.wildfiregames.com/ticket/2495
### This relies on ALL game information is in the state.

I had to redesign the event system of Hannibal and I think I found the source of the problem while looking at AIMetadata. Apparently the bot API holds data, which I consider as game state, but from the view of the game it is AI data. So the real question is: How to serialize the data of the API. There are EntityCollections, MetaData and a few maps. Every JS data structure which survives JSON.stringify() is a non-issue for serialization, so the maps are fine, they also can be easily recreated by the API on load game. Hannibal uses only strings and numbers as MetaData and no ECs. Petra uses ECs and perhaps stores object/array pointers as MetaData, Mimo will know. JS functions can be serialized with .toString(), but not with JSON.stringify() and generator functions coming up with next SM are un-serializable. 

In short Hannibal needs MetaData serialized by the game and Petra ECs and MetaData. Serializing the ECs sounds easy because they rely on entity ids, which don't change and in best case Petra does not save pointers as MetaData. However, Petra is scripted and Hannibal not, there may be more work to make Petra work with saved games. 

A clean solution would probably insist on no data in the API, make AIs serialize their metadata, generate the maps with the engine, replaces the ECs with a triple store running in the engine and encourage AIs to have only object instances re-creatable from JSON. 

The low hanging fruit is to find a solution for the JSON compatible MetaData, which is probably very easy. It would open doors for new bots supporting save/load game and the work on Petra could start too.




### Order process 

Group assets place orders with hcq as filter, location and amount
  order.id is taken from H.Objects
  order.remaining is set to order.amount
  order.processing is set to 0
  order is appended to queue
  queued orders are evaluated every n ticks and 
    if tech is researched 
      order is removed
    if order.remaining == 0 
      order is removed
    if order.remaining + order.processing = order.amount 
      order is ignored
    order.executable is set to false
    if n existing units or structures are available
      they are passed to groups
      order.remaining -= n
    if a producer exists and all requirements are met
      order.producer is selected
      order.executable = true

  executable orders are processed every n ticks 
  first over full amount then on single 
    order.unprocessed = order.remaining - order.processing
    if budget > order.unprocessed.cost
    if budget > order.single.cost
      if unit and producer.queue < 3
        order is passed to producer
        producer.queue += 1
        order.processing += order.unprocessed/single
        producer sends order to engine
      if structure
        producer sends order to engine
        order.processing += order.unprocessed/single

  created foundations, trained units and researched techs appear later in events
  TrainingFinished AIMetadata
    H.Bot.culture.loadById(id);
    H.Economy.listener("onOrderReady", id, event);
      event.metadata.order has order.id
      order.processing -= 1
      order.remaining -= 1
  new researchedTechs
    Events.dispatchEvent("onAdvance", "onAdvance", {name: name, tech: tech});


### Quotes ###


“In preparing for battle I have always found that plans are useless, but
planning is indispensable.”
-- Dwight D. Eisenhower

The question of whether machines can think... 
  is about as relevant as the question of 
  whether submarines can swim"
-- Dijkstra


### Keywords ###

micromotives, artificial societies, 


start

if moves.length === 0
  add 4 points to moves, south first, clockwise
  pointer = 0

visit next point

onidle
  has met point
    mark visted
    pointer += 1
  has not
    mark water or unreachable
    pointer += 1






### map root ###

http://trac.wildfiregames.com/export/15148/ps/trunk/binaries/data/mods/public/maps/scenarios/





````js

// Call
  o.f.call(o, d, e, f)     // 15,702,342

// Call with null
  o.f.call(null, d, e, f)  // 15,399,460

// Direct
  o.f(d, e, f)             // 15,062,388

// Apply
  o.f.apply(o, [d, e, f])  //  3,401,670

// Apply predefined array
  o.f.apply(o, z)          //  4,197,047

// Direct with Spread 
  o.f(...z)                //    924,084

// Call with spread
  o.f.call(o, ...z)        //    627,680

// Direct with Spread II
  o.f(...[d, e, f])        //    660,252

// New Function
  o.ff(d, e, f)            // 15,902,228

````










# TODO #

structures.athen.field, structures.athen.dock WITH cost.population === 0


## browser ##

menu (asm, htn, tech)
run


http://stackoverflow.com/questions/2804543/read-subprocess-stdout-line-by-line
https://github.com/0ad/0ad/blob/master/binaries/system/readme.txt
https://gitorious.org/0ad/0ad/source/4d7d842b80163e90cb2333a67b154b4aa908b616:binaries/data/config/system.cfg

Sending keystrokes to Windows exe programs
https://mail.python.org/pipermail/python-list/2011-April/600957.html


### Happy Bots Ticket ###

Chatting

* Full communication between teams with bot members
* Synchronize attacks
* Resource sharing, tributes
* Diplomacy between bots

Monte Carlo

Good bots need a lot of testing with different maps. Also bots could learn fom experience, either by the developer adjusting or tweaking params or let a system generate plausible values from played games. 

In artificial intelligence, stochastic programs work by using probabilistic methods to solve problems, as in simulated annealing, stochastic neural networks, stochastic optimization, genetic algorithms, and genetic programming. A problem itself may be stochastic as well, as in planning under uncertainty.

* Unattended headless testing
* Writes log files/reports
* Basic Map Info to launch pre-written scipts
* Basic Player info [player names] for log header
* Works with Random Map Generator

The Brain

* ability to call async home
* inherit strains from the global gen pool
* exchange strategies in realtime
* live update of bots
* detecting strong/weak players
* opt-in for players/host


## Groups ##

### Grain-picker ###
  onLaunch   : units, field, dropsite, cc, refuge
  onAssign   :
  onAttack   : garrison
  onInterval : update to infantry in city
  comments   : check mobile dropsites

### Forager ###
  onLaunch   : 2 units, dropsite, refuge, cc, location circle, range
  onAssign   : search pattern
  onAttack   : report
  onInterval : if idle, move next, if not picking, if complete dissolve
  comments   : check mobile dropsites

### House Builder ###
  onLaunch   : units per civ, female, refuge, cc, south of cc
  onAssign   : 
  onAttack   :
  onInterval : if popcap < popmax build
  builds     : Houses, Support, Walls, Towers

### Treelogger ###
  onLaunch   :
  onAssign   :
  onAttack   :
  onInterval :
    find resources
    order dropsite
    check mobile dropsites
    order towers on attack
  comments   : check mobile dropsites


### Miner ###
  onLaunch   :
  onAssign   :
  onAttack   :
  onInterval :
    find resources
    order dropsite
    check mobile dropsites
    order towers
    order cc

### Hunter ###
  onLaunch   : circle around cc, search pattern
  onAssign   : start seach
  onAttack   : report
  onInterval : find resource, report metal, stone, wood, pattern complete dissolve

### Scouts ###
  onLaunch   :
  onAssign   :
  onAttack   :
  onInterval :


### MAP ###

LongName: Tiny
  Tiles: 128
LongName: Small (2 players)
  Tiles: 192
LongName: Medium (3 players)
  Tiles: 256, Default: true
LongName: Normal (4 players)
  Tiles: 320
LongName: Large (6 players)
  Tiles: 384
LongName: Very Large (8 players)
  Tiles: 448
LongName: Giant
  Tiles: 512


## fun with planning ##

At game start or load a bot is thrown into cold water. He might discover a very hostile environment in terms of resources, units, buildings and enemies. Interestingly game start and end can be very similar, meaning eveything is low, if the human opponnent has victory within his grasp. But a bot doesn't give up, as long there is a small chance of success - he takes it, right?

What is the worst case? Let's say no civic centers. That's close to ground zero in 0 A.D., because without CC you lack the territory to build any other structure. So, naturally the very first questions in this case are: Can I build a CC? And if not, what can I do at all? It turns out, these are very complex questions.

Let's start with some simple conditions:

  has only resources    
    -> whiteflag
  has only buildings    
    -> whiteflag
  has only units    
    -> whiteflag or fight like hell

Ok, that's not so difficult. And it looks translatable into straight forward JavaScript, too. Here comes the next level:

  has buildings, units, no resources
    has no CC
      has no CC builder
        can not train CC builder
          -> whiteflag or fight like hell
        can train CC builder
          -> gather resources
          -> train CC builder
          -> construct CC
      has CC builder
        -> gather resources
        -> construct CC


Actually that's only the surface. It assumes the units are not champions and the needed resources are available. Here are a few more:

  has buildings, resources, no units
    has no CC
      can train CC builder
        -> train CC builder
        -> construct CC
      can not train CC builder
        -> whiteflag

  has units, resources, no buildings
    has no CC
      has no CC builder
        -> whiteflag or fight like hell
      has CC builder
        -> construct CC

and finally:

  has units, resources, buildings
    has no CC
      has CC builder
        -> construct CC
      has no CC builder
        can train CC builder
          -> train builder
          -> construct CC
        can not train CC builder
          -> whiteflag or fight like hell

Can you imagine how many conditions the bot has to check just to find out he has definetly lost? Now add more edge cases, mixin technologies, multiply with all buildings and all factions and you'll end up with tens of thousands lines of code, hard to read, difficult to maintain and taking months to write.

That's where planners jump in. They know which conditions to check and how to answer them. Ontop they come up with a list of actions to reach your goal or none if your goal is unreachable.

HTN (hierarchical task network) planners are conceptually fairly simple, but extremely powerful. They define a state, that's the starting point, a goal and operators and methods, the latter are just functions. Operators can change the state and methods result in more methods or operators. 

So, you initialize a planner with a state, your goal and then call the first method. From there it tries to decompose the problem until only an ordered list of operators is left - that's your plan.

A 0 A.D example:

state = {
  resources: {food: 300, wood: 300},
  entities: {
    structures.athen.civil.centre: 1
    },
  technologies: [phase.village]
};

goal = {
  resources: {},
  entities: {
    structures.athen.field: 1},
  technologies: [gather.wicker.baskets]
}

The goal basically says: I don't care about resources and the civic centre, but in any case I want a field and foragers better equipped. Do you see the two traps? 

Here's the plan:

HTN: SUCCESS, actions: 8, 1 msecs
  op:   1, train_units ( units.athen.support.female.citizen, 1 )
  op:   2, wait_secs ( 10 )
  op:   3, build_structures ( structures.athen.farmstead, 1 )
  op:   4, wait_secs ( 45 )
  op:   5, build_structures ( structures.athen.field, 1 )
  op:   6, wait_secs ( 100 )
  op:   7, research_tech ( gather.wicker.baskets, 1 )
  op:   8, wait_secs ( 40 )

See how the planner automatically found out he needs a builder for the field and the farmstead for the technology.

And the final state:

resources: { food: 250, wood: 150, time: 195, metal: 0, stone: 0, pop: 1, popmax: 300, popcap: 20 }
entities: {
  structures.athen.civil.centre: 1
  units.athen.support.female.citizen: 1
  structures.athen.farmstead: 1
  structures.athen.field: 1
}
technologies: [phase.village, gather.wicker.baskets]

... which can be used for your next goal. HTN Planners are well used in RTS games. The net has a few nice presentations, google them. Some games have highly optimized ones, checking hundreds of plans each tick, looking for the optimal strategy to keep the human opponent entertained.

So far this planner lacks a few features, he needs a better awareness of time e.g. calculate how long it takes to get a given amount of resources and more challenging learns the concept of parallel tasks.

I'll continue when it produces heros :)








[2664]   events: UNDEFINED (undefined)
[2664]   passabilityMap: UNDEFINED (undefined)
[2664]   territoryMap: UNDEFINED (undefined)
gamestate unavailbale
explicitely set des
isDeserialized = false; 



### Externals

*  Language: https://docs.google.com/drawings/d/1NIsuihzChPC237EsuqKJuP_mtjlxaw9U5ByCmwK0NR0/edit 

### External Libraries + Tools ###

*  http://simjs.com/random.html
*  http://skylink.dl.sourceforge.net/project/tortoisesvn/1.8.4/Application/TortoiseSVN-1.8.4.24972-win32-svn-1.8.5.msi
*  https://github.com/fbzhong/sublime-jslint
*  http://svn.wildfiregames.com/public/ps/trunk

### civs ###

*  athen, brit, cart, celt, gaia, gaul, hele, iber, mace, maur, nociv, pers, ptol, rome, sele, skirm,
   spart, theb

### performance ###

*  http://rfrn.org/~shu/2013/03/20/two-reasons-functional-style-is-slow-in-spidermonkey.html
*  https://github.com/sq/JSIL/wiki/JavaScript-Performance-For-Madmen

### command line

"D:\Games\0 A.D. alpha\binaries\system\pyrogenesis.exe"  -quickstart -autostart=aitest02 -autostart-ai=1:hannibal -autostart-ai=2:aegis

### shared vs. private resources

*  a group can have private or shared resources
*  at game start for all structures => metadata.operator: 'g.custodian'
*  at game start for all units      => metadata.operator: 'none', 'g.healers', 'g.hero'

__group requests private unit: (e.g. grainpicker, female)__
  not existing:
    economy trains unit with metadata.order = order.id
  existing: 
    economy selects unit from game
  on ready economy calls resource listener found in order
  listener sets metadata.operator = instance.id
  listener calls onAssign of group

__group requests shared unit: (hero, healer)__
  not existing:
    economy trains unit with metadata.order = order.id
    on ready :
      economy calls listener for 'g.healer' => assign
        listener sets metadata.operator = instance.id
      economy calls listener for order with ?????
  existing: 
    economy calls listener for order with ?????

__group requests private structure: (e.g. field)__
  not existing:
    economy constructs structure with metadata.order = order.id
    events call on ready in economy
  existing: 
    // do nothing special
  economy calls on ready listener for order
  listener sets metadata.operator = instance.id

__group requests shared structure: (e.g. dropsite, refuge, civic centre)__
  not existing:
    economy constructs structure with metadata.order = order.id
    event onAIMetadata :
      launch instance of 'g.custodian'
      set metadata.operator = instance.id
      assign structure to instance
      connect instance downstream with group
      connect group upstream with instance
      economy calls listener for 'g.healer' => assign
      economy calls listener for order with ?????
  existing: 
    // do nothing special
  economy calls on ready listener for order
  listener sets metadata.operator = instance.id


### HTN Planner ###

design goals: 

*  team-based strategies
*  A plan is a list of ordered of primitive tasks
*  None primitive tasks are compound of subtasks
*  primitive tasks perform (physical) actions directly via their operator
*  methods decompose non prim tasks
*  a prim tasks is achieved by an operator
*  Method decomposition does not change the statte of the world
*  operators have no preconditions only effects


SHOP = Simple Hierarchical Orderer Planner

*** https://bitbucket.org/dananau/pyhop
** http://www.cs.umd.edu/~nau/papers/nau2012what.pdf
* http://aigamedev.com/open/reviews/fear-ai/
* http://aigamedev.com/open/coverage/htn-planning-discussion/
* http://www.cs.umd.edu/~nau/planning/slides/
http://www.cse.lehigh.edu/~munoz/projects/HTNbots/files/Hoang_Thesis_v10.pdf
http://www.cse.lehigh.edu/~munoz/AIPlanning/classes/HTN%20final.ppt
http://www.isi.edu/~blythe/cs541/Slides/2003-9-18-htn.pdf
http://icaps07-satellite.icaps-conference.org/workshop8/Planning%20with%20Hierarchical%20Task%20Networks%20in%20Video%20Games.pdf

Logistics
  Military operations planning:
  Air campaign planning, Non-
  Combatant Evacuation Operations
  Crisis Response: Oil Spill Response
  Production line scheduling
  Construction planning:
  Space platform building, house construction
  Space applications:
  mission sequencing, satellite control
  Software Development:
  Unix administrator's script writing

Many features:
  Hierarchical decomposition
  Resources
  Time
  Complex conditions
  Axioms
  Procedural attachments
  Scheduling
  Planning and Execution
  Knowledge acquisition tools
  Mixed-initiative

Problem reduction:
  Decompose tasks into subtasks
  Handle constraints
  Resolve interactions
  If necessary, backtrack and try other decompositions


### economy ###

*  why listener and source in order?

### hot keys ###
http://trac.wildfiregames.com/wiki/HotKeys
F11:        Enable/disable real-time profiler (toggles through the displays of information)
F12:        Show time elapsed since the beginning of the game
Alt+ F:     Show/hide frame counter (FPS)
F2:         Take screenshot (in .png format, location is displayed in the top left of the GUI
Alt + K:    Show the 0 A.D. logo and copyright notice as a watermark for images.
Alt + G:    Hide/show the GUI
Alt + D:    Show/hide developer overlay (with developer options)
Space:      If timewarp mode enabled (in the developer overlay), speed up the game
Backspace:  If timewarp mode enabled (in the developer overlay), go back to an earlier point in the game



### group launch ###
init before ticks, instances, number

### Events ###

*  Create
*  Destroy
*  Attacked
*  RangeUpdate
*  ConstructionFinished
*  TrainingFinished
*  AIMetadata
*  PlayerDefeated
*  EntityRenamed
*  OwnershipChanged

## 0 A.D. Language ###

have 2 civs, 13 verbs, 342 nodes, 2172 edges
[accept, build, carry, contain, enable, gather, heal, hold, member, provide, require, research, train]

[ nodes | VERB [prop [, prop, [...]]] 
          [WITH prop op value [, prop op value, [...]]] 
          [SORT op prop [, op prop, [...]]]
          [LIMIT value]
          [RAND value]
[VERB [...]]
]



### Startup Conditions and Priorities

  has only resources    
    -> whiteflag
  has only buildings    
    -> whiteflag
  has only units    
    -> whiteflag or fight like hell

  has buildings, units, no resources
    has no CC
      has no CC builder
        can not train CC builder
          -> whiteflag or fight like hell
        can train CC builder
          -> gather resources
          -> train CC builder
          -> construct CC
      has CC builder
        -> gather resources
        -> construct CC

  has buildings, resources, no units
    has no CC
      can train CC builder
        -> train CC builder
        -> construct CC
      can not train CC builder
        -> whiteflag

  has units, resources, no buildings
    has no CC
      has no CC builder
        -> whiteflag or fight like hell
      has CC builder
        -> construct CC

  has units, resources, buildings
    has no CC
      has CC builder
        -> construct CC
      has no CC builder
        can train CC builder
          -> train builder
          -> construct CC
        can not train CC builder
          -> whiteflag or fight like hell


