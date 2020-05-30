export default /* glsl */`
///////////////////////////////////////////////////////////////////////////////////
// common
#define PI 3.14159265359
#define PI2 6.28318530718
#define PI_HALF 1.5707963267949
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6

#ifndef saturate
// <tonemapping_pars_fragment> may have defined saturate() already
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement(a) ( 1.0 - saturate( a ) )

float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}

#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float max3( vec3 v ) { return max( max( v.x, v.y ), v.z ); }
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif

struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};

struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};

struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef CLEARCOAT
	vec3 clearcoatNormal;
#endif
};

///////////////////////////////////////////////////////////////////////////////////
// 4D functions

vec4 xyzw(vec5 v) {
	return vec4(v.x, v.y, v.z, v.w);
}

vec4 perspectiveClampV(vec5 v) {
	return vec4(v.x / v.v, v.y / v.v, v.z / v.v, v.w / v.v);
}

vec4 castv4(vec5 v) {
	return vec4(v.x, v.y, v.z, 1.0);
} 

vec5 multiply(vec5 v, mat5 m) {

	float x = v.x*m.m11 + v.y*m.m21 + v.z*m.m31 + v.w*m.m41 + v.v*m.m51;
	float y = v.x*m.m12 + v.y*m.m22 + v.z*m.m32 + v.w*m.m42 + v.v*m.m52;
	float z = v.x*m.m13 + v.y*m.m23 + v.z*m.m33 + v.w*m.m43 + v.v*m.m53;
	float w = v.x*m.m14 + v.y*m.m24 + v.z*m.m34 + v.w*m.m44 + v.v*m.m54;
	float _v = v.x*m.m15 + v.y*m.m25 + v.z*m.m35 + v.w*m.m45 + v.v*m.m55;

	return vec5( x, y, z, w, _v );

}

vec5 multiply(mat5 m, vec5 v) {

	float x = v.x*m.m11 + v.y*m.m12 + v.z*m.m13 + v.w*m.m14 + v.v*m.m15;
	float y = v.x*m.m21 + v.y*m.m22 + v.z*m.m23 + v.w*m.m24 + v.v*m.m25;
	float z = v.x*m.m31 + v.y*m.m32 + v.z*m.m33 + v.w*m.m34 + v.v*m.m35;
	float w = v.x*m.m41 + v.y*m.m42 + v.z*m.m43 + v.w*m.m44 + v.v*m.m45;
	float _v = v.x*m.m51 + v.y*m.m52 + v.z*m.m53 + v.w*m.m54 + v.v*m.m55;

	return vec5( x, y, z, w, _v );

}

vec4 inverseTransformDirection( in vec4 dir, in mat5 matrix ) {

	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal

	return normalize( xyzw( multiply( vec5( dir.x, dir.y, dir.z, dir.w, 0.0 ), matrix ) ) );

}

///////////////////////////////////////////////////////////////////////////////////
// Old functions

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {

	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal

	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );

}

vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

	float distance = dot( planeNormal, point - pointOnPlane );

	return - distance * planeNormal + point;

}

float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

	return sign( dot( point - pointOnPlane, planeNormal ) );

}

vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {

	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;

}

mat3 transposeMat3( const in mat3 m ) {

	mat3 tmp;

	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );

	return tmp;

}

// https://en.wikipedia.org/wiki/Relative_luminance
float linearToRelativeLuminance( const in vec3 color ) {

	vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );

	return dot( weights, color.rgb );

}

bool isPerspectiveMatrix( mat4 m ) {

  return m[ 2 ][ 3 ] == - 1.0;

}
`;
