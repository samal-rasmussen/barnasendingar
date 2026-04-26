// @ts-check
(function (window) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	var storageKey = 'watched';

	/**
	 * @typedef {import('../../scripts/shared-types').Show} Show
	 * @typedef {import('../../scripts/shared-types').Episode} Episode
	 */

	/**
	 * @returns {Object}
	 */
	BS.watched.getAll = function () {
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
			BS.util.logError('Could not read watched state.', error);
			return {};
		}
	};

	/**
	 * @param {Object} watched
	 */
	BS.watched.saveAll = function (watched) {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(watched));
		} catch (error) {
			BS.util.logError('Could not save watched state.', error);
			return;
		}
	};

	/**
	 * @param {Show} show
	 * @param {Episode} episode
	 */
	BS.watched.setWatched = function (show, episode) {
		var watched = BS.watched.getAll();
		if (watched[show.title] == null) {
			watched[show.title] = {};
		}
		watched[show.title][episode.sortKey] = true;
		BS.watched.saveAll(watched);
	};

	/**
	 * @param {Show} show
	 * @param {Episode} episode
	 * @returns {boolean}
	 */
	BS.watched.isWatched = function (show, episode) {
		var watched = BS.watched.getAll();
		return watched[show.title] != null && watched[show.title][episode.sortKey] === true;
	};

	/**
	 * @param {Show} show
	 * @returns {Object}
	 */
	BS.watched.clearWatched = function (show) {
		var watched = BS.watched.getAll();
		delete watched[show.title];
		BS.watched.saveAll(watched);
		return watched;
	};
})(window);
