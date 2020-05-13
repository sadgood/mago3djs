#ifdef GL_ES
    precision highp float;
#endif
  

uniform sampler2D shadowMapTex;// 0
uniform sampler2D shadowMapTex2;// 1
uniform sampler2D diffuseTex;  // 2
uniform sampler2D diffuseTex_1;// 3
uniform sampler2D diffuseTex_2;// 4
uniform sampler2D diffuseTex_3;// 5
uniform sampler2D diffuseTex_4;// 6
uniform sampler2D diffuseTex_5;// 7
uniform bool textureFlipYAxis;
uniform bool bIsMakingDepth;
uniform bool bExistAltitudes;
uniform mat4 projectionMatrix;
//uniform vec2 noiseScale;
//uniform float near;
uniform float far;            
uniform float fov;
uniform float aspectRatio;    
uniform float screenWidth;    
uniform float screenHeight;    
uniform float shininessValue;
uniform vec3 kernel[16];   
uniform int uActiveTextures[8];
uniform vec2 uMinMaxAltitudes;
uniform int uTileDepth;
uniform int uSeaOrTerrainType;
uniform int uRenderType;

uniform vec4 oneColor4;
uniform highp int colorType; // 0= oneColor, 1= attribColor, 2= texture.

varying vec2 vTexCoord;   
varying vec3 vLightWeighting;

varying vec3 diffuseColor;
uniform vec3 specularColor;
varying float depthValue;

const int kernelSize = 16;  
uniform float radius;      

uniform float ambientReflectionCoef;
uniform float diffuseReflectionCoef;  
uniform float specularReflectionCoef; 
uniform float externalAlpha;
uniform bool bApplyShadow;
uniform float shadowMapWidth;    
uniform float shadowMapHeight;
varying vec3 v3Pos;
varying float vFogAmount;

varying float applySpecLighting;
varying vec4 vPosRelToLight; 
varying vec3 vLightDir; 
varying vec3 vNormal;
varying vec3 vNormalWC;
varying float currSunIdx;
varying float vAltitude;

const float equatorialRadius = 6378137.0;
const float polarRadius = 6356752.3142;

float unpackDepth(const in vec4 rgba_depth)
{
    const vec4 bit_shift = vec4(0.000000059605, 0.000015258789, 0.00390625, 1.0);
    float depth = dot(rgba_depth, bit_shift);
    return depth;
} 

float UnpackDepth32( in vec4 pack )
{
    float depth = dot( pack, 1.0 / vec4(1.0, 256.0, 256.0*256.0, 16777216.0) );// 256.0*256.0*256.0 = 16777216.0
    return depth * (16777216.0) / (16777216.0 - 1.0);
}

vec4 packDepth(const in float depth)
{
    const vec4 bit_shift = vec4(16777216.0, 65536.0, 256.0, 1.0);
    const vec4 bit_mask  = vec4(0.0, 0.00390625, 0.00390625, 0.00390625); 
    //vec4 res = fract(depth * bit_shift); // Is not precise.
	vec4 res = mod(depth * bit_shift * vec4(255), vec4(256) ) / vec4(255); // Is better.
    res -= res.xxyz * bit_mask;
    return res;  
}               

vec3 getViewRay(vec2 tc)
{
    float hfar = 2.0 * tan(fov/2.0) * far;
    float wfar = hfar * aspectRatio;    
    vec3 ray = vec3(wfar * (tc.x - 0.5), hfar * (tc.y - 0.5), -far);    
    return ray;                      
}

//linear view space depth
//float getDepth(vec2 coord)
//{
//    return unpackDepth(texture2D(depthTex, coord.xy));
//}  

vec3 getRainbowColor_byHeight(float height)
{
	float minHeight_rainbow = -200.0;
	float maxHeight_rainbow = 0.0;
	
	float gray = (height - minHeight_rainbow)/(maxHeight_rainbow - minHeight_rainbow);
	if (gray > 1.0){ gray = 1.0; }
	else if (gray<0.0){ gray = 0.0; }
	
	float r, g, b;
	
	if(gray < 0.16666)
	{
		b = 0.0;
		g = gray*6.0;
		r = 1.0;
	}
	else if(gray >= 0.16666 && gray < 0.33333)
	{
		b = 0.0;
		g = 1.0;
		r = 2.0 - gray*6.0;
	}
	else if(gray >= 0.33333 && gray < 0.5)
	{
		b = -2.0 + gray*6.0;
		g = 1.0;
		r = 0.0;
	}
	else if(gray >= 0.5 && gray < 0.66666)
	{
		b = 1.0;
		g = 4.0 - gray*6.0;
		r = 0.0;
	}
	else if(gray >= 0.66666 && gray < 0.83333)
	{
		b = 1.0;
		g = 0.0;
		r = -4.0 + gray*6.0;
	}
	else if(gray >= 0.83333)
	{
		b = 6.0 - gray*6.0;
		g = 0.0;
		r = 1.0;
	}
	
	float aux = r;
	r = b;
	b = aux;
	
	//b = -gray + 1.0;
	//if (gray > 0.5)
	//{
	//	g = -gray*2.0 + 2.0; 
	//}
	//else 
	//{
	//	g = gray*2.0;
	//}
	//r = gray;
	vec3 resultColor = vec3(r, g, b);
    return resultColor;
} 

float getDepthShadowMap(vec2 coord)
{
	// currSunIdx
	if(currSunIdx > 0.0 && currSunIdx < 1.0)
	{
		return UnpackDepth32(texture2D(shadowMapTex, coord.xy));
	}
    else if(currSunIdx > 1.0 && currSunIdx < 2.0)
	{
		return UnpackDepth32(texture2D(shadowMapTex2, coord.xy));
	}
	else
		return 1000.0;
} 

float getGridLineWidth(int depth)
{
	float gridLineWidth = 0.025;
	
	if(depth == 17)
	{
		gridLineWidth = 0.025;
	}
	else{
		int dif = 18 - depth;
		if(dif < 1)
		dif = 1;
		gridLineWidth = (0.04/17.0) * float(depth/dif);
	}
	
	return gridLineWidth;
}

void main()
{           
	if(bIsMakingDepth)
	{
		gl_FragColor = packDepth(-depthValue);
	}
	else{
		if(uRenderType == 2)
		{
			gl_FragColor = oneColor4; 
			return;
		}

		float shadow_occlusion = 1.0;
		if(bApplyShadow)
		{
			if(currSunIdx > 0.0)
			{
				vec3 fragCoord = gl_FragCoord.xyz;
				vec3 fragWC;
				
				//float ligthAngle = dot(vLightDir, vNormalWC);
				//if(ligthAngle > 0.0)
				//{
				//	// The angle between the light direction & face normal is less than 90 degree, so, the face is in shadow.***
				//	shadow_occlusion = 0.5;
				//}
				//else
				{

					vec3 posRelToLight = vPosRelToLight.xyz / vPosRelToLight.w;
					float tolerance = 0.9963;
					//tolerance = 0.9962;
					//tolerance = 1.0;
					posRelToLight = posRelToLight * 0.5 + 0.5; // transform to [0,1] range
					if(posRelToLight.x >= 0.0 && posRelToLight.x <= 1.0)
					{
						if(posRelToLight.y >= 0.0 && posRelToLight.y <= 1.0)
						{
							float depthRelToLight = getDepthShadowMap(posRelToLight.xy);
							if(posRelToLight.z > depthRelToLight*tolerance )
							{
								shadow_occlusion = 0.5;
							}
						}
					}
				}
			}
		}
		
		// Do specular lighting.***
		vec3 normal2 = vNormal;	
		float lambertian = 1.0;
		float specular;
		vec2 texCoord;
		if(applySpecLighting> 0.0)
		{
			vec3 L;
			if(bApplyShadow)
			{
				L = vLightDir;// test.***
				lambertian = max(dot(normal2, L), 0.0); // original.***
			}
			else
			{
				vec3 lightPos = vec3(0.0, 0.0, 0.0);
				L = normalize(lightPos - v3Pos);
				lambertian = max(dot(normal2, L), 0.0);
			}
			
			specular = 0.0;
			if(lambertian > 0.0)
			{
				vec3 R = reflect(-L, normal2);      // Reflected light vector
				vec3 V = normalize(-v3Pos); // Vector to viewer
				
				// Compute the specular term
				float specAngle = max(dot(R, V), 0.0);
				specular = pow(specAngle, shininessValue);
				
				if(specular > 1.0)
				{
					specular = 1.0;
				}
			}
			
			if(lambertian < 0.5)
			{
				lambertian = 0.5;
			}
			
			// test.
			lambertian += 0.3;
		}
		
		
	
		vec4 textureColor;
		if(colorType == 0)
		{
			textureColor = oneColor4;
			
			if(textureColor.w == 0.0)
			{
				discard;
			}
		}
		else if(colorType == 2)
		{
			
			if(textureFlipYAxis)
			{
				//textureColor = texture2D(diffuseTex, vec2(vTexCoord.s, 1.0 - vTexCoord.t));
				texCoord = vec2(vTexCoord.s, 1.0 - vTexCoord.t);
			}
			else{
				//textureColor = texture2D(diffuseTex, vec2(vTexCoord.s, vTexCoord.t));
				texCoord = vec2(vTexCoord.s, vTexCoord.t);
			}
			
			bool firstColorSetted = false;
			if(uActiveTextures[7] == 1)
			{
				vec4 layersTextureColor = texture2D(diffuseTex_5, texCoord);
				if(layersTextureColor.w > 0.0)
				{
					textureColor = layersTextureColor;
					firstColorSetted = true;
				}
			}
			
			if(!firstColorSetted && uActiveTextures[6] == 1)
			{
				vec4 layersTextureColor = texture2D(diffuseTex_4, texCoord);
				if(layersTextureColor.w > 0.0)
				{
					textureColor = layersTextureColor;
					firstColorSetted = true;
				}
			}
			
			if(!firstColorSetted && uActiveTextures[5] == 1)
			{
				vec4 layersTextureColor = texture2D(diffuseTex_3, texCoord);
				if(layersTextureColor.w > 0.0)
				{
					textureColor = layersTextureColor;
					firstColorSetted = true;
				}
			}
			
			if(!firstColorSetted && uActiveTextures[4] == 1)
			{
				vec4 layersTextureColor = texture2D(diffuseTex_2, texCoord);
				if(layersTextureColor.w > 0.0)
				{
					textureColor = layersTextureColor;
					firstColorSetted = true;
				}
			}
			
			if(!firstColorSetted && uActiveTextures[3] == 1)
			{
				vec4 layersTextureColor = texture2D(diffuseTex_1, texCoord);
				if(layersTextureColor.w > 0.0)
				{
					textureColor = layersTextureColor;
					firstColorSetted = true;
				}
			}
			
			if(!firstColorSetted && uActiveTextures[2] == 1)
			{
				vec4 layersTextureColor = texture2D(diffuseTex, texCoord);
				if(layersTextureColor.w > 0.0)
				{
					textureColor = layersTextureColor;
					firstColorSetted = true;
				}
			}
			
			if(textureColor.w == 0.0)
			{
				discard;
			}
		}
		else{
			textureColor = oneColor4;
		}

		textureColor.w = externalAlpha;
		vec4 fogColor = vec4(0.9, 0.9, 0.9, 1.0);
		
		// Test dem image.***
		float altitude = 1000000.0;
		if(uActiveTextures[3] == 10)
		{
			vec4 layersTextureColor = texture2D(diffuseTex_1, texCoord);
			if(layersTextureColor.w > 0.0)
			{
				// decode the grayScale.***
				altitude = uMinMaxAltitudes.x + layersTextureColor.r * (uMinMaxAltitudes.y - uMinMaxAltitudes.x);
			}
		}
		// End test dem image.---
		
		
		
		if(altitude < 0.0)
		{
			if(uSeaOrTerrainType == 1)
			{
				gl_FragColor = vec4(oneColor4.xyz * shadow_occlusion * lambertian, 0.5); // original.***
				return;
			}
			
			float minHeight_rainbow = -100.0;
			float maxHeight_rainbow = 0.0;
			float gray = (altitude - minHeight_rainbow)/(maxHeight_rainbow - minHeight_rainbow);
			//float gray = (vAltitude - minHeight_rainbow)/(maxHeight_rainbow - minHeight_rainbow);
			//vec3 rainbowColor = getRainbowColor_byHeight(altitude);
			
			//if(grayMeshAltitude * 1.1 < gray)
			//gray = grayMeshAltitude;
			
			if(gray < 0.05)
			gray = 0.05;
			float red = gray + 0.2;
			float green = gray + 0.6;
			float blue = gray*2.0 + 2.0;
			//fogColor = vec4(gray*1.3, gray*2.1, gray*2.7, 1.0);
			fogColor = vec4(red, green, blue, 1.0);
			
			// Test drawing grid.***
			if(uTileDepth > 7)
			{
				float numSegs = 5.0;
				float fX = fract(texCoord.x * numSegs);

				float gridLineWidth = getGridLineWidth(uTileDepth);
				if( fX < gridLineWidth || fX > 1.0-gridLineWidth)
				{
					gl_FragColor = vec4(0.99, 0.5, 0.5, 1.0);
					return;
				}
				
				float fY = fract(texCoord.y * numSegs);
				if( fY < gridLineWidth|| fY > 1.0-gridLineWidth)
				{
					gl_FragColor = vec4(0.3, 0.5, 0.99, 1.0);
					return;
				}
			}
			// End test drawing grid.---
			vec4 finalColor = mix(textureColor, fogColor, 0.7); 
			gl_FragColor = vec4(finalColor.xyz * shadow_occlusion * lambertian, 1.0); // original.***
			return;
		}
		else{
			if(uSeaOrTerrainType == 1)
			discard;
		
		}
		
		
		vec4 finalColor = mix(textureColor, fogColor, vFogAmount); 
		gl_FragColor = vec4(finalColor.xyz * shadow_occlusion * lambertian, 1.0); // original.***
		//gl_FragColor = textureColor; // test.***
		//gl_FragColor = vec4(vNormal.xyz, 1.0); // test.***
		
		//if(currSunIdx > 0.0 && currSunIdx < 1.0 && shadow_occlusion<0.9)gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
	}
}