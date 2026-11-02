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
	// The app stays loaded for hours, so the limits are over time, not per
	// page load. They stop an error that repeats from flooding PostHog: at
	// most `max` reports in any `ms`. The longest window must come last.
	var minute = 60 * 1000;
	var limits = [
		{ ms: minute, max: 5 },
		{ ms: 10 * minute, max: 40 },
		{ ms: 4 * 60 * minute, max: 200 },
		{ ms: 24 * 60 * minute, max: 400 }
	];
	var maxOverlayLines = 20;
	var maxBreadcrumbs = 20;

	var reporting = /\.vercel\.app$/.test(window.location.hostname);
	var debug = /[?&]debug(=|&|$)/.test(window.location.search);
	// When the reports in the longest window were sent, oldest first.
	/** @type {number[]} */
	var sentTimes = [];
	// Reports held back by the limits since the last one sent.
	var suppressed = 0;
	/** @type {?string} */
	var distinctId = null;
	// The latest notes from BS.logEvent and earlier errors, oldest first,
	// sent with every report.
	/** @type {string[]} */
	var breadcrumbs = [];
	// Properties sent with every report, from BS.setErrorContext and about
	// the browser's video support.
	/** @type {Object<string, string>} */
	var context = mediaSupport();

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
			if (reporting) {
				sendLimited(value, /** @type {ErrorLike} */ (error), !uncaught);
			}
			// Later reports show this one, even if the limits held it back.
			BS.errors.note('Error: ' + value);
		} catch (_reportError) {
			// Nothing sensible is left to do; reporting must not break the app.
		}
	};

	/**
	 * Adds a breadcrumb, which later reports carry. Never throws.
	 *
	 * @param {string} text
	 */
	BS.errors.note = function (text) {
		try {
			breadcrumbs.push(new Date().toTimeString().slice(0, 8) + ' ' + text);
			if (breadcrumbs.length > maxBreadcrumbs) {
				breadcrumbs.shift();
			}
		} catch (_noteError) {
			// Breadcrumbs are extra; never let them break the app.
		}
	};

	/**
	 * Sets a property that every later report carries.
	 *
	 * @param {string} name
	 * @param {string} value
	 */
	BS.errors.setContext = function (name, value) {
		context[name] = value;
	};

	/**
	 * Promises that fail with nothing to handle the failure. The LG's
	 * browser predates this event, so there it never fires.
	 *
	 * @param {PromiseRejectionEvent} event
	 */
	window.onunhandledrejection = function (event) {
		BS.errors.report('Unhandled promise rejection:', event.reason, true);
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
	 * Sends a report unless the limits hold it back.
	 *
	 * @param {string} value
	 * @param {ErrorLike} error
	 * @param {boolean} handled
	 */
	function sendLimited(value, error, handled) {
		var now = Date.now();
		var i;
		while (sentTimes.length && now - sentTimes[0] >= limits[limits.length - 1].ms) {
			sentTimes.shift();
		}
		for (i = 0; i < limits.length; i += 1) {
			if (countSince(now - limits[i].ms) >= limits[i].max) {
				suppressed += 1;
				return;
			}
		}
		sentTimes.push(now);
		send(value, error, handled, suppressed);
		suppressed = 0;
	}

	/**
	 * How many reports were sent after the given time.
	 *
	 * @param {number} time
	 * @returns {number}
	 */
	function countSince(time) {
		var count = 0;
		var i;
		for (i = sentTimes.length - 1; i >= 0 && sentTimes[i] > time; i -= 1) {
			count += 1;
		}
		return count;
	}

	/**
	 * What the browser offers for video: its own HLS support (as
	 * canPlayType answers, '' for none) and Media Source Extensions, which
	 * hls.js needs.
	 *
	 * @returns {Object<string, string>}
	 */
	function mediaSupport() {
		try {
			return {
				native_hls: document.createElement('video').canPlayType('application/vnd.apple.mpegURL'),
				mse: typeof window.MediaSource === 'function' ? 'yes' : 'no'
			};
		} catch (_error) {
			return {};
		}
	}

	/**
	 * @param {string} value
	 * @param {ErrorLike} error
	 * @param {boolean} handled
	 * @param {number} suppressedBefore reports held back since the last sent
	 */
	function send(value, error, handled, suppressedBefore) {
		var xhr = new XMLHttpRequest();
		/** @type {Object<string, unknown>} */
		var properties = {
			distinct_id: getDistinctId(),
			$process_person_profile: false,
			$current_url: window.location.href,
			$raw_user_agent: window.navigator.userAgent,
			$screen_width: window.screen.width,
			$screen_height: window.screen.height,
			suppressed_before: suppressedBefore,
			breadcrumbs: breadcrumbs.slice()
		};
		var name;
		var exception = {
			type: error && typeof error.name === 'string' ? error.name : 'Error',
			value: value,
			mechanism: { handled: handled, synthetic: false },
			stacktrace: {
				type: 'raw',
				frames: parseStack(error && typeof error.stack === 'string' ? error.stack : '')
			}
		};

		properties.$exception_list = [exception];
		for (name in context) {
			if (Object.prototype.hasOwnProperty.call(context, name)) {
				properties[name] = context[name];
			}
		}

		xhr.open('POST', posthogUrl, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(JSON.stringify({ token: posthogToken, event: '$exception', properties: properties }));
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
			' | native HLS: ' +
			(context.native_hls || 'no') +
			' | MSE: ' +
			(context.mse || '?') +
			' | sending to PostHog: ' +
			(reporting ? 'yes' : 'no');
		overlay.hidden = false;
	}

	if (debug) {
		showDebugInfo();
	}
})(window, document);
