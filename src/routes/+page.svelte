<script>
  import {
    Container,
    Theme,
    Section,
    Titleblock,
    Button,
    Cards,Card,
    Footer
  } from "@onsvisual/svelte-components";
  import HeaderImage from "$lib/layout/HeaderImage.svelte";
  import Lede from "$lib/layout/Lede.svelte";
  import { base } from "$app/paths";
</script>

<div class="flex flex-col min-h-screen">
  <div class="flex-grow">
    <Theme theme="dark">
      <Titleblock title="Build a custom area profile" background="#206095">
        <HeaderImage/>
        <Lede
          >Create your own profile for local areas with data for England and
          Wales</Lede
        >

        <div style:height="32px" />
        <Button icon="arrow" iconPosition="after" href="{base}/draw"
          >Get started</Button
        >
        
      </Titleblock>
      </Theme>
      <Theme theme="light">
      <Section marginTop>
        <h2>How to use the profile builder</h2>

        <p>How to use the profile builder</p>
        <p>There are two steps to build your custom area profile.</p>
        <p>
          The first is to draw your area. You can do this using the map on the
          next page.
        </p>
        <p>
          The second is to select which datasets you want to add to your
          profile.
        </p>
        <p>
          Once you have drawn your area and chosen your datasets, you will be
          able to build your profile. You will be able to download data and
          charts from your profile.
        </p>
        </Section>
        <!-- <Section width="wide" background="#f5f5f5"> -->
          <Cards>
            <Card title="Step 1 - Create an area profile">
              <p>There are four ways to create an area profile:</p>
          <ol>
            <li>Search for an area in the search box.</li>
            <li>Draw a polygon on the map.</li>
            <li>Draw a circle on the map.</li>
            <li>Upload a saved area.</li>
          </ol>
          <p>Select “Build profile for the area”.</p>
        </Card>
  
            <Card title="Step 2 - Build a profile for the area">
          <p>
            Once you have drawn your area, choose which datasets you want for your
            profile. These are available in the Datasets section.
          </p>
  
          <p>
            Choose as many datasets as you want. The profile will be built as you
            choose your datasets. Your comparison area will be preset depending on
            the area you drew in Step 1. You can change this comparison area.
          </p>
        </Card>
      </Cards>
        <!-- </Section> -->
        <Section>
        
        

        <h3>Which datasets are available?</h3>
        <p>This is a list of the datasets available through this tool:</p>
        <h4>Census 2021 datasets:</h4>
        <ul>
          <li>Dataset name 1</li>
          <li>Dataset name 2</li>
          <li>Dataset name 3</li>
          <li>Dataset name 4</li>
        </ul>
        <h4>Non-Census datasets:</h4>

        <ul>
          <li>Dataset name 1</li>
          <li>Dataset name 2</li>
          <li>Dataset name 3</li>
          <li>Dataset name 4</li>
        </ul>

        <h3>How does this tool produce these figures?</h3>
          <p>The tool takes your chosen shape and compares it to your selected datasets.</p>
          <p>It produces a best-fit shape, which is the closest available to your chosen shape. It adds up the data for your best-fit shape and returns it as an estimated total.</p>
          <p>Census 2021 datasets and non-Census datasets use different small area types.</p>
          <p>Census 2021 datasets use Output Areas (OAs) whereas non-Census datasets use larger Lower layer Super Output Areas (LSOAs).</p>
          <p>We advise caution when comparing values between Census and non-Census datasets because these best-fit shapes will have different boundaries.</p>
      </Section>
    </Theme>
  </div>
</div>
<Footer />
