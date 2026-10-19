import test from "node:test";
import assert from "node:assert/strict";
import { buildBorderPaths, isIran, labelPoint } from "../src/lib/globe-geo.js";

const iranPolygon = {
  type: "Feature",
  properties: { ADMIN: "Iran", ISO_A3: "IRN" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [[50, 30], [52, 30], [52, 32], [50, 32], [50, 30]],
      [[50.4, 30.4], [50.6, 30.4], [50.6, 30.6], [50.4, 30.6], [50.4, 30.4]],
    ],
  },
};

test("recognizes Iran using country names and ISO codes", () => {
  assert.equal(isIran(iranPolygon), true);
  assert.equal(isIran({ properties: { iso2: "IR" } }), true);
  assert.equal(isIran({ properties: { ADM0_A3: "IRN" } }), true);
  assert.equal(isIran({ properties: { ADMIN: "Iraq", ISO_A3: "IRQ" } }), false);
  assert.equal(isIran(null), false);
});

test("builds border paths as [latitude, longitude] pairs and uses outer country rings", () => {
  const paths = buildBorderPaths([iranPolygon]);
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0][0], [30, 50]);
  assert.deepEqual(paths[0][1], [30, 52]);
  assert.equal(paths[0].length, 5);
});

test("splits country boundaries at the antimeridian instead of drawing across the globe", () => {
  const datelineFeature = {
    type: "Feature",
    properties: { ADMIN: "Dateline sample" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [170, 10], [175, 20], [-179, 25], [-175, 10], [170, 10],
      ]],
    },
  };
  const paths = buildBorderPaths([datelineFeature]);
  assert.equal(paths.length, 2);
  for (const path of paths) {
    assert.ok(path.length >= 2);
    for (let index = 1; index < path.length; index += 1) {
      assert.ok(Math.abs(path[index][1] - path[index - 1][1]) <= 180);
    }
  }
});

test("finds a finite label anchor from the largest outer ring", () => {
  const point = labelPoint(iranPolygon);
  assert.deepEqual(point, { name: "Iran", lat: 31, lng: 51 });
  assert.equal(labelPoint({ geometry: { type: "Point", coordinates: [51, 31] } }), null);
});
