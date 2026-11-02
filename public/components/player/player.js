// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('player.html');

	/**
	 * @typedef {{height?: number, bitrate?: number}} Level
	 *   The parts of an hls.js quality level that callers use.
	 *
	 * @typedef {{fatal?: boolean, type?: string, details?: string}} HlsErrorData
	 *   The parts of an hls.js error event that the player uses.
	 */

	/**
	 * A video player for HLS streams. It plays through hls.js where the
	 * browser supports it, otherwise through the browser's own HLS support,
	 * and otherwise shows a message. It starts playback and asks for
	 * fullscreen once a stream is ready.
	 *
	 * @param {{
	 *   onEnded: () => void,
	 *   onLevels: (levels: Level[]) => void
	 * }} options
	 *   onLevels gets the quality levels of the stream: none when a source
	 *   starts loading, then the stream's levels once hls.js has read them.
	 * @returns {{
	 *   element: HTMLElement,
	 *   load: (source: {src: string, poster?: string}) => void,
	 *   showMessage: (text: string) => void,
	 *   setLevel: (index: number) => void,
	 *   requestFullscreen: () => void,
	 *   focus: () => boolean,
	 *   destroy: () => void
	 * }}
	 */
	BS.components.player = function (options) {
		var view = BS.templates.clone('player');
		var element = /** @type {HTMLElement} */ (view.element);
		var video = /** @type {HTMLVideoElement} */ (view.refs.video);
		var message = /** @type {HTMLElement} */ (view.refs.message);
		// The hls.js instance. The vendored library has no types.
		/** @type {any} */
		var hls = null;
		// The state of the current source, reset by load().
		// True from a video error until playback runs again.
		var failed = false;
		// How many times hls.js was asked to recover from a video error.
		var recoveries = 0;
		// The quality levels hls.js switched to, for error reports.
		/** @type {string[]} */
		var levelSwitches = [];
		/** @type {?number} */
		var stallTimer = null;

		video.onended = function () {
			// Some TVs (Samsung Tizen) fire `ended` when playback fails. Moving
			// on then would skip episode after episode, so the video stays put.
			if (failed || endedEarly(video)) {
				BS.logError('Video stopped before the end, not moving on.', describePlayback());
				return;
			}
			options.onEnded();
		};
		video.onerror = function () {
			var details = describePlayback();
			failed = true;
			if (!hls || recoveries >= maxRecoveries) {
				BS.logError('Video error.', details);
				return;
			}
			recoveries += 1;
			BS.logError('Video error, recovering (attempt ' + recoveries + ').', details);
			// hls.js's documented recovery for decode errors: reattach the
			// media, and if that wasn't enough, also try the other AAC codec.
			if (recoveries > 1) {
				hls.swapAudioCodec();
			}
			hls.recoverMediaError();
			// Reattaching loads a new source, which pauses the video.
			video.oncanplay = function () {
				video.oncanplay = null;
				play(video);
			};
		};
		video.onwaiting = function () {
			clearStallTimer();
			stallTimer = window.setTimeout(function () {
				stallTimer = null;
				BS.logError('Playback stalled.', describePlayback());
			}, stallReportMs);
		};
		video.onplaying = function () {
			failed = false;
			clearStallTimer();
		};

		function clearStallTimer() {
			if (stallTimer !== null) {
				window.clearTimeout(stallTimer);
				stallTimer = null;
			}
		}

		/**
		 * What the player was doing, for error reports: the position, what
		 * is buffered, the quality level and its history, and the error.
		 *
		 * @returns {string}
		 */
		function describePlayback() {
			var parts = [
				'at ' + seconds(video.currentTime) + ' of ' + seconds(video.duration),
				'buffered ' + describeRanges(video.buffered)
			];
			if (hls) {
				parts.push('hls.js level ' + describeLevel(hls, hls.currentLevel));
				parts.push('switches ' + (levelSwitches.join(', ') || 'none'));
			} else {
				parts.push('native HLS');
			}
			if (video.error) {
				parts.push(
					'MediaError code ' +
						video.error.code +
						(video.error.message ? ' ' + video.error.message : '')
				);
			}
			return parts.join(', ');
		}

		function stop() {
			if (hls && hls.destroy) {
				hls.destroy();
			}
			hls = null;
			clearStallTimer();
			video.onloadedmetadata = null;
			video.oncanplay = null;
			video.pause();
			video.removeAttribute('src');
		}

		function start() {
			play(video);
			requestFullscreen(video);
		}

		/**
		 * Shows text in place of the video, which is taken out of the page.
		 *
		 * @param {string} text
		 */
		function showMessage(text) {
			stop();
			if (video.parentNode) {
				element.removeChild(video);
			}
			message.textContent = text;
			message.hidden = false;
		}

		/**
		 * Plays a new source in the same <video> element. Reusing the element
		 * keeps the player in fullscreen when moving on to the next source,
		 * because browsers only allow entering fullscreen from a user gesture.
		 *
		 * @param {{src: string, poster?: string}} source
		 */
		function load(source) {
			// hls.js, from the vendored script. It has no types.
			var Hls = /** @type {any} */ (window).Hls;

			stop();
			failed = false;
			recoveries = 0;
			levelSwitches = [];
			if (!video.parentNode) {
				element.insertBefore(video, message);
			}
			message.hidden = true;
			video.poster = source.poster || '';
			options.onLevels([]);

			if (Hls && Hls.isSupported && Hls.isSupported()) {
				hls = attachHls(
					Hls,
					video,
					source.src,
					function (levels) {
						options.onLevels(levels);
						start();
					},
					function (level) {
						levelSwitches.push(describeLevel(hls, level) + ' at ' + seconds(video.currentTime));
					}
				);
				return;
			}

			if (video.canPlayType('application/vnd.apple.mpegURL')) {
				video.src = source.src;
				video.onloadedmetadata = start;
				return;
			}

			showMessage('Hesin kaga dugir ikki at spæla video.');
		}

		return {
			element: element,
			load: load,
			showMessage: showMessage,

			/**
			 * Picks a quality level by its index in the levels given to
			 * onLevels, or -1 for automatic.
			 *
			 * @param {number} index
			 */
			setLevel: function (index) {
				if (hls) {
					hls.currentLevel = index;
				}
			},

			requestFullscreen: function () {
				requestFullscreen(video);
			},

			/**
			 * Focuses the video, so OK/Enter controls playback when the
			 * player isn't fullscreen. Returns false, and focuses nothing,
			 * when a message shows instead of the video.
			 */
			focus: function () {
				if (!video.parentNode) {
					return false;
				}
				video.focus();
				return true;
			},

			destroy: function () {
				video.onended = null;
				video.onerror = null;
				video.onwaiting = null;
				video.onplaying = null;
				stop();
			}
		};
	};

	// How often hls.js may try to recover from video errors per source.
	var maxRecoveries = 3;
	// `ended` this many seconds or more before the duration is a failure.
	var endedEarlySeconds = 10;
	// Waiting for data this long is reported as a stall.
	var stallReportMs = 10000;

	/**
	 * Whether the video says it ended while its position is still well
	 * before its duration. False when the duration isn't known.
	 *
	 * @param {HTMLVideoElement} video
	 * @returns {boolean}
	 */
	function endedEarly(video) {
		return isFinite(video.duration) && video.duration - video.currentTime >= endedEarlySeconds;
	}

	/**
	 * @param {number} value
	 * @returns {string}
	 */
	function seconds(value) {
		return isFinite(value) ? value.toFixed(1) + 's' : String(value);
	}

	/**
	 * @param {TimeRanges} ranges
	 * @returns {string}
	 */
	function describeRanges(ranges) {
		var parts = [];
		var i;
		for (i = 0; i < ranges.length; i += 1) {
			parts.push(ranges.start(i).toFixed(1) + '-' + ranges.end(i).toFixed(1));
		}
		return parts.join(' ') || 'nothing';
	}

	/**
	 * A quality level by index, with its height when known, such as "1 (480p)".
	 *
	 * @param {any} hls the hls.js instance, which has no types
	 * @param {number} index
	 * @returns {string}
	 */
	function describeLevel(hls, index) {
		var level = hls && hls.levels ? hls.levels[index] : null;
		return index + (level && level.height ? ' (' + level.height + 'p)' : '');
	}

	/**
	 * @param {any} Hls the hls.js constructor, which has no types
	 * @param {HTMLVideoElement} video
	 * @param {string} src
	 * @param {(levels: Level[]) => void} onReady called once the stream's
	 *   levels are known
	 * @param {(level: number) => void} onLevelSwitched called with the index
	 *   of each quality level hls.js switches to
	 * @returns {any} the hls.js instance
	 */
	function attachHls(Hls, video, src, onReady, onLevelSwitched) {
		var hls = new Hls({ enableWorker: false });

		hls.loadSource(src);
		hls.attachMedia(video);
		hls.on(Hls.Events.MANIFEST_PARSED, function () {
			onReady(hls.levels || []);
		});
		hls.on(
			Hls.Events.LEVEL_SWITCHED,
			/**
			 * @param {string} eventName
			 * @param {{level: number}} data
			 */
			function (eventName, data) {
				onLevelSwitched(data.level);
			}
		);
		hls.on(
			Hls.Events.ERROR,
			/**
			 * @param {string} eventName
			 * @param {HlsErrorData} data
			 */
			function (eventName, data) {
				if (data && data.fatal) {
					BS.logError('Fatal hls.js error, trying to recover.', data.type + ' ' + data.details);
					recover(hls, data);
				}
			}
		);
		return hls;
	}

	/**
	 * Tries to recover from a fatal hls.js error.
	 *
	 * @param {any} hls the hls.js instance, which has no types
	 * @param {HlsErrorData} data
	 */
	function recover(hls, data) {
		if (data.type === 'networkError') {
			hls.startLoad();
			return;
		}
		if (data.type === 'mediaError') {
			hls.recoverMediaError();
		}
	}

	/**
	 * The prefixed fullscreen APIs of older browsers, which TypeScript's DOM
	 * library doesn't include.
	 *
	 * @typedef {Object} PrefixedFullscreenElement
	 * @property {() => void=} webkitRequestFullscreen
	 * @property {() => void=} webkitRequestFullScreen
	 * @property {() => void=} mozRequestFullScreen
	 * @property {() => void=} msRequestFullscreen
	 *
	 * @typedef {Object} PrefixedFullscreenDocument
	 * @property {?Element=} webkitFullscreenElement
	 * @property {?Element=} webkitCurrentFullScreenElement
	 */

	/**
	 * @param {HTMLVideoElement} video
	 */
	function requestFullscreen(video) {
		var element = /** @type {HTMLVideoElement & PrefixedFullscreenElement} */ (video);
		var doc = /** @type {Document & PrefixedFullscreenDocument} */ (document);
		var request;
		if (
			(doc.fullscreenElement ||
				doc.webkitFullscreenElement ||
				doc.webkitCurrentFullScreenElement) === element
		) {
			return;
		}
		request =
			element.requestFullscreen ||
			element.webkitRequestFullscreen ||
			element.webkitRequestFullScreen ||
			element.mozRequestFullScreen ||
			element.msRequestFullscreen;
		if (request) {
			try {
				request.call(element);
			} catch (error) {
				BS.logError('Could not request fullscreen.', error);
			}
		}
	}

	/**
	 * @param {HTMLMediaElement} media
	 */
	function play(media) {
		try {
			media.play();
		} catch (error) {
			BS.logError('Could not start media playback.', error);
		}
	}
})(window, document);
