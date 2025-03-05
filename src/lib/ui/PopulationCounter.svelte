<script>
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import { onMount, tick } from 'svelte';
  
    export let population = 0;
  
    let count = tweened(0, {
      duration: 1000,
      easing: cubicOut
    });

    function formatNumber(value) {
        return value.toLocaleString();
    }
  
    // Update tweened value whenever population changes
    $: tick().then(() => count.set(Math.round(population)));
  </script>


  
  
  <style>
    .counter {
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      position:absolute;
      z-index: 99;
      margin:8px;
      bottom:15px;
    }

    p{
        font-size: 0.8em;
        font-weight: 400;
        margin:0;
    }

    .bigger{
        font-size: 1.2em;
        font-weight: bold;
    }
  </style>
  
  <div class="counter">
    <p>Population selected</p>
    <p class='bigger'>{formatNumber(Math.round($count))}</p>
  </div>
  