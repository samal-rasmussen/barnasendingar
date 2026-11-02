// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	/**
	 * @param {string} message
	 * @param {unknown} error
	 */
	BS.util.logError = function (message, error) {
		if (window.console && window.console.error) {
			window.console.error(message, error);
		}
	};

	/**
	 * @param {Element} element
	 */
	BS.util.clearElement = function (element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	};

	/**
	 * @param {string} tagName
	 * @param {string=} className
	 * @param {string=} text
	 * @returns {HTMLElement}
	 */
	BS.util.el = function (tagName, className, text) {
		var element = document.createElement(tagName);
		if (className) {
			element.className = className;
		}
		if (typeof text === 'string') {
			element.textContent = text;
		}
		return element;
	};

	/**
	 * @param {HTMLElement} root
	 * @param {string} message
	 */
	BS.util.renderStatus = function (root, message) {
		var messageElement = BS.util.el('div', 'status-message', message);
		BS.util.clearElement(root);
		root.appendChild(messageElement);
	};

	/**
	 * Loads and parses JSON. The callback is called exactly once, with an
	 * error if the request fails, returns a non-2xx status, cannot be parsed,
	 * or does not finish within timeoutMs.
	 *
	 * @param {string} url
	 * @param {(error: ?Error, result?: unknown) => void} callback
	 * @param {number=} timeoutMs
	 */
	BS.util.getJson = function (url, callback, timeoutMs) {
		BS.util.getText(
			url,
			/**
			 * @param {?Error} error
			 * @param {string=} text
			 */
			function (error, text) {
				var result;
				if (error) {
					callback(error);
					return;
				}
				try {
					// getText always passes the text when there is no error.
					result = JSON.parse(/** @type {string} */ (text));
				} catch (parseError) {
					BS.util.logError('Could not parse JSON from ' + url, parseError);
					// JSON.parse only throws SyntaxError.
					callback(/** @type {SyntaxError} */ (parseError));
					return;
				}
				callback(null, result);
			},
			timeoutMs
		);
	};

	/**
	 * Loads a text file. The callback is called exactly once, with an error
	 * if the request fails, returns a non-2xx status, or does not finish
	 * within timeoutMs.
	 *
	 * @param {string} url
	 * @param {(error: ?Error, text?: string) => void} callback
	 * @param {number=} timeoutMs
	 */
	BS.util.getText = function (url, callback, timeoutMs) {
		var xhr = new XMLHttpRequest();
		var finished = false;
		/** @type {?number} */
		var timer = null;

		/**
		 * @param {?Error} error
		 * @param {string=} result
		 */
		function finish(error, result) {
			if (finished) {
				return;
			}
			finished = true;
			if (timer !== null) {
				window.clearTimeout(timer);
				timer = null;
			}
			callback(error, result);
		}

		xhr.open('GET', url, true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4 || finished) {
				return;
			}
			if (xhr.status >= 200 && xhr.status < 300) {
				finish(null, xhr.responseText);
				return;
			}
			finish(new Error('Could not load ' + url));
		};
		xhr.onerror = function () {
			finish(new Error('Could not load ' + url));
		};

		if (timeoutMs && timeoutMs > 0) {
			timer = window.setTimeout(function () {
				timer = null;
				BS.util.logError('Timed out loading ' + url, null);
				finish(new Error('Timed out loading ' + url));
				try {
					xhr.abort();
				} catch (error) {
					BS.util.logError('Could not abort request for ' + url, error);
				}
			}, timeoutMs);
		}

		xhr.send();
	};

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
	BS.util.requestFullscreen = function (video) {
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
				BS.util.logError('Could not request fullscreen.', error);
				return;
			}
		}
	};

	/**
	 * @param {HTMLMediaElement} media
	 */
	BS.util.play = function (media) {
		try {
			media.play();
		} catch (error) {
			BS.util.logError('Could not start media playback.', error);
			return;
		}
	};
})(window, document);
