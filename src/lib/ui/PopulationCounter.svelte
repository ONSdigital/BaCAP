<script>
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import { tick } from 'svelte';
    import { roundCount } from "$lib/util/functions";

    export let population = 0;
  
    let count = tweened(0, {
      duration: 1000,
      easing: cubicOut
    });

 
    // Update tweened value whenever population changes
    $: tick().then(() => count.set(roundCount(population)));
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
    <p class='bigger'>{roundCount(population).toLocaleString("en-GB")}</p>
  </div>
  