

# Map Analysis #


## Passability Map ##

  pathfinderObstruction: 1,   // map border
  foundationObstruction: 2, 
  building-land:         4, 
  building-shore:        8, 
  default:              16, 
  ship:                 32, 
  unrestricted:         64

## Terrain for Pathfinder ##

````js
t = (
  (s  &  1)              ?  0 :   // dark   red : pathfinder obstruction forbidden
  (s  & 32) &&  (s & 64) ? 64 :   //        red : land too steep
  (s  & 32) && !(s & 64) ? 32 :   // dark  blue : deep water
  !(s & 16) &&  (s & 64) ? 16 :   // light blue : land and water
  (s  & 16)              ?  8 :   //      green : land only
    255                           // the gaps (probably land and water)
);
````


## Foundation Obstructions ##

