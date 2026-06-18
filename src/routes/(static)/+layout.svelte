<script>
	import { PhaseBanner, Header, Main, Footer } from "@onsvisual/svelte-components";

	let { children } = $props();
</script>

<PhaseBanner phase="Prototype" />
<Header />
<Main>
	{@render children()}
</Main>
<Footer />
