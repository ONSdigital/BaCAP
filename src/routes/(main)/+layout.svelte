<script>
  import "$lib/css/app.css";
  import "@onsvisual/svelte-components/css/main.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { centroids } from "$lib/stores/mapstore.js";
  import { GetCentroids } from "$lib/util/centroid-utils.js";
  import AnalyticsBanner from "$lib/layout/AnalyticsBanner.svelte";
  import ONSHeader from "$lib/layout/ONSHeader.svelte";
  import { Footer } from "@onsvisual/svelte-components";
  import Title from "$lib/layout/Title.svelte";
  import { points, lsoaPoints } from '$lib/config/geography';

  let loaded = false;

  onMount(async () => {
    // calculate the centroids and simplifications.
    var centroidDummy = await GetCentroids([points,lsoaPoints]);
    centroids.set(centroidDummy);
    loaded = true;
  });

</script>



{#if loaded}
<div class="overflow-hidden">
  <slot />
</div>
{/if}


{#if ['build', 'glossary'].some(term => $page.url.pathname.includes(term))}
  <Footer />
{/if}
