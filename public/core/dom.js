// @ts-check
(function (window) {
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
})(window);
