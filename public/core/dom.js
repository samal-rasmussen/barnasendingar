// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	/**
	 * Puts element where placeholder is, and removes placeholder. Pages use it
	 * to put a component in place of a placeholder in their template.
	 *
	 * @param {Element} placeholder
	 * @param {Element} element
	 */
	BS.dom.replace = function (placeholder, element) {
		var parent = placeholder.parentNode;
		if (!parent) {
			throw new Error('BS.dom.replace: the placeholder has no parent.');
		}
		parent.replaceChild(element, placeholder);
	};

	/**
	 * Sets the page title to the given parts, most specific first, followed
	 * by the site name: setTitle('Partur 2', 'Alfa og Beta') gives
	 * 'Partur 2 - Alfa og Beta - Barnasendingar'. ES5 has no rest
	 * parameters, so it reads the parts from `arguments`.
	 *
	 * @type {(...parts: string[]) => void}
	 */
	BS.dom.setTitle = function () {
		var all = Array.prototype.slice.call(arguments);
		all.push('Barnasendingar');
		document.title = all.join(' - ');
	};
})(window, document);
