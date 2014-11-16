#!/bin/bash


#!/bin/bash

pathWork="/home/noiv/Desktop/0ad"
pathMod="/home/noiv/.local/share/0ad/mods/hannibal"
pathCode="/home/noiv/.local/share/0ad/mods/hannibal/simulation/ai/hannibal"
pathDistriMod="/home/noiv/Desktop/0ad/distribution/hannibal"
pathDistriHanni="/home/noiv/Desktop/0ad/distribution/hannibal/simulation/ai/hannibal"

cd $pathMod
cp mod.json $pathDistriMod
cp readme.txt $pathDistriMod

cd $pathCode
cp data.json $pathDistriHanni

ls _*.js | xargs cat > _merged.js
ls [a-z]*.js | xargs cat > azmerged.js
cat _merged.js azmerged.js > merged.js
mv merged.js $pathDistriHanni
rm _merged.js
rm azmerged.js

cd $pathDistriHanni

## cat functions.js config.js classes.js creatures.js paintdebug.js panels.js behaviour.js bios.js aqua.js main.js > simulation.js

# java -jar /home/noiv/Programs/yuicompressor-2.4.8.jar \
#   --line-break 80 \
#   merged.js > merged.yc.js

cd $pathWork

ls $pathDistriHanni