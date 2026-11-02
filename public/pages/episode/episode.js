// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('episode.html');

	/**
	 * @typedef {import('../../../scripts/shared-types').Show} Show
	 * @typedef {import('../../../scripts/shared-types').Episode} Episode
	 */

	var page = {};
	BS.pages.episode = page;

	/**
	 * @param {HTMLElement} root
	 * @param {Show} show
	 * @param {Episode} episode
	 * @returns {() => void} cleanup, called when leaving the page
	 */
	page.render = function (root, show, episode) {
		var view = BS.templates.clone('episode-page');
		var currentEpisode = episode;
		var quality = BS.components.qualitySelect({
			id: 'quality-selector',
			/** @param {number} level */
			onChange: function (level) {
				player.setLevel(level);
			}
		});
		var player = BS.components.player({
			onLevels: quality.setLevels,
			onEnded: function () {
				var nextEpisode;
				var nextParams;
				BS.watched.setWatched(show, currentEpisode);
				nextEpisode = BS.data.getNextEpisode(show, currentEpisode);
				if (!nextEpisode) {
					return;
				}
				nextParams = { show: show.title, episode: nextEpisode.title };
				if (nextEpisode.mediaId) {
					// Same player, new address: keeps fullscreen (see player.load).
					BS.router.go('episode', nextParams, { replace: true, render: false });
					showEpisode(nextEpisode);
					return;
				}
				BS.router.go('episode', nextParams, { replace: true });
			}
		});

		/**
		 * @param {Episode} shownEpisode
		 */
		function showEpisode(shownEpisode) {
			currentEpisode = shownEpisode;
			BS.pages.show.rememberEpisode(show, shownEpisode);
			BS.dom.setTitle(shownEpisode.title, show.title);
			view.refs.episodeTitle.textContent = shownEpisode.title;
			if (shownEpisode.mediaId) {
				player.load({
					src: BS.data.playlistUrl(shownEpisode.mediaId),
					poster: shownEpisode.img
				});
			} else {
				player.showMessage('Hesin parturin hevur einki video.');
			}
		}

		view.refs.showTitle.textContent = show.title;
		view.refs.back.onclick = function () {
			BS.router.back('show', { show: show.title });
		};
		view.refs.fullscreen.onclick = function () {
			player.requestFullscreen();
		};
		BS.dom.replace(view.refs.quality, quality.element);
		BS.dom.replace(view.refs.player, player.element);

		root.appendChild(view.fragment);
		showEpisode(episode);
		// The back button when there is no video to play.
		if (!player.focus()) {
			view.refs.back.focus();
		}

		return function () {
			player.destroy();
			quality.destroy();
		};
	};
})(window);
