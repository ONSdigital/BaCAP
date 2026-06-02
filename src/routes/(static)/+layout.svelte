<script>
	import { Header, Main, Footer } from "@onsvisual/svelte-components";

	let { children } = $props();
</script>

<Header />
<Main>
	{@render children()}
</Main>
<Footer />
