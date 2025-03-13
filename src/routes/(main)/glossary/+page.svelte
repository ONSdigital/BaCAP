<script>
  import topicsAll from "$lib/config/topics.json";
  import { base } from "$app/paths";
  import {
    Theme,
    Breadcrumb,
    Container,
    Titleblock,
    Button,
  } from "@onsvisual/svelte-components";
</script>

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
        { label: "Area profile", href: `${base}/build/` },
      ]}
    />
    <Container width="wider">
      <h2>Datasets</h2>
    </Container>
    <Titleblock width="wider" title="Glossary" />
  </div>
</Theme>

<Container width="wider" marginTop>
  <div class="ons-grid ons-grid-flex">
    <div class="ons-grid__col ons-col-3@m ons-u-flex-no-shrink">
      <h3>Topics</h3>
      {#each topicsAll.sort((a, b) => a.label.localeCompare(b.label)) as topic}
        <!-- <Button href={`${base}/glossary#${topic.code}`}>{topic.label}</Button> -->
        <div><a class="btn-link" href={`${base}/glossary#${topic.code}`}>{topic.label}</a></div><br/>
      {/each}
    </div>
    <div class="ons-grid__col ons-col-9@m">
      {#each topicsAll.sort((a, b) => a.label.localeCompare(b.label)) as topic}
        <p id={topic.code} class="bold">{topic.label}</p>
        {#if topic.descLong}
            {@html topic.descLong}
        {:else}
            <p>{topic.desc}</p>
        {/if}
        {#if topic.url}<a class="btn-link" href={`${base}/${topic.url}`} target="_blank">Read more</a>{/if}
        <hr class="hr-full">
      {/each}
    </div>
  </div>
</Container>

<style>
  .bold {
    font-weight: bold;
  }

  p.bold{
    margin-top:16px;
    margin-bottom: 28px;
  }
</style>
