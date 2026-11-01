// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	/**
	 * @returns {string}
	 */
	BS.router.homeHash = function () {
		return '#/';
	};

	/**
	 * @param {string} showTitle
	 * @returns {string}
	 */
	BS.router.showHash = function (showTitle) {
		return '#/sending/' + BS.util.encodeSegment(showTitle);
	};

	/**
	 * @param {string} showTitle
	 * @param {string} episodeTitle
	 * @returns {string}
	 */
	BS.router.episodeHash = function (showTitle, episodeTitle) {
		return (
			'#/sending/' +
			BS.util.encodeSegment(showTitle) +
			'/partur/' +
			BS.util.encodeSegment(episodeTitle)
		);
	};

	/**
	 * @param {string} hash
	 */
	BS.router.navigate = function (hash) {
		if (window.location.hash === hash) {
			BS.router.render();
			return;
		}
		window.location.hash = hash;
	};

	/**
	 * @param {string} hash
	 */
	BS.router.replace = function (hash) {
		BS.state.replacingRoute = true;
		if (window.history && window.history.replaceState) {
			window.history.replaceState(null, document.title, hash);
			BS.router.render();
			return;
		}
		window.location.replace(hash);
	};

	BS.router.goHome = function () {
		BS.router.navigate(BS.router.homeHash());
	};

	/**
	 * @param {string} showTitle
	 */
	BS.router.goToShow = function (showTitle) {
		BS.router.navigate(BS.router.showHash(showTitle));
	};

	/**
	 * @param {string} showTitle
	 * @param {string} episodeTitle
	 */
	BS.router.goToEpisode = function (showTitle, episodeTitle) {
		BS.router.navigate(BS.router.episodeHash(showTitle, episodeTitle));
	};

	/**
	 * @param {string} showTitle
	 * @param {string} episodeTitle
	 */
	BS.router.replaceWithEpisode = function (showTitle, episodeTitle) {
		BS.router.replace(BS.router.episodeHash(showTitle, episodeTitle));
	};

	/**
	 * Updates the address to another episode without re-rendering the view.
	 * Returns false when the browser cannot do that.
	 *
	 * @param {string} showTitle
	 * @param {string} episodeTitle
	 * @returns {boolean}
	 */
	BS.router.replaceEpisodeHashOnly = function (showTitle, episodeTitle) {
		if (!window.history || !window.history.replaceState) {
			return false;
		}
		window.history.replaceState(
			null,
			document.title,
			BS.router.episodeHash(showTitle, episodeTitle)
		);
		BS.state.currentRoute = BS.router.parse();
		return true;
	};

	/**
	 * For back buttons. Goes back in history if the page before this one is
	 * the target, and otherwise replaces this page with the target. Back
	 * buttons never add history entries, so a later "back" can't return to
	 * a page the user already left, and they never leave the app.
	 *
	 * @param {string} hash
	 */
	BS.router.goBack = function (hash) {
		if (
			BS.router.sameRoute(BS.state.previousRoute, BS.router.parseHash(hash)) &&
			window.history &&
			window.history.length > 1
		) {
			window.history.back();
			return;
		}
		BS.router.replace(hash);
	};

	BS.router.goBackHome = function () {
		BS.router.goBack(BS.router.homeHash());
	};

	/**
	 * @param {string} showTitle
	 */
	BS.router.goBackToShow = function (showTitle) {
		BS.router.goBack(BS.router.showHash(showTitle));
	};

	/**
	 * @param {*} a
	 * @param {*} b
	 * @returns {boolean}
	 */
	BS.router.sameRoute = function (a, b) {
		return !!(
			a &&
			b &&
			a.name === b.name &&
			a.showTitle === b.showTitle &&
			a.episodeTitle === b.episodeTitle
		);
	};

	/**
	 * @returns {Object}
	 */
	BS.router.parse = function () {
		return BS.router.parseHash(window.location.hash);
	};

	/**
	 * @param {string} hash
	 * @returns {Object}
	 */
	BS.router.parseHash = function (hash) {
		var path = !hash ? '/' : hash.charAt(0) === '#' ? hash.substr(1) : hash;
		var parts;
		var showTitle;
		var episodeTitle;

		if (path === '' || path === '/') {
			return { name: 'home' };
		}

		parts = path.split('/');
		if (parts.length === 3 && parts[0] === '' && parts[1] === 'sending') {
			showTitle = BS.util.decodeSegment(parts[2]);
			if (showTitle != null) {
				return { name: 'show', showTitle: showTitle };
			}
		}

		if (parts.length === 5 && parts[0] === '' && parts[1] === 'sending' && parts[3] === 'partur') {
			showTitle = BS.util.decodeSegment(parts[2]);
			episodeTitle = BS.util.decodeSegment(parts[4]);
			if (showTitle != null && episodeTitle != null) {
				return {
					name: 'episode',
					showTitle: showTitle,
					episodeTitle: episodeTitle
				};
			}
		}

		return { name: 'not-found' };
	};

	BS.router.start = function () {
		window.onhashchange = function () {
			BS.router.render();
		};

		if (!window.location.hash) {
			window.location.hash = BS.router.homeHash();
			return;
		}
		BS.router.render();
	};

	BS.router.refresh = function () {
		BS.router.render();
	};

	/**
	 * Remembers the current and previous route for goBack. Re-rendering the
	 * same route (a refresh) and replacing the current page leave the
	 * previous route as it is, since neither adds a history entry.
	 *
	 * @param {*} route
	 */
	BS.router.trackRoute = function (route) {
		if (!BS.router.sameRoute(route, BS.state.currentRoute)) {
			if (!BS.state.replacingRoute) {
				BS.state.previousRoute = BS.state.currentRoute || null;
			}
			BS.state.currentRoute = route;
		}
		BS.state.replacingRoute = false;
	};

	BS.router.cleanup = function () {
		if (typeof BS.state.cleanupView === 'function') {
			BS.state.cleanupView();
			BS.state.cleanupView = null;
		}
	};

	BS.router.render = function () {
		var root = BS.state.appElement;
		var route;
		var show;
		var episode;
		var cleanup;

		if (!root) {
			return;
		}

		BS.router.cleanup();
		route = BS.router.parse();
		BS.router.trackRoute(route);

		if (route.name === 'home') {
			cleanup = BS.pages.home.render(root);
		} else if (route.name === 'show') {
			show = BS.data.getShow(route.showTitle);
			if (show) {
				cleanup = BS.pages.show.render(root, show);
			} else {
				BS.pages.notFound.render(root);
			}
		} else if (route.name === 'episode') {
			show = BS.data.getShow(route.showTitle);
			episode = show ? BS.data.getEpisode(show, route.episodeTitle) : undefined;
			if (show && episode) {
				cleanup = BS.pages.episode.render(root, show, episode);
			} else {
				BS.pages.notFound.render(root);
			}
		} else {
			BS.pages.notFound.render(root);
		}

		if (typeof cleanup === 'function') {
			BS.state.cleanupView = cleanup;
		}
	};
})(window, document);
