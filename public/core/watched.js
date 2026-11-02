// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;
	var storageKey = 'watched';

	BS.watched = {};

	/**
	 * @typedef {import('../../scripts/shared-types').Show} Show
	 * @typedef {import('../../scripts/shared-types').Episode} Episode
	 * @typedef {Object<string, Object<string, boolean>>} WatchedState
	 *   Show title to episode sortKey to true.
	 */

	/**
	 * @returns {WatchedState}
	 */
	function getAll() {
		var watchedString;
		var watched;
		try {
			watchedString = window.localStorage.getItem(storageKey);
			if (watchedString == null) {
				return {};
			}
			watched = JSON.parse(watchedString);
			if (watched == null || typeof watched !== 'object') {
				return {};
			}
			return watched;
		} catch (error) {
			BS.logError('Could not read watched state.', error);
			return {};
		}
	}

	/**
	 * @param {WatchedState} watched
	 */
	function saveAll(watched) {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(watched));
		} catch (error) {
			BS.logError('Could not save watched state.', error);
		}
	}

	/**
	 * @param {Show} show
	 * @param {Episode} episode
	 */
	BS.watched.setWatched = function (show, episode) {
		var watched = getAll();
		if (watched[show.title] == null) {
			watched[show.title] = {};
		}
		watched[show.title][episode.sortKey] = true;
		saveAll(watched);
	};

	/**
	 * @param {Show} show
	 * @param {Episode} episode
	 * @returns {boolean}
	 */
	BS.watched.isWatched = function (show, episode) {
		var watched = getAll();
		return watched[show.title] != null && watched[show.title][episode.sortKey] === true;
	};

	/**
	 * @param {Show} show
	 */
	BS.watched.clearWatched = function (show) {
		var watched = getAll();
		delete watched[show.title];
		saveAll(watched);
	};
})(window);
