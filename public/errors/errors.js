// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS || {};
	/** @type {any} */ (window).BS = BS;

	/**
	 * Error reporting, for finding out what goes wrong on the TV.
	 *
	 * - On barnasendingar.vercel.app and its preview deployments, errors are
	 *   sent to PostHog's error tracking. Nowhere else, so local development
	 *   and tests send nothing.
	 * - With ?debug in the address (before the #), they are also listed in an
	 *   overlay at the bottom of the screen, whose markup and styles are in
	 *   index.html.
	 *
	 * Errors come from window.onerror (uncaught errors) and from BS.logError,
	 * which calls BS.errors.report. This file loads first and uses only the
	 * DOM, so it also catches errors in the scripts after it. It must never
	 * throw itself.
	 */
	BS.errors = {};

	var posthogUrl = 'https://eu.i.posthog.com/i/v0/e/';
	// A PostHog project API key can only send events, so it is public.
	var posthogToken = 'phc_yWiuG9obwEZR2F6aUNuUoTVZHFchuNu47Ep2HgjocvcR';
	// localStorage key for a random id that tells installs apart.
	var idKey = 'errorReporterId';
	// At most this many reports are sent per page load, and each different
	// message only once, so an error that repeats can't flood PostHog.
	var maxReports = 10;
	var maxOverlayLines = 20;

	var reporting = /\.vercel\.app$/.test(window.location.hostname);
	var debug = /[?&]debug(=|&|$)/.test(window.location.search);
	/** @type {Object<string, boolean>} */
	var reported = {};
	var reportCount = 0;
	/** @type {?string} */
	var distinctId = null;

	/**
	 * @typedef {Object} Frame A stack frame in PostHog's format.
	 * @property {string} platform
	 * @property {string} lang
	 * @property {string} function
	 * @property {string=} filename
	 * @property {number=} lineno
	 * @property {number=} colno
	 * @property {boolean=} in_app
	 *
	 * @typedef {Object} ErrorLike The parts of a thrown value that are used.
	 * @property {string=} name
	 * @property {string=} message
	 * @property {string=} stack
	 */

	/**
	 * Reports an error: sends it to PostHog where reporting is on, and lists
	 * it in the overlay with ?debug. Never throws.
	 *
	 * @param {string} message what the app was doing
	 * @param {unknown} error what was thrown or failed, if anything
	 * @param {boolean=} uncaught true for errors no code caught
	 */
	BS.errors.report = function (message, error, uncaught) {
		var details = describe(error);
		var value = details ? message + ' ' + details : message;
		try {
			if (debug) {
				showInOverlay(value);
			}
			if (reporting && !reported[value] && reportCount < maxReports) {
				reported[value] = true;
				reportCount += 1;
				send(value, /** @type {ErrorLike} */ (error), !uncaught);
			}
		} catch (_reportError) {
			// Nothing sensible is left to do; reporting must not break the app.
		}
	};

	/**
	 * @param {Event|string} message
	 * @param {string=} source
	 * @param {number=} line
	 * @param {number=} column
	 * @param {Error=} error
	 */
	window.onerror = function (message, source, line, column, error) {
		var where = source ? ' at ' + source + ':' + line + ':' + column : '';
		// The browser's message repeats the error's own, so it is only used
		// when there is no error object (such as for some script errors).
		BS.errors.report(
			error ? 'Uncaught' + where + ':' : 'Uncaught' + where + ': ' + String(message),
			error,
			true
		);
		return false;
	};

	/**
	 * A short description of a thrown value, or '' for none.
	 *
	 * @param {unknown} error
	 * @returns {string}
	 */
	function describe(error) {
		var errorLike = /** @type {ErrorLike} */ (error);
		if (error == null) {
			return '';
		}
		if (typeof error === 'object' && typeof errorLike.message === 'string') {
			return (errorLike.name ? errorLike.name + ': ' : '') + errorLike.message;
		}
		try {
			return typeof error === 'object' ? JSON.stringify(error) : String(error);
		} catch (_stringifyError) {
			return String(error);
		}
	}

	/**
	 * @param {string} value
	 * @param {ErrorLike} error
	 * @param {boolean} handled
	 */
	function send(value, error, handled) {
		var xhr = new XMLHttpRequest();
		var exception = {
			type: error && typeof error.name === 'string' ? error.name : 'Error',
			value: value,
			mechanism: { handled: handled, synthetic: false },
			stacktrace: {
				type: 'raw',
				frames: parseStack(error && typeof error.stack === 'string' ? error.stack : '')
			}
		};

		xhr.open('POST', posthogUrl, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(
			JSON.stringify({
				token: posthogToken,
				event: '$exception',
				properties: {
					distinct_id: getDistinctId(),
					$process_person_profile: false,
					$exception_list: [exception],
					$current_url: window.location.href,
					$raw_user_agent: window.navigator.userAgent,
					$screen_width: window.screen.width,
					$screen_height: window.screen.height
				}
			})
		);
	}

	/**
	 * Turns a V8 stack trace ("    at name (url:1:2)" lines) into PostHog's
	 * frames, oldest call first. Lines in another format are skipped.
	 *
	 * @param {string} stack
	 * @returns {Frame[]}
	 */
	function parseStack(stack) {
		var lines = stack.split('\n');
		/** @type {Frame[]} */
		var frames = [];
		var match;
		var i;
		for (i = lines.length - 1; i >= 0; i -= 1) {
			match = /^\s*at (?:(.*?) \()?(.*?):(\d+):(\d+)\)?\s*$/.exec(lines[i]);
			if (match) {
				frames.push({
					platform: 'custom',
					lang: 'javascript',
					function: match[1] || '?',
					filename: match[2],
					lineno: Number(match[3]),
					colno: Number(match[4]),
					in_app: match[2].indexOf('/vendor/') === -1
				});
			}
		}
		return frames;
	}

	/**
	 * A random id for this install, kept in localStorage, or one for this
	 * page load when storage doesn't work.
	 *
	 * @returns {string}
	 */
	function getDistinctId() {
		if (distinctId) {
			return distinctId;
		}
		try {
			distinctId = window.localStorage.getItem(idKey);
		} catch (_error) {
			distinctId = null;
		}
		if (!distinctId) {
			distinctId = 'tv-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
			try {
				window.localStorage.setItem(idKey, distinctId);
			} catch (_error) {
				// Keep the id for this page load only.
			}
		}
		return distinctId;
	}

	/**
	 * @param {string} text
	 */
	function showInOverlay(text) {
		var overlay = document.getElementById('errors-overlay');
		var list = document.getElementById('errors-list');
		var item;
		if (!overlay || !list) {
			return;
		}
		item = document.createElement('li');
		item.textContent = new Date().toTimeString().slice(0, 8) + ' ' + text;
		// Newest first, so the overflow that is cut off is the oldest.
		list.insertBefore(item, list.firstChild);
		while (list.children.length > maxOverlayLines) {
			list.removeChild(list.children[maxOverlayLines]);
		}
		overlay.hidden = false;
	}

	/**
	 * With ?debug, shows the overlay with the facts that matter on the TV.
	 * The overlay's markup comes before the scripts in index.html.
	 */
	function showDebugInfo() {
		var info = document.getElementById('errors-info');
		var overlay = document.getElementById('errors-overlay');
		if (!info || !overlay) {
			return;
		}
		info.textContent =
			window.navigator.userAgent +
			' | ' +
			window.screen.width +
			'x' +
			window.screen.height +
			' | sending to PostHog: ' +
			(reporting ? 'yes' : 'no');
		overlay.hidden = false;
	}

	if (debug) {
		showDebugInfo();
	}
})(window, document);
