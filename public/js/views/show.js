// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	BS.views.show = BS.views.show || {};

	BS.views.show.render = function (root, show) {
		var heading;
		var grid;
		var actions;
		var i;

		document.title = show.title + ' - Barnasendingar';
		BS.util.clearElement(root);

		heading = BS.util.el('h1', '', show.title);
		grid = BS.util.el('div', 'grid episode-grid');
		actions = BS.views.show.createActions(show);

		root.appendChild(heading);
		root.appendChild(grid);
		grid.appendChild(actions);

		for (i = 0; i < show.episodes.length; i += 1) {
			grid.appendChild(BS.views.show.createEpisodeTile(show, show.episodes[i]));
		}
		BS.views.show.addSpacers(grid);
	};

	BS.views.show.createActions = function (show) {
		var actions = BS.util.el('div', 'actions');
		var backButton = /** @type {HTMLButtonElement} */ (BS.util.el('button', 'icon', '⇦'));
		var clearButton = /** @type {HTMLButtonElement} */ (
			BS.util.el('button', '', 'Nulstilla "Sæð"')
		);

		backButton.onclick = function () {
			BS.router.goBackOrHome();
		};
		clearButton.onclick = function () {
			BS.watched.clearWatched(show);
			BS.router.refresh();
		};

		actions.appendChild(backButton);
		actions.appendChild(clearButton);
		return actions;
	};

	BS.views.show.createEpisodeTile = function (show, episode) {
		var item = BS.util.el('div', 'grid-item');
		var container = BS.util.el('div', 'grid-container');
		var header = BS.util.el('div', 'header');
		var title = BS.util.el('h2', '', episode.title);
		var image = /** @type {HTMLImageElement} */ (BS.util.el('img'));
		var watched;

		image.src = episode.img;
		image.alt = 'Partur';

		BS.util.onActivate(container, function () {
			BS.router.goToEpisode(show.title, episode.title);
		});

		header.appendChild(title);
		container.appendChild(header);
		container.appendChild(image);

		if (BS.watched.isWatched(show, episode)) {
			watched = BS.util.el('div', 'watched', 'Sæð');
			container.appendChild(watched);
		}

		item.appendChild(container);
		return item;
	};

	BS.views.show.addSpacers = function (grid) {
		var i;
		for (i = 0; i < 12; i += 1) {
			grid.appendChild(BS.util.el('div', 'grid-spacer'));
		}
	};
})(window, document);
