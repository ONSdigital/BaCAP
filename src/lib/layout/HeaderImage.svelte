<script>
	import {base} from "$app/paths";
</script>

<div class="ons-grid__col ons-col-2@m">
    <img src="{base}/img/og.png" alt="ONS logo" class="header-image" />
</div>

<style>
    .header-image {
		position: absolute;
		top: -52px;
		right:-150px;
        height: 100%;
	}
	@media (max-width: 1000px) {
		.header-image {
			display: none;
		}
	}
</style>