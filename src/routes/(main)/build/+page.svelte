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
  // import { flip } from "svelte/animate";
  // import tooltip from "$lib/ui/tooltip";
  // import Notice from "$lib/ui/Notice.svelte";
  // import TopicItem from "$lib/ui/TopicItem.svelte";
  // import Icon from "$lib/ui/Icon.svelte";
  // import { cdnbase } from "$lib/config/geography";
  // import { download, clip } from "$lib/util/functions";
  // import { analyticsEvent } from "$lib/layout/AnalyticsBanner.svelte";
  import Select from "$lib/ui/Select.svelte";
  import topicsAll from "$lib/config/topics.json";
  import { simplifyGeo } from "$lib/util/drawing-utils";
  import getParents from "$lib/util/get-parents";
  import { onMount } from "svelte";
  import AreaMapComparison from "$lib/charts/AreaMapComparison.svelte";
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
    // mode: "move",
    // radius: 5,
    // select: "add",
    // showSave: false,
    showEmbed: false,
    topics: [],
    // topicsExpand: false,
    // topicsFilter: "",
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

  <!-- <div style="height:16px;" /> -->

  <!-- <AreaMap/> -->
  <!-- <AreaMap name={$buildstate.name} comp={$buildstate.comparison.areanm} {geojson} compGeojson={$buildstate.comparison.geometry} /> -->
</Theme>
<Container width="wider" marginTop>
  <div class="ons-grid ons-grid-flex">
    <div class="ons-grid__col ons-col-3@m ons-u-flex-no-shrink" style="width:100%">
      <!-- <Checkbox
        id="selectComparison"
        label="Select comparison area"
        bind:checked={selectComparison}
        compact
      ></Checkbox> -->

      <!-- {#if selectComparison} -->
      
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
      <!-- {/if} -->
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
<!-- <nav>
  <div class="nav-left">
    <button class="text" on:click={() => goto(`${base}/draw/`)}>
      <Icon type="chevron" rotation={180} /><span>Edit area</span>
    </button>
  </div>
  <div class="nav-right">
    <button
      title={state.showSave ? "Close save options" : "Save selected area"}
      use:tooltip
      on:click={() => (state.showSave = !state.showSave)}
      class:active={state.showSave}
    >
      <Icon
        type={state.showSave ? "add" : "download"}
        rotation={state.showSave ? 45 : 0}
      />
    </button>
  </div>
</nav>
{#if state.showSave}
  <nav class="tray">
    <div />
    <div class="save-buttons">
      <input
        type="text"
        class="input-text"
        bind:value={state.name}
        placeholder="Type your area name"
      />
      <button
        class="text"
        on:click={async () => {
          let blob = geoBlob(store);
          download(
            blob,
            `${state.name ? state.name.replaceAll(" ", "_") : "custom_area"}.geojson`,
          );
          state.showSave = false;
          let opts = state.name ? { areaName: state.name } : {};
          analyticsEvent({
            event: "fileDownload",
            fileExtension: "json",
            ...opts,
          });
        }}
      >
        <Icon type="download" /><span>Save geography</span>
      </button>
      <button
        class="text"
        on:click={() => {
          var codes = store.properties.oa_all.join(",");
          clip(codes, "Copied output area codes to clipboard");
          state.showSave = false;
          let opts = state.name ? { areaName: state.name } : {};
          analyticsEvent({ event: "geoCopy", ...opts });
        }}
      >
        <Icon type="copy" /><span>Copy area codes</span>
      </button>
    </div>
  </nav>
{/if}
<div class="container">
  <aside class="topics-box">
    <h2>Name your area</h2>
    <input
      type="text"
      class="input-text"
      bind:value={state.name}
      placeholder="Type your area name"
    />

    <label>
      <input type="checkbox" bind:checked={includemap} />
      Include map
    </label>

    {#if parents}
      <h2>Select comparison area</h2>
      <div class="search">
        <Select
          value={state.comparison}
          autoClear={false}
          isClearable
          on:select={(e) => (state.comparison = e.detail)}
          on:clear={() => (state.comparison = null)}
        />
        <button
          title="Upload a saved area"
          use:tooltip
          on:click={() => uploader.click()}
        >
          <Icon type="upload" />
        </button>
        <input
          type="file"
          accept=".geojson,.json"
          style:display="none"
          bind:this={uploader}
          on:input={loadGeo}
        />
      </div>

      <label
        class:label-disabled={!includemap || !state.comparison}
        style:margin-top="8px"
      >
        <input
          type="checkbox"
          bind:checked={includecomp}
          disabled={!includemap || !state.comparison}
        />
        Show on map
      </label>
    {/if}

    <h2>Select topics</h2>
    <input
      type="text"
      class="input-text"
      placeholder="Type to filter"
      bind:value={state.topicsFilter}
    />
    {#each filterTopics(topics, state.topics, regex,highestLevel) as topic, i (topic.code)}
      <div
        animate:flip={{ duration: 500 }}
        style:z-index={state.topics.includes(topic) ? 10 : 0}
      >
        <TopicItem
          {topic}
          {regex}
          show={state.topics.includes(topic) || i < 6 || state.topicsExpand}
          selected={state.topics.includes(topic)}
        >
          <input
            type="checkbox"
            bind:group={state.topics}
            name="topics"
            value={topic}
          />
        </TopicItem>
      </div>
    {/each}
    {#if !regex}
      <button
        class="btn-link"
        style:margin="6px 0"
        on:click={() => (state.topicsExpand = !state.topicsExpand)}
      >
        {state.topicsExpand
          ? "Show fewer"
          : `Show ${state.topics.length > 6 ? topics.length - state.topics.length : topics.length - 6} more`}
      </button>
    {/if}

    <div class="related-content">
      <p><strong>Looking for another topic?</strong></p>
      <p>
        Due to technical constraints, not all Census 2021 topics can be included
        in this tool.
      </p>
      <p>
        Data for a wider range of topics can be found on <a
          href="https://www.nomisweb.co.uk/sources/census_2021"
          target="_blank"
          rel="noreferrer">Nomis</a
        >
        <span style:font-size="0.8em" style:margin="0 2px"
          ><Icon type="launch" /></span
        >. Multi-variate data can be found via the
        <a href="https://www.ons.gov.uk/datasets/create" target="_blank"
          >Create a custom dataset</a
        > service.
      </p>
    </div>
  </aside>
  <article class="profile">
    <h2>Profile preview</h2>

    <div id="embed" />
    <Notice>
      The data and boundaries displayed in this profile are aggregated from
      small areas on a best-fit basis, and therefore may differ slightly from
      other sources.
    </Notice>
    <div class="embed-actions">
      <button
        class="btn-link"
        disabled={!state.topics}
        on:click={() => document.getElementById("iframe").contentWindow.print()}
      >
        Print profile
      </button>
      |
      <button
        class="btn-link"
        on:click={() => {
          pymParent.sendMessage("makePNG", null);
          let opts = state.name ? { areaName: state.name } : {};
          analyticsEvent({
            event: "fileDownload",
            fileExtension: "png",
            ...opts,
          });
        }}
      >
        Save as image (PNG)
      </button>
      |
      <button class="btn-link" disabled={!state.topics} on:click={downloadData}
        >Download data (CSV)</button
      >
      |
      <button
        class="btn-link"
        on:click|preventDefault={() => {
          state.showEmbed = !state.showEmbed;

          setTimeout(() => {
            const el = document.querySelector("textarea");
            if (!el) return;

            el.scrollIntoView({
              behavior: "smooth",
            });
          });
        }}
      >
        {state.showEmbed ? "Hide embed code" : "Show embed code"}
      </button>
      {#if embedHash && state.showEmbed}
        <p style:margin-bottom={0}>Embed code</p>
        <textarea rows="4" readonly>{makeEmbed(embedHash)}</textarea>
        <button
          class="copy-embed"
          on:click={() => {
            clip(makeEmbed(embedHash), "Copied embed code to clipboard");
            let opts = state.name ? { areaName: state.name } : {};
            analyticsEvent({ event: "embed", ...opts });
          }}
        >
          <Icon type="copy" />
          <span>Copy embed code</span>
        </button>
      {/if}
    </div>
  </article>
</div> -->

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
