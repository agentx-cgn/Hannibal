#!/bin/bash

: << '--COMMENT--'

  Dependencies
    sudo apt-get install tree

--COMMENT--


## set file date
## find ~/.local/share/0ad/mods/hannibal -exec touch -t 201501220000 {} \;

## paths
# pathRoot="/Daten/Dropbox/Projects/hannibal/"
pathCode="/home/noiv/.local/share/0ad/mods/hannibal/simulation/ai/hannibal"
pathDistri="/Daten/Dropbox/Projects/hannibal"
pathDiffer="/home/noiv/Sources/prettydiff-master"

## files
compiler="/home/noiv/Programs/closure-compiler/compiler.jar"
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
  rm  -f \
    hannibal.m.js \
    _debug.js
  ls  _*.js         | xargs cat > _.jss
  ls  [a-z]*.js     | xargs cat > az.jss
  cat  _.jss az.jss > hannibal.m.js
  rm  -f  \
    _.jss \
    az.jss 
  mv  hannibal.m.js "${pathDistri}/mods/hannibal/simulation/ai/hannibal/hannibal.m.js"

echo
echo counting locs in hannibal.m.js ... 
cd "${pathDistri}/mods/hannibal/simulation/ai/hannibal/"
  cat hannibal.m.js | grep -v ^$ | wc -l


## java -jar compiler.jar --help
## real compress
    # --compilation_level SIMPLE_OPTIMIZATIONS \
    # --language_out ES5_strict \
    # --tracer_mode ALL \
    # --language_in  ECMASCRIPT6_STRICT \
    # --language_out ECMASCRIPT6_STRICT \

echo
echo compressing...
cd "${pathDistri}/mods/hannibal/simulation/ai/hannibal/"

#   java -jar $compiler \
#     --compilation_level WHITESPACE_ONLY \
#     --js hannibal.m.js --js_output_file hannibal.js

fileMini="${pathDistri}/mods/hannibal/simulation/ai/hannibal/hannibal.m.js"
fileFina="${pathDistri}/mods/hannibal/simulation/ai/hannibal/hannibal.js"

echo "${pathDiffer}/api/node-local.js source:'${fileMini}' mode:'minify' readmethod:'file' output:'hannibal.js'"
js "${pathDiffer}/api/node-local.js source:'${fileMini}' mode:minify" ## source:'hannibal.m.js' mode:'minify' readmethod:'file' output:'hannibal.js'"


##  fake compress
# cd "${pathDistri}/mods/hannibal/simulation/ai/hannibal/"
#   cp  hannibal.m.js hannibal.u.js
#   cp  hannibal.u.js hannibal.p.js
#   cp  hannibal.p.js hannibal.js

##  clearup compress
cd "${pathDistri}/mods/hannibal/simulation/ai/hannibal/"
  rm  -f          \
    # hannibal.m.js \
    hannibal.u.js \
    hannibal.p.js

##  ZIP
echo
echo zipping...
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
