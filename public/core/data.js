// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	/**
	 * @typedef {import('../../scripts/shared-types').Show} Show
	 * @typedef {import('../../scripts/shared-types').Episode} Episode
	 */

	/** @type {Show[]} */
	var shows = [];
	/** @type {Object<string, Show>} */
	var showByTitle = {};

	BS.data = {};

	BS.data.loadShowsTimeoutMs = 20000;

	/**
	 * Loads the show catalogue. Until it has loaded, there are no shows. The
	 * callback is called exactly once, with an error if loading fails.
	 *
	 * @param {(error: ?Error) => void} callback
	 */
	BS.data.load = function (callback) {
		BS.http.getJson(
			'/assets/shows.json',
			/**
			 * @param {?Error} error
			 * @param {unknown=} result
			 */
			function (error, result) {
				var i;
				if (error) {
					callback(error);
					return;
				}
				shows = /** @type {Show[]} */ (result);
				showByTitle = {};
				for (i = 0; i < shows.length; i += 1) {
					showByTitle[shows[i].title] = shows[i];
				}
				callback(null);
			},
			BS.data.loadShowsTimeoutMs
		);
	};

	/**
	 * @returns {Show[]} every show, in catalogue order
	 */
	BS.data.getShows = function () {
		return shows;
	};

	/**
	 * @param {string} title
	 * @returns {Show|undefined}
	 */
	BS.data.getShow = function (title) {
		return Object.prototype.hasOwnProperty.call(showByTitle, title)
			? showByTitle[title]
			: undefined;
	};

	/**
	 * The first episode in the show with the given title.
	 *
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
	 * The episode after the given one in the show, matched by identity or
	 * sortKey.
	 *
	 * @param {Show} show
	 * @param {Episode} episode
	 * @returns {Episode|undefined} undefined after the last episode
	 */
	BS.data.getNextEpisode = function (show, episode) {
		var i;
		for (i = 0; i < show.episodes.length; i += 1) {
			if (show.episodes[i] === episode || show.episodes[i].sortKey === episode.sortKey) {
				return show.episodes[i + 1];
			}
		}
		return undefined;
	};

	/**
	 * The address of an episode's HLS master playlist on KVF's video server.
	 *
	 * @param {string} mediaId
	 * @returns {string}
	 */
	BS.data.playlistUrl = function (mediaId) {
		return (
			'https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/' +
			mediaId +
			'.smil?type=m3u8'
		);
	};
})(window);
