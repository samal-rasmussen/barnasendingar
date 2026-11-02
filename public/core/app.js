// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	// boot/boot.js has already created it.
	var BS = /** @type {any} */ (window).BS || {};
	/** @type {any} */ (window).BS = BS;

	// Filled by the component and page scripts, one entry per folder.
	BS.components = {};
	BS.pages = {};

	/**
	 * Logs an error to the console, and reports it through BS.errors
	 * (public/errors/errors.js) where that is loaded.
	 *
	 * @param {string} message what the app was doing
	 * @param {unknown} error what was thrown or failed, if anything
	 */
	BS.logError = function (message, error) {
		if (window.console && window.console.error) {
			window.console.error(message, error);
		}
		if (BS.errors) {
			BS.errors.report(message, error);
		}
	};

	/**
	 * Notes something that happened, such as a page change or a quality
	 * switch. It is not reported on its own, but the latest notes go with
	 * every error report, as breadcrumbs (see public/errors/errors.js).
	 *
	 * @param {string} text
	 */
	BS.logEvent = function (text) {
		if (BS.errors) {
			BS.errors.note(text);
		}
	};

	/**
	 * Sets a property that goes with every error report from now on, such
	 * as how the player plays video.
	 *
	 * @param {string} name
	 * @param {string} value
	 */
	BS.setErrorContext = function (name, value) {
		if (BS.errors) {
			BS.errors.setContext(name, value);
		}
	};

	BS.start = function () {
		var app = document.getElementById('app');
		if (!app) {
			return;
		}

		BS.loadApp(app);
	};

	/**
	 * Loads the show catalogue and the page templates in parallel, then
	 * starts the router. Shows the loading screen meanwhile, and the
	 * load-error screen, with a retry, if either fails.
	 *
	 * @param {HTMLElement} app
	 */
	BS.loadApp = function (app) {
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
				BS.logError('Could not start the app.', error);
				BS.boot.showError(function () {
					BS.loadApp(app);
				});
				return;
			}
			remaining -= 1;
			if (remaining === 0) {
				BS.boot.hide();
				BS.router = BS.createRouter({
					root: app,
					routes: BS.routes,
					/** @param {HTMLElement} root */
					notFound: function (root) {
						BS.logEvent('Page: not found');
						return BS.pages.notFound.render(root);
					}
				});
				BS.router.start();
			}
		}

		BS.boot.showLoading();
		BS.data.load(done);
		BS.templates.load(done);
	};
})(window, document);
