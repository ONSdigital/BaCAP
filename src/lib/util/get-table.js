import { csvParse, autoType } from 'd3-dsv';
import { roundCount } from '$lib/util/functions';
import { analyticsEvent } from '$lib/layout/AnalyticsBanner.svelte';
import nomislookup from "$lib/config/nomislookup.json";
import { centroids } from "$lib/stores/mapstore";
import { get } from 'svelte/store';

// function makeUrl(table, tableCode, codes, comp) {
//   let url = `https://www.nomisweb.co.uk/api/v01/dataset/${tableCode}.data.csv?date=latest&geography=MAKE|MyCustomArea|${codes.join(";")},MAKE|ComparisonArea|${comp}&${table.cellCode}=${makeCells(table)}&measures=${table.measures}&select=geography_name,${table.cellCode}_name,obs_value`;
//   if (table.queryExt) url += table.queryExt;
//   console.log(url)
//   return url;
// }

function makeUrl(table, tableCode, codes, comp) {
  // Initialize the URL with the base parts
  let url = `https://www.nomisweb.co.uk/api/v01/dataset/${tableCode}.data.csv?geography=MAKE|MyCustomArea|${codes.join(";")},MAKE|ComparisonArea|${comp}&${table.cellCode}=${makeCells(table)}&measures=${table.measures}&select=geography_name,${table.cellCode}_name,obs_value`;

  // Check if table.cellCode is not 'date', then add date=latest
  if (table.date) {
    url += "&date=" + table.date;
  } else if (table.date==false){

  } else   {
    url += "&date=latest";
  }

  // If there's any query extension, append it
  if (table.queryExt) {
    url += table.queryExt;
  }

  console.log(url);
  return url;
}


// function makeCells(categories) {
//   let cells = [];
//   if (categories.map(c => c.cells.length).reduce((a, b) => a + b, 0) > categories.length) {
//     categories.forEach(c => {
//       cells.push(`MAKE|${c.label}|${c.cells.join(";")}`);
//     });
//   } else {
//     cells = categories.map(c => c.cells[0]);
//   }
//   return cells.join(",");
// };

function makeCells(table) {
  if (table.cellCode === "date") return table.categories.map(c => c.cells[0]).join(",");
  const categories = table.categories;
  let cells = [];
  if (categories.map(c => c.cells.length).reduce((a, b) => a + b, 0) > categories.length) {
    for (const c of categories) {
      cells.push(`MAKE|${c.label}|${c.cells.join(";")}`);
    }
  } else {
    cells = categories.map(c => c.cells[0]);
  }
  return cells.join(",");
};

// function calcPercent(data) {
//   let totals = {};
//   data.forEach(d => {
//     if (!totals[d.areanm]) {
//       totals[d.areanm] = d.value;
//     } else {
//       totals[d.areanm] += d.value
//     }
//   });
//   let dataNew = JSON.parse(JSON.stringify(data));
//   dataNew.forEach(d => {
//     d.count = d.value
//     d.value = +((d.value / totals[d.areanm]) * 100).toFixed(1);
//   });
//   return dataNew;
// }

function filterCodes(codes, level = "none") {
  return level === "none" ? codes :
    level === "lower" ? codes.filter(c => ["00","01", "02"].includes(c.slice(1, 3))) :
    codes.filter(c => !["00","01", "02"].includes(c.slice(1, 3)));
}



function calcPercent(data, table) {
  let totals = {};
  data.forEach(d => {
    if (!totals[d.areanm]) {
      totals[d.areanm] = d.value;
    } else {
      totals[d.areanm] += d.value
    }
  });
  let dataNew = JSON.parse(JSON.stringify(data));
  dataNew.forEach(d => {
    d.originalValue = d.value;
    d.count = table.doNotRound ? d.value : roundCount(d.value);
    d.percentage = +((d.value / totals[d.areanm]) * 100).toFixed(1);
    d.value = d.percentage;
  });
  return dataNew;
}

function processNomiswebData(data, table) {
  
  const hasBothCountAndPercentage = table.measures.length === 2;
  const hasTwoTables = Array.isArray(table.tableCode);
  const processedData = [];

  if(hasTwoTables){
    // calculate percentage ourselves
    return calcPercent(data, table);
  }else if(hasBothCountAndPercentage && !hasTwoTables){
    // use counts and percentages from nomis
    for(let i=1;i<data.length;i+=2){
      processedData.push({
        ...data[i],
        count: data[i-1].value,
        percentage:data[i].value,
        originalValue:data[i].value
      })
    }
    return processedData;
  }else{
    return data.map(d => {
      const count = d.value;
      // Conditionally handle rounding for specific types
      const processedCount = table.doNotRound ? count : roundCount(count);
        
      return { 
          ...d,
          value:processedCount,
          count: processedCount,
          originalValue: count
        };
      })
    };
  }

export default async function fetchNomiswebData(table, state, comp = ["K04000001"]) {

  let data = null;

  // Ensure tableCode is treated as an array
  const tableCodes = Array.isArray(table.tableCode) ? table.tableCode : [table.tableCode];
  // same for comp
  comp = Array.isArray(comp) ? comp : [comp];

  for (const tableCode of tableCodes) {
    const codes = table.onlyOA ? state.codes : state.compressed;
    const filter = tableCodes.length === 1 ? "none" : tableCode === tableCodes[0] ? "lower" : "higher";
    let cds=get(centroids).replaceCodesWithMSOA(codes);
    cds = filterCodes(cds, filter);
    const compcds = filterCodes(comp, filter);
    if(table.code === "residential_property_sales"){
      //replace cds with nomis codes
      cds = cds.map(c => nomislookup[c] !== undefined ? nomislookup[c] : c);
    }
    const url = makeUrl(table, tableCode, cds, compcds);

    // console.log(`Fetching data from: ${url}`);
    if(cds.length !== 0 || compcds.length !== 0){
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${tableCode}, Status: ${res.status}`);
  
        const str = (await res.text())
          .replace("GEOGRAPHY_NAME", "areanm")
          .replace("OBS_VALUE", "value")
          .replace(`${table.cellCode}_name`.toUpperCase(), "category");
  
        const parsedData = csvParse(str, autoType);
        data = sumData(data, parsedData);
      } catch (error) {
        console.error(`Error fetching data for ${tableCode}:`, error);
      }
    }
    
  }

    // Analytical tracking
    analyticsEvent({
      event: "topicSelect",
      topicName: table.label,
      topicCode: table.code
    });

    data = processNomiswebData(data, table);
    return data || [];

  // const codes = table.onlyOA ? state.codes : state.compressed;
  // const url = makeUrl(table, codes, comp);
  // const res = await fetch(url);
  // const str = (await res.text())
  //   .replace("GEOGRAPHY_NAME", "areanm")
  //   .replace("OBS_VALUE", "value")
  //   .replace(`${table.cellCode}_name`.toUpperCase(), "category");
  
  // let data = csvParse(str, autoType);

  // // Analytical tracking
  // analyticsEvent({
  //   event: "topicSelect",
  //   topicName: table.label,
  //   topicCode: table.code
  // });

  // // If the table is count-based, calculate percentages
  // // if (table.unit === "%" && table.measures === 20100) {
  //   data = processNomiswebData(data, table);
  // // }

  // return data;
}

function sumData(data1, data2) {
  if (!data1?.[0]) return data2;
  if (!data2?.[0]) return data1;

  const newData = {};

  for (const data of [data1, data2]) {
    if (Array.isArray(data)) {
      for (const d of data) {
        const key = `${d.areanm}_${d.category}`;
        if (!newData[key]) newData[key] = d;
        else newData[key].value += d.value;
      }
    }
  }
  return Object.keys(newData).map(key => newData[key]);
}