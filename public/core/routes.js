// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	/**
	 * The app's pages and their addresses, for BS.createRouter. The render
	 * functions look up the data a page needs, and show the not-found page
	 * when it doesn't exist. Each notes the page for error reports.
	 */
	BS.routes = [
		{
			name: 'home',
			path: '/',
			/** @param {HTMLElement} root */
			render: function (root) {
				BS.logEvent('Page: home');
				return BS.pages.home.render(root);
			}
		},
		{
			name: 'show',
			path: '/sending/:show',
			/**
			 * @param {HTMLElement} root
			 * @param {Object<string, string>} params
			 */
			render: function (root, params) {
				var show = BS.data.getShow(params.show);
				BS.logEvent('Page: show ' + params.show);
				if (!show) {
					return BS.pages.notFound.render(root);
				}
				return BS.pages.show.render(root, show);
			}
		},
		{
			name: 'episode',
			path: '/sending/:show/partur/:episode',
			/**
			 * @param {HTMLElement} root
			 * @param {Object<string, string>} params
			 */
			render: function (root, params) {
				var show = BS.data.getShow(params.show);
				var episode = show ? BS.data.getEpisode(show, params.episode) : undefined;
				BS.logEvent('Page: episode ' + params.show + ' / ' + params.episode);
				if (!show || !episode) {
					return BS.pages.notFound.render(root);
				}
				return BS.pages.episode.render(root, show, episode);
			}
		}
	];
})(window);
