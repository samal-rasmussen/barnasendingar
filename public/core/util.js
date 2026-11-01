// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	/**
	 * @param {string} message
	 * @param {*} error
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
	 * @param {HTMLElement} element
	 * @param {Function} callback
	 */
	BS.util.onActivate = function (element, callback) {
		element.setAttribute('role', 'button');
		element.tabIndex = 0;
		element.onclick = function () {
			callback();
		};
		element.onkeydown = function (event) {
			var code = event.keyCode || event.which;
			if (code === 13 || code === 32) {
				if (event.preventDefault) {
					event.preventDefault();
				}
				callback();
			}
		};
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
	 * Adds empty spacer tiles to the end of a grid, so the tiles on the last
	 * row line up with the rows above instead of being centred.
	 *
	 * @param {HTMLElement} grid
	 */
	BS.util.addGridSpacers = function (grid) {
		var i;
		for (i = 0; i < 12; i += 1) {
			grid.appendChild(BS.util.el('div', 'grid-spacer'));
		}
	};

	/**
	 * Loads and parses JSON. The callback is called exactly once, with an
	 * error if the request fails, returns a non-2xx status, cannot be parsed,
	 * or does not finish within timeoutMs.
	 *
	 * @param {string} url
	 * @param {Function} callback
	 * @param {number=} timeoutMs
	 */
	BS.util.getJson = function (url, callback, timeoutMs) {
		BS.util.getText(
			url,
			function (error, text) {
				var result;
				if (error) {
					callback(error);
					return;
				}
				try {
					result = JSON.parse(text);
				} catch (parseError) {
					BS.util.logError('Could not parse JSON from ' + url, parseError);
					callback(parseError);
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
	 * @param {Function} callback
	 * @param {number=} timeoutMs
	 */
	BS.util.getText = function (url, callback, timeoutMs) {
		var xhr = new XMLHttpRequest();
		var finished = false;
		var timer = null;

		/**
		 * @param {*} error
		 * @param {*=} result
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
	 * @param {HTMLVideoElement} video
	 */
	BS.util.requestFullscreen = function (video) {
		var element = /** @type {any} */ (video);
		var doc = /** @type {any} */ (document);
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
