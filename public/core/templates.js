// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	/** @type {string[]} */
	var urls = [];
	/** @type {Object<string, boolean>} */
	var loadedUrls = {};
	/** @type {Object<string, HTMLTemplateElement>} */
	var templatesById = {};

	BS.templates.loadTimeoutMs = 20000;

	/**
	 * Adds an HTML file of <template> elements to load at startup. Each page
	 * script calls this for its own HTML file.
	 *
	 * @param {string} url
	 */
	BS.templates.register = function (url) {
		urls.push(url);
	};

	/**
	 * Loads every registered file that is not loaded yet. The callback is
	 * called exactly once, with an error if any file fails to load.
	 *
	 * @param {Function} callback
	 */
	BS.templates.load = function (callback) {
		var pending = [];
		var remaining;
		var finished = false;
		var i;

		for (i = 0; i < urls.length; i += 1) {
			if (!loadedUrls[urls[i]]) {
				pending.push(urls[i]);
			}
		}

		remaining = pending.length;
		if (remaining === 0) {
			callback(null);
			return;
		}

		/**
		 * @param {string} url
		 */
		function loadOne(url) {
			BS.util.getText(
				url,
				function (error, text) {
					if (finished) {
						return;
					}
					if (error) {
						finished = true;
						callback(error);
						return;
					}
					BS.templates.add(text);
					loadedUrls[url] = true;
					remaining -= 1;
					if (remaining === 0) {
						finished = true;
						callback(null);
					}
				},
				BS.templates.loadTimeoutMs
			);
		}

		for (i = 0; i < pending.length; i += 1) {
			loadOne(pending[i]);
		}
	};

	/**
	 * Parses HTML text and stores every <template> in it by its id.
	 *
	 * @param {string} html
	 */
	BS.templates.add = function (html) {
		var container = document.createElement('div');
		var templates;
		var template;
		var i;

		container.innerHTML = html;
		templates = container.getElementsByTagName('template');
		for (i = 0; i < templates.length; i += 1) {
			template = /** @type {HTMLTemplateElement} */ (templates[i]);
			if (template.id) {
				templatesById[template.id] = template;
			}
		}
	};

	/**
	 * Makes a fresh copy of a template.
	 *
	 * - fragment: everything in the template, ready to append.
	 * - element: the first element in the template, for single-root templates.
	 * - refs: every element with a data-ref attribute, keyed by its value.
	 *
	 * @param {string} id
	 * @returns {{fragment: DocumentFragment, element: HTMLElement, refs: Object<string, any>}}
	 */
	BS.templates.clone = function (id) {
		var template = templatesById[id];
		var fragment;
		/** @type {?Node} */
		var element = null;
		var refs = {};
		var nodes;
		var node;
		var i;

		if (!template) {
			throw new Error('Unknown template: ' + id);
		}

		fragment = /** @type {DocumentFragment} */ (document.importNode(template.content, true));

		for (i = 0; i < fragment.childNodes.length; i += 1) {
			if (fragment.childNodes[i].nodeType === 1) {
				element = fragment.childNodes[i];
				break;
			}
		}

		nodes = fragment.querySelectorAll('[data-ref]');
		for (i = 0; i < nodes.length; i += 1) {
			node = nodes[i];
			refs[node.getAttribute('data-ref')] = node;
		}

		return {
			fragment: fragment,
			element: /** @type {HTMLElement} */ (element),
			refs: refs
		};
	};
})(window, document);
