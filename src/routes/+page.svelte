<script>
  import {
    Container,
    Theme,
    Section,
    Titleblock,
    Button,
    Cards,Card,
    Footer,
    Twisty
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
        <Section width="wide">
          
        
        

        <h3>Which datasets are available?</h3>
        <p>This is a list of the datasets available through this tool:</p>
        <Twisty title="Census 2021 datasets">
          <ul class="list-container">
            <li class="list-item">Age profile</li>
            <li class="list-item">Country of birth</li>
            <li class="list-item">Disability</li>
            <li class="list-item">Ethnic group</li>
            <li class="list-item">General health</li>
            <li class="list-item">Highest level of qualification</li>
            <li class="list-item">National identity</li>
            <li class="list-item">Proficiency in English</li>
            <li class="list-item">Religion</li>
            <li class="list-item">Sex</li>
            <li class="list-item">Welsh language skills</li>
            <li class="list-item">Welsh speaking ability</li>
            <li class="list-item">Accommodation type</li>
            <li class="list-item">Household composition</li>
            <li class="list-item">Household deprivation</li>
            <li class="list-item">Household size</li>
            <li class="list-item">Legal partnership status</li>
            <li class="list-item">Length of residence in the UK</li>
            <li class="list-item">Number of bedrooms</li>
            <li class="list-item">Number of cars and vans</li>
            <li class="list-item">Number of households</li>
            <li class="list-item">Occupancy rating for bedrooms</li>
            <li class="list-item">Tenure of household</li>
            <li class="list-item">Economic activity status</li>
            <li class="list-item">Employment history</li>
            <li class="list-item">Hours per week worked</li>
            <li class="list-item">Occupation</li>
            <li class="list-item">Socio-economic classification (NS-Sec)</li>
            <li class="list-item">Provision of unpaid care</li>
            <li class="list-item">Central heating</li>
            <li class="list-item">Distance travelled to work</li>
            <li class="list-item">Method of travel to workplace</li>
            <li class="list-item">Population</li>
            <li class="list-item">Residential property sales</li>
            <li class="list-item">School children and full-time students</li>
            <li class="list-item">Second address indicator</li>
            <li class="list-item">Passports held</li>
        </ul>
        </Twisty>
        <div style="height: 16px"></div>
        
        <Twisty title="Non-Census datasets">
          <ul class="list-container">
              <li class="list-item">Residential house sales</li>
              <li class="list-item">Energy efficiency</li>
          </ul>
        </Twisty>
        <div style="height: 16px"></div>
      </Section>
      <Section>
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
<style>
  .list-container {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            list-style-type: none;
            padding: 0;
        }
  .list-item {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 10px 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      min-width: 200px;
      flex: 1 1 auto;
      transition: all 0.2s ease;
  }
  /* .list-item:hover {
      background-color: #e9ecef;
      transform: translateY(-2px);
      box-shadow: 0 3px 5px rgba(0,0,0,0.15);
  } */
  @media (max-width: 768px) {
      .list-item {
          min-width: 150px;
      }
  }
  @media (max-width: 480px) {
      .list-item {
          min-width: 100%;
      }
  }
</style>