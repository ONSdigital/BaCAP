<script>
  import "$lib/css/app.css";
  import "@onsvisual/svelte-components/css/main.css";
  import AnalyticsBanner from "$lib/layout/AnalyticsBanner.svelte";
  import ONSHeader from "$lib/layout/ONSHeader.svelte";
  import ONSFooter from "$lib/layout/ONSFooter.svelte";
  // import Title from "$lib/layout/Title.svelte";
  import { Footer } from "@onsvisual/svelte-components";

  // GOOGLE ANALYTICS
  // Settings for page analytics. Values must be shared with <AnalyticsBanner> component
  const analyticsId = "GTM-MBCBVQS";
  const analyticsProps = {
    contentTitle: "Build a custom area profile",
    releaseDate: "20230117",
    contentType: "exploratory",
    outputSeries: "buildacustomareaprofile",
  };
</script>

<svelte:head>
  <title>Build a custom area profile - ONS</title>
  <meta
    property="og:title"
    content="Build a custom area profile - ONS"
  />
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
<div class="ons-grid--flex ons-grid--column">
  <div>
    <AnalyticsBanner {analyticsId} {analyticsProps} />
  <header>
    <ONSHeader />
  </header>
  </div>

  <div class="ons-u-flex-grow">
    <main>
        <slot />
    </main>
  </div>
</div>

