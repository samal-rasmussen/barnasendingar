// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('home.html');

	/**
	 * @typedef {import('../../../scripts/shared-types').Show} Show
	 */

	var page = {};
	BS.pages.home = page;

	// The show that was open last, so coming back focuses its tile. The show
	// page sets it, which also covers opening a show by its address.
	/** @type {?string} */
	var lastShowTitle = null;

	/**
	 * Remembers the show as the one open last.
	 *
	 * @param {Show} show
	 */
	page.rememberShow = function (show) {
		lastShowTitle = show.title;
	};

	/**
	 * @param {HTMLElement} root
	 */
	page.render = function (root) {
		var view = BS.templates.clone('home-page');
		/** @type {Show[]} */
		var shows = BS.data.getShows();
		var tiles = shows.map(page.createShowTile);
		var focusIndex = 0;
		var i;

		BS.dom.setTitle();

		BS.dom.replace(view.refs.grid, BS.components.grid({ items: tiles }).element);

		root.appendChild(view.fragment);

		for (i = 0; i < shows.length; i += 1) {
			if (shows[i].title === lastShowTitle) {
				focusIndex = i;
				break;
			}
		}
		if (tiles[focusIndex]) {
			tiles[focusIndex].focus();
		}
	};

	/**
	 * @param {Show} show
	 */
	page.createShowTile = function (show) {
		return BS.components.tile({
			title: show.title,
			image: show.img,
			onActivate: function () {
				BS.router.go('show', { show: show.title });
			}
		});
	};
})(window);
