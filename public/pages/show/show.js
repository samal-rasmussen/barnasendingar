// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	var page = /** @type {any} */ ({});
	BS.pages.show = page;

	BS.templates.register('/pages/show/show.html');

	/**
	 * @param {HTMLElement} root
	 * @param {*} show
	 */
	page.render = function (root, show) {
		var view = BS.templates.clone('show-page');
		var i;

		document.title = show.title + ' - Barnasendingar';
		BS.util.clearElement(root);

		view.refs.title.textContent = show.title;
		view.refs.back.onclick = function () {
			BS.router.goBackOrHome();
		};
		view.refs.clear.onclick = function () {
			BS.watched.clearWatched(show);
			BS.router.refresh();
		};

		for (i = 0; i < show.episodes.length; i += 1) {
			view.refs.grid.appendChild(page.createEpisodeTile(show, show.episodes[i]));
		}
		BS.util.addGridSpacers(view.refs.grid);

		root.appendChild(view.fragment);
	};

	page.createEpisodeTile = function (show, episode) {
		return BS.components.tile({
			title: episode.title,
			image: episode.img,
			imageAlt: 'Partur',
			watched: BS.watched.isWatched(show, episode),
			onActivate: function () {
				BS.router.goToEpisode(show.title, episode.title);
			}
		}).element;
	};
})(window, document);
