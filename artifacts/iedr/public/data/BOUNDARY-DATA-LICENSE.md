# Iran province boundary data — attribution and licence

The simplified province boundary paths in `../../src/data/iran-province-shapes.ts` are derived from OpenStreetMap administrative boundaries. The geometry has been simplified and projected to local SVG paths for display; the map no longer downloads GeoJSON at runtime.

- Source data pipeline: [shahrzadpeyman/metabase-iran-geojson-map](https://github.com/shahrzadpeyman/metabase-iran-geojson-map), based on OpenStreetMap.
- Simplified path representation used as a formatting reference: [persianlabs/ui — iran-map-data.ts](https://github.com/persianlabs/ui/blob/91b3f70d1baf90bb26e9e86f47525820d45ec2ff/packages/ui/src/lib/iran-map-data.ts).
- Attribution: **© OpenStreetMap contributors**, with a link to [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright).
- Data licence: [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

The upstream boundary data is identified as ODbL 1.0 data, distinct from software licence. The boundary data remains under ODbL; it is not re-licensed under this repository's software licence. Keep this notice with redistributed copies and comply with the ODbL attribution and share-alike terms.
