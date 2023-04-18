<script lang="ts">
	import shows from '$lib/assets/shows.json';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Show } from '../../../../scripts/shared-types.js';

	function playEpisode(episodeTitle: string) {
		goto(`${$page.params.showTitle}/partur/${episodeTitle}`);
	}

	const titleToShow = {} as Record<string, Show>;
	for (const show of shows) {
		titleToShow[show.title] = show;
	}
	const show = titleToShow[$page.params.showTitle];
</script>

<div class="episodes">
	{#each show.episodes as episode}
		<div
			class="episode"
			on:click={() => playEpisode(episode.title)}
			on:keypress={() => playEpisode(episode.title)}
		>
			<h3>{episode.title}</h3>
			<p>Sesong: {episode.seasonNumber} Partur: {episode.episodeNumber}</p>
			<img src={episode.img} alt="Partur" />
		</div>
	{/each}
</div>

<style>
	.episodes {
		padding-bottom: 2em;
	}
	.episode {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 2em;
	}
	.episode h3 {
		margin: 0;
	}
	.episode p {
		margin-top: 0px;
		margin-bottom: 4px;
	}
	.episode img {
		width: 300px;
		height: 168.783px;
	}
</style>
