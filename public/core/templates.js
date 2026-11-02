// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	/** @type {string[]} */
	var urls = [];
	/** @type {Object<string, string>} */
	var textsByUrl = {};
	/** @type {Object<string, boolean>} */
	var addedUrls = {};
	/** @type {Object<string, HTMLTemplateElement>} */
	var templatesById = {};

	BS.templates = {};

	BS.templates.loadTimeoutMs = 20000;

	/**
	 * Adds an HTML file to load at startup. Each component and page script
	 * calls this as its first statement, with its own file name. The name is
	 * resolved relative to the calling script, through document.currentScript,
	 * so this only works while the script first runs.
	 *
	 * @param {string} fileName
	 */
	BS.load = function (fileName) {
		var script = /** @type {?HTMLScriptElement} */ (document.currentScript);

		if (!script || !script.src) {
			throw new Error(
				'BS.load must be called at the top of a script loaded with <script src>: ' + fileName
			);
		}
		urls.push(script.src.split(/[?#]/)[0].replace(/[^/]*$/, '') + fileName);
	};

	/**
	 * Loads every registered file that is not loaded yet. Once all of them
	 * have loaded, adds their contents to the page in the order they were
	 * registered (see addHtml). The callback is called exactly once,
	 * with an error if any file fails to load.
	 *
	 * @param {(error: ?Error) => void} callback
	 */
	BS.templates.load = function (callback) {
		/** @type {string[]} */
		var pending = [];
		/** @type {number} */
		var remaining;
		var finished = false;
		var i;

		function addAll() {
			var j;
			for (j = 0; j < urls.length; j += 1) {
				if (!addedUrls[urls[j]]) {
					addHtml(textsByUrl[urls[j]]);
					addedUrls[urls[j]] = true;
				}
			}
			finished = true;
			callback(null);
		}

		for (i = 0; i < urls.length; i += 1) {
			if (!Object.prototype.hasOwnProperty.call(textsByUrl, urls[i])) {
				pending.push(urls[i]);
			}
		}

		remaining = pending.length;
		if (remaining === 0) {
			addAll();
			return;
		}

		/**
		 * @param {string} url
		 */
		function loadOne(url) {
			BS.http.getText(
				url,
				/**
				 * @param {?Error} error
				 * @param {string=} text
				 */
				function (error, text) {
					if (finished) {
						return;
					}
					if (error) {
						finished = true;
						callback(error);
						return;
					}
					textsByUrl[url] = text || '';
					remaining -= 1;
					if (remaining === 0) {
						addAll();
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
	 * Parses HTML text and uses everything at its top level:
	 *
	 * - each <template> is stored by its id, for BS.templates.clone
	 * - each <style> is added to the end of <head>
	 * - any other element is added to the end of <body>
	 *
	 * @param {string} html
	 */
	function addHtml(html) {
		var container = document.createElement('div');
		/** @type {Element[]} */
		var elements = [];
		var element;
		var tagName;
		var i;

		container.innerHTML = html;
		// Copied first, because moving an element changes container.children.
		for (i = 0; i < container.children.length; i += 1) {
			elements.push(container.children[i]);
		}

		for (i = 0; i < elements.length; i += 1) {
			element = elements[i];
			tagName = element.tagName.toLowerCase();
			if (tagName === 'template') {
				if (element.id) {
					templatesById[element.id] = /** @type {HTMLTemplateElement} */ (element);
				}
			} else if (tagName === 'style') {
				document.head.appendChild(element);
			} else {
				document.body.appendChild(element);
			}
		}
	}

	/**
	 * Makes a fresh copy of a template.
	 *
	 * - fragment: everything in the template, ready to append.
	 * - element: the first element in the template, for single-root templates.
	 * - refs: every element with a data-ref attribute, keyed by its value.
	 *
	 * @param {string} id
	 * @returns {{fragment: DocumentFragment, element: HTMLElement, refs: Object<string, Element>}}
	 */
	BS.templates.clone = function (id) {
		var template = templatesById[id];
		var fragment;
		/** @type {?Node} */
		var element = null;
		/** @type {Object<string, Element>} */
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
			// The selector only matches elements that have the attribute.
			refs[/** @type {string} */ (node.getAttribute('data-ref'))] = node;
		}

		return {
			fragment: fragment,
			element: /** @type {HTMLElement} */ (element),
			refs: refs
		};
	};
})(window, document);
