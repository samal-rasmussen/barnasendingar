<script lang="ts">
	import shows from '$lib/assets/shows.json';
	import { goto } from '$app/navigation';
	import type { Episode, Show } from '../../scripts/shared-types.js';

	function gotoShow(showTitle: string) {
		goto(`sending/${showTitle}`);
	}
</script>

<svelte:head>
	<title>Barnasendingar</title>
</svelte:head>

<main>
	<h1>Barnasendingar</h1>
	<div class="shows">
		{#each shows as show}
			<div
				class="show"
				on:click={() => gotoShow(show.title)}
				on:keypress={() => gotoShow(show.title)}
			>
				<h2>{show.title}</h2>
				<img src={show.img} alt="Sending" />
			</div>
		{/each}
	</div>
</main>

<style>
	main {
		padding-left: 2em;
		width: 100%;
	}

	.shows {
		white-space: pre;
		display: flex;
		flex-wrap: wrap;
		box-sizing: border-box;
		justify-content: center;
	}
	.show {
		display: flex;
		flex-direction: column;
		width: 345px;
		cursor: pointer;
		margin-right: 2em;
		margin-bottom: 2em;
	}
	.show img {
		width: 100%;
	}
	.show h2 {
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 0;
		margin-bottom: 8px;
	}

	@media only screen and (max-width: 785px) {
		main {
			padding: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
		}
		h1 {
			font-size: 2.6em;
			margin-bottom: 1em;
		}

		.shows {
			flex-direction: column;
			align-items: center;
		}
		.show {
			flex-direction: row;
			width: auto;
			justify-content: space-between;
			margin: 0 2em 2em 2em;
			align-items: center;
			white-space: initial;
		}
		.show h2 {
			font-size: 1.3em;
			padding-right: 2em;
			flex: 1;
			text-align: center;
		}
		.show img {
			width: 50%;
		}
	}

	@media only screen and (max-width: 520px) {
		.show h2 {
			font-size: 1.1em;
		}
	}

	@media only screen and (max-width: 420px) {
		.show h2 {
			font-size: 1em;
		}
	}
</style>
