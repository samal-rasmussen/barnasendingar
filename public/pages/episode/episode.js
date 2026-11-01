// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	var page = /** @type {any} */ ({});
	BS.pages.episode = page;

	BS.templates.register('/pages/episode/episode.html');

	/**
	 * @param {HTMLElement} root
	 * @param {*} show
	 * @param {*} episode
	 * @returns {Function} cleanup, called when leaving the page
	 */
	page.render = function (root, show, episode) {
		var view = BS.templates.clone('episode-page');
		var context = view.refs.episodeTitle;
		var playerWrap = view.refs.playerWrap;
		var video = /** @type {HTMLVideoElement} */ (view.refs.video);
		var qualitySelect = /** @type {HTMLSelectElement} */ (view.refs.quality);
		var hls = null;
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
		 * @param {*} nextEpisode
		 */
		function loadEpisode(nextEpisode) {
			destroyHls();
			currentEpisode = nextEpisode;
			currentIndex = BS.data.getEpisodeIndex(show, nextEpisode);
			document.title = nextEpisode.title + ' - ' + show.title + ' - Barnasendingar';
			context.textContent = nextEpisode.title;
			video.poster = nextEpisode.img;
			page.setQualityOptions(qualitySelect, []);
			qualitySelect.onchange = null;
			hls = page.attachVideo(video, qualitySelect, nextEpisode.mediaId);
		}

		BS.util.clearElement(root);

		view.refs.showTitle.textContent = show.title;
		context.textContent = episode.title;

		view.refs.back.onclick = function () {
			BS.router.goToShow(show.title);
		};
		view.refs.fullscreen.onclick = function () {
			BS.util.requestFullscreen(video);
		};

		root.appendChild(view.fragment);

		if (!episode.mediaId) {
			document.title = episode.title + ' - ' + show.title + ' - Barnasendingar';
			page.setQualityOptions(qualitySelect, []);
			page.renderPlayerMessage(playerWrap, 'Hesin parturin hevur einki video.');
			return function () {
				video.pause();
			};
		}

		video.onended = function () {
			var nextEpisode;
			BS.watched.setWatched(show, currentEpisode);
			nextEpisode = show.episodes[currentIndex + 1];
			if (!nextEpisode) {
				return;
			}
			if (nextEpisode.mediaId && BS.router.replaceEpisodeHashOnly(show.title, nextEpisode.title)) {
				loadEpisode(nextEpisode);
				return;
			}
			BS.router.replaceWithEpisode(show.title, nextEpisode.title);
		};

		loadEpisode(episode);

		return function () {
			video.onended = null;
			video.pause();
			destroyHls();
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

	page.attachVideo = function (video, qualitySelect, mediaId) {
		var playlistUrl =
			'https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/' +
			mediaId +
			'.smil?type=m3u8';
		var HlsConstructor = /** @type {any} */ (window).Hls;
		var hls;

		if (HlsConstructor && HlsConstructor.isSupported && HlsConstructor.isSupported()) {
			hls = new HlsConstructor({ enableWorker: false });
			hls.loadSource(playlistUrl);
			hls.attachMedia(video);
			hls.on(HlsConstructor.Events.MANIFEST_PARSED, function () {
				page.setQualityOptions(qualitySelect, hls.levels || []);
				qualitySelect.onchange = function () {
					var selected = parseInt(qualitySelect.value, 10);
					if (!isNaN(selected)) {
						hls.currentLevel = selected;
					}
				};
				BS.util.play(video);
				BS.util.requestFullscreen(video);
			});
			hls.on(HlsConstructor.Events.ERROR, function (eventName, data) {
				if (data && data.fatal) {
					page.handleFatalHlsError(hls, data);
				}
			});
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

		qualitySelect.disabled = true;
		page.renderPlayerMessage(
			/** @type {HTMLElement} */ (video.parentNode),
			'Hesin kaga dugir ikki at spæla video.'
		);
		return null;
	};

	page.handleFatalHlsError = function (hls, data) {
		if (data.type === 'networkError') {
			hls.startLoad();
			return;
		}
		if (data.type === 'mediaError') {
			hls.recoverMediaError();
		}
	};

	page.setQualityOptions = function (select, levels) {
		var autoOption;
		var i;
		var option;
		var level;
		var label;

		BS.util.clearElement(select);

		autoOption = document.createElement('option');
		autoOption.value = '-1';
		autoOption.text = 'Auto';
		select.appendChild(autoOption);

		for (i = 0; i < levels.length; i += 1) {
			level = levels[i];
			if (level.height) {
				label = level.height + 'p';
			} else if (level.bitrate) {
				label = Math.round(level.bitrate / 1000) + ' kbps';
			} else {
				label = 'Góðska ' + (i + 1);
			}

			option = document.createElement('option');
			option.value = String(i);
			option.text = label;
			select.appendChild(option);
		}

		select.value = '-1';
		select.disabled = levels.length === 0;
	};
})(window, document);
