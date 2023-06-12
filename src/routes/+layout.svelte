<script>
	import './style.css';
	import './grid.css';
</script>

<main>
	<slot />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
