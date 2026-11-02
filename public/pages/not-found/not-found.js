// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;
	var page = {};
	BS.pages.notFound = page;

	BS.templates.register('/pages/not-found/not-found.html');

	/**
	 * @param {HTMLElement} root
	 */
	page.render = function (root) {
		var view = BS.templates.clone('not-found-page');

		document.title = 'Ikki funnið - Barnasendingar';
		BS.util.clearElement(root);

		view.refs.home.onclick = function () {
			BS.router.go('home');
		};

		root.appendChild(view.fragment);
	};
})(window, document);
