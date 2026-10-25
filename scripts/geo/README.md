# The walk's geography

`scripts/make-geo.py` writes `src/walk/geo/regions.ts` (each region's land, India's 36 states and union territories with their areas) and `src/walk/geo/routes.ts` (every route's line) from Natural Earth, which is in the public domain.

It reads three Natural Earth files, kept outside the repo because they're large (about 57 MB):

- `ne_50m_admin_0_countries.geojson`
- `ne_10m_admin_0_countries_ind.geojson` (India's point-of-view boundaries)
- `ne_10m_admin_1_states_provinces.geojson`

Get them from naturalearthdata.com (or the `nvkelso/natural-earth-vector` repository's `geojson/` folder), put them in one folder, and run:

```bash
python3 -I scripts/make-geo.py <that folder> src/walk/geo
```

Routes are added to `scripts/geo/routes.json`: each has its region, the names at either end, and its waypoints as `[longitude, latitude]` (or `xy`, already in map units, for invented lands). Never edit the generated files by hand.
