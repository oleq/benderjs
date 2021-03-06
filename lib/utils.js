/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Contains reusable utilities
 */

'use strict';

var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	logger = require( './logger' );

/**
 * @module utils
 */
module.exports = {

	name: 'utils',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this,
			utils = bender.utils = {},
			tplPattern = /(?:%)(\w+)(?:%)/g;

		/**
		 * Dependency check helper function
		 * @param {String}    name    Name of the module
		 * @param {...String} modules Dependency names
		 */
		bender.checkDeps = function( name, modules ) {
			modules = Array.prototype.slice.call( arguments, 1 );

			Array.prototype.forEach.call( modules, function( mod ) {
				if ( bender[ mod ] ) {
					return;
				}

				logger.error( 'Missing module:', mod );
				logger.error( 'Module', name, 'requires:', modules.join( ', ' ) );
				process.exit( 1 );
			} );
		};

		/**
		 * Render HTML content as a response
		 * @param {Object} res  HTTP response
		 * @param {String} html HTML to render
		 */
		utils.renderHTML = function( res, html ) {
			res.writeHead( 200, {
				'Content-Type': 'text/html',
				'Content-Length': Buffer.byteLength( html, 'utf8' ),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			} );
			res.end( html );
		};

		/**
		 * Render JSON object as a response
		 * @param {Object} res HTTP response
		 * @param {Object} obj Object to render
		 */
		utils.renderJSON = function( res, obj ) {
			var str = JSON.stringify( obj );

			res.writeHead( 200, {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength( str, 'utf8' ),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			} );
			res.end( str );
		};

		/**
		 * Render given script as a response
		 * @param  {Object} res    HTTP response
		 * @param  {String} script Script's content
		 */
		utils.renderScript = function( res, script ) {
			res.writeHead( 200, {
				'Content-Type': 'application/javascript',
				'Content-Length': Buffer.byteLength( script, 'utf8' ),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			} );
			res.end( script );
		};

		/**
		 * Replace %NAME% tags with properties of the given data object
		 * @param  {String} tpl  Template string
		 * @param  {Object} data Data object
		 * @return {String}
		 */
		utils.template = function( tpl, data ) {
			return tpl.replace( tplPattern, function( match, param ) {
				return ( typeof data == 'object' && data[ param ] ) ? data[ param ] : match;
			} );
		};

		/**
		 * Creates a direcory, makes parent directories if needed
		 * @param {String}   dirPath    Path to create
		 * @param {Function} callback   Function called when done or error occures
		 * @param {Number}   [position] Used internally
		 */
		utils.mkdirp = function( dirPath, callback, position ) {
			var next = function() {
					utils.mkdirp( dirPath, callback, position + 1 );
				},
				directory,
				parts;

			position = position || 0;
			parts = path.normalize( dirPath ).split( path.sep );

			if ( position >= parts.length ) {
				return callback();
			}

			directory = parts.slice( 0, position + 1 ).join( path.sep );

			if ( !directory ) {
				return next();
			}

			fs.stat( directory, function( err ) {
				if ( err ) {
					fs.mkdir( directory, function( err ) {
						if ( err && err.code !== 'EEXIST' ) {
							callback( err );
						} else {
							next();
						}
					} );
				} else {
					next();
				}
			} );
		};

		/**
		 * Strip URL parameters from the file path
		 * @param  {String} file File path
		 * @return {String}
		 */
		utils.stripParams = function( file ) {
			return file.trim().split( '?' )[ 0 ].split( ';' )[ 0 ];
		};
	}
};
