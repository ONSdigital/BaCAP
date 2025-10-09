<script>
  import {
    Titleblock,
    Breadcrumb,
    Theme,
    Container,
    Button,
    Checkbox,
    Twisty,
    Checkboxes,
    Input
  } from "@onsvisual/svelte-components";
  import { isLoading } from "$lib/stores/mapstore";
  import ONSloader from "$lib/ui/ONSloader.svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import pym from "pym.js";
  import Select from "$lib/ui/Select.svelte";
  import topicsAll from "$lib/config/topics.json";
  import { simplifyGeo } from "$lib/util/drawing-utils";
  import getParents from "$lib/util/get-parents";
  import { onMount } from "svelte";
  import AreaMap from "$lib/charts/AreaMap.svelte";
  import {
    getData,
    downloadData,
    makeEmbed,
    copyEmbed,
    showEmbed,
    handleDatasetsShowAllClick,
    savePNG,
    checkForHashSelection,
    groupTopics,
    updateLocalStorage,
    filterTopics
  } from "$lib/util/build-utils";
  import { state, buildstate,tables, version } from "$lib/stores/mapstore";

  // Embed-related variables
  let pymParent; // Variable for pym
  let embedHash; // Variable for embed hash string

  // Geography & Coverage
  let highestLevel = "oa";
  let coverage = ["E", "W"];

  // Data storage
  // let tables = []; // Array to hold table data
  let topicsGrouped = {};
  let currentTopics = [];

  // UI States
  let includemap = true;
  let showMapInProfile = false
  let includecomp = false;
  let store;
  let geojson;
  let parents;
  let topics = [];
  // let uploader; // DOM element for geojson file upload
  // let selectComparison = true;

  $buildstate = {
    start: false,
    showEmbed: false,
    topics: [],
    comparison: null,
    showAllDatasets: false,
  };

  function handleCheckboxChange(event) {
    const { id, checked } = event.detail;
    const topic = topicsAll.find((t) => t.code === id);

    if (!topic) return;

    const topicCodes = new Set(currentTopics.map((t) => t.code));

    if (checked) {
      if (!topicCodes.has(id)) {
        currentTopics = [...currentTopics, topic];
      }
    } else {
      currentTopics = currentTopics.filter((t) => t.code !== id);
    }
  }

  async function init() {
    isLoading.set(true);
    await checkForHashSelection();

    // resume as normal
    store = JSON.parse(localStorage.getItem("onsbuild"));

    if (!store) {
      alert("Warning, no area selected! Redirecting to the drawing page.");
      goto(`${base}/draw/`);
    }

    processStoreData();
    isLoading.set(false);
  }

  onMount(init);

  ////////////////////////////////////////////////////////////////
  // Processing functions
  ////////////////////////////////////////////////////////////////
  async function updateProfile(
    start,
    name,
    comp,
    data,
    includemap,
    includecomp,
    oa_all,
    lsoa_all
  ) {
    if (!start) return;

    updateLocalStorage(name);
    let codes = data.map((d) => d.code);
    let compcds = comp?.codes ? comp.codes.join(";") : comp?.areacd || "";

    $tables = await getData(filterTopicsByCodes(codes), compcds);
    embedHash = generateEmbedHash(name, comp, includemap, includecomp, oa_all, lsoa_all);
    updateEmbedFrame();
  }

  function generateEmbedHash(name, comp, includemap, includecomp, oa_all, lsoa_all) {
  return `#/?name=${btoa(name)}${
    comp ? `&comp=${btoa(comp.areanm)}` : ""
  }&tabs=${btoa(JSON.stringify($tables))}${
    includemap ? `&poly=${btoa(JSON.stringify(geojson))}` : ""
  }${
    includemap && includecomp && comp?.geometry
      ? `&comppoly=${btoa(JSON.stringify(simplifyGeo(comp.geometry)))}`
      : ""
  }${
    oa_all ? `&oa=${btoa(JSON.stringify(oa_all))}` : ""
  }${
    lsoa_all ? `&lsoa=${btoa(JSON.stringify(lsoa_all))}` : ""
  }${
    showMapInProfile ? `&showMap=${showMapInProfile}` : ""
  }${
    `&version=${btoa($version)}`
  }`;
}

  function updateEmbedFrame() {
    if (!pymParent) {
      pymParent = new pym.Parent("embed", `${base}/embed/${embedHash}`, {
        name: "embed",
        id: "iframe",
        title: "Embedded area profile",
      });
    } else {
      document.getElementById("iframe").contentWindow.location.hash = embedHash;
    }
  }

  function filterTopicsByCodes(codes) {
    return topics.filter((t) => codes.includes(t.code));
  }

  async function processStoreData() {
    highestLevel = store.properties.highestLevel;
    geojson = simplifyGeo(store.geojson);
    parents = await getParents(store.properties.compressed);
    coverage = parents.coverage;

    topics = filterTopics(topicsAll, highestLevel, coverage);
    topicsGrouped = groupTopics(topics);

    $state.name = store.properties.name || "Selected area";

    $buildstate = {
      ...$buildstate,
      name: $state.name,
      codes: store.properties.oa_all,
      compressed: store.properties.compressed,
      comparison: parents.parents[0],
      start: true,
    };

    currentTopics = [topics[0]]; // Default to population topic
  }

  $: updateProfile(
    $buildstate.start,
    $state.name,
    $buildstate.comparison,
    currentTopics,
    includemap,
    includecomp,
    store?.properties.oa_all,
    store?.properties.lsoa_all,
    showMapInProfile
  );
  let showChangeName = false
  let nameChangeInputValue = ""
  function handleChangeName(){
    showChangeName = !showChangeName
  }

  function saveNameChange(){
    showChangeName = false
    $state.name = nameChangeInputValue
    updateLocalStorage(nameChangeInputValue)
  }

  function cancelChangeName(){
    showChangeName = false
  }
</script>

<ONSloader isLoading={$isLoading} />
<Theme theme="light" background="#F5F5F6">
  <div class="header-div">
    <Breadcrumb
      width="wider"
      links={[
        { label: "Home", href: "https://www.ons.gov.uk/", refresh: true },
        {
          label: "Build a custom area profile",
          href: `${base}/`,
          refresh: true,
        },
        { label: "Edit map", href: `${base}/draw/` },
      ]}
    />
    
    <Container width="wider">
      <h2>Area profile</h2>
    </Container>
    <!-- <Titleblock width="wider" title={$buildstate.name}></Titleblock> -->
     <Titleblock width="wider" title=""/>
    <Container width="wider">
      {#if showChangeName}
        <Input bind:value={nameChangeInputValue} hideLabel label="Enter area name"/>
        <div style="height:16px;" />
        <Button variant="secondary" on:click={cancelChangeName}>Cancel</Button>
        <Button variant="primary" on:click={saveNameChange}>Save</Button>
      {:else if showChangeName == false}
        <Button variant="secondary" on:click={handleChangeName}>Change area name</Button>
      {/if}
    </Container>
  </div>
  
  <div class="area-map-container">
    <div class="fade" />
    {#if geojson}
      <AreaMap name={$state.name} comp={null} {geojson}/>
    {/if}
  </div>

</Theme>
<Container width="wider" marginTop>
  <div class="ons-grid ons-grid-flex">
    <div class="ons-grid__col ons-col-3@m ons-u-flex-no-shrink" style="width:100%">
      
      <div class="ons-u-mb-s" style="width:100%">
        <p class='font-bold' style="margin-bottom:0">Select comparison area</p>
        <div >
          <Select
          value={$buildstate.comparison}
          autoClear={false}
          isClearable
          on:select={(e) => ($buildstate.comparison = e.detail)}
          on:clear={() => ($buildstate.comparison = null)}
        />
        </div>
      </div>

      <Checkbox
        id="includemap"
        label="Include map in profile"
        bind:checked={showMapInProfile}
        compact
      ></Checkbox>

      <hr class="hr-full" />
      <div
        style="display: flex;justify-content: space-between;align-items:center;"
      >
        <p class="font-bold dataset">Datasets</p>

        <button
          class="btn-link"
          style="margin-bottom:-4px"
          aria-label="Show all datasets"
          on:click={handleDatasetsShowAllClick}
          >{$buildstate.showAllDatasets ? "Hide all" : "Show all"}</button
        >
      </div>

      {#each Object.entries(topicsGrouped).sort() as [topic, items],i}
        <Twisty title={topic} open={$buildstate.showAllDatasets||i==0}>
          <Checkboxes on:change={handleCheckboxChange}>
            {#each items as item}
              <Checkbox
                id={item.code}
                label={item.label}
                value={item.code}
                compact
                checked={currentTopics.some((t) => t.code === item.code)}
                on:change={handleCheckboxChange}
              ></Checkbox>
            {/each}
          </Checkboxes>
        </Twisty>
        <hr class="hr-full" />
      {/each}

      <div style="height:16px;" />

      <p class="font-bold">Help and guidance for topics</p>
      <p>
        More information about the definition and background of topics is
        available on our <a href="{base}/glossary/">topic glossary</a>.
      </p>
      <p class="font-bold">Looking for another topic?</p>
      <p>
        Due to technical constraints, not all Census 2021 topics can be included
        in this tool.
      </p>
      <p>
        Data for a wider range of topics can be found on <a
          href="https://www.nomisweb.co.uk/sources/census_2021">Nomis</a
        >. Multi-variate data can be found via the
        <a href="https://www.ons.gov.uk/datasets/create"
          >Create a custom dataset</a
        > service.
      </p>
      <div class="ons-u-mb-xl"></div>
    </div>
    <div class="ons-grid__col ons-col-9@m">
      <div id="embed" />
      <hr class="hr-full" />
      <div class="button-container no-margin-left">
        <Button variant="primary" on:click={showEmbed}
          >{$buildstate.showEmbed ? "Hide" : "Show"} embed code</Button
        >
        <Button variant="primary" on:click={downloadData}
          >Download data (CSV)</Button
        >
        <Button variant="primary" on:click={savePNG(pymParent)}
          >Save as image (PNG)</Button
        >
        <Button
          variant="primary"
          on:click={() => document.getElementById("iframe").contentWindow.print()}
        >
          Print profile
        </Button>
        <br/>
        {#if embedHash && $buildstate.showEmbed}
          <p style:margin-bottom={0}>Embed code</p>
          <textarea rows="4" readonly>{makeEmbed(embedHash)}</textarea>
          <Button variant="secondary" on:click={copyEmbed(embedHash)}
            >Copy embed code</Button
          >
        {/if}
      </div>
    </div>
  </div>
</Container>

<style>

.button-container {
    display: flex;
    flex-wrap: wrap;
    row-gap: 10px; /* Adjust spacing */
}

  :global(#lmap) {
    filter: invert(0.9);
    opacity: 0.9;
  }
  :global(.bx--inline-notification__subtitle) {
    margin: 1em;
  }
  :global(.bx--inline-notification__details svg) {
    visibility: hidden;
    width: 0;
    display: none;
  }
  input[type="checkbox"] {
    margin-left: 1px;
  }

  h2 {
    color: #206095;
    margin-bottom: -20px;
  }

  .font-bold {
    font-weight: 700;
  }

  hr.hr-full {
    margin-top: 1rem;
    margin-bottom: 1rem;
    border: 0;
    border-top: 2px solid #707071;
  }

  .dataset {
    margin: 1rem 0;
  }

  :global(div.ons-collapsible__content.ons-js-collapsible-content) {
    border-left: none;
  }

  .area-map-container {
    position: absolute;
    top: 0;
    min-width: 50%;
    right: 0;
  }

  .fade {
    position: absolute;
    height: 100%;
    width: 20%;
    background: linear-gradient(
      to left,
      rgba(255, 255, 255, 0),
      var(--background, #f5f5f5)
    );
    z-index: 1000;
  }

  .header-div {
    height: 300px;
  }

  textarea {
    width: 100%;
  }
</style>
