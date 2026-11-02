// @ts-check
(function (window, document) {
	'use strict';

	/**
	 * @typedef {import('../../scripts/shared-types').Show} Show
	 */

	// The global namespace is built up across many files and has no type.
	var current = /** @type {any} */ (window).BS || {};
	current.state = current.state || {};
	current.util = current.util || {};
	current.dom = current.dom || {};
	current.data = current.data || {};
	current.watched = current.watched || {};
	current.templates = current.templates || {};
	current.components = current.components || {};
	current.pages = current.pages || {};

	/** @type {any} */ (window).BS = current;

	current.start = function () {
		var app = document.getElementById('app');
		if (!app) {
			return;
		}

		current.loadApp(app);
	};

	/**
	 * Loads the show catalogue and the page templates in parallel, then
	 * starts the router. Shows the loading screen meanwhile, and the
	 * load-error screen, with a retry, if either fails.
	 *
	 * @param {HTMLElement} app
	 */
	current.loadApp = function (app) {
		var remaining = 2;
		var failed = false;

		/**
		 * @param {?Error} error
		 */
		function done(error) {
			if (failed) {
				return;
			}
			if (error) {
				failed = true;
				current.boot.showError(function () {
					current.loadApp(app);
				});
				return;
			}
			remaining -= 1;
			if (remaining === 0) {
				current.boot.hide();
				current.router = current.createRouter({
					root: app,
					routes: current.routes,
					/** @param {HTMLElement} root */
					notFound: function (root) {
						return current.pages.notFound.render(root);
					}
				});
				current.router.start();
			}
		}

		current.boot.showLoading();

		current.data.loadShows(
			/**
			 * @param {?Error} error
			 * @param {Show[]=} shows
			 */
			function (error, shows) {
				if (!error) {
					current.state.shows = shows;
					current.data.buildIndexes(shows);
				}
				done(error);
			}
		);
		current.templates.load(done);
	};
})(window, document);
