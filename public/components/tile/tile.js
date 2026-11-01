// @ts-check
(function (window) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	BS.templates.register('/components/tile/tile.html');

	/**
	 * A grid tile with a title and an image that can be focused and opened
	 * with Enter/OK or a click.
	 *
	 * @param {{
	 *   title: string,
	 *   image: string,
	 *   imageAlt: string,
	 *   watched?: boolean,
	 *   onActivate: Function
	 * }} options
	 * @returns {{element: HTMLElement}}
	 */
	BS.components.tile = function (options) {
		var view = BS.templates.clone('tile');

		view.refs.title.textContent = options.title;
		view.refs.image.src = options.image;
		view.refs.image.alt = options.imageAlt;

		if (!options.watched) {
			view.refs.watched.parentNode.removeChild(view.refs.watched);
		}

		BS.util.onActivate(view.refs.container, options.onActivate);

		return { element: view.element };
	};
})(window);
