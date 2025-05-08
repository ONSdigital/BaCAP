export function isDatasetAvailableInVersion(dataset, version) {
    const from = dataset.validFromVersion ?? -Infinity;
    const to = dataset.lastValidVersion ?? Infinity;
    return version >= from && version <= to;
  }

export function getDatasetForVersion(dataset, version) {
    if (!isDatasetAvailableInVersion(dataset, version)) return null;
  
    const versionKeys = Object.keys(dataset.versions || {})
      .map(v => parseInt(v))
      .filter(v => v <= version)
      .sort((a, b) => b - a);
  
    const matchedVersion = versionKeys[0];
    const overrides = (dataset.versions?.[matchedVersion]) || {};
  
    return {
      ...dataset,
      ...overrides,
    };
  }