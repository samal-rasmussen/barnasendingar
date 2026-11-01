// @ts-check
(function (window, document) {
	'use strict';

	var current = /** @type {any} */ (window).BS || {};
	current.state = current.state || {};
	current.util = current.util || {};
	current.data = current.data || {};
	current.watched = current.watched || {};
	current.router = current.router || {};
	current.views = current.views || {};

	/** @type {any} */ (window).BS = current;

	current.start = function () {
		var app = document.getElementById('app');
		if (!app) {
			return;
		}

		current.state.appElement = app;
		current.loadShows(app);
	};

	/**
	 * @param {HTMLElement} app
	 */
	current.loadShows = function (app) {
		current.util.renderStatus(app, 'Lesur barnasendingar...');

		current.data.loadShows(function (error, shows) {
			if (error) {
				current.renderLoadError(app);
				return;
			}

			current.state.shows = shows;
			current.data.buildIndexes(shows);
			current.router.start();
		});
	};

	/**
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
			current.loadShows(app);
		};

		container.appendChild(message);
		container.appendChild(button);
		app.appendChild(container);
		button.focus();
	};
})(window, document);
