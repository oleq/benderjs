/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

( function() {
	'use strict';

	var isIE = navigator.userAgent.toLowerCase().indexOf( 'trident' ) > -1,
		ieVersion = navigator.userAgent.match( /msie (\d+)/i ),
		isOldIE = isIE && ieVersion && Number( ieVersion[ 1 ] ) < 9,
		testId = window.location.pathname
		.replace( /^(\/(?:tests|single|(?:jobs\/(?:\w+)\/tests))\/)/i, '' ),
		supportsConsole = !!( window.console && window.console.log ),
		launcher = opener || parent,
		collapseEl,
		resultsEl,
		statusEl,
		bender,
		init;

	/**
	 * Load additional stylesheet needed for single test runs
	 */
	function loadStyles() {
		var link = document.createElement( 'link' );

		link.rel = 'stylesheet';
		link.href = '/css/client.css';

		document.getElementsByTagName( 'head' )[ '0' ].appendChild( link );
	}

	/**
	 * Prepare UI elements used in single test runs.
	 */
	function prepareResultsEl() {
		var summaryEl,
			allEl;

		// summary box that sticks to the top of the window
		summaryEl = document.createElement( 'div' );
		summaryEl.className = 'summary';

		// collapse results button
		collapseEl = document.createElement( 'a' );
		collapseEl.href = '#';
		collapseEl.className = 'btn collapse';
		collapseEl.title = 'Collapse the results';
		summaryEl.appendChild( collapseEl );

		// run all tests button
		allEl = document.createElement( 'a' );
		allEl.href = '#';
		allEl.className = 'btn all';
		allEl.title = 'Run all tests';
		summaryEl.appendChild( allEl );

		// test status located in summary box
		statusEl = document.createElement( 'p' );
		statusEl.innerHTML = '<strong>Running...</strong>';
		summaryEl.appendChild( statusEl );

		// test results box
		resultsEl = document.createElement( 'div' );
		resultsEl.className = 'results';
		resultsEl.appendChild( summaryEl );

		// handle bender-ui directive
		// hide all results till the end of the tests
		if ( bender.testData.ui !== 'none' ) {
			if ( bender.testData.ui === 'collapsed' ) {
				resultsEl.className = 'results collapsed';
				collapseEl.className = 'btn expand';
				collapseEl.title = 'Expand the results';
			}

			document.body.appendChild( resultsEl );
		}

		// handle all clicks in results box
		function handleClick( event ) {
			var target,
				collapsed;

			event = event || window.event;

			if ( event.preventDefault ) {
				event.preventDefault();
			} else {
				event.returnValue = false;
			}

			target = event.target || event.srcElement;

			if ( target.tagName !== 'A' ) {
				return;
			}

			if ( target === collapseEl ) {
				collapsed = isCollapsed();
				resultsEl.className = 'results' + ( collapsed ? '' : ' collapsed' );
				collapseEl.className = 'btn ' + ( collapsed ? 'collapse' : 'expand' );
				collapseEl.title = ( collapsed ? 'Collapse' : 'Expand' ) + ' the results';
			} else {
				window.location = target.href;
				window.location.reload();
			}
		}

		if ( resultsEl.addEventListener ) {
			resultsEl.addEventListener( 'click', handleClick, false );
		} else if ( resultsEl.attachEvent ) {
			resultsEl.attachEvent( 'onclick', handleClick );
		} else {
			resultsEl.onclick = handleClick;
		}
	}

	/**
	 * Check if the results box is collapsed
	 * @return {Boolean}
	 */
	function isCollapsed() {
		return ( resultsEl.className + '' ).indexOf( 'collapsed' ) > -1;
	}

	/**
	 * Expand single test UI if it was hidden or collapsed before
	 */
	function expandUI() {
		// nothing is shown
		if ( bender.testData.ui === 'none' ) {
			document.body.appendChild( resultsEl );
			// results are collapsed
		} else if ( bender.testData.ui === 'collapsed' && isCollapsed() ) {
			resultsEl.className = 'results';
			collapseEl.className = 'btn collapse';
			collapseEl.title = 'Collapse the results';
		}
	}

	/**
	 * Escape &, > and < characters to HTML entities
	 * @param  {String} str String to escape
	 * @return {String}
	 */
	function escapeTags( str ) {
		var replacements = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;'
		};

		return str.replace( /[&<>]/g, function( item ) {
			return replacements[ item ] || item;
		} );
	}

	/**
	 * Add a result to the results box
	 * @param {Object} result Result object received from assertion library
	 */
	function addResult( result ) {
		var resEl = document.createElement( 'div' ),
			res = [
				'<p>',
				'<span class="icon ',
				result.success ? result.ignored ? 'ignored' : 'passed' : 'failed',
				'"></span>',
				result.module, ' - ',
				'<a href="#' + encodeURIComponent( result.fullName || result.name ) + '" class="single">' + result.name + '</a>',
				'</p>'
			];

		if ( !result.success ) {
			res.push( '<pre>', escapeTags( result.error ), '</pre>' );
		}

		resEl.className = 'result ' + ( result.success ? result.ignored ? 'warn' : 'ok' : 'fail' );
		resEl.innerHTML = res.join( '' );

		resultsEl.appendChild( resEl );
	}

	/**
	 * Local Bender class
	 * @constructor
	 */
	function Bender() {
		this.result = function( result ) {
			if ( !result.success && supportsConsole ) {
				console.log( result.module + ' - ' + result.name + ' FAILED\n' + result.error );
			}
			addResult( result );
		};

		this.log = function( message ) {
			if ( supportsConsole ) {
				console.log( message );
			}
		};

		this.ignore = function( result ) {
			var resEl = document.createElement( 'div' );

			resEl.className = 'warn';
			resEl.innerHTML = '<p><span class="icon ignored"></span>Tests in <strong>' +
				result.module + '</strong> were ignored for current browser\'s version</p>';

			resultsEl.appendChild( resEl );

			statusEl.innerHTML = '<strong>Ignored</strong>';

			expandUI();
		};

		this.error = function( error ) {
			var resEl = document.createElement( 'div' );

			if ( !resultsEl ) {
				prepareResultsEl();
			}

			if ( error.error ) {
				resEl.className = 'result fail';
				resEl.innerHTML = '<p><span class="icon failed"></span>Error' +
					( error.methodName ? ( ' in ' + error.methodName ) : '' ) +
					( '<pre>' + escapeTags( error.error ? error.error.message : error.message ) + '</pre>' ) +
					'</p>';

				resultsEl.appendChild( resEl );

				bender.stopRunner();
				expandUI();

				throw ( error.error );
			} else {
				resEl.className = 'result fail';
				resEl.innerHTML = '<p><span class="icon failed"></span>Error<pre>' + error + '</pre></p>';

				resultsEl.appendChild( resEl );

				if ( supportsConsole ) {
					console.log( error.stack ? error.stack : error.error ? error.error : error );
				}
			}
		};

		this.next = function( result ) {
			statusEl.innerHTML = '<strong>Testing Done:</strong> ' +
				result.passed + ' passed, ' + result.failed + ' failed' +
				( result.ignored ? ', ' + result.ignored + ' ignored ' : ' ' ) +
				'in ' + result.duration + 'ms';

			expandUI();
		};

		this.start = this.complete = function() {};
	}

	/**
	 * Check for ignored tests and handle test start
	 */
	function start() {
		if ( bender.ignoreOldIE && isOldIE ) {
			bender.ignore( {
				module: testId
			} );
		} else {
			bender.start();
		}
	}

	// test file is running in a popup or iframe, bender will be a proxy to parent window
	if ( launcher && launcher.bender && launcher.bender.runAsChild && window.location.hash === '#child' ) {
		bender = {
			result: function( result ) {
				launcher.bender.result( JSON.stringify( result ) );
			},
			next: function( result ) {
				launcher.bender.next( JSON.stringify( result ) );
			},
			ignore: function( result ) {
				launcher.bender.ignore( JSON.stringify( result ) );
			},
			log: function( message ) {
				launcher.bender.log( message );
			},
			error: function( error ) {
				launcher.bender.error(
					JSON.stringify( error.stack ? error.stack : error.error ? error.error.stack : error )
				);

				return true;
			}
		};

		init = start;
		// standalone run, local instance of Bender and additional CSS is needed
	} else {
		bender = new Bender();

		loadStyles();

		init = function() {
			prepareResultsEl();
			start();
		};
	}

	window.onerror = bender.error;
	bender.config = BENDER_CONFIG;

	bender.addListener = function( target, event, handler ) {
		if ( target.addEventListener ) {
			target.addEventListener( event, handler, false );
		} else if ( target.attachEvent ) {
			target.attachEvent( 'on' + event, handler );
		} else {
			target[ 'on' + event ] = handler;
		}
	};

	bender.removeListener = function( target, event, handler ) {
		if ( target.removeEventListener ) {
			target.removeEventListener( event, handler, false );
		} else if ( target.detachEvent ) {
			target.detachEvent( 'on' + event, handler );
		} else {
			target[ 'on' + event ] = null;
		}
	};

	window.alert = function( msg ) {
		throw {
			message: 'window.alert: ' + msg
		};
	};

	window.bender = bender;

	bender.addListener( window, 'load', init );
} )();
