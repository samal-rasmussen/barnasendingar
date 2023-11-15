<script lang="ts">
	import { page } from '$app/stores';
	import shows from '$lib/assets/shows.json';
	import type { Show } from '../../../../../../scripts/shared-types';
	import videojs from 'video.js';
	import 'video.js/dist/video-js.min.css';
	// import 'videojs-mobile-ui/dist/videojs-mobile-ui.css';
	import '$lib/luxmty-skin/videojsluxmtyplayerskin/dist/plugins/css/quality-selector.css';
	import '$lib/luxmty-skin/videojsluxmtyplayerskin/dist/vjs-luxmty.css';
	// import 'videojs-mobile-ui';
	import './quality-selector/plugin';
	import { onDestroy, onMount } from 'svelte';
	import { setWatched } from '$lib/watched';

	const titleToShow = {} as Record<string, Show>;
	for (const show of shows) {
		titleToShow[show.title] = show;
	}
	const show = titleToShow[$page.params.showTitle];
	const episodeTitle = $page.params.episodeTitle;

	let currentIndex = show.episodes.findIndex((e) => e.title === episodeTitle);
	if (currentIndex == null) {
		throw new Error('episode not found');
	}
	let current = show.episodes[currentIndex!];

	function playEpisode() {
		if (currentIndex >= show.episodes.length) {
			return;
		}
		current = show.episodes[currentIndex];
		const playlist = `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${current?.mediaId}.smil?type=m3u8`;
		player.titleBar.update({
			title: show.title,
			description: `${current.title}\nSesong: ${current.seasonNumber} Partur: ${current.episodeNumber}`,
		});
		setTimeout(() => {
			player?.src([
				{
					type: 'application/x-mpegURL',
					src: playlist,
				},
			]);
			player?.play();
		});
	}

	let player: ReturnType<typeof videojs> | undefined;

	onMount(async () => {
		player = videojs('barnasendingar-video-player', {
			controlBar: {
				children: [
					'playToggle',
					'skipBackward',
					'skipForward',
					'volumePanel',
					'currentTimeDisplay',
					'timeDivider',
					'durationDisplay',
					'progressControl',
					'remainingTimeDisplay',
					'customControlSpacer',
					'hlsQualitySelector',
					'pictureInPictureToggle',
					'fullscreenToggle',
				],
				skipButtons: {
					forward: 10,
					backward: 10,
				},
			},
			preload: 'metadata',
			controls: true,
			responsive: true,
			fluid: false,
			preferFullWindow: true,
			techOrder: ['html5'],
			html5: {
				vhs: {
					enableLowInitialPlaylist: true,
					fastQualityChange: true,
					overrideNative: true,
					useDevicePixelRatio: false,
					limitRenditionByPlayerDimensions: false,
				},
			},
		});
		// player.mobileUi();
		player.hlsQualitySelector({
			autoPlacement: 'bottom',
			displayCurrentQuality: true,
			getCurrentQuality: 'auto',
			sortAscending: false,
		});
		player.ready(function onPlayerReady(this: any) {
			this.play();
		});
		player.on('ended', function () {
			setWatched(show, current);
			currentIndex++;
			playEpisode();
		});
		player.requestFullscreen();
		playEpisode();
	});

	onDestroy(() => {
		console.log('player onDestroy');
		player?.pause();
		player?.dispose();
	});
</script>

<div class="episode">
	<div>
		<!-- svelte-ignore a11y-media-has-caption -->
		<video-js id="barnasendingar-video-player" class="video-js vjs-luxmty" />
	</div>
</div>

<style>
	.episode {
		display: flex;
		justify-content: center;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}
	.episode > div {
		height: 100%;
	}
	.episode video-js {
		/* background-color: initial; */
		height: 100vh;
		width: 100vw;
	}
	:root {
		--secondary-hsl: 237, 86%, 64%;
		--tertiary-hsl: 0 0% 10%;
	}
	.episode video-js :global(.vjs-title-bar-description) {
		white-space: pre-wrap;
	}
	.episode
		video-js
		:global(.vjs-menu-button.vjs-menu-button-popup.vjs-control.vjs-button.vjs-quality-selector) {
		width: auto;
	}
</style>
