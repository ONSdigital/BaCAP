<script>
  import "@onsvisual/svelte-components/css/main.css";
  import "$lib/css/app.css";
  import { AnalyticsBanner } from "@onsvisual/svelte-components"
  import { PhaseBanner, Header, Footer } from "@onsvisual/svelte-components";
  import { page } from "$app/stores";

  // GOOGLE ANALYTICS
  // Settings for page analytics. Values must be shared with <AnalyticsBanner> component
  const analyticsId = "GTM-MBCBVQS";
  const analyticsProps = {
    contentTitle: "Build a custom area profile",
    releaseDate: "20230117",
    contentType: "exploratory",
    outputSeries: "buildacustomareaprofile",
  };

  $: pageWidth = $page.url.pathname.includes("draw") ? "full" : $page.url.pathname.includes("build") ? "wider" : "wide";
</script>

<svelte:head>
  <title>Build a custom area profile - ONS</title>
  <meta property="og:title" content="Build a custom area profile - ONS" />
  <meta property="og:type" content="website" />
  <meta
    property="og:url"
    content="https://www.ons.gov.uk/visualisations/customprofiles/draw/"
  />
  <meta
    property="og:image"
    content="https://www.ons.gov.uk/visualisations/customprofiles/img/og.png"
  />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta
    property="og:description"
    content="Create your own profile for local areas with data for England and Wales."
  />
  <meta
    name="description"
    content="Create your own profile for local areas with data for England and Wales. Data topics include population, age, sex, ethnicity, religion, the work people do, and the homes they live in."
  />
</svelte:head>
{#if $page.url.pathname.includes("embed")}
  <slot />
{:else}
  {#if !$page.url.pathname.includes("landing")}
    <AnalyticsBanner {analyticsId} {analyticsProps} {page} width={pageWidth}/>
    <PhaseBanner width={pageWidth} phase="Beta" href="https://consultations.ons.gov.uk/digital-publishing/2ff010d4/consultation/intro/"/>
    <Header width={pageWidth} compact={$page.url.pathname.includes("draw")} legacy={false} />
  {/if}
  <main id="main">
    <slot />
  </main>
{/if}

{#if !['draw', 'landing', 'embed'].some(term => $page.url.pathname.includes(term))}
  <Footer width={pageWidth} />
{/if}
