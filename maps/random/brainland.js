/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals 
	uneval, log, RMS, TERRAIN_SEPARATOR, PI, TWO_PI, 
	cos, sin, round, randInt, abs, 
	randomizeBiome, InitMap, getNumPlayers, createTileClass, placeTerrain, sortPlayers, getMapSize, randFloat, createArea, 
	scaleByMapSize, fractionToTiles, addToClass, placeCivDefaultEntities, createObjectGroup, createStragglerTrees, 
	ClumpPlacer, LayeredPainter, SimpleGroup, SimpleObject, createFood, 
	avoidClasses, createBumps, createHills, createMines, createDecoration, createForests, createMountains, createLayeredPatches, createPatches, 
	rBiomeT1, rBiomeT2, rBiomeT3, rBiomeT4, rBiomeT5, rBiomeT6, rBiomeT7, rBiomeT8, rBiomeT10, rBiomeT11, rBiomeT12, 
	rBiomeE1, rBiomeE2, rBiomeE3, rBiomeE4, rBiomeE5, rBiomeE6, rBiomeE7, rBiomeE8, rBiomeE10, rBiomeE11, rBiomeE12, rBiomeE13, 
	rBiomeA1, rBiomeA2, rBiomeA5, rBiomeA6, rBiomeA7, rBiomeA8, 
	ExportMap
*/

var tt = Date.now();

RMS.LoadLibrary("rmgen");

//random terrain textures
var random_terrain = randomizeBiome();

const 
	tMainTerrain = rBiomeT1(),
	tForestFloor1 = rBiomeT2(),
	tForestFloor2 = rBiomeT3(),
	tCliff = rBiomeT4(),
	tTier1Terrain = rBiomeT5(),
	tTier2Terrain = rBiomeT6(),
	tTier3Terrain = rBiomeT7(),
	tHill = rBiomeT8(),
	// tDirt = rBiomeT9(),
	tRoad = rBiomeT10(),
	tRoadWild = rBiomeT11(),
	tTier4Terrain = rBiomeT12(),
	// tShoreBlend = rBiomeT13(),
	// tShore = rBiomeT14(),
	// tWater = rBiomeT15(),

	// gaia entities
	oTree1 = rBiomeE1(),
	oTree2 = rBiomeE2(),
	oTree3 = rBiomeE3(),
	oTree4 = rBiomeE4(),
	oTree5 = rBiomeE5(),
	oFruitBush = rBiomeE6(),
	oChicken = rBiomeE7(),
	oMainHuntableAnimal = rBiomeE8(),
	// oFish = rBiomeE9(),
	oSecondaryHuntableAnimal = rBiomeE10(),
	oStoneLarge = rBiomeE11(),
	oStoneSmall = rBiomeE12(),
	oMetalLarge = rBiomeE13(),

	// decorative props
	aGrass = rBiomeA1(),
	aGrassShort = rBiomeA2(),
	// aReeds = rBiomeA3(),
	// aLillies = rBiomeA4(),
	aRockLarge = rBiomeA5(),
	aRockMedium = rBiomeA6(),
	aBushMedium = rBiomeA7(),
	aBushSmall = rBiomeA8(),

	pForest1 = [tForestFloor2 + TERRAIN_SEPARATOR + oTree1, tForestFloor2 + TERRAIN_SEPARATOR + oTree2, tForestFloor2],
	pForest2 = [tForestFloor1 + TERRAIN_SEPARATOR + oTree4, tForestFloor1 + TERRAIN_SEPARATOR + oTree5, tForestFloor1],
	BUILDING_ANGlE = -PI/4;

// initialize map

log("Initializing map...");

InitMap();

const 
	numPlayers = getNumPlayers(),
	mapSize = getMapSize();
	// mapArea = mapSize*mapSize;

// create tile classes

var 
	clPlayer = createTileClass(),
	clHill = createTileClass(),
	clForest = createTileClass(),
	// clWater = createTileClass(),
	clDirt = createTileClass(),
	clRock = createTileClass(),
	clMetal = createTileClass(),
	clFood = createTileClass(),
	clBaseResource = createTileClass();
	// clSettlement = createTileClass();

// silly globals
var
	group,
	playerIDs,
	playerX,
	playerZ,
	playerAngle;

function step0  (/* options */) {
	for (var ix = 0; ix < mapSize; ix++)
	{
		for (var iz = 0; iz < mapSize; iz++)
		{
			var x = ix / (mapSize + 1.0);
			var z = iz / (mapSize + 1.0);
				placeTerrain(ix, iz, tMainTerrain);
		}
	}
}

function step1  (/* options */) {
	playerIDs = [];
	for (var i = 0; i < numPlayers; i++)
	{
		playerIDs.push(i+1);
	}
	playerIDs = sortPlayers(playerIDs);
}

function step2  (/* options */) {

	playerX = new Array(numPlayers);
	playerZ = new Array(numPlayers);
	playerAngle = new Array(numPlayers);

	var startAngle = randFloat(0, TWO_PI);
	for (var i = 0; i < numPlayers; i++)
	{
		playerAngle[i] = startAngle + i*TWO_PI/numPlayers;
		playerX[i] = 0.5 + 0.35*cos(playerAngle[i]);
		playerZ[i] = 0.5 + 0.35*sin(playerAngle[i]);
	}
}

function step3  (/* options */) {
	for (var i = 0; i < numPlayers; i++)
	{
		var id = playerIDs[i];
		// var group, num, j;
		var num, j;
		log("Creating base for player " + id + "...");
		
		// some constants
		var radius = scaleByMapSize(15,25);
		// var cliffRadius = 2;
		// var elevation = 20;
		
		// get the x and z in tiles
		var fx = fractionToTiles(playerX[i]);
		var fz = fractionToTiles(playerZ[i]);
		var ix = round(fx);
		var iz = round(fz);
		addToClass(ix, iz, clPlayer);
		addToClass(ix+5, iz, clPlayer);
		addToClass(ix, iz+5, clPlayer);
		addToClass(ix-5, iz, clPlayer);
		addToClass(ix, iz-5, clPlayer);
		
		// create starting units
		placeCivDefaultEntities(fx, fz, id, BUILDING_ANGlE);
		
		// create the city patch
		var cityRadius = radius/3;
		var placer = new ClumpPlacer(PI*cityRadius*cityRadius, 0.6, 0.3, 10, ix, iz);
		var painter = new LayeredPainter([tRoadWild, tRoad], [1]);
		createArea(placer, painter, null);
		
		// create animals
		for (j = 0; j < 2; ++j)
		{
			var aAngle = randFloat(0, TWO_PI);
			var aDist = 7;
			var aX = round(fx + aDist * cos(aAngle));
			var aZ = round(fz + aDist * sin(aAngle));
			
			group = new SimpleGroup(
				[new SimpleObject(oChicken, 5,5, 0,2)],
				true, clBaseResource, aX, aZ
			);
			createObjectGroup(group, 0);
		}
		
		// create berry bushes
		var bbAngle = randFloat(0, TWO_PI);
		var bbDist = 12;
		var bbX = round(fx + bbDist * cos(bbAngle));
		var bbZ = round(fz + bbDist * sin(bbAngle));
		group = new SimpleGroup(
			[new SimpleObject(oFruitBush, 5,5, 0,3)],
			true, clBaseResource, bbX, bbZ
		);
		createObjectGroup(group, 0);
		
		// create metal mine
		var mAngle = bbAngle;
		while(abs(mAngle - bbAngle) < PI/3)
		{
			mAngle = randFloat(0, TWO_PI);
		}
		var mDist = 12;
		var mX = round(fx + mDist * cos(mAngle));
		var mZ = round(fz + mDist * sin(mAngle));
		group = new SimpleGroup(
			[new SimpleObject(oMetalLarge, 1,1, 0,0)],
			true, clBaseResource, mX, mZ
		);
		createObjectGroup(group, 0);
		
		// create stone mines
		mAngle += randFloat(PI/8, PI/4);
		mX = round(fx + mDist * cos(mAngle));
		mZ = round(fz + mDist * sin(mAngle));
		group = new SimpleGroup(
			[new SimpleObject(oStoneLarge, 1,1, 0,2)],
			true, clBaseResource, mX, mZ
		);
		createObjectGroup(group, 0);
		var hillSize = PI * radius * radius;
		// create starting trees
		num = 5;
		var tAngle = randFloat(0, TWO_PI);
		var tDist = randFloat(12, 13);
		var tX = round(fx + tDist * cos(tAngle));
		var tZ = round(fz + tDist * sin(tAngle));
		group = new SimpleGroup(
			[new SimpleObject(oTree1, num, num, 0,3)],
			false, clBaseResource, tX, tZ
		);
		createObjectGroup(group, 0, avoidClasses(clBaseResource,2));
		
		// create grass tufts
		num = hillSize / 250;
		for (j = 0; j < num; j++)
		{
			var gAngle = randFloat(0, TWO_PI);
			var gDist = radius - (5 + randInt(7));
			var gX = round(fx + gDist * cos(gAngle));
			var gZ = round(fz + gDist * sin(gAngle));
			group = new SimpleGroup(
				[new SimpleObject(aGrassShort, 2,5, 0,1, -PI/8,PI/8)],
				false, clBaseResource, gX, gZ
			);
			createObjectGroup(group, 0);
		}
	}
}


function step4  (/* options */) {

	// create bumps
	createBumps();

	// create hills
	if (randInt(1,2) == 1)
		createHills([tCliff, tCliff, tHill], avoidClasses(clPlayer, 20, clHill, 15), clHill, scaleByMapSize(3, 15));
	else
		createMountains(tCliff, avoidClasses(clPlayer, 20, clHill, 15), clHill, scaleByMapSize(3, 15));

	// create forests
	createForests(
	 [tMainTerrain, tForestFloor1, tForestFloor2, pForest1, pForest2],
	 avoidClasses(clPlayer, 20, clForest, 18, clHill, 0), 
	 clForest,
	 1.0,
	 random_terrain
	);
}

function step5  (/* options */) {

	// create dirt patches
	createLayeredPatches(
	 [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)],
	 [[tMainTerrain,tTier1Terrain],[tTier1Terrain,tTier2Terrain], [tTier2Terrain,tTier3Terrain]],
	 [1,1]
	);

	// create grass patches
	log("Creating grass patches...");
	createPatches(
	 [scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)],
	 tTier4Terrain
	);
}

function step6  (/* options */) {

	// create stone quarries
	createMines(
	 [
	  [new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)],
	  [new SimpleObject(oStoneSmall, 2,5, 1,3)]
	 ]
	);

	log("Creating metal mines...");
	// create large metal quarries
	createMines(
	 [
	  [new SimpleObject(oMetalLarge, 1,1, 0,4)]
	 ],
	 avoidClasses(clForest, 1, clPlayer, 20, clMetal, 10, clRock, 5, clHill, 1),
	 clMetal
	);

}

function step7  (/* options */) {

	var planetm = 1;

	if (random_terrain==7)
		planetm = 8;

	createDecoration
	(
	 [[new SimpleObject(aRockMedium, 1,3, 0,1)], 
	  [new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
	  [new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)],
	  [new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)],
	  [new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
	 ],
	 [
	  scaleByMapSize(16, 262),
	  scaleByMapSize(8, 131),
	  planetm * scaleByMapSize(13, 200),
	  planetm * scaleByMapSize(13, 200),
	  planetm * scaleByMapSize(13, 200)
	 ]
	);
}

function step8  (/* options */) {

	createFood
	(
	 [
	  [new SimpleObject(oMainHuntableAnimal, 5,7, 0,4)],
	  [new SimpleObject(oSecondaryHuntableAnimal, 2,3, 0,2)]
	 ], 
	 [
	  3 * numPlayers,
	  3 * numPlayers
	 ]
	);
}

function step9  (/* options */) {

	createFood
	(
	 [
	  [new SimpleObject(oFruitBush, 5,7, 0,4)]
	 ], 
	 [
	  3 * numPlayers
	 ],
	 avoidClasses(clForest, 0, clPlayer, 20, clHill, 1, clFood, 10)
	);
}

function step10  (/* options */) {

	var types = [oTree1, oTree2, oTree4, oTree3];	// some variation
	createStragglerTrees(types);

}
// Export map data

var sequence = [
	[ 2, step0,  "Place terrain...",               {}],
	[ 3, step1,  "Randomize player order...",      {}],
	[ 5, step2,  "Place players...",               {}],
	[10, step3,  "Creating village...",            {}],
	// [20, step4,  "Creating bumps/hills/mountains/forests...", {}],
	// [50, step5,  "Creating dirt/grass patches...", {}],
	// [55, step6,  "Creating stone/metal mines...",  {}],
	// [65, step7,  "Creating decoration...",         {}],
	// [70, step8,  "Creating animals...",            {}],
	// [75, step9,  "Creating fruits...",             {}],
	// [85, step10, "Creating straggler trees...",    {}],
];

function tab (s,l){l=l||4;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);}

print("--- ### generating: brainland (" + sequence.length + ") ### ---\n");
sequence.forEach(function (task){
	var t0 = Date.now();
	RMS.SetProgress(task[0]); log(task[2]);
	task[1](task[3]);
	print("  " + tab(Date.now() - t0) + " -> " + task[2] + "\n");
});
print("--- ### finished: brainland (" + sequence.length + " steps in " + ((Date.now() - tt)/1000).toFixed(1) + " secs) ### ---\n");

ExportMap();