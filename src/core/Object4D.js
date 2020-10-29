import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
import { Vector4 } from '../math/Vector4.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Matrix5 } from '../math/Matrix5.js';
import { EventDispatcher } from './EventDispatcher.js';
import { Euler4D } from '../math/Euler4D.js';
import { Layers } from './Layers.js';
import { Matrix3 } from '../math/Matrix3.js';
import { MathUtils } from '../math/MathUtils.js';

var _object4DId = 0;

var _v1 = new Vector4();
var _q1 = new Quaternion();
var _m1 = new Matrix5();
var _target = new Vector4();

var _position = new Vector4();
var _scale = new Vector4();
var _quaternion = new Quaternion();

var _xAxis = new Vector4( 1, 0, 0, 0 );
var _yAxis = new Vector4( 0, 1, 0, 0 );
var _zAxis = new Vector4( 0, 0, 1, 0 );
var _wAxis = new Vector4( 0, 0, 0, 1 );

var _addedEvent = { type: 'added' };
var _removedEvent = { type: 'removed' };

/**
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author elephantatwork / www.elephantatwork.ch
 */

function Object4D() {

	Object.defineProperty( this, 'id', { value: _object4DId ++ } );

	this.uuid = MathUtils.generateUUID();

	this.name = '';
	this.type = 'Object4D';

	this.parent = null;
	this.children = [];

	this.up = Object4D.DefaultUp.clone();

	var position = new Vector4();
	var rotation = new Euler4D();
	var quaternion = new Quaternion();
	var scale = new Vector4( 1, 1, 1, 1 );

	function onRotationChange() {

		//quaternion.setFromEuler( rotation, false );

	}

	function onQuaternionChange() {

		//rotation.setFromQuaternion( quaternion, undefined, false );

	}

	rotation._onChange( onRotationChange );
	quaternion._onChange( onQuaternionChange );

	Object.defineProperties( this, {
		position: {
			configurable: true,
			enumerable: true,
			value: position
		},
		rotation: {
			configurable: true,
			enumerable: true,
			value: rotation
		},
		quaternion: {
			configurable: true,
			enumerable: true,
			value: quaternion
		},
		scale: {
			configurable: true,
			enumerable: true,
			value: scale
		},
		modelViewMatrix: {
			value: new Matrix5()
		},
		normalMatrix: {
			value: new Matrix4()
		}
	} );

	this.matrix = new Matrix5();
	this.matrixWorld = new Matrix5();

	this.matrixAutoUpdate = Object4D.DefaultMatrixAutoUpdate;
	this.matrixWorldNeedsUpdate = false;

	this.layers = new Layers();
	this.visible = true;

	this.castShadow = false;
	this.receiveShadow = false;

	this.frustumCulled = false;
	this.renderOrder = 0;

	this.userData = {};

}

Object4D.DefaultUp = new Vector4( 0, 1, 0, 0 );
Object4D.DefaultMatrixAutoUpdate = true;

Object4D.prototype = Object.assign( Object.create( EventDispatcher.prototype ), {

	constructor: Object4D,

	isObject4D: true,

	onBeforeRender: function () {},
	onAfterRender: function () {},

	applyMatrix4: function ( matrix ) {

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		this.matrix.premultiply( matrix );

		this.matrix.decompose( this.position, this.quaternion, this.scale );

	},

	applyQuaternion: function ( q ) {

		this.quaternion.premultiply( q );

		return this;

	},

	setRotationFromAxisAngle: function ( axis, angle ) {

		// assumes axis is normalized

		this.quaternion.setFromAxisAngle( axis, angle );

	},

	setRotationFromEuler: function ( euler ) {

		this.quaternion.setFromEuler( euler, true );

	},

	setRotationFromMatrix: function ( m ) {

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		this.quaternion.setFromRotationMatrix( m );

	},

	setRotationFromQuaternion: function ( q ) {

		// assumes q is normalized

		this.quaternion.copy( q );

	},

	rotateOnAxis: function ( axis, angle ) {

		// rotate object on axis in object space
		// axis is assumed to be normalized

		_q1.setFromAxisAngle( axis, angle );

		this.quaternion.multiply( _q1 );

		return this;

	},

	rotateOnWorldAxis: function ( axis, angle ) {

		// rotate object on axis in world space
		// axis is assumed to be normalized
		// method assumes no rotated parent

		_q1.setFromAxisAngle( axis, angle );

		this.quaternion.premultiply( _q1 );

		return this;

	},

	rotateX: function ( angle ) {

		return this.rotateOnAxis( _xAxis, angle );

	},

	rotateY: function ( angle ) {

		return this.rotateOnAxis( _yAxis, angle );

	},

	rotateZ: function ( angle ) {

		return this.rotateOnAxis( _zAxis, angle );

	},

	translateOnAxis: function ( axis, distance ) {

		// translate object by distance along axis in object space
		// axis is assumed to be normalized

		_v1.copy( axis ).applyQuaternion( this.quaternion );

		this.position.add( _v1.multiplyScalar( distance ) );

		return this;

	},

	translateX: function ( distance ) {

		return this.translateOnAxis( _xAxis, distance );

	},

	translateY: function ( distance ) {

		return this.translateOnAxis( _yAxis, distance );

	},

	translateZ: function ( distance ) {

		return this.translateOnAxis( _zAxis, distance );

	},

	localToWorld: function ( vector ) {

		return vector.applyMatrix4( this.matrixWorld );

	},

	worldToLocal: function ( vector ) {

		return vector.applyMatrix4( _m1.getInverse( this.matrixWorld ) );

	},

	lookAt: function ( x, y, z, w ) {

		// This method does not support objects having non-uniformly-scaled parent(s)

		if ( x.isVector4 ) {

			_target.copy( x );

		} else {

			_target.set( x, y, z, w );

		}

		var parent = this.parent;

		this.updateWorldMatrix( true, false );

		_position.setFromMatrixPosition( this.matrixWorld );

		if ( this.isCamera || this.isLight ) {

			_m1.lookAt( _position, _target, this.up );

		} else {

			_m1.lookAt( _target, _position, this.up );

		}

		this.quaternion.setFromRotationMatrix( _m1 );

		if ( parent ) {

			_m1.extractRotation( parent.matrixWorld );
			_q1.setFromRotationMatrix( _m1 );
			this.quaternion.premultiply( _q1.inverse() );

		}

	},

	add: function ( object ) {

		if ( arguments.length > 1 ) {

			for ( var i = 0; i < arguments.length; i ++ ) {

				this.add( arguments[ i ] );

			}

			return this;

		}

		if ( object === this ) {

			console.error( "THREE.Object4D.add: object can't be added as a child of itself.", object );
			return this;

		}

		if ( ( object && object.isObject4D ) ) {

			if ( object.parent !== null ) {

				object.parent.remove( object );

			}

			object.parent = this;
			this.children.push( object );

			object.dispatchEvent( _addedEvent );

		} else {

			console.error( "THREE.Object4D.add: object not an instance of THREE.Object4D.", object );

		}

		return this;

	},

	remove: function ( object ) {

		if ( arguments.length > 1 ) {

			for ( var i = 0; i < arguments.length; i ++ ) {

				this.remove( arguments[ i ] );

			}

			return this;

		}

		var index = this.children.indexOf( object );

		if ( index !== - 1 ) {

			object.parent = null;
			this.children.splice( index, 1 );

			object.dispatchEvent( _removedEvent );

		}

		return this;

	},

	attach: function ( object ) {

		// adds object as a child of this, while maintaining the object's world transform

		this.updateWorldMatrix( true, false );

		_m1.getInverse( this.matrixWorld );

		if ( object.parent !== null ) {

			object.parent.updateWorldMatrix( true, false );

			_m1.multiply( object.parent.matrixWorld );

		}

		object.applyMatrix5( _m1 );

		object.updateWorldMatrix( false, false );

		this.add( object );

		return this;

	},

	getObjectById: function ( id ) {

		return this.getObjectByProperty( 'id', id );

	},

	getObjectByName: function ( name ) {

		return this.getObjectByProperty( 'name', name );

	},

	getObjectByProperty: function ( name, value ) {

		if ( this[ name ] === value ) return this;

		for ( var i = 0, l = this.children.length; i < l; i ++ ) {

			var child = this.children[ i ];
			var object = child.getObjectByProperty( name, value );

			if ( object !== undefined ) {

				return object;

			}

		}

		return undefined;

	},

	getWorldPosition: function ( target ) {

		if ( target === undefined ) {

			console.warn( 'THREE.Object4D: .getWorldPosition() target is now required' );
			target = new Vector4();

		}

		this.updateMatrixWorld( true );

		return target.setFromMatrixPosition( this.matrixWorld );

	},

	getWorldQuaternion: function ( target ) {
		console.warn( 'THREE.Object4D: .getWorldQuaternion() is not done' );
		if ( target === undefined ) {

			console.warn( 'THREE.Object4D: .getWorldQuaternion() target is now required' );
			target = new Quaternion();

		}

		this.updateMatrixWorld( true );

		this.matrixWorld.decompose( _position, target, _scale );

		return target;

	},

	getWorldScale: function ( target ) {
		console.warn( 'THREE.Object4D: .getWorldScale() is not done' );
		if ( target === undefined ) {

			console.warn( 'THREE.Object4D: .getWorldScale() target is now required' );
			target = new Vector4();

		}

		this.updateMatrixWorld( true );

		this.matrixWorld.decompose( _position, _quaternion, target );

		return target;

	},

	getWorldDirection: function ( target ) {
		console.warn( 'THREE.Object4D: .getWorldDirection() is not done' );
		if ( target === undefined ) {

			console.warn( 'THREE.Object4D: .getWorldDirection() target is now required' );
			target = new Vector4();

		}

		this.updateMatrixWorld( true );

		var e = this.matrixWorld.elements;

		return target.set( e[ 8 ], e[ 9 ], e[ 10 ] ).normalize();

	},

	raycast: function () {},

	traverse: function ( callback ) {

		callback( this );

		var children = this.children;

		for ( var i = 0, l = children.length; i < l; i ++ ) {

			children[ i ].traverse( callback );

		}

	},

	traverseVisible: function ( callback ) {

		if ( this.visible === false ) return;

		callback( this );

		var children = this.children;

		for ( var i = 0, l = children.length; i < l; i ++ ) {

			children[ i ].traverseVisible( callback );

		}

	},

	traverseAncestors: function ( callback ) {

		var parent = this.parent;

		if ( parent !== null ) {

			callback( parent );

			parent.traverseAncestors( callback );

		}

	},

	updateMatrix: function () {

		this.matrix.composeEuler( this.position, this.rotation, this.scale );

		this.matrixWorldNeedsUpdate = true;

	},

	updateMatrixWorld: function ( force ) {

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		if ( this.matrixWorldNeedsUpdate || force ) {

			if ( this.parent === null ) {

				this.matrixWorld.copy( this.matrix );

			} else {

				this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

			}

			this.matrixWorldNeedsUpdate = false;

			force = true;

		}

		// update children

		var children = this.children;

		for ( var i = 0, l = children.length; i < l; i ++ ) {

			children[ i ].updateMatrixWorld( force );

		}

	},

	updateWorldMatrix: function ( updateParents, updateChildren ) {

		var parent = this.parent;

		if ( updateParents === true && parent !== null ) {

			parent.updateWorldMatrix( true, false );

		}

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		if ( this.parent === null ) {

			this.matrixWorld.copy( this.matrix );

		} else {

			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

		}

		// update children

		if ( updateChildren === true ) {

			var children = this.children;

			for ( var i = 0, l = children.length; i < l; i ++ ) {

				children[ i ].updateWorldMatrix( false, true );

			}

		}

	},

	toJSON: function ( meta ) {

		// meta is a string when called from JSON.stringify
		var isRootObject = ( meta === undefined || typeof meta === 'string' );

		var output = {};

		// meta is a hash used to collect geometries, materials.
		// not providing it implies that this is the root object
		// being serialized.
		if ( isRootObject ) {

			// initialize meta obj
			meta = {
				geometries: {},
				materials: {},
				textures: {},
				images: {},
				shapes: {}
			};

			output.metadata = {
				version: 4.5,
				type: 'Object',
				generator: 'Object4D.toJSON'
			};

		}

		// standard Object3D serialization

		var object = {};

		object.uuid = this.uuid;
		object.type = this.type;

		if ( this.name !== '' ) object.name = this.name;
		if ( this.castShadow === true ) object.castShadow = true;
		if ( this.receiveShadow === true ) object.receiveShadow = true;
		if ( this.visible === false ) object.visible = false;
		if ( this.frustumCulled === false ) object.frustumCulled = false;
		if ( this.renderOrder !== 0 ) object.renderOrder = this.renderOrder;
		if ( JSON.stringify( this.userData ) !== '{}' ) object.userData = this.userData;

		object.layers = this.layers.mask;
		object.matrix = this.matrix.toArray();

		if ( this.matrixAutoUpdate === false ) object.matrixAutoUpdate = false;

		// object specific properties

		if ( this.isInstancedMesh ) {

			object.type = 'InstancedMesh';
			object.count = this.count;
			object.instanceMatrix = this.instanceMatrix.toJSON();

		}

		//

		function serialize( library, element ) {

			if ( library[ element.uuid ] === undefined ) {

				library[ element.uuid ] = element.toJSON( meta );

			}

			return element.uuid;

		}

		if ( this.isMesh || this.isLine || this.isPoints ) {

			object.geometry = serialize( meta.geometries, this.geometry );

			var parameters = this.geometry.parameters;

			if ( parameters !== undefined && parameters.shapes !== undefined ) {

				var shapes = parameters.shapes;

				if ( Array.isArray( shapes ) ) {

					for ( var i = 0, l = shapes.length; i < l; i ++ ) {

						var shape = shapes[ i ];

						serialize( meta.shapes, shape );

					}

				} else {

					serialize( meta.shapes, shapes );

				}

			}

		}

		if ( this.material !== undefined ) {

			if ( Array.isArray( this.material ) ) {

				var uuids = [];

				for ( var i = 0, l = this.material.length; i < l; i ++ ) {

					uuids.push( serialize( meta.materials, this.material[ i ] ) );

				}

				object.material = uuids;

			} else {

				object.material = serialize( meta.materials, this.material );

			}

		}

		//

		if ( this.children.length > 0 ) {

			object.children = [];

			for ( var i = 0; i < this.children.length; i ++ ) {

				object.children.push( this.children[ i ].toJSON( meta ).object );

			}

		}

		if ( isRootObject ) {

			var geometries = extractFromCache( meta.geometries );
			var materials = extractFromCache( meta.materials );
			var textures = extractFromCache( meta.textures );
			var images = extractFromCache( meta.images );
			var shapes = extractFromCache( meta.shapes );

			if ( geometries.length > 0 ) output.geometries = geometries;
			if ( materials.length > 0 ) output.materials = materials;
			if ( textures.length > 0 ) output.textures = textures;
			if ( images.length > 0 ) output.images = images;
			if ( shapes.length > 0 ) output.shapes = shapes;

		}

		output.object = object;

		return output;

		// extract data from the cache hash
		// remove metadata on each item
		// and return as array
		function extractFromCache( cache ) {

			var values = [];
			for ( var key in cache ) {

				var data = cache[ key ];
				delete data.metadata;
				values.push( data );

			}
			return values;

		}

	},

	clone: function ( recursive ) {

		return new this.constructor().copy( this, recursive );

	},

	copy: function ( source, recursive ) {

		if ( recursive === undefined ) recursive = true;

		this.name = source.name;

		this.up.copy( source.up );

		this.position.copy( source.position );
		this.quaternion.copy( source.quaternion );
		this.scale.copy( source.scale );

		this.matrix.copy( source.matrix );
		this.matrixWorld.copy( source.matrixWorld );

		this.matrixAutoUpdate = source.matrixAutoUpdate;
		this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

		this.layers.mask = source.layers.mask;
		this.visible = source.visible;

		this.castShadow = source.castShadow;
		this.receiveShadow = source.receiveShadow;

		this.frustumCulled = source.frustumCulled;
		this.renderOrder = source.renderOrder;

		this.userData = JSON.parse( JSON.stringify( source.userData ) );

		if ( recursive === true ) {

			for ( var i = 0; i < source.children.length; i ++ ) {

				var child = source.children[ i ];
				this.add( child.clone() );

			}

		}

		return this;

	}

} );


export { Object4D };
