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
		var tile = BS.templates.clone('home-show-tile');

		tile.refs.title.textContent = show.title;
		tile.refs.image.src = show.img;

		BS.util.onActivate(tile.refs.tile, function () {
			BS.router.goToShow(show.title);
		});

		return tile.element;
	};
})(window, document);
