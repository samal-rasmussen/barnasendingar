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
		var qualityControl;
		var qualityLabel;
		var qualitySelect;
		var hls = null;
		var currentEpisode = episode;
		var currentIndex = BS.data.getEpisodeIndex(show, episode);

		document.title = episode.title + ' - ' + show.title + ' - Barnasendingar';
		BS.util.clearElement(root);

		section = BS.util.el('div', 'episode');
		header = BS.util.el('div', 'episode-header');
		backButton = /** @type {HTMLButtonElement} */ (BS.util.el('button', 'icon', '⇦'));
		heading = BS.util.el('div', 'episode-heading');
		title = BS.util.el('h1', '', show.title);
		context = BS.util.el('p', '', episode.title);
		playerWrap = BS.util.el('div', 'player-wrap');
		video = /** @type {HTMLVideoElement} */ (BS.util.el('video', 'player-video'));
		qualityControl = BS.util.el('div', 'quality-control');
		qualityLabel = BS.util.el('label', '', 'Góðska');
		qualitySelect = /** @type {HTMLSelectElement} */ (BS.util.el('select'));

		backButton.onclick = function () {
			BS.router.goToShow(show.title);
		};

		video.controls = true;
		video.autoplay = true;
		video.preload = 'metadata';
		video.poster = episode.img;
		video.setAttribute('playsinline', 'playsinline');
		video.setAttribute('webkit-playsinline', 'webkit-playsinline');

		qualityLabel.setAttribute('for', 'quality-selector');
		qualitySelect.id = 'quality-selector';
		qualitySelect.disabled = true;
		BS.views.episode.setQualityOptions(qualitySelect, []);

		heading.appendChild(title);
		heading.appendChild(context);
		header.appendChild(backButton);
		header.appendChild(heading);
		qualityControl.appendChild(qualityLabel);
		qualityControl.appendChild(qualitySelect);
		playerWrap.appendChild(video);
		playerWrap.appendChild(qualityControl);
		section.appendChild(header);
		section.appendChild(playerWrap);
		root.appendChild(section);

		if (!episode.mediaId) {
			BS.views.episode.renderPlayerMessage(playerWrap, 'Hesin parturin hevur einki video.');
			return function () {
				video.pause();
			};
		}

		video.onended = function () {
			var nextEpisode;
			BS.watched.setWatched(show, currentEpisode);
			nextEpisode = show.episodes[currentIndex + 1];
			if (nextEpisode) {
				BS.router.goToEpisode(show.title, nextEpisode.title);
			}
		};

		hls = BS.views.episode.attachVideo(video, qualitySelect, episode.mediaId);

		return function () {
			video.onended = null;
			video.pause();
			video.removeAttribute('src');
			if (hls && hls.destroy) {
				hls.destroy();
			}
		};
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
