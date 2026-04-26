// @ts-check
(function (window) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	/**
	 * @typedef {import('../../scripts/shared-types').Show} Show
	 * @typedef {import('../../scripts/shared-types').Episode} Episode
	 */

	/**
	 * @param {Function} callback
	 */
	BS.data.loadShows = function (callback) {
		BS.util.getJson('/assets/shows.json', callback);
	};

	/**
	 * @param {Show[]} shows
	 */
	BS.data.buildIndexes = function (shows) {
		var showByTitle = {};
		var episodeByShowTitleAndTitle = {};
		var i;
		var j;
		var show;
		var episode;
		var episodeByTitle;

		for (i = 0; i < shows.length; i += 1) {
			show = shows[i];
			showByTitle[show.title] = show;
			episodeByTitle = {};
			episodeByShowTitleAndTitle[show.title] = episodeByTitle;
			for (j = 0; j < show.episodes.length; j += 1) {
				episode = show.episodes[j];
				if (episodeByTitle[episode.title] == null) {
					episodeByTitle[episode.title] = episode;
				}
			}
		}

		BS.state.showByTitle = showByTitle;
		BS.state.episodeByShowTitleAndTitle = episodeByShowTitleAndTitle;
	};

	/**
	 * @param {string} title
	 * @returns {Show|undefined}
	 */
	BS.data.getShow = function (title) {
		return BS.state.showByTitle ? BS.state.showByTitle[title] : undefined;
	};

	/**
	 * @param {Show} show
	 * @param {string} title
	 * @returns {Episode|undefined}
	 */
	BS.data.getEpisode = function (show, title) {
		var i;
		for (i = 0; i < show.episodes.length; i += 1) {
			if (show.episodes[i].title === title) {
				return show.episodes[i];
			}
		}
		return undefined;
	};

	/**
	 * @param {Show} show
	 * @param {Episode} episode
	 * @returns {number}
	 */
	BS.data.getEpisodeIndex = function (show, episode) {
		var i;
		for (i = 0; i < show.episodes.length; i += 1) {
			if (show.episodes[i] === episode || show.episodes[i].sortKey === episode.sortKey) {
				return i;
			}
		}
		return -1;
	};
})(window);
