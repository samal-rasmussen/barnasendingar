// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('tile.html');

	/**
	 * A button with a title and an image, opened with Enter/OK or a click.
	 * A "Sæð" marker shows when it is watched.
	 *
	 * @param {{
	 *   title: string,
	 *   image: string,
	 *   watched?: boolean,
	 *   onActivate: () => void
	 * }} options
	 * @returns {{
	 *   element: HTMLButtonElement,
	 *   setWatched: (watched: boolean) => void,
	 *   focus: () => void
	 * }}
	 */
	BS.components.tile = function (options) {
		var view = BS.templates.clone('tile');
		var element = /** @type {HTMLButtonElement} */ (view.element);

		view.refs.title.textContent = options.title;
		view.refs.image.src = options.image;
		element.onclick = function () {
			options.onActivate();
		};

		/**
		 * @param {boolean} watched
		 */
		function setWatched(watched) {
			view.refs.watched.hidden = !watched;
		}
		setWatched(!!options.watched);

		return {
			element: element,
			setWatched: setWatched,
			focus: function () {
				element.focus();
			}
		};
	};
})(window);
