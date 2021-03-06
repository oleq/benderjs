/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Handles Socket.IO connection and events
 * @module App.Sockets
 */

App.module( 'Sockets', function( Sockets, App, Backbone ) {
	'use strict';

	Sockets.status = new( Backbone.Model.extend( {
		defaults: {
			status: 'disconnected'
		},

		setStatus: function( status ) {
			this.set( 'status', status );
		}
	} ) )();

	Sockets.StatusView = Backbone.View.extend( {
		tagName: 'span',

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		render: function() {
			var status = this.model.get( 'status' );

			this.el.innerHTML = status;
			this.el.className = 'label label-' + ( status === 'connected' ? 'success' :
				status === 'reconnecting' ? 'warning' : 'danger' );
		}
	} );

	Sockets.addInitializer( function() {
		var socket = io.connect( '/dashboard', {
			'reconnection delay': 2000,
			'reconnection limit': 2000,
			'max reconnection attempts': Infinity
		} );

		Sockets.socket = socket;

		// expose socket.io emit method
		Sockets.emit = socket.emit;

		socket.on( 'connect', function() {
			socket.emit( 'register' );
			Sockets.status.setStatus( 'connected' );
			App.hideDisconnectedPopup();
		} );

		function handleDisconnect() {
			Sockets.status.setStatus( 'disconnected' );
			App.showDisconnectedPopup();
		}

		socket.on( 'disconnect', handleDisconnect );

		App.socketStatus.show( new Sockets.StatusView( {
			model: Sockets.status
		} ) );

		$( window ).on( 'beforeunload', function() {
			socket.removeListener( 'disconnect', handleDisconnect );
			socket.disconnect();
		} );
	} );
} );
