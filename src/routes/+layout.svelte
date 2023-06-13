<script>
	import './style.css';
	import './grid.css';
</script>

<main>
	<slot />
</main>

<style>
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
