/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Serves job assets
 */

'use strict';

var path = require( 'path' ),
	parse = require( 'url' ).parse,
	send = require( 'send' ),
	_ = require( 'lodash' ),
	logger = require( '../logger' ).create( 'middleware-jobs', true ),
	cwd = process.cwd();

/**
 * Create a HTTP handler serving job requests
 * @return {Function}
 */
function build( bender ) {
	return function( req, res, next ) {
		var parsed = parse( req.url ),
			url = req.url.substr( 1 ).split( '/' );


		function resume( err ) {
			/* istanbul ignore next:not much to test */
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( String( err ) );
			}
			next();
		}

		/* istanbul ignore if:not much to test */
		if ( url[ 0 ] !== 'jobs' ) {
			return resume();
		}

		function error( msg ) {
			bender.utils.renderJSON( res, {
				success: false,
				error: msg
			} );
		}

		// handle specific job id
		function serveJob( job ) {
			var file,
				id,
				ext;

			// send a file located in job's directory
			function sendAsset() {
				var jobFilePath = bender.utils.stripParams( path.join( cwd, '.bender/', url.join( '/' ) ) ),
					filePath = bender.utils.stripParams( path.join( cwd, url.slice( 3 ).join( '/' ) ) );

				// no snapshot was taken and file shouldn't be cached
				if ( !job.snapshot ) {
					send( req, filePath )
						.on( 'error', resume )
						.pipe( res );
				} else {
					bender.files.send( jobFilePath, res, resume, filePath );
				}
			}

			function sendApp() {
				bender.jobs.getApp( job._id, url[ 3 ] )
					.then( function( app ) {
						if ( !app || !app.path ) {
							return resume();
						}

						var jobFilePath = bender.utils.stripParams(
								path.join( cwd, '.bender/', url.join( '/' ) )
							),
							appFilePath = bender.utils.stripParams(
								path.join( cwd, [ app.path ].concat( url.slice( 4 ) ).join( '/' ) )
							);

						if ( job.snapshot ) {
							bender.files.send( jobFilePath, res, resume, appFilePath );
						} else {
							bender.files.send( appFilePath, res, resume );
						}
					} );
			}

			function sendFile() {
				var filePath = bender.utils.stripParams( path.join( cwd, '.bender/', url.join( '/' ) ) );

				send( req, filePath )
					.on( 'error', resume )
					.pipe( res );
			}

			// no such job - leave
			if ( !job ) {
				return resume();
			}

			// only job id is specified - get jobs results and render in JSON
			if ( !url[ 2 ] ) {
				return bender.jobs
					.get( job._id )
					.done( function( job ) {
						bender.utils.renderJSON( res, job );
					} );
			}

			// request for a test (task) or its asset
			if ( url[ 2 ] === 'tests' ) {

				// remove query from task/file name
				file = url.slice( 3 ).join( '/' ).split( '?' )[ 0 ];

				// remove extension
				ext = path.extname( file );
				id = decodeURIComponent( ( ext === '.js' || ext === '.html' ) ? file.replace( ext, '' ) : file );

				// add query string to task id (used by i.e. jQuery plugin)
				if ( parsed.search ) {
					id += parsed.search;
				}

				// remove & at the end of url
				if ( id.substr( -1 ) === '&' ) {
					id = id.slice( 0, -1 );
				}

				bender.jobs
					.getTask( url[ 1 ], id )
					.done( function( task ) {
						// no such task - try to send an asset then
						if ( !task ) {
							return sendAsset();
						}

						bender.template
							.build( _.extend( {
								snapshot: job.snapshot
							}, task ) )
							.done( function( content ) {
								bender.utils.renderHTML( res, content );
							}, resume );
					}, resume );
			} else if ( url[ 2 ] === 'apps' ) {
				sendApp();
			} else {
				sendFile();
			}
		}

		if ( req.method === 'GET' ) {
			// restart a job
			if ( url[ 1 ] && url[ 2 ] === 'restart' ) {
				return bender.jobs
					.restart( url[ 1 ] )
					.done( function() {
						bender.utils.renderJSON( res, {
							success: true,
							id: url[ 1 ]
						} );
					}, error );
			}

			// serve job details
			if ( url[ 1 ] ) {
				return bender.jobs
					.find( url[ 1 ] )
					.done( serveJob, resume );
			}

			// serve list of all jobs in JSON
			return bender.jobs
				.list()
				.done( function( jobs ) {
					bender.utils.renderJSON( res, {
						job: jobs
					} );
				}, resume );
		}

		// create new job
		if ( req.method === 'POST' && req.url === '/jobs' ) {
			return bender.jobs
				.create( req.body )
				.done( function( id ) {
					bender.utils.renderJSON( res, {
						success: true,
						id: id
					} );
				}, error );
		}

		// delete a job
		if ( req.method === 'DELETE' && url[ 1 ] ) {
			return bender.jobs
				.delete( url[ 1 ] )
				.done( function() {
					bender.utils.renderJSON( res, {
						success: true,
						id: url[ 1 ]
					} );
				}, error );
		}

		/* istanbul ignore else:not much to test */
		// edit a job
		if ( req.method === 'PUT' && url[ 1 ] ) {
			return bender.jobs
				.edit( url[ 1 ], req.body )
				.done( function( job ) {
					bender.utils.renderJSON( res, job );
				}, error );
		}

		/* istanbul ignore next:not much to test */
		resume();
	};
}

module.exports = {
	name: 'bender-middleware-jobs',
	build: build
};
