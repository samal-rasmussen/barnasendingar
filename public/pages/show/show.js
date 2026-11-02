// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('show.html');

	/**
	 * @typedef {import('../../../scripts/shared-types').Show} Show
	 * @typedef {import('../../../scripts/shared-types').Episode} Episode
	 */

	var page = {};
	BS.pages.show = page;

	/**
	 * @param {HTMLElement} root
	 * @param {Show} show
	 */
	page.render = function (root, show) {
		var view = BS.templates.clone('show-page');
		var i;

		document.title = show.title + ' - Barnasendingar';
		BS.util.clearElement(root);

		view.refs.title.textContent = show.title;
		view.refs.back.onclick = function () {
			BS.router.back('home');
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

	/**
	 * @param {Show} show
	 * @param {Episode} episode
	 */
	page.createEpisodeTile = function (show, episode) {
		return BS.components.tile({
			title: episode.title,
			image: episode.img,
			imageAlt: 'Partur',
			watched: BS.watched.isWatched(show, episode),
			onActivate: function () {
				BS.router.go('episode', { show: show.title, episode: episode.title });
			}
		}).element;
	};
})(window, document);
