<script lang="ts">
	import { page } from '$app/stores';
	import shows from '$lib/assets/shows.json';
	import type { Show } from '../../../../../../scripts/shared-types';
	import videojs from 'video.js';
	import { onDestroy, onMount } from 'svelte';
	import 'video.js/dist/video-js.min.css';
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
		const playlist = `https://play.kringvarp.fo/redirect/video/_definst_/smil:${current?.mediaId}.smil?type=m3u8`;
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
			controls: true,
			// preload: 'auto',
			autoplay: false,
			fill: true,
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
		<div class="header">
			<h3>{show?.title} - {current?.title}</h3>
			<p>Sesong: {current?.seasonNumber} Partur: {current?.episodeNumber}</p>
		</div>
		<!-- svelte-ignore a11y-media-has-caption -->
		<video-js id="barnasendingar-video-player" class="video-js" />
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
	.header {
		display: flex;
		justify-content: center;
		height: 3rem;
	}
	.header > * {
		margin-top: 0.8rem;
		margin-bottom: 0;
	}
	.header h3 {
		margin-right: 2rem;
	}
	.header p {
		margin-left: 2rem;
	}
	.episode video-js {
		background-color: initial;
		height: calc(100% - 3rem);
	}
	.episode video-js :global(.vjs-big-play-button) {
		left: 50%;
		top: 50%;
		margin-left: calc(1.5em / -2);
		margin-top: calc(1.63332em / -2);
	}
</style>
