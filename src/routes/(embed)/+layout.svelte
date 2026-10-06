<script>
	let { children } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
	<meta name="googlebot" content="indexifembedded" />
</svelte:head>

{@render children()}
