// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;
	/**
	 * @typedef {import('../../../scripts/shared-types').Show} Show
	 * @typedef {import('../../../scripts/shared-types').Episode} Episode
	 */

	var page = {};
	BS.pages.episode = page;

	BS.templates.register('/pages/episode/episode.html');

	/**
	 * @param {HTMLElement} root
	 * @param {Show} show
	 * @param {Episode} episode
	 * @returns {() => void} cleanup, called when leaving the page
	 */
	page.render = function (root, show, episode) {
		var view = BS.templates.clone('episode-page');
		var context = view.refs.episodeTitle;
		var playerWrap = view.refs.playerWrap;
		var video = /** @type {HTMLVideoElement} */ (view.refs.video);
		// The hls.js instance. The vendored library has no types.
		/** @type {any} */
		var hls = null;
		var quality = BS.components.qualitySelect({
			id: 'quality-selector',
			/** @param {number} level */
			onChange: function (level) {
				if (hls) {
					hls.currentLevel = level;
				}
			}
		});
		var currentEpisode = episode;
		var currentIndex = BS.data.getEpisodeIndex(show, episode);

		function destroyHls() {
			if (hls && hls.destroy) {
				hls.destroy();
			}
			hls = null;
		}

		/**
		 * Plays an episode in the existing video element. Reusing the element
		 * keeps the player in fullscreen when moving on to the next episode,
		 * because browsers only allow entering fullscreen from a user gesture.
		 *
		 * @param {Episode} nextEpisode an episode with a mediaId
		 */
		function loadEpisode(nextEpisode) {
			destroyHls();
			currentEpisode = nextEpisode;
			currentIndex = BS.data.getEpisodeIndex(show, nextEpisode);
			document.title = nextEpisode.title + ' - ' + show.title + ' - Barnasendingar';
			context.textContent = nextEpisode.title;
			video.poster = nextEpisode.img;
			quality.setLevels([]);
			hls = page.attachVideo(video, quality, /** @type {string} */ (nextEpisode.mediaId));
		}

		BS.util.clearElement(root);

		view.refs.header.appendChild(quality.element);
		view.refs.showTitle.textContent = show.title;
		context.textContent = episode.title;

		view.refs.back.onclick = function () {
			BS.router.back('show', { show: show.title });
		};
		view.refs.fullscreen.onclick = function () {
			BS.util.requestFullscreen(video);
		};

		root.appendChild(view.fragment);

		if (!episode.mediaId) {
			document.title = episode.title + ' - ' + show.title + ' - Barnasendingar';
			page.renderPlayerMessage(playerWrap, 'Hesin parturin hevur einki video.');
			return function () {
				video.pause();
				quality.destroy();
			};
		}

		video.onended = function () {
			var nextEpisode;
			var nextParams;
			BS.watched.setWatched(show, currentEpisode);
			nextEpisode = show.episodes[currentIndex + 1];
			if (!nextEpisode) {
				return;
			}
			nextParams = { show: show.title, episode: nextEpisode.title };
			if (nextEpisode.mediaId) {
				// Same player, new address: keeps fullscreen (see loadEpisode).
				BS.router.go('episode', nextParams, { replace: true, render: false });
				loadEpisode(nextEpisode);
				return;
			}
			BS.router.go('episode', nextParams, { replace: true });
		};

		loadEpisode(episode);

		return function () {
			video.onended = null;
			video.pause();
			destroyHls();
			quality.destroy();
			video.removeAttribute('src');
		};
	};

	/**
	 * @param {HTMLElement} playerWrap
	 * @param {string} message
	 */
	page.renderPlayerMessage = function (playerWrap, message) {
		var messageView = BS.templates.clone('episode-player-message');
		messageView.element.textContent = message;
		BS.util.clearElement(playerWrap);
		playerWrap.appendChild(messageView.fragment);
	};

	/**
	 * @param {HTMLVideoElement} video
	 * @param {{setLevels: (levels: Array<{height?: number, bitrate?: number}>) => void}} quality
	 *   the episode's qualitySelect component
	 * @param {string} mediaId
	 */
	page.attachVideo = function (video, quality, mediaId) {
		var playlistUrl =
			'https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/' +
			mediaId +
			'.smil?type=m3u8';
		// hls.js, from the vendored script. It has no types.
		var HlsConstructor = /** @type {any} */ (window).Hls;
		/** @type {any} */
		var hls;

		if (HlsConstructor && HlsConstructor.isSupported && HlsConstructor.isSupported()) {
			hls = new HlsConstructor({ enableWorker: false });
			hls.loadSource(playlistUrl);
			hls.attachMedia(video);
			hls.on(HlsConstructor.Events.MANIFEST_PARSED, function () {
				quality.setLevels(hls.levels || []);
				BS.util.play(video);
				BS.util.requestFullscreen(video);
			});
			hls.on(
				HlsConstructor.Events.ERROR,
				/**
				 * @param {string} eventName
				 * @param {HlsErrorData} data
				 */
				function (eventName, data) {
					if (data && data.fatal) {
						page.handleFatalHlsError(hls, data);
					}
				}
			);
			return hls;
		}

		if (video.canPlayType('application/vnd.apple.mpegURL')) {
			video.src = playlistUrl;
			video.onloadedmetadata = function () {
				BS.util.play(video);
				BS.util.requestFullscreen(video);
			};
			return null;
		}

		page.renderPlayerMessage(
			/** @type {HTMLElement} */ (video.parentNode),
			'Hesin kaga dugir ikki at spæla video.'
		);
		return null;
	};

	/**
	 * @typedef {{fatal?: boolean, type?: string}} HlsErrorData
	 *   The parts of an hls.js error event that this page uses.
	 */

	/**
	 * @param {any} hls the hls.js instance, which has no types
	 * @param {HlsErrorData} data
	 */
	page.handleFatalHlsError = function (hls, data) {
		if (data.type === 'networkError') {
			hls.startLoad();
			return;
		}
		if (data.type === 'mediaError') {
			hls.recoverMediaError();
		}
	};
})(window, document);
