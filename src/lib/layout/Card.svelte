<script>
  import { getContext } from "svelte";
  import { geographyLookup } from "$lib/util/build-utils";

  export let colspan = 1; // 1, 2 or 3
  export let rowspan = 1;
  export let title = null;
  export let links = null;
  export let blank = false;
  export let source
  export let geography 
  export let timeperiod

  const { cols } = getContext("tiles");
</script>

<article
  class:blank
  class={!blank ? "tile tile__content" : ""}
  style:grid-column="span {colspan == 1
    ? 1
    : colspan > $cols
      ? $cols
      : colspan}"
  style:grid-row="span {rowspan}"
>
  {#if title}
    <header class="margin-top--1">
        <h3 class="margin-top--0 margin-right--0 margin-bottom--0 margin-left--0">
          {title}
        </h3>
        {#if timeperiod}<span>{timeperiod}</span>{/if}
    </header>
  {/if}
  <slot />
  <div class="ons-u-mt-s">
    {#if source}
    <p class="footnote"
    >Source: {@html source}</p
  >
    {/if}
    {#if geography}
      <p class="footnote">Lowest geography: {@html geographyLookup[geography]}</p>
    {/if}
  </div>


  {#if links && links[0]}
    <div class="margin-top--2">
      {#each links as link}
        <a
          href={link.url}
          class="tile__link"
          aria-label={link.label}
          data-gtm-label={link.label}
        >
          {link.label}
        </a>
      {/each}
    </div>
  {/if}
</article>

<style>
  h3 {
    font-size: 1.3rem;
    font-weight: bold;
  }
  .blank {
    padding: 0;
    line-height: 1;
  }
  .tile,
  .blank {
    color: black;
    margin: 4px 0 0 !important;
    display: block;
    page-break-inside: avoid;
  }
  .footnote{
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
    color:#323132;
    margin: 0;
    padding: 0;
  }
  .footnote + .footnote {
    margin-top: 8px;
  }
  .bold{
    font-weight: 700;
  }
</style>
