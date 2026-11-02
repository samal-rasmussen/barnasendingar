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
		var tiles = show.episodes.map(function (episode) {
			return page.createEpisodeTile(show, episode);
		});

		document.title = show.title + ' - Barnasendingar';
		BS.util.clearElement(root);

		view.refs.title.textContent = show.title;
		view.refs.back.onclick = function () {
			BS.router.back('home');
		};
		// Updates the tiles in place, so focus stays on the button.
		view.refs.clear.onclick = function () {
			BS.watched.clearWatched(show);
			tiles.forEach(function (tile) {
				tile.setWatched(false);
			});
		};

		BS.dom.replace(
			view.refs.grid,
			BS.components.grid({
				toolbar: [view.refs.back, view.refs.clear],
				items: tiles
			}).element
		);

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
			watched: BS.watched.isWatched(show, episode),
			onActivate: function () {
				BS.router.go('episode', { show: show.title, episode: episode.title });
			}
		});
	};
})(window, document);
