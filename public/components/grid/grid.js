// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('grid.html');

	/**
	 * Lays out items (such as tiles) in centred, left-aligned columns, with an
	 * optional toolbar in a row above them that lines up with the first column.
	 *
	 * @param {{
	 *   toolbar?: HTMLElement | HTMLElement[],
	 *   items: Array<{element: HTMLElement}>
	 * }} options
	 * @returns {{element: HTMLElement}}
	 */
	BS.components.grid = function (options) {
		var view = BS.templates.clone('grid');
		var toolbar = !options.toolbar
			? []
			: Array.isArray(options.toolbar)
				? options.toolbar
				: [options.toolbar];
		var cell;
		var i;

		if (toolbar.length === 0) {
			view.refs.toolbar.parentNode.removeChild(view.refs.toolbar);
		}
		for (i = 0; i < toolbar.length; i += 1) {
			view.refs.toolbar.appendChild(toolbar[i]);
		}

		for (i = 0; i < options.items.length; i += 1) {
			cell = BS.templates.clone('grid-item').element;
			cell.appendChild(options.items[i].element);
			view.refs.items.appendChild(cell);
		}

		return { element: view.element };
	};
})(window);
