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
		current.util.renderStatus(app, 'Lesur barnasendingar...');

		current.data.loadShows(function (error, shows) {
			if (error) {
				document.title = 'Barnasendingar';
				current.util.renderStatus(app, 'Kundi ikki lesa barnasendingarnar. Royn aftur seinni.');
				return;
			}

			current.state.shows = shows;
			current.data.buildIndexes(shows);
			current.router.start();
		});
	};
})(window, document);
