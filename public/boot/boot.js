// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS || {};
	/** @type {any} */ (window).BS = BS;

	/**
	 * The loading and load-error screens, whose markup and styles are in
	 * index.html. They must work when nothing else has loaded, so this file
	 * uses only the DOM: no templates, components, BS.util or router.
	 */
	BS.boot = {};

	/**
	 * @param {string} id
	 * @returns {HTMLElement}
	 */
	function byId(id) {
		return /** @type {HTMLElement} */ (document.getElementById(id));
	}

	BS.boot.showLoading = function () {
		byId('boot-error').hidden = true;
		byId('boot-loading').hidden = false;
	};

	/**
	 * Shows the load-error screen and focuses its "Royn aftur" button.
	 *
	 * @param {() => void} onRetry
	 */
	BS.boot.showError = function (onRetry) {
		var retry = byId('boot-retry');
		byId('boot-loading').hidden = true;
		byId('boot-error').hidden = false;
		retry.onclick = function () {
			onRetry();
		};
		retry.focus();
	};

	BS.boot.hide = function () {
		byId('boot-loading').hidden = true;
		byId('boot-error').hidden = true;
		byId('boot-retry').onclick = null;
	};
})(window, document);
