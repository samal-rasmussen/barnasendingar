// @ts-check
(function (window, document) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;
	var page = /** @type {any} */ ({});
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
			BS.router.goHome();
		};

		root.appendChild(view.fragment);
	};
})(window, document);
