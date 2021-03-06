/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Main dashboard script
 */
( function( window ) {
	'use strict';

	/**
	 * Marionette Application
	 */
	window.App = new Marionette.Application();

	/**
	 * Navigate to a route
	 * @param {String}  route             Route to navigate to
	 * @param {Object}  [options]         Backbone.history.navigate options
	 * @param {Boolean} [options.trigger] Force triggering route event
	 * @param {Boolean} [options.replace] Replace current route with new one instead of adding another history item
	 *
	 */
	App.navigate = function( route, options ) {
		options = options || {
			trigger: true
		};

		Backbone.history.navigate( route, options );
	};

	/**
	 * Get current route
	 * @return {String}
	 */
	App.getCurrentRoute = function() {
		return Backbone.history.fragment;
	};

	/**
	 * Alias for history.back
	 */
	App.back = function() {
		Backbone.history.history.back();
	};

	/**
	 * Main layout region responsible for displaying dialog modals
	 */
	App.ModalRegion = Marionette.Region.extend( {
		el: '#modal',

		constructor: function() {
			Marionette.Region.prototype.constructor.apply( this, arguments );

			this._ensureElement();
			this.$el.on( 'hidden.bs.modal', _.bind( this.empty, this ) );
		},

		onShow: function( view ) {
			view.once( 'destroy', _.bind( this.onEmpty, this ) );

			this.$el.modal( {
				backdrop: 'static',
				show: true
			} );
		},

		onEmpty: function() {
			this.$el.modal( 'hide' );
		}
	} );

	App.addRegions( {
		socketStatus: '#socket-status',
		tabs: '#tabs',
		header: '#header',
		content: '#content',
		modal: App.ModalRegion,
		alerts: '#alerts'
	} );

	// adjust body padding to match header height each time the content is changed
	App.addInitializer( function() {
		App.$body = $( 'body' );
		App.$navbar = $( '.navbar' );

		App.content.on( 'show', function() {
			App.$body.css( 'paddingTop', App.$navbar.height() + 1 + 'px' );
		} );
	} );

	App.on( 'start', function() {
		Backbone.history.start();

		if ( this.getCurrentRoute() === '' ) {
			App.Tests.trigger( 'tests:list' );
		}
	} );

} )( this );
