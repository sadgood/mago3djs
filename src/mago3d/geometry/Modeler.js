
'use strict';


/**
 * Now under implementation
 * @class Modeler
 */
var Modeler = function() 
{
	if (!(this instanceof Modeler)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	/**
	 * Current modeler's mode. 
	 * @type {Enumeration}
	 * @default CODE.modelerMode.INACTIVE
	 */
	this.mode = CODE.modelerMode.INACTIVE; // test for the moment.
	this.drawingState = CODE.modelerDrawingState.NO_STARTED; // test for the moment.
	this.drawingElement = CODE.modelerDrawingElement.NOTHING; // test for the moment.
	
	// Test objects.***
	this.planeGrid; // sketch plane.
	this.polyLine2d; // current polyline2D to sketch.
	this.geoCoordsList; // class: GeographicCoordsList. geographic polyline.
	this.excavation; // class : Excavation.
	this.tunnel; // class : Tunnel.
	this.bSplineCubic3d;
	
	this.objectsArray; // put here all objects.***
	this.currentVisibleObjectsArray;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.extractObjectsByClassName = function(className, resultObjectsArray) 
{
	if (this.objectsArray === undefined)
	{ return resultObjectsArray; }
	
	if (resultObjectsArray === undefined)
	{ resultObjectsArray = []; }
	
	var objectsCount = this.objectsArray.length;
	for (var i=0; i<objectsCount; i++)
	{
		var object = this.objectsArray[i];
		if (object.constructor.name === className)
		{
			resultObjectsArray.push(object);
		}
	}
	
	return resultObjectsArray;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.newPipe = function(options) 
{
	var interiorRadius = options.interiorRadius;
	var exteriorRadius = options.exteriorRadius;
	var height = options.height;
	
	var pipe = new Pipe(interiorRadius, exteriorRadius, height, options);
	
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }
	
	this.objectsArray.push(pipe);
	return pipe;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.newTube = function(options) 
{
	var interiorRadius = options.interiorRadius;
	var exteriorRadius = options.exteriorRadius;
	var height = options.height;
	
	var tube = new Tube(interiorRadius, exteriorRadius, height, options);
	
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }
	
	this.objectsArray.push(tube);
	return tube;
};

/**
 * 모델러에 콘센트릭튜브 추가
 * @param {Object}
 */
Modeler.prototype.addObject = function(object) 
{
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }

	this.objectsArray.push(object);
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.newBasicFactory = function(factoryWidth, factoryLength, factoryHeight, options) 
{
	var basicFactory = new BasicFactory(factoryWidth, factoryLength, factoryHeight, options);
	basicFactory.bHasGround = true;
	
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }
	
	this.objectsArray.push(basicFactory);
	
	return basicFactory;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.getExtrudedSolidMesh = function(profile2d, extrusionDist, extrudeSegmentsCount, extrusionVector, bIncludeBottomCap, bIncludeTopCap, resultMesh) 
{
	if (profile2d === undefined || extrusionDist === undefined)
	{ return undefined; }
	
	var vtxProfilesList = new VtxProfilesList();
	
	// if want caps in the extruded mesh, must calculate "ConvexFacesIndicesData" of the profile2d before creating vtxProfiles.
	vtxProfilesList.convexFacesIndicesData = profile2d.getConvexFacesIndicesData(undefined);
	
	// create vtxProfiles.
	// make the base-vtxProfile.
	var baseVtxProfile = vtxProfilesList.newVtxProfile();
	baseVtxProfile.makeByProfile2D(profile2d);
	
	if (extrusionVector === undefined)
	{ extrusionVector = new Point3D(0, 0, 1); }
	
	var increDist = extrusionDist/extrudeSegmentsCount;
	for (var i=0; i<extrudeSegmentsCount; i++)
	{
		// test with a 1 segment extrusion.
		var nextVtxProfile = vtxProfilesList.newVtxProfile();
		nextVtxProfile.copyFrom(baseVtxProfile);
		nextVtxProfile.translate(0, 0, increDist*(i+1));
	}
	
	// must separate vbo groups by surfaces.
	resultMesh = vtxProfilesList.getMesh(resultMesh, bIncludeBottomCap, bIncludeTopCap);
	resultMesh.calculateVerticesNormals();
	
	return resultMesh;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.getExtrudedMesh = function(profile2d, extrusionDist, extrudeSegmentsCount, extrusionVector, bIncludeBottomCap, bIncludeTopCap, resultMesh) 
{
	if (profile2d === undefined || extrusionDist === undefined)
	{ return undefined; }

	var solidMesh = Modeler.getExtrudedSolidMesh(profile2d, extrusionDist, extrudeSegmentsCount, extrusionVector, undefined);
	resultMesh = solidMesh.getCopySurfaceIndependentMesh(resultMesh);
	resultMesh.calculateVerticesNormals();
	
	return resultMesh;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.getGeographicCoordsList = function() 
{
	if (this.geoCoordsList === undefined)
	{ this.geoCoordsList = new GeographicCoordsList(); }
	
	return this.geoCoordsList;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.getExcavation = function() 
{
	if (this.excavation === undefined)
	{ this.excavation = new Excavation(); }
	
	return this.excavation;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.getTunnel = function() 
{
	if (this.tunnel === undefined)
	{ this.tunnel = new Tunnel(); }
	
	return this.tunnel;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.addPointToPolyline = function(point2d) 
{
	if (this.polyLine2d === undefined)
	{ this.polyLine2d = new PolyLine2D(); }
	
	this.polyLine2d.newPoint2d(point2d.x, point2d.y);
};


/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.render = function(magoManager, shader, renderType, glPrimitive) 
{
	// Generic objects.***
	/*
	if (this.objectsArray !== undefined)
	{
		var objectsCount = this.objectsArray.length;
		for (var i=0; i<objectsCount; i++)
		{
			this.objectsArray[i].render(magoManager, shader, renderType, glPrimitive);
		}
	}
	*/
	
	// 1rst, render the planeGrid if exist.
	if (this.planeGrid !== undefined)
	{
		this.planeGrid.render(magoManager, shader);
	}
	
	if (this.geoCoordsList !== undefined)
	{
		// Provisionally render geographicPoints.
		this.geoCoordsList.renderPoints(magoManager, shader, renderType);
	}
	
	if (this.excavation !== undefined)
	{
		this.excavation.renderPoints(magoManager, shader, renderType);
	}
	
	if (this.tunnel !== undefined)
	{
		this.tunnel.renderPoints(magoManager, shader, renderType);
	}
	
	
	if (this.bSplineCubic3d !== undefined)
	{
		this.bSplineCubic3d.renderPoints(magoManager, shader, renderType);
	}
	
};

/**
 * 어떤 일을 하고 있습니까?
 */
Modeler.prototype.createPlaneGrid = function(width, height, numCols, numRows) 
{
	// Test function.
	if (width === undefined)
	{ width = 500.0; }
	
	if (height === undefined)
	{ height = 500.0; }
	
	if (numCols === undefined)
	{ numCols = 50; }
	
	if (numRows === undefined)
	{ numRows = 50; }
	
	if (this.planeGrid === undefined)
	{
		this.planeGrid = new PlaneGrid(width, height, numCols, numRows);
	}
	
	
};











































