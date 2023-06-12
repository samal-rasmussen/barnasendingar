<script lang="ts">
	import shows from '$lib/assets/shows.json';
	import { goto } from '$app/navigation';

	function gotoShow(showTitle: string) {
		goto(`sending/${showTitle}`);
	}
</script>

<svelte:head>
	<title>Barnasendingar</title>
</svelte:head>

<h1>Barnasendingar</h1>
<div class="grid">
	{#each shows as show}
		<div class="grid-item">
			<div
				class="grid-container"
				on:click={() => gotoShow(show.title)}
				on:keypress={() => gotoShow(show.title)}
			>
				<h2>{show.title}</h2>
				<img src={show.img} alt="Sending" />
			</div>
		</div>
	{/each}
</div>
