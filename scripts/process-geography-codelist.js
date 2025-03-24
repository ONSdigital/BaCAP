import fs from 'fs';
import { DOMParser } from 'xmldom';

async function processXmlToJson(filename) {
  try {
    const xmlString = fs.readFileSync(filename, 'utf8');

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const codeElements = xmlDoc.getElementsByTagNameNS('*', 'Code');

    const lookup = {};

    // Iterate using a traditional for loop
    for (let i = 0; i < codeElements.length; i++) {
      const codeElement = codeElements[i];
      const codeValue = codeElement.getAttribute('value');

      const annotations = codeElement.getElementsByTagNameNS('*', 'Annotation');
      let geogCode = null;

      for (let j = 0; j < annotations.length; j++) {
        const annotation = annotations[j];
        const title = annotation.getElementsByTagNameNS('*', 'AnnotationTitle')[0]?.textContent;
        const text = annotation.getElementsByTagNameNS('*', 'AnnotationText')[0]?.textContent;

        if (title === 'GeogCode') {
          geogCode = text?.trim();
          break;
        }
      }

      if (codeValue && geogCode) {
        lookup[geogCode] = codeValue;
      }
    }

    return JSON.stringify(lookup, null, 2);
  } catch (error) {
    console.error('Error processing XML:', error);
    return null;
  }
}

const filename = process.argv[2];

if (!filename) {
  console.error('Please provide an XML filename as an argument.');
  process.exit(1);
}

processXmlToJson(filename).then((jsonString) => {
  if (jsonString) {
    console.log(jsonString);
    fs.writeFileSync('src/lib/config/nomislookup.json', jsonString);
    console.log('JSON saved to lookup.json');
  }
});