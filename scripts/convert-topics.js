import { readFileSync, writeFileSync } from "node:fs";

const input = "./scripts/data/topics-old.json";
const output = "./static/data/topics-generated.json";

const measures = { 20100: "Value", 20301: "Percent" };

const topics_raw = JSON.parse(readFileSync(input));
const topics = [];

for (const topic of topics_raw) {
	if (!topic.lastValidVersion) {
		topics.push({
			key: topic.code,
			label: topic.label,
			topic: topic.topic,
			summary: topic.desc,
			description: topic.descLong || null,
			chart: topic.chart || "bar",
			tableCode: topic.tableCode,
			cellCode: topic.cellCode === "time" ? null : topic.cellCode || null,
			measures: [topic.measures].flat().map((cell) => ({ label: measures[cell], cell })),
			categories: topic.categories,
			dates:
				topic.cellCode === "time"
					? topic.categories.map((cat) => cat.cells[0])
					: topic.date
						? [topic.date]
						: [2021],
			unit: topic.unit,
			base: topic.base,
			geography: topic.lowestGeography + "21",
			source: "ONS analysis of EPC data",
			url: topic.url || null,
			census: topic.census || false
		});
	}
}

writeFileSync(output, JSON.stringify(topics));
console.log(`Wrote ${output}`);
