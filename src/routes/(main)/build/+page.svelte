<script>
  import {
    Titleblock,
    Breadcrumb,
    Theme,
    Container,
    Button,
    Checkbox,
    Notice,
    Twisty,
    Checkboxes,
    Input,
    Grid,
    GridCell,
    Icon
  } from "@onsvisual/svelte-components";
  import ONSloader from "$lib/ui/ONSloader.svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import pym from "pym.js";
  import Select from "$lib/ui/Select.svelte";
  import topicsAll from "$lib/config/topics.json";
  import { simplifyGeo } from "$lib/util/drawing-utils";
  import getParents from "$lib/util/get-parents";
  import { onMount } from "svelte";
  import bbox from "@turf/bbox";
  import AreaMap from "$lib/charts/AreaMap.svelte";
  import AreaMapComparison from "$lib/charts/AreaMapComparison.svelte";
  import { download } from "$lib/util/functions";
  import { copyAreasToClipboard } from "$lib/config/toolbar"

  import {
    getData,
    downloadData,
    makeEmbed,
    copyEmbed,
    handleDatasetsShowAllClick,
    savePNG,
    checkForHashSelection,
    groupTopics,
    updateLocalStorage,
    filterTopics,
    loadGeo,
  } from "$lib/util/build-utils";
  import {
    isLoading,
    state,
    buildstate,
    tables,
    version,
  } from "$lib/stores/mapstore";

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
  let showMapInProfile = true;
  let includecomp = false;
  let store;
  let geojson;
  let parents;
  let topics = [];
  let uploader; // DOM element for geojson file upload
  // let selectComparison = true;

  // initial $buildstate
  $buildstate = {
    start: false,
    showEmbed: false,
    showDownloadOptions: false,
    topics: [],
    compressed: { oa: [""], lsoa: [""] },
    comparison: { oa: ["K04000001"], lsoa: ["K04000001"] },
    showAllDatasets: false,
  };

  let nameChangeInputValue;

  function handleCheckboxChange(event) {
    const { item } = event.detail;

    const id = item.id;
    const checked = item.checked;
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
    console.log({store})

    if (!store) {
      alert("No area selected! Redirecting to the drawing page...");
      goto(`${base}/draw/`);
    }

    await processStoreData(store);
    isLoading.set(false);
  }

  onMount(init);

  ////////////////////////////////////////////////////////////////
  // Processing functions
  ////////////////////////////////////////////////////////////////
  async function updateProfile(
    start,
    name,
    comparison,
    topics,
    showMapInProfile,
    includecomp
  ) {
    if (!start || !$buildstate.compressed) return;

    updateLocalStorage(store);
    let codes = topics.map((d) => d.code);

    $tables = await getData(filterTopicsByCodes(codes), comparison);
    embedHash = generateEmbedHash(
      name,
      comparison,
      showMapInProfile,
      includecomp
    );
    updateEmbedFrame();
  }

  function generateEmbedHash(name, comp, showMapInProfile, includecomp) {
    return `#/?name=${btoa(name)}${
      comp ? `&comp=${btoa(comp.areanm)}` : ""
    }&tabs=${btoa(JSON.stringify($tables))}${
      showMapInProfile ? `&poly=${btoa(JSON.stringify(geojson))}` : ""
    }${
      showMapInProfile && includecomp && comp?.geometry
        ? `&comppoly=${btoa(JSON.stringify((comp.geometry)))}`
        : ""
    }${
      showMapInProfile ? `&showMap=${showMapInProfile}` : ""
    }${`&version=${btoa($version)}`}`;
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

  async function processStoreData(store) {
    highestLevel = store.properties.highestLevel;
    geojson = simplifyGeo(store.geojson);
    parents = await getParents(store.properties.compressed);
    coverage = parents.coverage;
    topics = filterTopics(topicsAll, highestLevel, coverage);
    topicsGrouped = groupTopics(topics);

    $state.name = store.properties.name || "";

    $buildstate = {
      ...$buildstate,
      name: $state.name,
      codes: { oa: store.properties.oa_all, lsoa: store.properties.lsoa_all }, //needs to store oa and lsoa and compressed lists
      compressed: {
        oa: store.properties.compressed,
        lsoa: store.properties.compressedLsoa,
      },
      comparison: parents.parents,
    };

    nameChangeInputValue = $state.name;
    $buildstate.start = true;
    currentTopics = [topics[0]]; // Default to population topic
  }

  $: if ($buildstate.start && $buildstate.compressed) {
    updateProfile(
      $buildstate.start,
      $state.name,
      $buildstate.comparison,
      currentTopics,
      showMapInProfile,
      includecomp
    );
  }

  let showChangeName = false;
  function handleChangeName() {
    showChangeName = !showChangeName;
  }

  function saveNameChange() {
    showChangeName = false;
    $buildstate.name = nameChangeInputValue;
    $state.name = nameChangeInputValue;
    store.properties.name = nameChangeInputValue;
    updateLocalStorage(store);
  }

  function cancelChangeName() {
    showChangeName = false;
  }

  function handleSelect(e) {
    e.detail.codes = {
      oa: e.detail.areacd === "K04000001" ? ["E92000001", "W92000004"] : e.detail.oa21cds || [],
      lsoa: e.detail.areacd === "K04000001" ? ["E92000001", "W92000004"] : e.detail.lsoa21cds || []
    };
    const geo = e.detail
    geo.geometry = simplifyGeo(geo.geometry);
    $buildstate.comparison = geo;
  }

  function handleClearSelect() {
    $buildstate.comparison = null;
  }

  function downloadBuildGeoJSON() {
    if (!store?.geojson) return;

    const name = store.properties?.name || "Custom area";
    const fileName = `${name.replaceAll(" ", "_")}.geojson`;

    const geojson = {
      type: "Feature",
      properties: {
        name,
        bbox: bbox(store.geojson),
        codes: store.properties.oa_all,
        codes_compressed: store.properties.compressed,
        codes_compressed_to_lsoa: store.properties.compressedLsoa
      },
      geometry: store.geojson.geometry
    };
    console.log({store, geojson})
    const blob = new Blob([JSON.stringify(geojson)], {
      type: "application/json",
    });

    download(blob, fileName);
  }

  let confirmed = {oa: false, lsoa: false};

async function setConfirmed(type = 'oa') {
  confirmed[type] = true;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  confirmed[type] = false;
}

</script>

<ONSloader isLoading={$isLoading} />
<Theme theme="light" background="#F5F5F6">
  <div class="header-div">
    <Breadcrumb
      width="wider"
      links={[
        { label: "Home", href: "/", refresh: true },
        {
          label: "Build a custom area profile",
          href: `${base}/`,
          refresh: true,
        }
      ]}
    />

    <!-- <Titleblock width="wider" title={$buildstate.name}></Titleblock> -->
    <Titleblock cls="build-titleblock" width="wider" title="Area profile{$state.name ? ` for ${$state.name}` : ''}" />
    <Container width="wider">
      {#if showChangeName}
        <Input
          bind:value={nameChangeInputValue}
          hideLabel
          label="Enter area name"
        />
        <Button variant="secondary" small on:click={cancelChangeName}>Cancel</Button>
        <Button variant="primary" small on:click={saveNameChange}>Save</Button>
      {:else if showChangeName == false}
        <Button small icon="arrow" iconRotation={180} href={`${base}/draw/`}
          >Edit area</Button
        >
        <Button variant="secondary" small on:click={handleChangeName}
          >{$state.name ? 'Change' : 'Set'} area name</Button
        >
      {/if}
    </Container>
  </div>

  <div class="area-map-container">
    <div class="fade" />
    {#if store}
      <AreaMap name={$state.name} comp={null} geojson={store.geojson.geometry} />
    {/if}
  </div>
</Theme>
<Container width="wider" marginTop>
  <div class="ons-grid ons-grid-flex">
    <div
      class="ons-grid__col ons-col-3@l ons-col-4@m ons-u-flex-no-shrink select-panel"
      style="width:100%"
    >
      <div class="ons-u-mb-s" style="width:100%">
        <div class="ons-u-mb-2xs">
          <Select
            id="comparison-search"
            value={$buildstate.comparison}
            autoClear={false}
            isClearable
            on:select={handleSelect}
            on:clear={handleClearSelect}
            label="Select comparison area"
          />
        </div>
        <div>
          <input
            type="file"
            accept=".geojson,.json"
            style:display="none"
            bind:this={uploader}
            on:input={async () => {
              const geo = await loadGeo(uploader);
              if (geo) handleSelect({detail: geo});
            }}
          />
          <div class="upload-button">Or <Button variant="secondary" icon="upload" small on:click={() => uploader.click()}>Upload saved area</Button></div>
        </div>
      </div>

      <hr class="hr-full" />

      <Checkbox
        id="showMapInProfile"
        label="Show map in profile"
        bind:checked={showMapInProfile}
        compact
      ></Checkbox>
      <Checkbox
        id="includecomp"
        label="Show comparison area"
        bind:checked={includecomp}
        compact
        disabled={!showMapInProfile}
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
          small
          on:click={handleDatasetsShowAllClick}
          >{$buildstate.showAllDatasets ? "Hide all" : "Show all"}</button
        >
      </div>
      {#each Object.entries(topicsGrouped).sort() as [topic, items], i}
        <Twisty title={topic} open={$buildstate.showAllDatasets || i == 0}>
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
    <div class="ons-grid__col ons-col-9@l ons-col-8@m">
      {#if $version >= 2}
        <Notice>
          Census topics and non-Census datasets will primarily use different
          best-fit shapes to estimate the data to be returned to users.
        </Notice>
        {#if store?.properties.oa_all}
          <div class="ons-u-mt-s ons-u-mb-s">
            <Twisty title="See the difference in best-fit shapes">
              <p>
                The map below shows the best-fit shape, which is the closest
                available to your chosen shape. The small area data has been
                added together for your best-fit shape and provides you with an
                estimated total. Census 2021 topics and non-Census datasets use
                different small area types. We advise caution when comparing
                values between Census topics and non-Census datasets because
                these best-fit shapes will have different boundaries.
              </p>
              {#if store.properties.oa_all && store.properties.lsoa_all && store.geojson}
                <AreaMapComparison
                  name={$state.name}
                  comp={null}
                  geojson={store.geojson.geometry}
                  oa_all={store.properties.oa_all}
                  lsoa_all={store.properties.lsoa_all}
                />
              {/if}
            </Twisty>
          </div>
        {/if}
      {/if}

      <div id="embed"/>
      <hr class="hr-full" />
      <div class='button-group'>
          <Button variant="primary" small icon='chevron' iconRotation={$buildstate.showEmbed ? 90 : 0} 
          on:click={() => {
            $buildstate.showEmbed = !$buildstate.showEmbed
            $buildstate.showDownloadOptions = false
          }}
          >{$buildstate.showEmbed ? "Hide" : "Show"} embed code</Button
        >
        <Button variant="primary" small icon='chevron' iconRotation={$buildstate.showDownloadOptions ? 90 : 0} 
        on:click={() => {
          $buildstate.showDownloadOptions = !$buildstate.showDownloadOptions
          $buildstate.showEmbed = false
        }}
        >{$buildstate.showDownloadOptions ? "Hide" : "Show"} download options</Button
        >
        <Button
          variant="primary"
          small
          icon='print'
          on:click={() =>
            document.getElementById("iframe").contentWindow.print()}
        >
          Print profile
        </Button>

    </div>
      

        {#if embedHash && $buildstate.showEmbed}
        <div class='ons-field button-group'>
          <label class='ons-label' for='embed-textarea'>Embed code</label>
          <textarea rows="4" readonly class="ons-input ons-input--textarea" id='embed-textarea' >{makeEmbed(embedHash)}</textarea>
          <Button variant="secondary" small icon='copy' 
          on:click={() => {
            copyEmbed(embedHash)
            setConfirmed("embed")
            }}
            >Copy embed code</Button
          >
          {#if confirmed.embed}
          <Icon type="tick" marginLeft/>{/if}
          </div>
        {/if}

        {#if $buildstate.showDownloadOptions}
        <div class="ons-field button-group">
          <p class='ons-label'>Download profile</p>
         <Button variant="primary" small icon='download' on:click={downloadData}
          >Download data (CSV)</Button>
        <Button variant="primary" small icon='download' on:click={() => savePNG(pymParent)}
          >Download image (PNG)</Button>
        <Button
          variant="primary"
          small
          icon='download'
          on:click={downloadBuildGeoJSON}
        >
          Download geography (GeoJSON)
        </Button>

       
        <label class='ons-label' for='oa-textarea'>Output Area codes</label>
        <textarea rows="2" readonly id='oa-textarea' class="ons-input ons-input--textarea" >{store.properties.oa_all.join(",")}</textarea>

         <Button variant="secondary" small icon="copy" on:click={async () => {
                const hasCopied = copyAreasToClipboard(store.properties.oa_all);
                if (hasCopied) setConfirmed('oa');
                }}>
                Copy Output Area codes
          </Button>
              {#if confirmed.oa}
          <Icon type="tick" marginLeft/>{/if}
   
          <label class='ons-label' for='lsoa-textarea'>LSOA codes</label>
        <textarea rows="2" readonly id='lsoa-textarea' class="ons-input ons-input--textarea" >{store.properties.lsoa_all.join(",")}</textarea>
          <Button variant="secondary" small icon="copy" on:click={async () => {
                const hasCopied = copyAreasToClipboard(store.properties.lsoa_all);
                if (hasCopied) setConfirmed('lsoa');
                }}>
                Copy LSOA codes
          </Button>
              {#if confirmed.lsoa}
          <Icon type="tick" marginLeft/>{/if}
          </div>
        {/if}
      
    </div>
  </div>
</Container>

<style>

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
    border-top: 1px solid #707071;
  }

  .dataset {
    margin: 1rem 0;
  }

  :global(div.ons-collapsible__content.ons-js-collapsible-content) {
    border-left: none;
    padding-left: 0;
  }

  .area-map-container {
    position: absolute;
    display: none;
    top: 0;
    width: 40%;
    max-width: 440px;
    right: 0;
  }
  @media (min-width: 640px) {
    .area-map-container {
      display: block;
    }
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
    z-index: 1;
  }

  .header-div {
    height: 300px;
  }

  textarea {
    width: 100%;
  }

  :global(.build-titleblock h1) {
    display: block;
    font-size: 36px;
    z-index: 2;
    width: 60vw;
    min-width: 350px;
  }
  :global(.build-titleblock .ons-hero__details) {
    padding-bottom: 0;
  }

  .ons-field > :global(.ons-icon) {
    color: var(--ons-color-success);
  }

   .ons-label {
    margin: 1em 0 0.25em;
   }

   .button-group :global(.ons-btn) {
      margin: 0 2px 8px 0;
   }

   .upload-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
   }
</style>
