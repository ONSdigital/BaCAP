<script>
	import { Button } from "@onsvisual/svelte-components";

	let {
		variant = "primary",
		icon = null,
		color = null,
		small = false,
		onConfirm = () => null,
		pendingText = "Click again to confirm",
		children
	} = $props();

	let isPending = $state(false);
</script>

<Button
	{variant}
	{icon}
	{color}
	{small}
	on:click={() => {
		if (isPending) {
			onConfirm();
			isPending = false;
		} else {
			isPending = true;
		}
	}}
	>{#if isPending}{pendingText}{:else}{@render children?.()}{/if}</Button
>
