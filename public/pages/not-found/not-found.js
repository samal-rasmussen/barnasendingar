// @ts-check
(function (window) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('not-found.html');

	var page = {};
	BS.pages.notFound = page;

	/**
	 * @param {HTMLElement} root
	 */
	page.render = function (root) {
		var view = BS.templates.clone('not-found-page');

		BS.dom.setTitle('Ikki funnið');

		view.refs.home.onclick = function () {
			BS.router.go('home');
		};

		root.appendChild(view.fragment);
		view.refs.home.focus();
	};
})(window);
