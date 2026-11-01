// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	var page = /** @type {any} */ ({});
	BS.pages.home = page;

	BS.templates.register('/pages/home/home.html');

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
