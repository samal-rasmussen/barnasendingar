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
	 * @param {string} url
	 * @param {Function} callback
	 */
	BS.util.getJson = function (url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4) {
				return;
			}
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					callback(null, JSON.parse(xhr.responseText));
				} catch (error) {
					BS.util.logError('Could not parse JSON from ' + url, error);
					callback(error);
				}
				return;
			}
			callback(new Error('Could not load ' + url));
		};
		xhr.onerror = function () {
			callback(new Error('Could not load ' + url));
		};
		xhr.send();
	};

	/**
	 * @param {string} value
	 * @returns {string}
	 */
	BS.util.encodeSegment = function (value) {
		return encodeURIComponent(value);
	};

	/**
	 * @param {string} value
	 * @returns {string|null}
	 */
	BS.util.decodeSegment = function (value) {
		try {
			return decodeURIComponent(value);
		} catch (error) {
			BS.util.logError('Could not decode route segment: ' + value, error);
			return null;
		}
	};

	/**
	 * @param {HTMLVideoElement} video
	 */
	BS.util.requestFullscreen = function (video) {
		var element = /** @type {any} */ (video);
		var request =
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
