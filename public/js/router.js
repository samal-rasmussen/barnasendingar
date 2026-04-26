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
		BS.state.hasAppNavigation = true;
		if (window.location.hash === hash) {
			BS.router.render();
			return;
		}
		window.location.hash = hash;
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

	BS.router.goBackOrHome = function () {
		if (BS.state.hasAppNavigation && window.history && window.history.length > 1) {
			window.history.back();
			return;
		}
		BS.router.goHome();
	};

	/**
	 * @returns {Object}
	 */
	BS.router.parse = function () {
		var hash = window.location.hash || '#/';
		var path = hash.charAt(0) === '#' ? hash.substr(1) : hash;
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

		if (route.name === 'home') {
			cleanup = BS.views.home.render(root);
		} else if (route.name === 'show') {
			show = BS.data.getShow(route.showTitle);
			if (show) {
				cleanup = BS.views.show.render(root, show);
			} else {
				BS.router.renderNotFound(root);
			}
		} else if (route.name === 'episode') {
			show = BS.data.getShow(route.showTitle);
			episode = show ? BS.data.getEpisode(show, route.episodeTitle) : undefined;
			if (show && episode) {
				cleanup = BS.views.episode.render(root, show, episode);
			} else {
				BS.router.renderNotFound(root);
			}
		} else {
			BS.router.renderNotFound(root);
		}

		if (typeof cleanup === 'function') {
			BS.state.cleanupView = cleanup;
		}
	};

	/**
	 * @param {HTMLElement} root
	 */
	BS.router.renderNotFound = function (root) {
		var container;
		var heading;
		var message;
		var button;

		document.title = 'Ikki funnið - Barnasendingar';
		BS.util.clearElement(root);

		container = BS.util.el('div', 'not-found');
		heading = BS.util.el('h1', '', 'Ikki funnið');
		message = BS.util.el('p', '', 'Sendingin ella parturin finst ikki.');
		button = /** @type {HTMLButtonElement} */ (BS.util.el('button', '', 'Aftur til forsíðuna'));
		button.onclick = function () {
			BS.router.goHome();
		};

		container.appendChild(heading);
		container.appendChild(message);
		container.appendChild(button);
		root.appendChild(container);
	};
})(window, document);
