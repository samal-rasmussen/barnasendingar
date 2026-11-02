// @ts-check
(function (window) {
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

	// The episode that was open last, so coming back focuses its tile. The
	// episode page sets it, which also covers moving on to the next episode
	// and opening an episode by its address.
	/** @type {?{show: string, episode: string}} */
	var lastEpisode = null;

	/**
	 * Remembers the episode as the one open last.
	 *
	 * @param {Show} show
	 * @param {Episode} episode
	 */
	page.rememberEpisode = function (show, episode) {
		lastEpisode = { show: show.title, episode: episode.title };
	};

	/**
	 * @param {HTMLElement} root
	 * @param {Show} show
	 */
	page.render = function (root, show) {
		var view = BS.templates.clone('show-page');
		var tiles = show.episodes.map(function (episode) {
			return page.createEpisodeTile(show, episode);
		});
		var focusIndex = page.focusIndex(show);

		BS.pages.home.rememberShow(show);
		BS.dom.setTitle(show.title);

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
		if (tiles[focusIndex]) {
			tiles[focusIndex].focus();
		}
	};

	/**
	 * The episode to focus: the one open last, otherwise the first unwatched
	 * one, otherwise the first.
	 *
	 * @param {Show} show
	 * @returns {number} its index in show.episodes
	 */
	page.focusIndex = function (show) {
		var episodes = show.episodes;
		var i;

		if (lastEpisode && lastEpisode.show === show.title) {
			for (i = 0; i < episodes.length; i += 1) {
				if (episodes[i].title === lastEpisode.episode) {
					return i;
				}
			}
		}
		for (i = 0; i < episodes.length; i += 1) {
			if (!BS.watched.isWatched(show, episodes[i])) {
				return i;
			}
		}
		return 0;
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
})(window);
