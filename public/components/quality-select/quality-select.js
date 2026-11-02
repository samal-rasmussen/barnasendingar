// @ts-check
(function (window, document) {
	'use strict';

	// The global namespace is built up across many files and has no type.
	var BS = /** @type {any} */ (window).BS;

	BS.load('quality-select.html');

	/**
	 * A labelled select for picking a video quality level. It starts out
	 * disabled with only "Auto" until setLevels gets some levels.
	 *
	 * @param {{id: string, onChange: (level: number) => void}} options
	 *   onChange gets the chosen level index, or -1 for automatic.
	 */
	BS.components.qualitySelect = function (options) {
		var view = BS.templates.clone('quality-select');
		var select = /** @type {HTMLSelectElement} */ (view.refs.select);

		select.id = options.id;
		view.refs.label.setAttribute('for', options.id);

		select.onchange = function () {
			var level = parseInt(select.value, 10);
			if (!isNaN(level)) {
				options.onChange(level);
			}
		};

		var api = {
			element: view.element,

			/**
			 * Replaces the options with "Auto" plus one option per level, and
			 * selects "Auto". With no levels the select is disabled.
			 *
			 * @param {Array<{height?: number, bitrate?: number}>} levels
			 */
			setLevels: function (levels) {
				var i;

				BS.util.clearElement(select);
				select.appendChild(createOption('-1', 'Auto'));
				for (i = 0; i < levels.length; i += 1) {
					select.appendChild(createOption(String(i), levelLabel(levels[i], i)));
				}

				select.value = '-1';
				select.disabled = levels.length === 0;
			},

			destroy: function () {
				select.onchange = null;
			}
		};

		api.setLevels([]);
		return api;
	};

	/**
	 * @param {string} value
	 * @param {string} text
	 */
	function createOption(value, text) {
		var option = document.createElement('option');
		option.value = value;
		option.text = text;
		return option;
	}

	/**
	 * @param {{height?: number, bitrate?: number}} level
	 * @param {number} index
	 * @returns {string}
	 */
	function levelLabel(level, index) {
		if (level.height) {
			return level.height + 'p';
		}
		if (level.bitrate) {
			return Math.round(level.bitrate / 1000) + ' kbps';
		}
		return 'Góðska ' + (index + 1);
	}
})(window, document);
