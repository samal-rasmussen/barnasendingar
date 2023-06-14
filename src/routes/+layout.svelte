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
		width: 100vw;
		height: 100vh;
	}
	@media screen and (max-width: 520px) {
		main {
			width: initial;
			height: initial;
		}
	}
</style>
