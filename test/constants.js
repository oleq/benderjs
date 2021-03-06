/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Constangs module
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	constants = require( '../lib/constants' );

describe( 'Constants', function() {
	var bender = mocks.getBender(),
		pattern = /[A-Z_\-0-9]+/g;

	bender.use( constants );

	it( 'should be passed to bender', function() {
		var keys = Object.keys( constants ).filter( function( key ) {
			return pattern.test( key );
		} );

		expect( bender ).to.contain.keys( keys );
	} );
} );
