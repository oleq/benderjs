/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Common
 */

App.module( 'Common', function( Common, App, Backbone ) {
	'use strict';

	function throwError( message, name ) {
		var error = new Error( message );

		error.name = name || 'Error';

		throw error;
	}

	/**
	 * Helpers used in underscore templates
	 * @type {Object}
	 */
	Common.templateHelpers = {
		getTime: function( timestamp ) {
			return moment( timestamp ).fromNow();
		},

		getResultStyle: function( result ) {
			var status = result.status === 2 ? 'success' :
				result.status === 3 ? 'danger' :
				result.status === 4 ? 'warning' : 'info';

			return status + ' bg-' + status + ' text-' + status;
		},

		getResultMessage: function( result ) {
			var message = [
				'Waiting...',
				'Pending...',
				'Passed',
				'Failed',
				'Ignored'
			][ result.status ] || 'Unknown';

			if ( result.status === 2 || result.status === 3 ) {
				message += ' in ' + ( result.duration ? this.timeToText( result.duration ) : '?ms' );
			}

			return message;
		},

		getIcon: function( result ) {
			return 'glyphicon-' + ( result.status === 0 ? 'time' :
				result.status === 1 ? 'refresh' :
				result.status === 2 ? 'ok' :
				result.status === 3 ? 'remove' :
				'forward' );
		},

		timeToText: function( ms ) {
			var h, m, s;

			s = Math.floor( ms / 1000 );
			ms %= 1000;
			m = Math.floor( s / 60 );
			s %= 60;
			h = Math.floor( m / 60 );
			m %= 60;

			return ( h ? ( h + 'h ' ) : '' ) +
				( m ? ( ( m < 10 ? '0' : '' ) + m + 'm ' ) : '' ) +
				( s ? ( ( s < 10 ? '0' : '' ) + s + 's ' ) : '' ) +
				( ms < 10 ? '00' : ms < 100 ? '0' : '' ) + ms + 'ms';
		},

		getPercent: function( completed, total ) {
			return ( total > 0 ? Math.ceil( completed / total * 100 ) : 0 ) + '%';
		},

		isSlow: function( result ) {
			return result.duration && result.total &&
				( Math.round( result.duration / result.total ) > bender.config.slowAvgThreshold ) ||
				( result.duration > bender.config.slowThreshold );
		}
	};

	/**
	 * Optimized version of CompositeView that parses HTML for children just once when showing the entire collection
	 * @extends {Marionette.CompositeView}
	 */
	Common.TableView = Marionette.CompositeView.extend( {
		className: 'panel panel-default',
		childViewContainer: 'tbody',

		getChildTemplate: function() {
			var childView = this.getOption( 'childView' );

			if ( !childView ) {
				throwError( 'A "childView" must be specified', 'NoChildViewError' );
			}

			return childView.prototype.template;
		},

		_onCollectionAdd: function( child, collection, options ) {
			this.destroyEmptyView();

			var childTemplate = this.getChildTemplate(),
				index = this.collection.indexOf( child );

			this.addChild( child, childTemplate, index );
		},

		createEl: function( View, innerHTML ) {
			var vp = View.prototype,
				tagName = vp.tagName,
				className = vp.className,
				attributes = vp.attributes,
				html = [ '<', tagName ];

			if ( className ) {
				html.push( ' class="' + className + '"' );
			}

			if ( attributes ) {
				_.each( attributes, function( val, key ) {
					html.push( ' ' + key + '="' + val + '"' );
				} );
			}

			html.push( '>', innerHTML, '</', tagName, '>' );

			return html.join( '' );
		},

		showCollection: function() {
			var childTemplate = this.getChildTemplate(),
				div = document.createElement( 'div' ),
				html = [ '<table><tbody>' ];

			this.collection.each( function( child, index ) {
				html.push(
					this.createEl(
						this.childView,
						Marionette.Renderer.render( childTemplate,
							_.extend( child.toJSON(), this.childView.prototype.templateHelpers || {} )
						)
					)
				);
			}, this );

			html.push( '</tbody></table>' );

			div.innerHTML = html.join( '' );

			var elem = div.getElementsByTagName( 'tbody' )[ 0 ],
				nodes = _.toArray( elem.childNodes ),
				len = nodes.length,
				m = 0,
				view,
				node,
				i;

			for ( i = 0; i < len; i++ ) {
				if ( ( node = nodes[ i ] ) && node.nodeType === 1 ) {
					view = new this.childView( {
						el: node,
						model: this.collection.at( m )
					} );

					this._updateIndices( view, true, i );
					this._addChildView( view, i );
					m++;
				}
			}

		},

		addChild: function( child, childTemplate, index ) {
			var childViewOptions = this.getOption( 'childViewOptions' );

			if ( _.isFunction( childViewOptions ) ) {
				childViewOptions = childViewOptions.call( this, child, index );
			}

			var el = document.createElement( 'tr' );

			el.innerHTML = Marionette.Renderer.render(
				childTemplate,
				_.extend( child.toJSON(), this.childView.prototype.templateHelpers || {} )
			);

			var view = new Marionette.ItemView( {
				el: el
			} );

			// increment indices of views after this one
			this._updateIndices( view, true, index );

			this._addChildView( view, index );

			return view;
		},

		renderChildView: function( view, index ) {
			if ( !view.el || !view.el.innerHTML ) {
				view.render();
			}
			this.attachHtml( this, view, index );
		},
	} );


	/**
	 * View for displaying bootstrap styled modal dialogs
	 * @extends {Marionette.ItemView}
	 */
	Common.ModalView = Marionette.ItemView.extend( {
		className: 'modal-content',

		onRender: function() {
			this.undelegateEvents();
			this.$el.wrap(
				'<div class="modal-dialog ' +
				( this.size === 'big' ? 'modal-lg' : this.size === 'small' ? 'modal-sm' : '' ) +
				'"></div>'
			);
			this.$el = this.$el.parent();
			this.setElement( this.$el );
		}
	} );

	/**
	 * View for 404 error page
	 * @extends {Marionette.ItemView}
	 */
	Common.Error404View = Marionette.ItemView.extend( {
		template: '#error404'
	} );

	/**
	 * View for confirmation modals
	 * @extends {Common.ModalView}
	 */
	Common.ConfirmView = Common.ModalView.extend( {
		template: '#modal-tmpl',
		className: 'modal-content modal-confirm',

		callback: null,

		size: 'small',

		ui: {
			submit: '.submit-button'
		},

		events: {
			'click @ui.submit': 'submit'
		},

		initialize: function( options ) {
			this.model = new Backbone.Model( {
				message: options.message || 'Are you sure?',
				footer: true,
				title: false
			} );
			this.callback = options.callback;
		},

		closeHandler: function( doClose ) {
			this.ui.submit.prop( 'disabled', false );

			if ( doClose ) {
				this.destroy();
			}
		},

		submit: function() {
			if ( typeof this.callback == 'function' ) {
				this.callback( _.bind( this.closeHandler, this ) );
			}

			this.ui.submit.prop( 'disabled', true );
		}
	} );

	Common.DisconnectedView = Common.ModalView.extend( {
		template: '#modal-tmpl',

		name: 'disconnected-modal',

		initialize: function() {
			this.model = new Backbone.Model( {
				message: 'You\'ve been disconnected from the server, reconnecting...',
				footer: false,
				title: false
			} );
		}
	} );

	/**
	 * Test errors view
	 */
	Common.TestErrorsView = App.Common.ModalView.extend( {
		template: '#test-errors'
	} );

	/**
	 * Deferred fetch API mixin. This will defer fetching the model/collection
	 * for specified delay to reduce the amount of requests to the server.
	 * Plase override oldFetch value accordingly.
	 * @type {Object}
	 */
	Common.DeferredFetchMixin = {
		isFetching: false,
		deferredFetch: false,
		fetchDelay: 5000, // TODO adjust
		lastFetch: 0,

		oldFetch: function() {},

		initialize: function() {
			this.on( 'sync error', function() {
				this.isFetching = false;
				this.lastFetch = +new Date();
			}, this );
		},

		deferFetch: function() {
			if ( this.deferredFetch ) {
				clearTimeout( this.deferredFetch );
			}

			this.deferredFetch = setTimeout( _.bind( function() {
				this.deferredFetch = null;
				this.fetch();
			}, this ), this.fetchDelay );
		},

		fetch: function( options ) {
			options = options || {};

			if ( options.force ) {
				return this.oldFetch.call( this, options );
			}

			if ( ( this.isFetching || this.lastFetch + this.fetchDelay > +new Date() ) &&
				!this.deferredFetch ) {
				this.deferFetch();
			}

			if ( this.deferredFetch ) {
				return false;
			}

			this.isFetching = true;

			return this.oldFetch.call( this, options );
		},
	};

	/**
	 * Display the 'Error 404' page
	 */
	App.show404 = function() {
		App.header.empty();
		App.content.show( new Common.Error404View() );
	};

	/**
	 * Show confirmation popup
	 * @param {Object}   options          Modal configuration
	 * @param {String}   options.message  Modal message
	 * @param {Function} options.callback Callback function executed on modal confirmation
	 */
	App.showConfirmPopup = function( options ) {
		App.modal.show(
			new Common.ConfirmView( options )
		);
	};

	App.showDisconnectedPopup = function() {
		App.modal.show(
			new Common.DisconnectedView()
		);
	};

	App.hideDisconnectedPopup = function() {
		if ( App.modal.currentView && App.modal.currentView.name === 'disconnected-modal' ) {
			App.modal.empty();
		}
	};
} );
