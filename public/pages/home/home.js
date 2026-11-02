// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('home.html');

	/**
	 * @typedef {import('../../../scripts/shared-types').Show} Show
	 */

	var page = {};
	BS.pages.home = page;

	/**
	 * @param {HTMLElement} root
	 */
	page.render = function (root) {
		var view = BS.templates.clone('home-page');
		var shows = BS.state.shows || [];
		var i;

		document.title = 'Barnasendingar';
		BS.util.clearElement(root);

		for (i = 0; i < shows.length; i += 1) {
			view.refs.grid.appendChild(page.createShowTile(shows[i]));
		}
		BS.util.addGridSpacers(view.refs.grid);

		root.appendChild(view.fragment);
	};

	/**
	 * @param {Show} show
	 */
	page.createShowTile = function (show) {
		return BS.components.tile({
			title: show.title,
			image: show.img,
			imageAlt: 'Sending',
			onActivate: function () {
				BS.router.go('show', { show: show.title });
			}
		}).element;
	};
})(window, document);
