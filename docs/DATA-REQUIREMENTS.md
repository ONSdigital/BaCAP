# Data requirements

This document sets out what a dataset hosted on [Nomis](https://www.nomisweb.co.uk/) needs in order
to be included in the
[Build a Custom Area Profile (BaCAP)](https://www.ons.gov.uk/visualisations/customprofiles) service.
It is aimed at data owners and publishers interested to include their data. For an overview of how
the app itself works, see [ARCHITECTURE.md](./ARCHITECTURE.md).

- [Why BaCAP needs consistent data](#why-bacap-needs-consistent-data)
- [Requirements](#requirements)
    - [1. Counts, or numerators and denominators](#1-counts-or-numerators-and-denominators)
    - [2. Available down to LSOA or Output Area level](#2-available-down-to-lsoa-or-output-area-level)
    - [3. Coverage of England, Wales or both](#3-coverage-of-england-wales-or-both)
    - [4. A full geography hierarchy on Nomis](#4-a-full-geography-hierarchy-on-nomis)
    - [5. 2021 geography boundaries](#5-2021-geography-boundaries)
- [Checklist](#checklist)

## Why BaCAP needs consistent data

BaCAP lets users build a data profile for **any** area of England and Wales: a shape they have drawn
on a map, an uploaded boundary, or a named area such as a parliamentary constituency or a ward. Most
of these are not areas that statistics are widely published for. Instead, BaCAP describes each area
as a set of small statistical areas, either Output Areas (OAs) or Lower-layer Super Output Areas
(LSOAs), selected on a best-fit basis. It then asks the Nomis API to **aggregate the data for those
small areas on the fly**, at the moment the user requests it.

A large area can contain tens of thousands of OAs. Listing every one of them would be too large to
send to Nomis, and would make Nomis do a great deal of work for every request. To avoid this, BaCAP
compresses each area before requesting data for it. Wherever an area contains **every** OA in an
LSOA, every LSOA in an MSOA, every MSOA in a local authority, and so on, BaCAP replaces those small
areas with the single higher-level code. A request for a large custom area therefore looks something
like "this region, plus these two local authorities, plus these 40 MSOAs, plus these 300 OAs",
rather than a list of 30,000 OAs.

This only works if Nomis already holds the dataset for **every level of a consistent geography
hierarchy**, built from the same small areas. When it does:

- requests are much shorter and faster, so profiles load quickly for users;
- Nomis sums a small number of pre-generated totals instead of thousands of small-area values, which
  greatly reduces the work it has to do under the hood. This matters most for large custom areas and
  for other relatively large non-administrative areas, such as parliamentary constituencies.

If any level of the hierarchy is missing, or is built on different boundaries, requests that include
codes at that level will fail or return inconsistent figures, so the dataset cannot be used in
BaCAP.

## Requirements

### 1. Counts, or numerators and denominators

Data must be published as **counts** that can be added together across areas, for example numbers of
people, households or dwellings.

Percentages, rates, averages and other normalised values **cannot be aggregated**, because adding or
averaging them across small areas gives the wrong answer for the combined area. Where a dataset's
headline statistic is a rate or an average, it must also be published as its underlying **numerator
and denominator** counts, so that BaCAP can sum both and recalculate the statistic for the custom
area.

For example:

| Statistic             | What BaCAP needs for each small area                              |
| --------------------- | ----------------------------------------------------------------- |
| Percentage of people  | Number of people in each category, and the total number of people |
| Rate per 1,000 people | Number of events, and the population the rate is based on         |
| Mean house price      | Number of houses sold, and the total value of all houses sold     |

### 2. Available down to LSOA or Output Area level

Data must be available for **LSOAs** or **Output Areas**. These are the building blocks that BaCAP
uses to approximate custom areas, so data that is only available for larger areas, such as MSOAs or
local authorities, cannot be used.

Where possible, Output Area data is preferred, because it allows custom areas to be approximated
more closely.

### 3. Coverage of England, Wales or both

Datasets may cover **England only, Wales only, or England and Wales**. BaCAP only offers a dataset
for areas that fall within its coverage.

### 4. A full geography hierarchy on Nomis

The dataset must be available on Nomis for **every level of the geography hierarchy**, from the
smallest areas up to country:

```
Output Area (OA) → LSOA → MSOA → Local authority (lower-tier/unitary) → Region (England only) → Country
```

Datasets published at LSOA level start the hierarchy at LSOA. See
[Why BaCAP needs consistent data](#why-bacap-needs-consistent-data) for why this matters.

> **Note:** Given OA or LSOA data, Nomis can generate this full hierarchy automatically, but this
> needs to be requested from the Nomis team at the time of publication.

### 5. 2021 geography boundaries

All geographies must be on **2021 boundaries**, equivalent to those used for Census 2021. This
applies at **every level**, including local authorities, which must be the census-frozen 2021 local
authorities rather than current boundaries.

BaCAP's lookups between OAs, LSOAs, MSOAs, local authorities and regions are all based on the 2021
boundaries. Data published on other boundaries would not match these lookups, so custom areas would
be built from the wrong small areas.

## Checklist

A dataset is compatible with BaCAP if:

- [ ] it is published on Nomis;
- [ ] its values are counts, or rates/averages are accompanied by their numerator and denominator
      counts;
- [ ] it is available for LSOAs or Output Areas;
- [ ] it covers England, Wales, or England and Wales;
- [ ] it is available on Nomis for every level of the hierarchy, from OA or LSOA up to country;
- [ ] every level, including local authorities, uses 2021 (Census 2021) boundaries.
