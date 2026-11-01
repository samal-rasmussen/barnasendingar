// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	BS.views.episode = BS.views.episode || {};

	BS.views.episode.render = function (root, show, episode) {
		var section;
		var header;
		var backButton;
		var heading;
		var title;
		var context;
		var playerWrap;
		var video;
		var fullscreenButton;
		var qualityControl;
		var qualityLabel;
		var qualitySelect;
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
			BS.views.episode.setQualityOptions(qualitySelect, []);
			qualitySelect.onchange = null;
			hls = BS.views.episode.attachVideo(video, qualitySelect, nextEpisode.mediaId);
		}

		BS.util.clearElement(root);

		section = BS.util.el('div', 'episode');
		header = BS.util.el('div', 'episode-header');
		backButton = /** @type {HTMLButtonElement} */ (BS.util.el('button', 'icon', '⇦'));
		heading = BS.util.el('div', 'episode-heading');
		title = BS.util.el('h1', '', show.title);
		context = BS.util.el('p', '', episode.title);
		playerWrap = BS.util.el('div', 'player-wrap');
		video = /** @type {HTMLVideoElement} */ (BS.util.el('video', 'player-video'));
		fullscreenButton = /** @type {HTMLButtonElement} */ (
			BS.util.el('button', 'icon fullscreen-button')
		);
		qualityControl = BS.util.el('div', 'quality-control');
		qualityLabel = BS.util.el('label', '', 'Góðska');
		qualitySelect = /** @type {HTMLSelectElement} */ (BS.util.el('select'));

		backButton.onclick = function () {
			BS.router.goToShow(show.title);
		};

		fullscreenButton.title = 'Fullur skíggi';
		fullscreenButton.setAttribute('aria-label', 'Fullur skíggi');
		fullscreenButton.appendChild(BS.views.episode.createFullscreenIcon());
		fullscreenButton.onclick = function () {
			BS.util.requestFullscreen(video);
		};

		video.controls = true;
		video.autoplay = true;
		video.preload = 'metadata';
		video.setAttribute('playsinline', 'playsinline');
		video.setAttribute('webkit-playsinline', 'webkit-playsinline');

		qualityLabel.setAttribute('for', 'quality-selector');
		qualitySelect.id = 'quality-selector';

		heading.appendChild(title);
		heading.appendChild(context);
		header.appendChild(backButton);
		header.appendChild(heading);
		header.appendChild(fullscreenButton);
		qualityControl.appendChild(qualityLabel);
		qualityControl.appendChild(qualitySelect);
		header.appendChild(qualityControl);
		playerWrap.appendChild(video);
		section.appendChild(header);
		section.appendChild(playerWrap);
		root.appendChild(section);

		if (!episode.mediaId) {
			document.title = episode.title + ' - ' + show.title + ' - Barnasendingar';
			BS.views.episode.setQualityOptions(qualitySelect, []);
			BS.views.episode.renderPlayerMessage(playerWrap, 'Hesin parturin hevur einki video.');
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

	BS.views.episode.createFullscreenIcon = function () {
		var svgNs = 'http://www.w3.org/2000/svg';
		var svg = document.createElementNS(svgNs, 'svg');
		var path = document.createElementNS(svgNs, 'path');

		svg.setAttribute('class', 'fullscreen-icon');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');
		path.setAttribute('d', 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6');
		path.setAttribute('fill', 'none');
		path.setAttribute('stroke', 'currentColor');
		path.setAttribute('stroke-width', '2.5');
		path.setAttribute('stroke-linecap', 'round');
		path.setAttribute('stroke-linejoin', 'round');
		svg.appendChild(path);
		return svg;
	};

	BS.views.episode.renderPlayerMessage = function (playerWrap, message) {
		var messageElement = BS.util.el('div', 'player-message', message);
		BS.util.clearElement(playerWrap);
		playerWrap.appendChild(messageElement);
	};

	BS.views.episode.attachVideo = function (video, qualitySelect, mediaId) {
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
				BS.views.episode.setQualityOptions(qualitySelect, hls.levels || []);
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
					BS.views.episode.handleFatalHlsError(hls, data);
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
		BS.views.episode.renderPlayerMessage(
			/** @type {HTMLElement} */ (video.parentNode),
			'Hesin kaga dugir ikki at spæla video.'
		);
		return null;
	};

	BS.views.episode.handleFatalHlsError = function (hls, data) {
		if (data.type === 'networkError') {
			hls.startLoad();
			return;
		}
		if (data.type === 'mediaError') {
			hls.recoverMediaError();
		}
	};

	BS.views.episode.setQualityOptions = function (select, levels) {
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
