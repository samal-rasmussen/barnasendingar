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
		/** @type {Show[]} */
		var shows = BS.state.shows || [];

		document.title = 'Barnasendingar';
		BS.util.clearElement(root);

		BS.dom.replace(
			view.refs.grid,
			BS.components.grid({ items: shows.map(page.createShowTile) }).element
		);

		root.appendChild(view.fragment);
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
})(window, document);
