<script>
  import {
    Titleblock,
    Breadcrumb,
    Theme,
    Container,
    Button,
    Checkbox,
    Divider,
    Twisty,
    Checkboxes,
  } from "@onsvisual/svelte-components";
  import { centroids, isLoading, state, selected } from "$lib/stores/mapstore";
  import ONSloader from "$lib/ui/ONSloader.svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { flip } from "svelte/animate";
  import pym from "pym.js";
  import tooltip from "$lib/ui/tooltip";
  import Notice from "$lib/ui/Notice.svelte";
  import TopicItem from "$lib/ui/TopicItem.svelte";
  import Icon from "$lib/ui/Icon.svelte";
  import Select from "$lib/ui/Select.svelte";
  import topicsAll from "$lib/config/topics.json";
  import { simplifyGeo, geoBlob } from "$lib/util/drawing-utils";
  import getTable from "$lib/util/get-table";
  import getParents from "$lib/util/get-parents";
  import { cdnbase } from "$lib/config/geography";
  import { download, clip } from "$lib/util/functions";
  import { onMount } from "svelte";
  import { analyticsEvent } from "$lib/layout/AnalyticsBanner.svelte";
  import AreaMap from "$lib/charts/AreaMap.svelte";
  import {getAreaData, getName, downloadData, geographyLookup, GEOGRAPHY_LEVELS, makeEmbed, copyEmbed, showEmbed } from "$lib/util/build-utils";
  import { buildstate, tables, topicsLookup } from "$lib/stores/mapstore";

  // let isLoading = false;
  let pymParent; // Variabl for pym
  let embedHash; // Variable for embed hash string
  // let tables = []; // Array to hold table data
  let includemap = true;
  let includecomp = false;
  let parents;
  let coverage = ["E", "W"];
  let topics = [...topicsAll]; // Topics might be filtered based on coverage
  let uploader; // DOM element for geojson file upload
  let highestLevel = "oa";

  $topicsLookup = Object.fromEntries(topics.map((d) => [d.code, d]));
  // would this not be better off as a MAP and not a dict?

  $buildstate = {
    mode: "move",
    radius: 5,
    select: "add",
    name: "",
    showSave: false,
    showEmbed: false,
    topics: [topics[0]],
    topicsExpand: false,
    topicsFilter: "",
    comparison: null,
  };

  let topicsGrouped = {};

  let currentTopics = [];
  tables.subscribe(value => currentTopics = value);

  function handleCheckboxChange(event) {
    const { id, checked } = event.detail;
    tables.update(currentTopics => {
      if (checked && !currentTopics.includes(id)) {
        return [...currentTopics, id];
      } else if (!checked && currentTopics.includes(id)) {
        return currentTopics.filter(topicId => topicId !== id);
      }
      return currentTopics;
    });
  }

  let selectComparison = true;

  // Creates a geography filter function for use in a filter chain
  const geographyFilter = (selectedGeography) => {
    const selectedLevel = GEOGRAPHY_LEVELS.indexOf(
      selectedGeography.toLowerCase()
    );

    // Return a filter function
    return (topic) => {
      // If selected level is lsoa or higher, keep all topics. this is hardcoded
      if (selectedLevel >= GEOGRAPHY_LEVELS.indexOf("lsoa")) {
        return true;
      }
      // For oa, only keep topics with lowestGeography === 'oa'
      return topic.lowestGeography?.toLowerCase() === "oa";
    };
  };

  function filterTopics(topics, selected, regex, highestLevel) {
    /// display only those which exist
    let topicsStart = [];
    let topicsEnd = [];

    [...topics]
      .filter(geographyFilter(highestLevel))
      .filter(
        (t) => !t.coverage || t.coverage.every((c) => coverage.includes(c))
      )
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach((topic) => {
        if (selected.includes(topic)) {
          topicsStart.push(topic);
        } else {
          topicsEnd.push(topic);
        }
      });
    if (regex) topicsEnd = topicsEnd.filter((t) => regex.test(t.label));
    return [...topicsStart, ...topicsEnd];
  }
  $: regex =
    state.topicsFilter.length > 1 ? new RegExp(state.topicsFilter, "i") : null;

  let store;
  let geojson;

  // async function getAreaData(code, options = {}) {
  //   const res = await fetch(`${cdnbase}/${code.slice(0, 3)}/${code}.json`);
  //   const data = await res.json();
  //   const compressed = data.properties.c21cds;
  //   return {
  //     geojson: data,
  //     properties: {
  //       oa_all: !options?.comparison ? $centroids.expand(compressed) : null,
  //       compressed,
  //       name: data.properties.hclnm
  //         ? data.properties.hclnm
  //         : data.properties.areanm
  //           ? data.properties.areanm
  //           : code,
  //       highestLevel: $centroids.identifyHighestGeography(compressed),
  //     },
  //   };
  // }

  async function init() {
    isLoading.set(true);

    // in case we call for a pre loaded area as a hash string
    let hash = window.location.hash;
    if (hash.match(/#[EKNSW]\d{8}/)) {
      let code = hash.slice(1);
      try {
        const info = await getAreaData(code);
        localStorage.setItem("onsbuild", JSON.stringify(info));
        analyticsEvent({
          event: "hashSelect",
          areaCode: code,
          areaName: info.properties.name,
        });
      } catch (err) {
        console.error("Error fetching or processing data:", err.message, err.stack);
        console.warn(`Requested GSS code ${code} is unavailable or invalid.`);
        history.replaceState(null, "", " ");
      }
    }

    // resume as normal
    store = JSON.parse(localStorage.getItem("onsbuild"));

    if (!store) {
      alert("Warning, no area selected! Redirecting to the drawing page.");
      goto(`${base}/draw/`);
    }

    highestLevel = store.properties.highestLevel;

    topicsAll
      .filter(geographyFilter(highestLevel))
      .filter(
        (t) => !t.coverage || t.coverage.every((c) => coverage.includes(c))
      )
      .forEach((item) => {
        if (!topicsGrouped[item.topic]) {
          topicsGrouped[item.topic] = [];
        }
        topicsGrouped[item.topic].push(item);
      });

    geojson = simplifyGeo(store.geojson);

    let props = store.properties;
    // console.log('props', props);

    $buildstate.name = props.name;
    $buildstate.codes = props.oa_all;
    $buildstate.compressed = props.compressed;

    let par = await getParents($buildstate.compressed);
    coverage = par.coverage;
    parents = par.parents;
    topics = topicsAll.filter(
      (t) => !t.coverage || coverage.every((c) => t.coverage.includes(c))
    );
    $buildstate.comparison = parents[0];

    $buildstate.start = true;
    // console.warn(state.compressed);
    isLoading.set(false);
  }

  onMount(init);

  ////////////////////////////////////////////////////////////////
  // Processing functions
  ////////////////////////////////////////////////////////////////
  let cache = {};
  async function getData(data, comp) {
    if (!state.start) return [];
    if (!cache[comp]) cache[comp] = {};
    let tables = [];
    for (let i = 0; i < data.length; i++) {
      let table;
      if (cache[comp][data[i].code]) {
        table = cache[comp][data[i].code];
      } else {
        table = await getTable(data[i], state, comp);
        cache[comp][data[i].code] = table;
      }
      tables.push({ code: data[i].code, data: table });
    }
    console.log("tables", tables);
    return tables;
  }

  async function updateProfile(
    start,
    name,
    comp,
    data,
    includemap,
    includecomp
  ) {
    if (start) {
      var ls = JSON.parse(localStorage.getItem("onsbuild"));
      ls.properties.name = name;
      localStorage.setItem("onsbuild", JSON.stringify(ls));

      let codes = data.map((d) => d.code);
      let compcds = comp?.codes ? comp.codes.join(";") : comp?.areacd || "";
      $tables = await getData(
        topics.filter((t) => codes.includes(t.code)),
        compcds
      );

      embedHash = `#/?name=${btoa(name)}${
        comp ? `&comp=${btoa(comp.areanm)}` : ""
      }&tabs=${btoa(JSON.stringify($tables))}${
        includemap ? `&poly=${btoa(JSON.stringify(geojson))}` : ""
      }${
        includemap && includecomp && comp?.geometry
          ? `&comppoly=${btoa(JSON.stringify(simplifyGeo(comp.geometry)))}`
          : ""
      }`;

      // alert(population)

      if (!pymParent) {
        pymParent = new pym.Parent("embed", `${base}/embed/${embedHash}`, {
          name: "embed",
          id: "iframe",
          title: "Embedded area profile",
        });
        isLoading.set(false);
      } else {
        document.getElementById("iframe").contentWindow.location.hash =
          embedHash;
      }
    }
  }

  

  $: updateProfile(
    $buildstate.start,
    $buildstate.name,
    $buildstate.comparison,
    $buildstate.topics,
    includemap,
    includecomp
  );

  $:{console.log(currentTopics)}

  

  function loadGeo() {
    let file = uploader.files[0] ? uploader.files[0] : null;

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Read + simplify the boundary
          let b = JSON.parse(e.target.result);

          if (b.type == "FeatureCollection") {
            b = b.features[0];
          } else if (b.type == "Geometry") {
            b = { type: "Feature", geometry: b };
          }
          if (!b.properties) b.properties = {};

          if (!b?.properties?.codes_compressed && b?.geometry) {
            if (JSON.stringify(b.geometry).length > 10000)
              b.geometry = simplifyGeo(b.geometry, 10000);
            const oas = $centroids.contains(b);
            b.properties.codes_compressed = $centroids.compress([...oas.oa]);
          }

          if (b) {
            const props = b.properties;
            state.comparison = {
              areanm: props.areanm
                ? props.areanm
                : props.name
                  ? props.name
                  : "Custom area",
              areacd: props.areacd
                ? props.areacd
                : props.code
                  ? props.code
                  : "",
              group: "Uploaded area",
              geometry: b.geometry,
              codes: b.properties.codes_compressed,
            };
            analyticsEvent({
              event: "geoUpload",
              areaName: state.comparison.areanm,
            });
          } else {
            alert("Please upload a valid GeoJSON file.");
          }
        } catch {
          alert("Error. Please make sure you uploaded a valid GeoJSON file.");
        }
      };
      reader.readAsText(file);
    }
  }
  console.log($buildstate);

  let showAll = false;
  function handleShowAllClick() {
    showAll = !showAll;
  }
</script>

<!-- <ONSloader isLoading={$isLoading} /> -->
<Theme theme="light" background="#F5F5F6">
  <Breadcrumb
    width="wider"
    links={[
      { label: "Home", href: "https://www.ons.gov.uk/", refresh: true },
      { label: "Build a custom area profile", href: `${base}/`, refresh: true },
      { label: "Edit map", href: `${base}/draw/` },
    ]}
  />
  <Container width="wider">
    <h2>Area profile</h2>
    
  </Container>
  <Titleblock width="wider" title={$buildstate.name}></Titleblock>
  <Container width="wider">
    <Button variant="secondary">Change area name</Button>
  </Container>
  <div style="height:16px;" />

  <!-- <AreaMap/> -->
</Theme>
<Container width="wider" marginTop>
  <div class="ons-grid ons-grid-flex">
    <div class="ons-grid__col ons-col-3@m ons-u-flex-no-shrink">
      <Checkbox
        id="selectComparison"
        label="Select comparison area"
        bind:checked={selectComparison}
        compact
      ></Checkbox>

      {#if selectComparison}
        <div>
          <Select
            value={state.comparison}
            autoClear={false}
            isClearable
            on:select={(e) => (state.comparison = e.detail)}
            on:clear={() => (state.comparison = null)}
          />
        </div>
      {/if}
      <hr class="hr-full" />
      <div style="display: flex;justify-content: space-between;align-items:center;">
        <p class="font-bold dataset">Datasets</p>

        <button class="btn-link" style="margin-bottom:-4px" aria-label="Show all datasets" on:click={handleShowAllClick}>{showAll ? 'Hide all' : 'Show all'}</button
        >
      </div>

      {#each Object.entries(topicsGrouped) as [topic, items]}
        <Twisty title={topic} open={showAll}>
          <Checkboxes on:change={handleCheckboxChange}>
          {#each items as item}
            <Checkbox
              id={item.code}
              label={item.label}
              value={item.code}
              compact
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
      <div class="ons-pl-grid-col">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
        fermentum felis in velit accumsan, eget pulvinar risus sollicitudin.
        Pellentesque eget ullamcorper ante. Vivamus id eros tristique, gravida
        odio at, dapibus nunc. Proin quis ullamcorper sapien, vel mollis massa.
        Proin quis eros sem. Integer elit quam, eleifend vel est ac, consectetur
        dignissim quam. Nullam commodo odio non suscipit ullamcorper. Mauris a
        iaculis purus. Morbi scelerisque pretium auctor. Maecenas iaculis
        vehicula dolor, ac aliquet felis mattis ut. Sed lacinia suscipit augue
        vitae facilisis. Quisque dolor neque, dignissim a lobortis non,
        tincidunt tincidunt eros. Nunc vitae dolor massa.
      </div>
      <hr class="hr-full" />
      <Button variant="secondary" on:click={showEmbed}>{$buildstate.showEmbed ? 'Hide' : 'Show'} embed code</Button>
      <Button variant="primary" on:click={downloadData}>Download data (CSV)</Button>
      {#if embedHash && $state.showEmbed}
        <p style:margin-bottom={0}>Embed code</p>
        <textarea rows="4" readonly>{makeEmbed(embedHash)}</textarea>
        <Button variant="secondary" on:click={copyEmbed}>Copy embed code</Button>
      {/if}
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

  .dataset{
    margin:1rem 0;
  }

  :global(div.ons-collapsible__content.ons-js-collapsible-content){
    border-left: none;
  }
</style>
