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
	 * @typedef {{fatal?: boolean, type?: string}} HlsErrorData
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

		video.onended = function () {
			options.onEnded();
		};

		function stop() {
			if (hls && hls.destroy) {
				hls.destroy();
			}
			hls = null;
			video.onloadedmetadata = null;
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
			if (!video.parentNode) {
				element.insertBefore(video, message);
			}
			message.hidden = true;
			video.poster = source.poster || '';
			options.onLevels([]);

			if (Hls && Hls.isSupported && Hls.isSupported()) {
				hls = attachHls(Hls, video, source.src, function (levels) {
					options.onLevels(levels);
					start();
				});
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
				stop();
			}
		};
	};

	/**
	 * @param {any} Hls the hls.js constructor, which has no types
	 * @param {HTMLVideoElement} video
	 * @param {string} src
	 * @param {(levels: Level[]) => void} onReady called once the stream's
	 *   levels are known
	 * @returns {any} the hls.js instance
	 */
	function attachHls(Hls, video, src, onReady) {
		var hls = new Hls({ enableWorker: false });

		hls.loadSource(src);
		hls.attachMedia(video);
		hls.on(Hls.Events.MANIFEST_PARSED, function () {
			onReady(hls.levels || []);
		});
		hls.on(
			Hls.Events.ERROR,
			/**
			 * @param {string} eventName
			 * @param {HlsErrorData} data
			 */
			function (eventName, data) {
				if (data && data.fatal) {
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
