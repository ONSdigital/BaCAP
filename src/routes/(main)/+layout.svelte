<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { centroids } from "$lib/stores/mapstore.js";
  import { GetCentroids } from "$lib/util/centroid-utils.js";
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