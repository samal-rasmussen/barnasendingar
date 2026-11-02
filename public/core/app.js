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
	 * @param {string} message
	 * @param {unknown} error
	 */
	BS.logError = function (message, error) {
		if (window.console && window.console.error) {
			window.console.error(message, error);
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
