'use strict';

/**
 * Under implementation
 * Top class on Mago3D.
 * Handling mouse event and send it to MouseAction
 * @class MagoWorld
 * @param {MagoManager} magoManager
 */
var MagoWorld = function(magoManager) 
{
	if (!(this instanceof MagoWorld)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	this.magoManager = magoManager;

	this.cameraMovable = true;
	
	// Set the start position of the camera.***
	/*
	var camera = this.magoManager.sceneState.camera;
	var rotMat = new Matrix4();
	var angRad = 45 * Math.PI/180;
	var rotAxis = new Point3D();
	rotAxis.set(1, 0, 1);
	rotAxis.unitary();
	rotMat.rotationAxisAngRad(angRad, rotAxis.x, rotAxis.y, rotAxis.z);
	camera.transformByMatrix4(rotMat);

	this.updateModelViewMatrixByCamera(camera);
	*/
};

/**
 * 첫 번째 시야를 그릴 준비
 * @private
 */
MagoWorld.prototype.renderScene = function()
{
	//this.renderTest();
	var magoManager = this.magoManager; 
	var sceneState = magoManager.sceneState;
	var container = sceneState.canvas.parentElement;

	if (container.style.display === 'none')
	{
		return;
	}
	
	var gl = sceneState.gl;
	//gl.clearColor(0, 0, 0, 1);
	gl.enable(gl.DEPTH_TEST);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	magoManager.start(undefined, true, 0, 1);
};


/**
 * 카메라를 지구의 특정 위치에 위치시키는 함수
 * @param {Number} longitude 
 * @param {Number} latitude
 * @param {Number} altitude 
 * @param {Number} duration optional.
 * @param {boolean} silent optional.
 * @api
 */
MagoWorld.prototype.goto = function(longitude, latitude, altitude, duration, silent)
{
	var resultCartesian = Globe.geographicToCartesianWgs84(longitude, latitude, altitude, resultCartesian);
	
	var camera = this.magoManager.sceneState.camera;
	var camPos = camera.position;

	if (duration) 
	{
		// Make an animationData.***
		// Make 3 points & then make a bSpline.***
		var bStoreAbsolutePosition = false;
		var currGeoCoord = Globe.CartesianToGeographicWgs84(camPos.x, camPos.y, camPos.z, undefined, bStoreAbsolutePosition);
		var targetGeoCoord = new GeographicCoord(longitude, latitude, altitude);
		var midGeoCoord = GeographicCoord.getMidPoint(currGeoCoord, targetGeoCoord, undefined);
		
		// For the "midGeoCoord", increment the altitude a little, to fly like bouncing.***
		var angleDistDeg = GeographicCoord.getAngleBetweenCoords(currGeoCoord, targetGeoCoord);
		if (midGeoCoord.altitude < 30000.0 * angleDistDeg)
		{ midGeoCoord.altitude = 30000.0 * angleDistDeg; }
		
		var bSpline = new BSplineCubic3D();
		var geoCoordsList = bSpline.getGeographicCoordsList();
		geoCoordsList.addGeoCoordsArray([currGeoCoord, midGeoCoord, targetGeoCoord]);
		
		//var path = new Path3D([currGeoCoord, midGeoCoord, targetGeoCoord]);
		
		var animData = {animationType: CODE.animationType.PATH};
		animData.path = bSpline;
		animData.birthTime = this.magoManager.getCurrentTime();
		animData.linearVelocityInMetersSecond = 500000.0; // m/s.***
		animData.acceleration = 2000.0; // m/s2.***
		animData.durationInSeconds = defaultValue(duration, 3.0);
		camera.animationData = animData;
		
		if (this.magoManager.animationManager === undefined)
		{ this.magoManager.animationManager = new AnimationManager(); }

		this.magoManager.animationManager.putObject(camera);
	}
	else 
	{
		this.changeCameraPosition(resultCartesian, silent);
	}
};
/**
 * change camera orientation
 * @param {number} heading
 * @param {number} pitch
 * @param {number} roll
 * @param {boolean} silent
 */
MagoWorld.prototype.changeCameraOrientation = function(heading, pitch, roll, silent)
{
	heading = parseFloat(heading);
	pitch = parseFloat(pitch);
	roll = parseFloat(roll);
	if (isNaN(heading)) 
	{
		throw new Error('Heading require number type.');
	}

	if (isNaN(pitch)) 
	{
		throw new Error('Pitch require number type.');
	}

	if (isNaN(roll)) 
	{
		throw new Error('Roll require number type.');
	}

	var camera = this.magoManager.sceneState.camera;
	Camera.setOrientation(camera, heading, pitch, roll);

	this.updateModelViewMatrixByCamera(camera, silent);
};


/**
 * amount만큼 카메라를 뒤로 이동
 * @param {number} amount
 * @param {boolean} silent
 */
MagoWorld.prototype.moveBackward = function(amount, silent)
{
	var camera = this.magoManager.sceneState.camera;
	var camPos = camera.position;
	var camDir = camera.direction;

	amount = amount * -1;
	var scaled = Point3D.scale(camDir, amount);
	var addScaled = Point3D.add(camPos, scaled);
	
	this.changeCameraPosition(Point3D.toArray(addScaled), silent);
};

/**
 * adjust change camera position
 * @param {Array<number>} cartesian3 cartesian3
 * @param {boolean} silent
 * @private
 */
MagoWorld.prototype.changeCameraPosition = function(cartesian3, silent) 
{
	var camera = this.magoManager.sceneState.camera;

	var camPos = camera.position;
	var camDir = camera.direction;
	var camUp = camera.up;
	
	var orientation = camera.getOrientation();
	var heading = orientation.headingRad * 180 /Math.PI;
	var pitch = orientation.pitchRad * 180 /Math.PI;
	var roll = 0;

	camPos.set(cartesian3[0], cartesian3[1], cartesian3[2]);
	var matrixAux = ManagerUtils.calculateTransformMatrixAtWorldPosition(camPos, heading, pitch, roll);

	//var matrixAux = this.magoManager.globe.transformMatrixAtCartesianPointWgs84(cartesian3[0], cartesian3[1], cartesian3[2], matrixAux);

	// calculate camDir & camUp.
	var matFArray = matrixAux._floatArrays;
	camDir.set(-matFArray[8], -matFArray[9], -matFArray[10]);
	camUp.set(matFArray[4], matFArray[5], matFArray[6]); // tangent north direction.

	this.updateModelViewMatrixByCamera(camera, silent);
};

/**
 * 마우스 꾹 누르는 동작을 핸들링
 * @param {event} event 
 * @private
 */
MagoWorld.prototype.mousedown = function(event)
{
	this.magoManager.sceneState.mouseButton = event.button;
	MagoWorld.updateMouseStartClick(event.clientX, event.clientY, this.magoManager);
	this.magoManager.isCameraMoving = true;
	this.magoManager.mouse_x = event.clientX;
	this.magoManager.mouse_y = event.clientY;
	
	if (this.magoManager.sceneState.mouseButton === 0) 
	{
		this.magoManager.mouseActionLeftDown(event.clientX, event.clientY);
	}
};

/**
 * 마우스 클릭 위치를 최신으로 갱신
 * @param {Number} mouseX 최신 마우스 클릭 위치의 x 좌표
 * @param {Number} mouseY 최신 마우스 클릭 위치의 y 좌표
 * @param {MagoManager} magoManager
 * @private
 */
MagoWorld.updateMouseClick = function(mouseX, mouseY, magoManager)
{
	var mouseAction = magoManager.sceneState.mouseAction;
	mouseAction.curX = mouseX;
	mouseAction.curY = mouseY;
};


/**
 * 마우스를 꾹 눌렀다가 땔 때의 동작을 감지
 * @param {type}event 
 * @private
 */
MagoWorld.prototype.mouseup = function(event)
{
	var magoManager = this.magoManager;
	magoManager.bPicking = false;
	magoManager.isCameraMoving = false;
	var sceneState = magoManager.sceneState;
	var mouseAction = sceneState.mouseAction;
	
	// Check time to check if is a "click".***
	if (sceneState.mouseButton === 0)
	{
		var date = new Date();
		var currTime = date.getTime();
		var durationTime = currTime - mouseAction.strTime;
		if (durationTime < 200)
		{
			// now, calculate the angle and the rotationAxis.
			var xMoved = event.clientX - mouseAction.strX;
			var yMoved = event.clientY - mouseAction.strY;

			if (Math.abs(xMoved) < 3 && Math.abs(yMoved) < 3)
			{
				// Considere as "click".***
				magoManager.bPicking = true;
				magoManager.managePickingProcess();
				// Test. process leftClick in magoManager.
				//this.magoManager.mouseActionLeftClick(event.clientX, event.clientY);				
			}
		}
		this.magoManager.mouseActionLeftUp(event.clientX, event.clientY);
	}
	
	sceneState.mouseButton = -1;
	
	// Check if there are camera inertial movement.
	var currTime = new Date().getTime();
	var strTime = mouseAction.strTime;
	var deltaTime = currTime - strTime;
	var camera = sceneState.camera;
	if (deltaTime > 1E-3 && deltaTime < 200)
	{
		// apply inertial movement.
		camera.lastMovement.deltaTime = deltaTime;	
	}
	else 
	{
		camera.lastMovement.movementType = CODE.movementType.NO_MOVEMENT;
	}

	magoManager.mustCheckIfDragging = true;
};

/**
 * 마우스 클릭 동작을 감지
 * @param {type}event 
 * @private
 */
MagoWorld.prototype.mouseclick = function(event)
{
	//detail 2 = double click
	if (event.detail === 2) 
	{
		return;
	}


	if (event.button === 0)
	{
		var mouseX = event.clientX;
		var mouseY = event.clientY;
		this.magoManager.mouseActionLeftClick(mouseX, mouseY);
	}
};


MagoWorld.prototype.mouseRightClick = function(event)
{
	//detail 2 = double click
	if (event.detail === 2) 
	{
		return;
	}
	
	if (event.button === 2)
	{
		var mouseX = event.clientX;
		var mouseY = event.clientY;
		this.magoManager.mouseActionRightClick(mouseX, mouseY);
		//this.magoManager.managePickingProcess();
	}
};
/**
 * 마우스 더블클릭 동작을 감지
 * @param {type}event 
 * @private
 */
MagoWorld.prototype.mouseDblClick = function(event)
{
	event.preventDefault();
	event.stopPropagation();
	if (event.button === 0)
	{
		var mouseX = event.clientX;
		var mouseY = event.clientY;
		this.magoManager.mouseActionLeftDoubleClick(mouseX, mouseY);
	}
};

/**
 * 마우스 휠 동작을 감지
 * @param {type}event 
 * @private
 */
MagoWorld.prototype.mousewheel = function(event)
{
	//check enable camera movable
	if (!this.cameraMovable)
	{
		return;
	}

	var delta;
	//firefox wheelDelta not support.
	if (event.wheelDelta) 
	{
		delta = event.wheelDelta / 10;
		if (window.opera) { delta = -delta; }
	}
	else
	{
		delta = -event.deltaY / 3 * 12;
	}
	var magoManager = this.magoManager;
	var mouseAction = magoManager.sceneState.mouseAction;
	
	// move camera.
	var camera = magoManager.sceneState.camera;
	var camPos = camera.position;
	var camDir = camera.direction;
	var camUp = camera.up;
	
	// calculate the direction of the cursor.
	var nowX = event.clientX;
	var nowY = event.clientY;
	var mouseRayWC = ManagerUtils.getRayWorldSpace(undefined, nowX, nowY, undefined, magoManager);
	var mouseDirWC = mouseRayWC.direction;
	
	var camHeght = camera.getCameraElevation();

	if (isNaN(camHeght))
	{ return; }

	// Lineal increment.
	//delta *= camHeght * 0.003;
	
	// Squared increment.
	delta *= (camHeght*camHeght) * 0.00001 + camHeght * 0.001;
	delta += 1;
	
	//var maxDelta = 200000;
	var maxDelta = 0.5*camHeght;
	if (maxDelta > 200000)
	{ maxDelta = 200000; }
	
	if (delta < -maxDelta)
	{ delta = -maxDelta; }
	
	if (delta > maxDelta)
	{ delta = maxDelta; }
	
	var oldCamPos = new Point3D(camPos.x, camPos.y, camPos.z);
	var camNewPos = new Point3D(camPos.x + mouseDirWC.x * delta, camPos.y + mouseDirWC.y * delta, camPos.z + mouseDirWC.z * delta);
	camPos.set(camNewPos.x,  camNewPos.y,  camNewPos.z);
	
	// calculate the camera's global rotation, and then rotate de cam's direction.
	var rotAxis;
	rotAxis = oldCamPos.crossProduct(camNewPos, rotAxis);
	rotAxis.unitary();
	if (rotAxis.isNAN())
	{ return; }
		
	var angRad = oldCamPos.angleRadToVector(camNewPos);
	if (angRad === 0 || isNaN(angRad))
	{ return; }
		
	var rotMat = new Matrix4();
	rotMat.rotationAxisAngRad(angRad, rotAxis.x, rotAxis.y, rotAxis.z);
	camDir = rotMat.transformPoint3D(camDir, camDir);
	camUp = rotMat.transformPoint3D(camUp, camUp);

	
	this.updateModelViewMatrixByCamera(camera);
};

/**
 * 어떻게 화면을 변화시키는지를 처리할 수 있다. 마우스 왼쪽 또는 마우스 휠로 회전 가능.
 * @private
 */
MagoWorld.prototype.moveSelectedObject = function(event)
{
	// Check if exist selected object.
	var magoManager = this.magoManager;
	var selectionManager = magoManager.selectionManager;
	var currSelObject = selectionManager.getSelectedGeneral();
	magoManager.moveSelectedObjectGeneral(undefined, currSelObject);
};

/**
 * 어떻게 화면을 변화시키는지를 처리할 수 있다. 마우스 왼쪽 또는 마우스 휠로 회전 가능.
 * @private
 */
MagoWorld.prototype.mousemove = function(event)
{
	var magoManager = this.magoManager;
	var nowX = event.clientX;
	var nowY = event.clientY;
	magoManager.mouse_x = nowX;
	magoManager.mouse_y = nowY;
	
	// Check if is dragging.
	if (magoManager.mustCheckIfDragging) 
	{
		if (magoManager.isDragging()) 
		{
			magoManager.mouseDragging = true;
			//magoManager.setCameraMotion(false);
		}
		else 
		{
			magoManager.mouseDragging = false;
		}
		magoManager.mustCheckIfDragging = false;
		// Note: "mustCheckIfDragging" is assigned true in "onMouseUp".
	}
	/*
	if (magoManager.mouseDragging)
	{
		// Move selected object:
		this.moveSelectedObject(event);
		return;
	}
	*/
	// End check if is dragging.---
	var mouseAction = magoManager.sceneState.mouseAction;
	var camera = this.magoManager.sceneState.camera;
	
	var oldX = mouseAction.strX;
	var oldY = mouseAction.strY;

	this.magoManager.mouseActionMove({x: nowX, y: nowY}, {x: oldX, y: oldY});
	//check enable camera movable
	if (!this.cameraMovable)
	{
		return;
	}
		
	if (camera.lastMovement === undefined)
	{ camera.lastMovement = new Movement(); }

	var currTime = magoManager.getCurrentTime();
	var strTime = mouseAction.strTime;
	var deltaTime = currTime - strTime;
	
	if (magoManager.sceneState.mouseButton === 0)
	{
		// left button pressed.
		if (nowX === mouseAction.strX && nowY === mouseAction.strY)
		{ return; }

		var difX = mouseAction.strX - nowX;
		var difY = mouseAction.strY - nowY;
		if (Math.abs(difX) < 3 && Math.abs(difY) < 3)
		{
			return; 
		}
			
		var gl = magoManager.sceneState.gl;
		var sceneState = magoManager.sceneState;
		var strCamera = mouseAction.strCamera; // camera of onMouseDown.
		var strWorldPoint = mouseAction.strWorldPoint;
		var strEarthRadius = strWorldPoint.getModul();

		// now, calculate the angle and the rotationAxis.
		var strCamCoordPoint = mouseAction.strCamCoordPoint;
		
		// 1rst, check the strPoint distance to camera. If distance is small -> translate. If distance is big -> rotate.
		var distToCam = strCamCoordPoint.getModul();
		if (distToCam < 30.0)
		{
			var strWorldPoint = mouseAction.strWorldPoint;
			var strCamCoordPoint = mouseAction.strCamCoordPoint;
			
			// create a plane on strWorldPoint.
			var planeWC = Globe.planeAtCartesianPointWgs84(strWorldPoint.x, strWorldPoint.y, strWorldPoint.z, undefined);
			var planeWCNormalCartesian = Globe.normalAtCartesianPointWgs84(strWorldPoint.x, strWorldPoint.y, strWorldPoint.z, undefined);
			var planeWCNormal = new Point3D(planeWCNormalCartesian[0], planeWCNormalCartesian[1], planeWCNormalCartesian[2]);
			
			//var mv = mouseAction.strModelViewMatrix;
			var mv = sceneState.modelViewMatrix;
			var planeCamCoordNormal = mv.rotatePoint3D(planeWCNormal, undefined);
			var planeCamCoord = new Plane();
			planeCamCoord.setPointAndNormal(strCamCoordPoint.x, strCamCoordPoint.y, strCamCoordPoint.z, planeCamCoordNormal.x, planeCamCoordNormal.y, planeCamCoordNormal.z);
			
			// Now calculate rayWorldCoord.*********************************************************************************************************************************
			var camRayCamCoordCartesian = ManagerUtils.getRayCamSpace(nowX, nowY, camRayCamCoord, this.magoManager);
			var camRayCamCoord = new Line();
			camRayCamCoord.setPointAndDir(0.0, 0.0, 0.0,       camRayCamCoordCartesian[0], camRayCamCoordCartesian[1], camRayCamCoordCartesian[2]);// original.
		
			var nowCamCoordPoint = planeCamCoord.intersectionLine(camRayCamCoord, undefined);
			if (nowCamCoordPoint === undefined)
			{ return; }
			
			var moveVectorCC = new Point3D(nowCamCoordPoint.x - strCamCoordPoint.x, nowCamCoordPoint.y - strCamCoordPoint.y, nowCamCoordPoint.z - strCamCoordPoint.z);
			
			//var mv_inv = mouseAction.strModelViewMatrixInv;
			var mv_inv = sceneState.getModelViewMatrixInv();
			var moveVectorWC = mv_inv.rotatePoint3D(moveVectorCC, undefined);

			var moveVecModul = moveVectorWC.getModul();
			if (moveVecModul > 100.0 || moveVecModul < 1E-5)// there are error.
			{ return; }
			
			camera.copyPosDirUpFrom(strCamera);
			camera.position.add(-moveVectorWC.x, -moveVectorWC.y, -moveVectorWC.z);
			
			this.updateModelViewMatrixByCamera(camera);
			
			// Register the movement of the camera for the case : exist inertial movement.
			// calculate angular velocity.
			var moveDir = new Point3D();
			moveDir.copyFrom(moveVectorWC);
			moveDir.unitary();
			
			var linearVelocity = (moveVecModul/deltaTime)*0.25;
			
			camera.lastMovement.movementType = CODE.movementType.TRANSLATION;
			camera.lastMovement.currLinearVelocity = linearVelocity;
			camera.lastMovement.translationDir = moveDir;
		}
		else
		{
			var sceneState = this.magoManager.sceneState;
			var strCamera = mouseAction.strCamera; // camera of onMouseDown.
			var camera = this.magoManager.sceneState.camera;
			
			// now, calculate the angle and the rotationAxis.
			var strWorldPoint = mouseAction.strWorldPoint;
			var strEarthRadius = strWorldPoint.getModul();
			

			var nowPoint;
			var camRay, camRayCamCoord;
			
			camRayCamCoord = ManagerUtils.getRayCamSpace(nowX, nowY, camRayCamCoord, this.magoManager);
			
			// Now calculate rayWorldCoord.
			if (this.pointSC === undefined)
			{ this.pointSC = new Point3D(); }
			
			this.pointSC.set(camRayCamCoord[0], camRayCamCoord[1], camRayCamCoord[2]);

			// Now, must transform this posCamCoord to world coord, but with the "mouseAction.strModelViewMatrixInv".
			var mv_inv = mouseAction.strModelViewMatrixInv;
			this.pointSC2 = mv_inv.rotatePoint3D(this.pointSC, this.pointSC2); // rayWorldSpace.
			this.pointSC2.unitary(); // rayWorldSpace.
			camRay = new Line();
			var testScale = 0.0001;
			var strCamPos = strCamera.position;
			camRay.setPointAndDir(strCamPos.x*testScale, strCamPos.y*testScale, strCamPos.z*testScale,       this.pointSC2.x, this.pointSC2.y, this.pointSC2.z);// original.

			var nowWorldPoint;
			nowWorldPoint = this.magoManager.globe.intersectionLineWgs84(camRay, nowWorldPoint, strEarthRadius*testScale);

			if (nowWorldPoint === undefined)
			{ return; }
		
			var strPoint = new Point3D(strWorldPoint.x*testScale, strWorldPoint.y*testScale, strWorldPoint.z*testScale); // copy point3d.
			var nowPoint = new Point3D(nowWorldPoint[0], nowWorldPoint[1], nowWorldPoint[2]);

			var rotAxis;
			rotAxis = strPoint.crossProduct(nowPoint, rotAxis);
			rotAxis.unitary();
			if (rotAxis.isNAN())
			{ return; }
			
			var angRad = strPoint.angleRadToVector(nowPoint);
			if (angRad < 10E-9 || isNaN(angRad))
			{ return; }
			
			// recalculate position and direction of the camera.
			camera.copyPosDirUpFrom(strCamera);
			
			var rotMat = new Matrix4();
			rotMat.rotationAxisAngRad(-angRad, rotAxis.x, rotAxis.y, rotAxis.z);
			camera.transformByMatrix4(rotMat);

			this.updateModelViewMatrixByCamera(camera);
			
			// Register the movement of the camera for the case : exist inertial movement.
			// calculate angular velocity.
			var angRadVelocity = (angRad/deltaTime)*0.25;
			
			camera.lastMovement.movementType = CODE.movementType.ROTATION;
			camera.lastMovement.currAngularVelocity = angRadVelocity;
			camera.lastMovement.rotationAxis = rotAxis;
			camera.lastMovement.rotationPoint = undefined;

		}
	}
	else if (this.magoManager.sceneState.mouseButton === 1)
	{
		// middle button pressed.
		var strCamera = mouseAction.strCamera;
		camera.copyPosDirUpFrom(strCamera);
		
		// 1rst, determine the point of rotation.
		var rotPoint = mouseAction.strWorldPoint;
		
		// now determine the rotation axis.
		// the rotation axis are the camRight & normalToSurface.
		if (this.magoManager.globe === undefined)
		{ this.magoManager.globe = new Globe(); }
		
		var pivotPointNormal;
		pivotPointNormal = Globe.normalAtCartesianPointWgs84(rotPoint.x, rotPoint.y, rotPoint.z, pivotPointNormal);
		
		var xAxis = camera.getCameraRight();
		
		// now determine camZRot & camXRot angles.
		var nowX = event.clientX;
		var nowY = event.clientY;
		var increX = nowX - mouseAction.strX;
		var increY = nowY - mouseAction.strY;
		
		var zRotAngRad = increX * 0.003;
		var xRotAngRad = increY * 0.003;

		// limit the pitch.
		var startCamPitchRad = -mouseAction.startCamOrintation.pitchRad;
		var startCamPitchDeg = startCamPitchRad * 180/Math.PI;
		if (startCamPitchRad < 0.0)
		{
			var hola = 0;
		}
		else
		{
			var hola = 0;
		}
		var totalPitchRad = xRotAngRad + startCamPitchRad;
		if (totalPitchRad > -0.1)
		{ 
			if (startCamPitchRad < 0.0)
			{ xRotAngRad = -startCamPitchRad; } 
			else
			{ xRotAngRad = startCamPitchRad; } 
		}
		
		

		if (zRotAngRad === 0 && xRotAngRad === 0)
		{ return; }
		
		if (this.rotMat === undefined)
		{ this.rotMat = new Matrix4(); }
	
		// calculate the rotationAxis & angRad.
		var quatZRot = glMatrix.quat.create();
		quatZRot = glMatrix.quat.setAxisAngle(quatZRot, pivotPointNormal, -zRotAngRad);
		
		var quatXRot = glMatrix.quat.create();
		quatXRot = glMatrix.quat.setAxisAngle(quatXRot, [xAxis.x, xAxis.y, xAxis.z], -xRotAngRad);
		
		var quatTotalRot = glMatrix.quat.create();
		quatTotalRot = glMatrix.quat.multiply(quatTotalRot, quatZRot, quatXRot);
		
		this.rotMat._floatArrays = glMatrix.mat4.fromQuat(this.rotMat._floatArrays, quatTotalRot);
		
		// Alternative calculating by matrices.***************************************************************************************
		//this.rotMatX.rotationAxisAngRad(-xRotAngRad, xAxis.x, xAxis.y, xAxis.z);
		//this.rotMatZ.rotationAxisAngRad(-zRotAngRad, pivotPointNormal[0], pivotPointNormal[1], pivotPointNormal[2]);
		//this.rotMat = this.rotMatX.getMultipliedByMatrix(this.rotMatZ, this.rotMat);
		//----------------------------------------------------------------------------------------------------------------------------
		
		var translationVec_1 = new Point3D(-rotPoint.x, -rotPoint.y, -rotPoint.z);
		var translationVec_2 = new Point3D(rotPoint.x, rotPoint.y, rotPoint.z);
		
		camera.translate(translationVec_1);
		camera.transformByMatrix4(this.rotMat);
		camera.translate(translationVec_2);
		
		this.updateModelViewMatrixByCamera(camera);
		
		// Register the movement of the camera for the case : exist inertial movement.
		// calculate angular velocity.
		var angRadVelocity = (angRad/deltaTime)*0.3;
		
		camera.lastMovement.movementType = CODE.movementType.ROTATION_ZX;
		camera.lastMovement.rotationPoint = rotPoint;
		camera.lastMovement.xAngVelocity = (-xRotAngRad/deltaTime)*0.3;
		camera.lastMovement.zAngVelocity = (-zRotAngRad/deltaTime)*0.3;
		
	}
};

/**
 * 마우스를 드래그하기 시작하는 시점을 저장
 * @param {Number} mouseX the x coordi of the start point 
 * @param {Number} mouseY the y coordi of the start point
 * @param {MagoManager} magoManager
 * @private
 */
MagoWorld.screenToCamCoord = function(mouseX, mouseY, magoManager, resultPointCamCoord)
{
	var gl = magoManager.sceneState.gl;
	var camera = magoManager.sceneState.camera;
	
	if (resultPointCamCoord === undefined)
	{ resultPointCamCoord = new Point3D(); }
	
	// Must find the frustum on pick(mouseX, mouseY) detected depth value.***
	var currentDepthFbo;
	var currentFrustumFar;
	var currentFrustumNear;
	var currentLinearDepth;
	var depthDetected = false;
	var frustumsCount = magoManager.numFrustums;
	for (var i = 0; i < frustumsCount; i++)
	{
		var frustumVolume = magoManager.frustumVolumeControl.getFrustumVolumeCulling(i); 
		var depthFbo = frustumVolume.depthFbo;

		currentLinearDepth = ManagerUtils.calculatePixelLinearDepth(gl, mouseX, mouseY, depthFbo, magoManager);
		if (currentLinearDepth < 0.996) // maxDepth/255 = 0.99607...
		{ 
			currentDepthFbo = depthFbo;
			var frustum = camera.getFrustum(i);
			currentFrustumFar = frustum.far[0];
			currentFrustumNear = frustum.near[0];
			depthDetected = true;
			break;
		}
	}
	
	if (!magoManager.isCesiumGlobe())
	{ currentFrustumNear = 0.0; }
	
	//currentFrustumFar = 30000.0; // The "far" for depthTextures if fixed in "RenderShowDepthVS" shader.
	//currentDepthFbo = magoManager.depthFboNeo;
	resultPointCamCoord = ManagerUtils.calculatePixelPositionCamCoord(gl, mouseX, mouseY, resultPointCamCoord, currentDepthFbo, currentFrustumNear, currentFrustumFar, magoManager);
	return resultPointCamCoord;
};

/**
 * 마우스를 드래그하기 시작하는 시점을 저장
 * @param {Number} mouseX the x coordi of the start point 
 * @param {Number} mouseY the y coordi of the start point
 * @param {MagoManager} magoManager
 * @private
 */
MagoWorld.updateMouseStartClick = function(mouseX, mouseY, magoManager)
{
	var sceneState = magoManager.sceneState;
	var gl = sceneState.gl;
	var mouseAction = sceneState.mouseAction;
	
	MagoWorld.updateMouseClick(mouseX, mouseY, magoManager);
	
	var date = new Date();
	mouseAction.strTime = date.getTime();
	
	// if button = 1 (middleButton), then rotate camera.
	mouseAction.strX = mouseX;
	mouseAction.strY = mouseY;
	if (sceneState.mouseButton === 0)
	{
		magoManager.bPicking = true;
	}
	
	var camera = sceneState.camera;
	
	// Must find the frustum on pick(mouseX, mouseY) detected depth value.***
	var maxDepth = 0.996;
	//maxDepth = 0.996094;
	var currentDepthFbo;
	var currentFrustumFar;
	var currentFrustumNear;
	var currentLinearDepth;
	var depthDetected = false;
	var frustumsCount = magoManager.numFrustums;
	for (var i = 0; i < frustumsCount; i++)
	{
		var frustumVolume = magoManager.frustumVolumeControl.getFrustumVolumeCulling(i); 
		var depthFbo = frustumVolume.depthFbo;

		currentLinearDepth = ManagerUtils.calculatePixelLinearDepth(gl, mouseAction.strX, mouseAction.strY, depthFbo, magoManager);
		if (currentLinearDepth < maxDepth) // maxDepth/255 = 0.99607...
		{ 
			currentDepthFbo = depthFbo;
			var frustum = camera.getFrustum(i);
			currentFrustumFar = frustum.far[0];
			currentFrustumNear = frustum.near[0];
			depthDetected = true;
			break;
		}
	}
	

	if (!depthDetected && magoManager.scene !== undefined)
	{
		var scene = magoManager.scene;
		var camera = scene.frameState.camera;
		var ray = camera.getPickRay(new Cesium.Cartesian2(mouseX, mouseY));
		var pointWC = scene.globe.pick(ray, scene);
		mouseAction.strWorldPoint = pointWC;
		return;
	}
	
	// determine world position of the X,Y.
	mouseAction.strLinealDepth = currentLinearDepth;
	//mouseAction.strCamCoordPoint = ManagerUtils.calculatePixelPositionCamCoord(gl, mouseAction.strX, mouseAction.strY, mouseAction.strCamCoordPoint, currentDepthFbo, currentFrustumNear, currentFrustumFar, magoManager);
	mouseAction.strCamCoordPoint = MagoWorld.screenToCamCoord(mouseX, mouseY, magoManager, mouseAction.strCamCoordPoint);
	if (!mouseAction.strCamCoordPoint) 
	{
		return;
	}
	mouseAction.strWorldPoint = ManagerUtils.cameraCoordPositionToWorldCoord(mouseAction.strCamCoordPoint, mouseAction.strWorldPoint, magoManager);
	
	// now, copy camera to curCamera.
	var strCamera = mouseAction.strCamera;
	strCamera.copyPosDirUpFrom(camera);

	// save startCameraOrientation.
	mouseAction.startCamOrintation = camera.getOrientation();
	
	// copy modelViewMatrix.
	var modelViewMatrix = sceneState.modelViewMatrix;
	var modelViewMatrixInv = sceneState.getModelViewMatrixInv();
	mouseAction.strModelViewMatrix._floatArrays = glMatrix.mat4.copy(mouseAction.strModelViewMatrix._floatArrays, modelViewMatrix._floatArrays);
	mouseAction.strModelViewMatrixInv._floatArrays = glMatrix.mat4.copy(mouseAction.strModelViewMatrixInv._floatArrays, modelViewMatrixInv._floatArrays);

	// save the sphere pick.
	/*
	if (magoManager.globe !== undefined)
	{
		var camRay;
		camRay = ManagerUtils.getRayWorldSpace(gl, mouseX, mouseY, camRay, magoManager); // rayWorldSpace.
		mouseAction.strWorldPoint2 = magoManager.globe.intersectionLineWgs84(camRay, mouseAction.strWorldPoint2);
	}
	*/
};

/**
 * 만약 마우스 핸들링으로 화면이 바뀌었을 경우, 다음 함수가 활성화 된다
 * @param {Camera} camera
 * @param {boolean} silent
 * @private
 */
MagoWorld.prototype.updateModelViewMatrixByCamera = function(camera, silent)
{
	if (!silent) 
	{
		this.magoManager.cameraMoveStart();
	}
	
	var camera = this.magoManager.sceneState.camera;
	var camPos = camera.position;
	var camDir = camera.direction;
	var camUp = camera.up;
	var far = camera.frustum.far[0];
	
	var tergetX = camPos.x + camDir.x * far;
	var tergetY = camPos.y + camDir.y * far;
	var tergetZ = camPos.z + camDir.z * far;
	
	var modelViewMatrix = this.magoManager.sceneState.modelViewMatrix;																	
	modelViewMatrix._floatArrays = Matrix4.lookAt(modelViewMatrix._floatArrays, [camPos.x, camPos.y, camPos.z], 
		[tergetX, tergetY, tergetZ], 
		[camUp.x, camUp.y, camUp.z]);

	this.magoManager.sceneState.modelViewMatrixInv.dirty = true;

	if (!silent) 
	{
		var that = this;
		
		setTimeout(function()
		{
			that.magoManager.cameraMoveEnd();
		}, 10);
	}
};

MagoWorld.prototype.doTest__BSpline3DCubic = function(event)
{
	var magoManager = this.magoManager;
	var modeler = magoManager.modeler;

	if (modeler.bSplineCubic3d === undefined)
	{ modeler.bSplineCubic3d = new BSplineCubic3D(); }

	var bSplineCubic3d = modeler.bSplineCubic3d;
	if (bSplineCubic3d !== undefined)
	{
		if (bSplineCubic3d.geoCoordsList === undefined)
		{ bSplineCubic3d.geoCoordsList = new GeographicCoordsList(); }

		bSplineCubic3d.geoCoordsList = modeler.geoCoordsList;
			
		//var maxLengthDegree = 0.001;
		//Path3D.insertPointsOnLargeSegments(bSplineCubic3d.geoCoordsList.geographicCoordsArray, maxLengthDegree, magoManager);
			
		var coordsCount = bSplineCubic3d.geoCoordsList.geographicCoordsArray.length;
		for (var i=0; i<coordsCount; i++)
		{
			var geoCoord = bSplineCubic3d.geoCoordsList.geographicCoordsArray[i];
			var geoLocDataManager = geoCoord.getGeoLocationDataManager();
			var geoLocData = geoLocDataManager.newGeoLocationData("noName");
			geoLocData = ManagerUtils.calculateGeoLocationData(geoCoord.longitude, geoCoord.latitude, geoCoord.altitude, undefined, undefined, undefined, geoLocData, magoManager);
		}
			
		var geoCoordsList = bSplineCubic3d.getGeographicCoordsList();
		geoCoordsList.makeLines(magoManager);
		
		// Make the controlPoints.***
		var controlPointArmLength = 0.2;
		bSplineCubic3d.makeControlPoints(controlPointArmLength, magoManager);
		bSplineCubic3d.makeInterpolatedPoints();
	}
};

MagoWorld.prototype.doTest__ExtrudedObject = function(event)
{
	var magoManager = this.magoManager;
	var modeler = magoManager.modeler;

	var geoCoordsList = modeler.getGeographicCoordsList();
	if (geoCoordsList)
	{
		var extrudeDirWC = undefined;
		var bLoop = true;
		var height = 100.0;
		var extrudedRenderable = geoCoordsList.getExtrudedMeshRenderableObject(height, bLoop, undefined, magoManager, extrudeDirWC);

		extrudedRenderable.setOneColor(0.2, 0.7, 0.8, 0.3);
		extrudedRenderable.attributes.isMovable = true;
		extrudedRenderable.attributes.isSelectable = true;
		extrudedRenderable.attributes.name = "extrudedObject";
		extrudedRenderable.attributes.selectedColor4 = new Color(1.0, 1.0, 0.0, 0.0); // selectedColor fully transparent.

		if (extrudedRenderable.options === undefined)
		{ extrudedRenderable.options = {}; }
		
		extrudedRenderable.options.renderWireframe = true;
		extrudedRenderable.options.renderShaded = true;
		extrudedRenderable.options.depthMask = true;

		magoManager.smartTileManager.putObject(10, extrudedRenderable);
	}
};

MagoWorld.prototype.doTest__CameraOrientation = function()
{
	var heading = 145;
	var pitch = 80;
	var camera = this.magoManager.sceneState.camera;
	Camera.setOrientation(camera, heading, pitch, undefined);
	this.updateModelViewMatrixByCamera(camera);

	var camOrientation = camera.getOrientation();
	var heading2 = camOrientation.headingRad * 180/Math.PI;
	var pitch2 = camOrientation.pitchRad * 180/Math.PI;
	var roll2 = camOrientation.rollRad * 180/Math.PI;
	var hola = 0;
};

MagoWorld.prototype.doTest__GoTo = function(camera)
{
	var longitude = 127;
	var latitude = 36;
	var altitude = 1500;
	var duration = 3;

	this.goto(longitude, latitude, altitude, duration);
};

MagoWorld.prototype.doTest__TerrainScanner = function()
{
	// create a terrainScanner.
	// geoCoord_1 = (126.31394, 33.18262)
	// geoCoord_2 = (126.34513, 33.21500)
	var startGeoCoord = new GeographicCoord(126.31394, 33.18262, 0.0);
	var endGeoCoord = new GeographicCoord(126.34513, 33.21500, 0.0);
	var geoCoordSegment = new GeographicCoordSegment(startGeoCoord, endGeoCoord);
	var terrainScanner = new TerrainScannerLinear(geoCoordSegment);

	var geoLocDataManager = new GeoLocationDataManager();
	var geoLocData = geoLocDataManager.newGeoLocationData();
	geoLocData = ManagerUtils.calculateGeoLocationData(startGeoCoord.longitude, startGeoCoord.latitude, startGeoCoord.altitude, undefined, undefined, undefined, geoLocData);
	//geoLocData.setGeographicCoordsLonLatAlt(startGeoCoord.longitude, startGeoCoord.latitude, startGeoCoord.altitude);

	// set the geoLocDataManager of the terrainScanner.
	terrainScanner.geoLocDataManager = geoLocDataManager;

	var targetDepth = 10;
	this.magoManager.modeler.addObject(terrainScanner, targetDepth);

	// test adding geoCoords to objectsList.***
	startGeoCoord.makeDefaultGeoLocationData();
	endGeoCoord.makeDefaultGeoLocationData();
	this.magoManager.modeler.addObject(startGeoCoord, targetDepth);
	this.magoManager.modeler.addObject(endGeoCoord, targetDepth);

};

MagoWorld.prototype.doTest__MagoRectangle = function()
{
	// create a magoRectangle.***
	var position = {
		minLongitude : 126.31394,
		minLatitude  : 33.18262,
		maxLongitude : 126.34513,
		maxLatitude  : 33.21500,
		altitude     : 200.0
	};

	var style = {
		strokeWidth : 2,
		strokeColor : '#FF0000',
		fillColor   : '#00FF00',
		//imageUrl    : '/images/materialImages//factoryRoof.jpg',
		opacity     : 0.7,
	};

	var magoRect = new MagoRectangle(position, style);
	//magoRect.setOneColor(0.5, 1.0, 0.8);

	var targetDepth = 3;
	this.magoManager.modeler.addObject(magoRect, targetDepth);
};

MagoWorld.prototype.doTest__MagoPoint = function()
{
	// create a magoRectangle.***
	var position = {
		longitude : 126.31394,
		latitude  : 33.18262,
		altitude  : 200.0
	};

	var style = {
		size        : 10,
		strokeColor : '#FF0000',
		color       : '#00FF00',
		opacity     : 0.7
	};

	var magoPoint = new MagoPoint(position, style);
	//magoPoint.setOneColor(0.5, 1.0, 0.8);

	var targetDepth = 10;
	this.magoManager.modeler.addObject(magoPoint, targetDepth);
};

MagoWorld.prototype.doTest__MagoPolyline = function()
{
	var position = {
		coordinates: [{
			longitude : 126.31394,
			latitude  : 33.18262,
			altitude  : 200.0
		},
		{
			longitude : 126.34513,
			latitude  : 33.21500,
			altitude  : 200.0
		},
		{
			longitude : 126.33,
			latitude  : 33.18,
			altitude  : 200.0
		},
		{
			longitude : 126.35,
			latitude  : 33.18262,
			altitude  : 200.0
		},
		{
			longitude : 126.38,
			latitude  : 33.195,
			altitude  : 200.0
		}]
	};

	var style = {
		color     : '#ff0000',
		thickness : 2.0,
		point     : {
			size        : 20,
			strokeColor : '#000000',
			strokeSize  : 1,
			color       : '#00FF00',
			opacity     : 0.7
		}
	};

	var magoPolyline = new MagoPolyline(position, style);

	var targetDepth = 1;
	this.magoManager.modeler.addObject(magoPolyline, targetDepth);
};

MagoWorld.prototype.doTest__ObjectMarker = function()
{
	//magoManager 가져오기
	var magoManager = this.magoManager;
	var modeler = magoManager.modeler;

	var geoCoordsList = modeler.getGeographicCoordsList();

	if (geoCoordsList)
	{
		var geoCoordsCount = geoCoordsList.getGeoCoordsCount();
		for (var i=0; i<geoCoordsCount; i++)
		{
			//magoManager에 SpeechBubble 객체 없으면 생성하여 등록
			if (!magoManager.speechBubble) 
			{
				magoManager.speechBubble = new Mago3D.SpeechBubble();
			}

			var sb = magoManager.speechBubble;
			var bubbleColor = Color.getHexCode(1.0, 1.0, 1.0);

			//SpeechBubble 옵션
			var commentTextOption = {
				pixel       : 12,
				color       : 'blue',
				borderColor : 'white',
				text        : 'blabla'
			};

			//SpeechBubble을 통해서 png 만들어서 가져오기
			var img = sb.getPng([64, 64], bubbleColor, commentTextOption);

			//ObjectMarker 옵션, 위치정보와 이미지 정보
			var geoCoord = geoCoordsList.getGeoCoord(i);
			var lon = geoCoord.longitude;
			var lat = geoCoord.latitude;
			var alt = geoCoord.altitude;
			var options = {
				positionWC    : Mago3D.ManagerUtils.geographicCoordToWorldPoint(lon, lat, alt),
				imageFilePath : img
			};

			//지도에 ObjectMarker생성하여 표출
			magoManager.objMarkerManager.newObjectMarker(options, magoManager);
		}
	}
};

/**
 * @param {*} event
 * @private
 */
MagoWorld.prototype.keydown = function(event)
{
	var key = event.key;
	var magoManager = this.magoManager;
	var modeler = magoManager.modeler;
	if (key === 'm')
	{
		// Switch mago mode.***
		if (magoManager.magoMode === undefined)
		{ magoManager.magoMode = CODE.magoMode.NORMAL; }

		if (magoManager.magoMode === CODE.magoMode.DRAWING)
		{
			magoManager.magoMode = CODE.magoMode.NORMAL;
		}
		else if (magoManager.magoMode === CODE.magoMode.NORMAL)
		{
			magoManager.magoMode = CODE.magoMode.DRAWING;
		}
		
	}
	else if (key === 't')
	{
		//this.magoManager.TEST__RenderGeoCoords();

		//this.doTest__BSpline3DCubic();
		//this.doTest__ExtrudedObject();
		//this.doTest__ObjectMarker();
		//this.doTest__TerrainScanner();
		this.doTest__MagoRectangle();
		//this.doTest__MagoPoint();
		//this.doTest__MagoPolyline();
		//this.doTest__GoTo();
		//this.doTest__CameraOrientation();
	}
	else if (key === 'p')
	{

		if (this.smartTile_f4d_tested === undefined)
		{
			var fc = magoManager.f4dController;
			this.smartTile_f4d_tested = 1;
			//var projectFolderName = "smartTile_f4d_Korea";
			//var projectFolderName = "SejongParkJinWoo_20191101";
			var projectFolderName = "SmartTilesF4D_WorkFolder";
			var fileName = magoManager.readerWriter.geometryDataPath + "/" + projectFolderName + "/" + "smartTile_f4d_indexFile.sii";

			var smartTilePathInfo = fileName;//fc.smartTilePathInfo;
			var projectId = 'busan-mj';

			if (!fc.smartTilePathInfo[projectId])
			{
				fc.smartTilePathInfo[projectId] = {};
			}

			fc.smartTilePathInfo[projectId].projectId = projectId;
			fc.smartTilePathInfo[projectId].projectFolderPath = projectId;
			//fc.smartTilePathInfo[groupKey].smartTileIndexPath = groupDataFolder + '/' + groupKey + '_TILE';

			magoManager.getObjectIndexFileSmartTileF4d(projectFolderName);
		}
	}
};