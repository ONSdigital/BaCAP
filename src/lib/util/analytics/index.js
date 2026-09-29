import { analyticsEvent } from "@onsvisual/svelte-components";
import { formatName } from "@onsvisual/robo-utils";
import { geogroupsLookup } from "../../config/index.js";

function getAreaProps(area) {
	if (area?.areacd || area?.areanm) {
		const typecd = area?.areacd?.slice?.(0, 3);
		return {
			areaCode: area.areacd,
			areaName: area.areanm || area.areacd,
			areaType: geogroupsLookup?.[typecd]?.label || area.groupnm || null
		};
	}
	return {};
}

export function areaSelectEvent(eventProps = {}) {
	const eventData = {
		event: "interaction",
		interactionType: "search-select",
		interactionLabel: eventProps.label,
		...getAreaProps(eventProps.area)
	};
	console.debug({ eventData });
	analyticsEvent(eventData);
}

export function downloadEvent(eventProps = {}) {
	const eventData = {
		event: "fileDownload",
		extension: eventProps.format,
		filename: eventProps.filename,
		linkText: eventProps.label,
		linkDomain: "www.ons.gov.uk",
		...getAreaProps(eventProps.area)
	};
	console.debug({ eventData });
	analyticsEvent(eventData);
}

export function embedEvent(eventProps = {}) {
	const areaProps = getAreaProps(eventProps.area);
	const eventData = {
		event: "embed",
		pageUrl: eventProps.url,
		linkText: "Copy embed code",
		chartTitle: `Area profile for ${formatName(areaProps.areaName, "the")}`,
		chartType: "dashboard",
		...areaProps
	};
	console.debug({ eventData });
	analyticsEvent(eventData);
}

export function printEvent(eventProps = {}) {
	const areaProps = getAreaProps(eventProps.area);
	const eventData = {
		event: "interaction",
		interactionType: "save-print",
		interactionLabel: "Print profile",
		chartTitle: `Area profile for ${formatName(areaProps.areaName, "the")}`,
		chartType: "dashboard",
		...areaProps
	};
	console.debug({ eventData });
	analyticsEvent(eventData);
}
