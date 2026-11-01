// @ts-check
(function (window) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	/**
	 * @typedef {Object<string, string>} Params
	 *
	 * @typedef {Object} RouteDefinition
	 * @property {string} name
	 * @property {string} path Pattern such as '/items/:id'. `:name` segments become params.
	 * @property {function(HTMLElement, Params): (Function|void)} render
	 *   Renders the page into the root element. May return a cleanup function,
	 *   which is called before the next page renders.
	 *
	 * @typedef {Object} RouterOptions
	 * @property {HTMLElement} root
	 * @property {RouteDefinition[]} routes
	 * @property {function(HTMLElement, string): (Function|void)} notFound
	 *   Renders any address that matches no route. Gets the unmatched path.
	 *
	 * @typedef {Object} GoOptions
	 * @property {boolean=} replace Replace the current history entry instead of adding one.
	 * @property {boolean=} render
	 *   With replace, false only changes the address and leaves the page as it
	 *   is. For pages that update themselves in place.
	 */

	/**
	 * Creates a minimal hash router. Addresses look like `#/items/42`. Params
	 * are encoded and decoded by the router, so any text can be a param.
	 *
	 * @param {RouterOptions} options
	 */
	BS.createRouter = function (options) {
		var routes = [];
		var routesByName = {};
		/** @type {?{name: ?string, params: Params, key: string}} */
		var current = null;
		// Mirror of the browser history this router has seen: the page key at
		// each history position. Each entry stores its position in
		// history.state, so back and forward with the browser stay in sync.
		/** @type {string[]} */
		var keysByPosition = [];
		var position = -1;
		var started = false;
		/** @type {?Function} */
		var cleanup = null;
		var i;

		for (i = 0; i < options.routes.length; i += 1) {
			addRoute(options.routes[i]);
		}

		/**
		 * @param {RouteDefinition} definition
		 */
		function addRoute(definition) {
			var route = {
				name: definition.name,
				segments: definition.path.split('/'),
				render: definition.render
			};
			routes.push(route);
			routesByName[route.name] = route;
		}

		/**
		 * @param {string} name
		 * @param {Params=} params
		 * @returns {string} the path, without the leading '#'
		 */
		function buildPath(name, params) {
			var route = routesByName[name];
			var parts = [];
			var segment;
			var value;
			var j;

			if (!route) {
				throw new Error('Unknown route: ' + name);
			}
			for (j = 0; j < route.segments.length; j += 1) {
				segment = route.segments[j];
				if (segment.charAt(0) === ':') {
					value = params ? params[segment.substr(1)] : undefined;
					if (value == null) {
						throw new Error('Route ' + name + ' needs param ' + segment.substr(1));
					}
					parts.push(encodeURIComponent(value));
				} else {
					parts.push(segment);
				}
			}
			return parts.join('/');
		}

		/**
		 * @param {string} path
		 * @returns {{name: ?string, params: Params, key: string}}
		 */
		function match(path) {
			var segments = path.split('/');
			var params;
			var route;
			var j;
			var k;

			for (j = 0; j < routes.length; j += 1) {
				route = routes[j];
				if (route.segments.length !== segments.length) {
					continue;
				}
				params = {};
				for (k = 0; k < segments.length; k += 1) {
					if (route.segments[k].charAt(0) === ':') {
						try {
							params[route.segments[k].substr(1)] = decodeURIComponent(segments[k]);
						} catch (_malformed) {
							break;
						}
					} else if (route.segments[k] !== segments[k]) {
						break;
					}
				}
				if (k === segments.length) {
					// The key is the re-encoded path, so differently encoded
					// addresses for the same page compare equal.
					return { name: route.name, params: params, key: buildPath(route.name, params) };
				}
			}
			return { name: null, params: {}, key: path };
		}

		/**
		 * @returns {string}
		 */
		function currentPath() {
			var hash = window.location.hash;
			var path = hash.charAt(0) === '#' ? hash.substr(1) : hash;
			return path === '' ? '/' : path;
		}

		/**
		 * @returns {?number} the router position stored in the current history entry
		 */
		function storedPosition() {
			var state = window.history.state;
			return state && typeof state.routerPosition === 'number' ? state.routerPosition : null;
		}

		/**
		 * Records which page is at the current history position. An entry
		 * without a stored position is new (a link, go() or a typed address),
		 * so it gets the next position and drops any forward entries.
		 *
		 * @param {{name: ?string, params: Params, key: string}} location
		 */
		function track(location) {
			var stored = storedPosition();
			if (stored === null) {
				stored = position + 1;
				keysByPosition.length = stored;
				window.history.replaceState({ routerPosition: stored }, '');
			}
			position = stored;
			keysByPosition[position] = location.key;
			current = location;
		}

		function render() {
			var path = currentPath();
			var location = match(path);
			var result;

			if (cleanup) {
				cleanup();
				cleanup = null;
			}
			track(location);

			if (location.name === null) {
				result = options.notFound(options.root, path);
			} else {
				result = routesByName[location.name].render(options.root, location.params);
			}
			if (typeof result === 'function') {
				cleanup = result;
			}
		}

		/**
		 * @param {Params} params
		 * @returns {Params}
		 */
		function copy(params) {
			/** @type {Params} */
			var result = {};
			var key;
			for (key in params) {
				if (Object.prototype.hasOwnProperty.call(params, key)) {
					result[key] = params[key];
				}
			}
			return result;
		}

		var router = {
			/**
			 * Starts listening for address changes and renders the current page.
			 */
			start: function () {
				if (started) {
					return;
				}
				started = true;
				window.addEventListener('hashchange', render, false);
				render();
			},

			/**
			 * @param {string} name
			 * @param {Params=} params
			 * @returns {string} the address, such as '#/items/42'
			 */
			href: function (name, params) {
				return '#' + buildPath(name, params);
			},

			/**
			 * Goes to a page. Adds a history entry unless options.replace is set.
			 *
			 * @param {string} name
			 * @param {Params=} params
			 * @param {GoOptions=} goOptions
			 */
			go: function (name, params, goOptions) {
				var hash = '#' + buildPath(name, params);
				var replace = !!(goOptions && goOptions.replace);

				if (replace) {
					window.history.replaceState({ routerPosition: position }, '', hash);
					if (goOptions && goOptions.render === false) {
						track(match(currentPath()));
						return;
					}
					render();
					return;
				}
				if (window.location.hash === hash) {
					render();
					return;
				}
				window.location.hash = hash;
			},

			/**
			 * For on-screen back buttons: goes back to the given page. Uses the
			 * browser's history when that page is the previous entry, and
			 * otherwise replaces the current page with it. Never adds a history
			 * entry and never leaves the app.
			 *
			 * @param {string} name
			 * @param {Params=} params
			 */
			back: function (name, params) {
				if (position > 0 && keysByPosition[position - 1] === buildPath(name, params)) {
					window.history.back();
					return;
				}
				router.go(name, params, { replace: true });
			},

			/**
			 * Renders the current page again.
			 */
			refresh: function () {
				render();
			},

			/**
			 * @returns {?{name: ?string, params: Params}} the current page,
			 *   with name null when no route matched
			 */
			current: function () {
				return current ? { name: current.name, params: copy(current.params) } : null;
			}
		};

		return router;
	};
})(window);
