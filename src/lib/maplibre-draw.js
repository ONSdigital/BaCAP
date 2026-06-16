import MapboxDraw from "@mapbox/mapbox-gl-draw";

// Set mapbox-gl-draw constants to accommodate maplibre
MapboxDraw.constants.classes.CANVAS = "maplibregl-canvas";
MapboxDraw.constants.classes.CONTROL_BASE = "maplibregl-ctrl";
MapboxDraw.constants.classes.CONTROL_PREFIX = "maplibregl-ctrl-";
MapboxDraw.constants.classes.CONTROL_GROUP = "maplibregl-ctrl-group";
MapboxDraw.constants.classes.ATTRIBUTION = "maplibregl-ctrl-attrib";

const MapLibreDraw = MapboxDraw;

export default MapLibreDraw;
