<script lang="ts">
	import shows from '$lib/assets/shows.json';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Episode, Show } from '../../../../scripts/shared-types';
	import { clearWatched, getWatched } from '$lib/watched';

	function playEpisode(episodeTitle: string) {
		const url = `${$page.params.showTitle}/partur/${episodeTitle}`;
		goto(url);
	}

	let hasNavigated: boolean = false;

	afterNavigate(({ from }) => {
		hasNavigated = from?.url != null;
	});

	const goBack = () => {
		if (hasNavigated) {
			history.back();
		} else {
			goto('/');
		}
	};

	let watched = getWatched();

	const titleToShow = {} as Record<string, Show>;
	for (const show of shows) {
		titleToShow[show.title] = show;
	}
	const show = titleToShow[$page.params.showTitle];
</script>

<h1>{show.title}</h1>
<div class="grid">
	<actions>
		<button class="icon" on:click={() => goBack()}>&#8678</button>
		<button on:click={() => (watched = clearWatched(show))}>Nulstilla "Sæð"</button>
	</actions>
	{#each show.episodes as episode}
		<div class="grid-item">
			<div
				class="grid-container"
				role="button"
				tabindex="0"
				on:click={() => playEpisode(episode.title)}
				on:keypress={() => playEpisode(episode.title)}
			>
				<div class="header">
					<h2>{episode.title}</h2>
					<p>Sesong: {episode.seasonNumber} Partur: {episode.episodeNumber}</p>
				</div>
				<img src={episode.img} alt="Partur" />
				{#if watched?.[show.title]?.[episode.sortKey] === true}
					<watched>Sæð</watched>
				{/if}
			</div>
		</div>
	{/each}
	<!-- hack to make the last row left align with the grid -->
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
	<div class="grid-spacer" />
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
	actions {
		display: flex;
		box-sizing: border-box;
		margin-bottom: 2rem;
		width: 100%;
	}
	actions > * {
		margin-right: 1rem;
	}

	watched {
		position: absolute;
		right: 1rem;
		bottom: 1rem;
		font-size: 2rem;
		background: rgba(0, 0, 0, 0.5);
		padding: 6px 3px 3px 3px;
	}

	/* A bunch of media queries that make sure the the actions left align with the grid items */
	@media screen and (max-width: 2670px) {
		actions {
			width: 2262px;
		}
	}
	@media screen and (max-width: 2293px) {
		actions {
			width: 1885px;
		}
	}
	@media screen and (max-width: 1916px) {
		actions {
			width: 1508px;
		}
	}
	@media screen and (max-width: 1539px) {
		actions {
			width: 1131px;
		}
	}
	@media screen and (max-width: 1162px) {
		actions {
			width: 754px;
		}
	}

	@media screen and (max-width: 785px) {
		.header {
			width: 50%;
			padding-right: 2em;
		}
		.grid .grid-item p {
			font-size: 0.9em;
		}
		actions {
			padding-left: 2rem;
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
