declare module "mapboxgl-spiderifier" {
  import type mapboxgl from "mapbox-gl";

  interface SpiderLegParam {
    x: number;
    y: number;
    angle: number;
    legLength: number;
    index: number;
  }

  interface SpiderLegElements {
    container: HTMLElement;
    line: HTMLElement;
    pin: HTMLElement;
  }

  interface SpiderLeg {
    feature: GeoJSON.Feature;
    elements: SpiderLegElements;
    mapboxMarker: mapboxgl.Marker;
    param: SpiderLegParam;
  }

  interface Options {
    animate?: boolean;
    animationSpeed?: number;
    customPin?: boolean;
    initializeLeg?: (leg: SpiderLeg) => void;
    onClick?: (e: MouseEvent, leg: SpiderLeg) => void;
    circleSpiralSwitchover?: number;
    circleFootSeparation?: number;
    spiralFootSeparation?: number;
    spiralLengthStart?: number;
    spiralLengthFactor?: number;
  }

  class MapboxglSpiderfier {
    constructor(map: mapboxgl.Map, options?: Options);
    spiderfy(latLng: mapboxgl.LngLatLike, features: GeoJSON.Feature[]): void;
    unspiderfy(): void;
    each(callback: (leg: SpiderLeg) => void): void;
  }

  export = MapboxglSpiderfier;
}
