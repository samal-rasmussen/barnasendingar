<script lang="ts">
	import shows from '$lib/assets/shows.json';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Show } from '../../../../scripts/shared-types.js';

	function playEpisode(episodeTitle: string) {
		const url = `${$page.params.showTitle}/partur/${episodeTitle}`;
		goto(url);
	}

	const titleToShow = {} as Record<string, Show>;
	for (const show of shows) {
		titleToShow[show.title] = show;
	}
	const show = titleToShow[$page.params.showTitle];
</script>

<h1>{show.title}</h1>
<div class="grid">
	{#each show.episodes as episode}
		<div class="grid-item">
			<div
				class="grid-container"
				on:click={() => playEpisode(episode.title)}
				on:keypress={() => playEpisode(episode.title)}
			>
				<div class="header">
					<h2>{episode.title}</h2>
					<p>Sesong: {episode.seasonNumber} Partur: {episode.episodeNumber}</p>
				</div>
				<img src={episode.img} alt="Partur" />
			</div>
		</div>
	{/each}
</div>

<style>
	.grid .grid-item h2 {
		text-align: center;
		padding-right: 0;
		margin-bottom: 0;
	}
	.grid .grid-item p {
		margin-top: 0px;
		margin-bottom: 4px;
		text-align: center;
	}

	@media screen and (max-width: 785px) {
		.header {
			width: 50%;
			padding-right: 2em;
		}
		.grid .grid-item p {
			font-size: 0.9em;
		}
	}
	@media screen and (max-width: 520px) {
		.grid .grid-item p {
			font-size: 0.8em;
		}
	}
	@media screen and (max-width: 420px) {
		.grid .grid-item p {
			font-size: 0.7em;
		}
	}
</style>
