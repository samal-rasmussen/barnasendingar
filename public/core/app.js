// @ts-check
(function (window, document) {
	'use strict';

	var current = /** @type {any} */ (window).BS || {};
	current.state = current.state || {};
	current.util = current.util || {};
	current.data = current.data || {};
	current.watched = current.watched || {};
	current.router = current.router || {};
	current.templates = current.templates || {};
	current.pages = current.pages || {};

	/** @type {any} */ (window).BS = current;

	current.start = function () {
		var app = document.getElementById('app');
		if (!app) {
			return;
		}

		current.state.appElement = app;
		current.load(app);
	};

	/**
	 * Loads the show catalogue and the page templates in parallel, then
	 * starts the router. Shows the load-error screen if either fails.
	 *
	 * @param {HTMLElement} app
	 */
	current.load = function (app) {
		var remaining = 2;
		var failed = false;

		/**
		 * @param {*} error
		 */
		function done(error) {
			if (failed) {
				return;
			}
			if (error) {
				failed = true;
				current.renderLoadError(app);
				return;
			}
			remaining -= 1;
			if (remaining === 0) {
				current.router.start();
			}
		}

		current.util.renderStatus(app, 'Lesur barnasendingar...');

		current.data.loadShows(function (error, shows) {
			if (!error) {
				current.state.shows = shows;
				current.data.buildIndexes(shows);
			}
			done(error);
		});
		current.templates.load(done);
	};

	/**
	 * Built in code rather than from a template, because it must also work
	 * when the templates failed to load.
	 *
	 * @param {HTMLElement} app
	 */
	current.renderLoadError = function (app) {
		var container;
		var message;
		var button;

		document.title = 'Barnasendingar';
		current.util.clearElement(app);

		container = current.util.el('div', 'status-message');
		message = current.util.el('p', '', 'Kundi ikki lesa barnasendingarnar.');
		button = /** @type {HTMLButtonElement} */ (current.util.el('button', '', 'Royn aftur'));
		button.onclick = function () {
			current.load(app);
		};

		container.appendChild(message);
		container.appendChild(button);
		app.appendChild(container);
		button.focus();
	};
})(window, document);
