<script>
  import { Input } from "@onsvisual/svelte-components";
  import Slider from "./Slider.svelte";

  export let min = 0.1;
  export let max = 20;
  export let step = 0.1;
  export let value = 1;
  export let unit = "km";

  function handleInput(e) {
    const val = e?.detail?.value;
    if (+val > min) value = +val > max ? max : +val;
    else value = min;
  }
</script>

<div class="slider-wrapper">
    <Slider {min} {max} {step} bind:value/>
    <Input suffix={unit || null} width={2} {value} on:change={handleInput} on:blur={handleInput}/>
</div>

<style>
    .slider-wrapper {
        display: flex;
        flex-direction: row;
        gap: 8px;
        margin-top: 8px;
    }
    .slider-wrapper :global(.slider) {
        flex-grow: 1;
    }
    .slider-wrapper :global(.ons-field) {
        flex-shrink: 1;
    }
    .slider-wrapper :global(.ons-field input) {
        margin: 0;
    }
</style>