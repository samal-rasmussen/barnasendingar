<script>
	import './style.css';
	import './grid.css';
</script>

<main>
	<slot />
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
