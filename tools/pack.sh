#!/bin/bash

: << '--COMMENT--'

  Dependencies
    sudo apt-get install tree

--COMMENT--

# pathRoot="/Daten/Dropbox/Projects/hannibal/"
pathCode="/home/noiv/.local/share/0ad/mods/hannibal/simulation/ai/hannibal"
pathDistri="/Daten/Dropbox/Projects/hannibal"

echo 
echo "-- Start"
echo 

## STATIC

cd $pathDistri
  cp  LICENCE.txt "${pathDistri}/mods/hannibal/LICENCE.txt"
  cp  README.md   "${pathDistri}/mods/hannibal/README.md"
  cp  readme.txt  "${pathDistri}/mods/hannibal.readme.txt"

cd $pathCode
  cp  data.json   "${pathDistri}/mods/hannibal/simulation/ai/hannibal/data.json"

##  DYNAMIC

cd $pathCode
  rm  -f hannibal.m.js 
  ls  _*.js         | xargs cat > _.jss
  ls  [a-z]*.js     | xargs cat > az.jss
  cat  _.jss az.jss > hannibal.m.js
  rm  -f  \
    _.jss \
    az.jss 
  mv  hannibal.m.js "${pathDistri}/mods/hannibal/simulation/ai/hannibal/hannibal.m.js"

##  fake compress
cd "${pathDistri}/mods/hannibal/simulation/ai/hannibal/"
  cp  hannibal.m.js hannibal.u.js
  cp  hannibal.u.js hannibal.p.js
  cp  hannibal.p.js hannibal.js

##  clearup compress
cd "${pathDistri}/mods/hannibal/simulation/ai/hannibal/"
  rm  -f          \
    hannibal.m.js \
    hannibal.u.js \
    hannibal.p.js

##  ZIP

cd "${pathDistri}/mods/"
  rm  -f hannibal.zip
  zip hannibal.zip       \
    hannibal/mod.json    \
    hannibal/README.md   \
    hannibal/LICENCE.txt \
    hannibal/simulation/ai/hannibal/data.json \
    hannibal/simulation/ai/hannibal/hannibal.js

##  CHECK

cd "${pathDistri}/mods/"
  tree
  unzip -l hannibal.zip

echo 
echo "-- Done --"
echo 
