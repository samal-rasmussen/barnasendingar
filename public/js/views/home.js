// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	BS.views.home = BS.views.home || {};

	BS.views.home.render = function (root) {
		var heading;
		var grid;
		var shows = BS.state.shows || [];
		var i;
		var show;

		document.title = 'Barnasendingar';
		BS.util.clearElement(root);

		heading = BS.util.el('h1', '', 'Barnasendingar');
		grid = BS.util.el('div', 'grid');

		root.appendChild(heading);
		root.appendChild(grid);

		for (i = 0; i < shows.length; i += 1) {
			show = shows[i];
			grid.appendChild(BS.views.home.createShowTile(show));
		}
		BS.views.home.addSpacers(grid);
	};

	BS.views.home.createShowTile = function (show) {
		var item = BS.util.el('div', 'grid-item');
		var container = BS.util.el('div', 'grid-container');
		var title = BS.util.el('h2', '', show.title);
		var image = /** @type {HTMLImageElement} */ (BS.util.el('img'));

		image.src = show.img;
		image.alt = 'Sending';

		BS.util.onActivate(container, function () {
			BS.router.goToShow(show.title);
		});

		container.appendChild(title);
		container.appendChild(image);
		item.appendChild(container);
		return item;
	};

	BS.views.home.addSpacers = function (grid) {
		var i;
		for (i = 0; i < 12; i += 1) {
			grid.appendChild(BS.util.el('div', 'grid-spacer'));
		}
	};
})(window, document);
