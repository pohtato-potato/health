"""Generates the walk's land and route lines from Natural Earth (public domain).

Each region gets an equirectangular projection (x scaled by the cosine of its middle latitude), 300 units wide.
Land is simplified with Douglas-Peucker. Routes are placed from real longitude and latitude, read from
scripts/geo/routes.json. India uses Natural Earth's India point-of-view boundaries and its 36 states and union
territories, each with its area on the sphere.

Usage: python3 -I scripts/make-geo.py <natural-earth dir> <output dir>
Writes <output dir>/regions.ts and <output dir>/routes.ts. See scripts/geo/README.md.
"""
import json
import math
import os
import sys

ne, out_dir = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
world = json.load(open(ne + '/ne_50m_admin_0_countries.geojson'))['features']
india_pov = json.load(open(ne + '/ne_10m_admin_0_countries_ind.geojson'))['features']
states = [f for f in json.load(open(ne + '/ne_10m_admin_1_states_provinces.geojson'))['features'] if f['properties'].get('adm0_a3') == 'IND']
routes = json.load(open(os.path.join(here, 'geo', 'routes.json')))

# lon0, lon1, lat0 (south), lat1 (north)
REGIONS = {
    'india': (66.0, 98.5, 6.0, 37.5),
    'britain': (-8.5, 2.5, 49.6, 59.0),
    'med': (-10.0, 16.0, 36.0, 52.5),
    'japan': (131.5, 142.5, 32.5, 38.5),
    'asia': (48.0, 112.0, 20.0, 46.0),
    'iberia': (-10.0, 3.5, 35.8, 44.2),
    'greece': (20.0, 26.5, 35.5, 40.5),
    'anatolia': (26.0, 48.0, 31.0, 43.5),
    'southgeorgia': (-38.4, -35.6, -55.0, -53.8),
    'papua': (146.4, 149.0, -10.4, -8.0),
    'mexico': (-100.2, -95.2, 17.8, 21.2),
    'russia': (23.0, 39.5, 52.5, 57.0),
    'fergana': (65.0, 77.5, 37.0, 42.8),
}
COUNTRIES = {
    'britain': ['GBR', 'IRL', 'FRA'],
    'med': ['ESP', 'PRT', 'FRA', 'ITA', 'CHE', 'GBR', 'IRL', 'BEL', 'NLD', 'DEU', 'AUT', 'LUX', 'MCO', 'SVN', 'HRV', 'DZA', 'MAR', 'TUN'],
    'japan': ['JPN', 'KOR'],
    'asia': ['CHN', 'MNG', 'KAZ', 'KGZ', 'UZB', 'TJK', 'TKM', 'AFG', 'PAK', 'IND', 'NPL', 'BTN', 'BGD', 'MMR', 'IRN'],
    'iberia': ['ESP', 'PRT', 'FRA', 'AND', 'MAR', 'DZA', 'GIB'],
    'greece': ['GRC', 'TUR', 'ALB', 'MKD', 'BGR'],
    'anatolia': ['TUR', 'SYR', 'IRQ', 'IRN', 'ARM', 'GEO', 'AZE', 'GRC', 'BGR', 'CYP', 'LBN', 'JOR', 'ISR', 'PSX', 'SAU', 'KWT'],
    'southgeorgia': ['SGS'],
    'papua': ['PNG'],
    'mexico': ['MEX'],
    'russia': ['RUS', 'BLR', 'LTU', 'LVA', 'POL', 'UKR', 'EST'],
    'fergana': ['UZB', 'TJK', 'KGZ', 'KAZ', 'CHN', 'AFG', 'TKM'],
}
FINE = {'greece', 'southgeorgia', 'papua', 'mexico'}
TOL = {'india': 0.45, 'britain': 0.5, 'med': 0.6, 'japan': 0.5, 'asia': 0.7, 'iberia': 0.5, 'greece': 0.9, 'anatolia': 0.6, 'southgeorgia': 0.4, 'papua': 0.4, 'mexico': 0.9, 'russia': 1.6, 'fergana': 1.4}
UNION_TERRITORIES = {
    'Andaman and Nicobar', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
}
# Middle-earth stays invented.
FANTASY = {'box': [0, 0, 160, 104], 'outline': 'M6 30 L20 18 L34 22 L44 12 L60 16 L74 10 L96 14 L120 10 L150 18 L156 40 L150 64 L156 88 L140 96 L110 92 L86 98 L60 92 L40 96 L20 88 L10 70 L4 50 Z'}
# The main walk's chapter-1 cities, from their real places.
CITIES = {'Delhi': (77.23, 28.65), 'Agra': (78.01, 27.18), 'Gwalior': (78.18, 26.22), 'Bhopal': (77.41, 23.26), 'Nagpur': (79.09, 21.15),
          'Hyderabad': (78.49, 17.39), 'Bengaluru': (77.59, 12.97), 'Madurai': (78.12, 9.93), 'Kanyakumari': (77.54, 8.08)}
# Every city on the walk (longitude, latitude), for arrivals and the passport.
ALL_CITIES = {**CITIES,
    'Chennai': (80.27, 13.08), 'Nellore': (79.99, 14.44), 'Vijayawada': (80.65, 16.51), 'Visakhapatnam': (83.22, 17.69), 'Bhubaneswar': (85.82, 20.30),
    'Kolkata': (88.36, 22.57), 'Varanasi': (82.97, 25.32), 'Kanpur': (80.33, 26.45), 'Jaipur': (75.79, 26.91), 'Udaipur': (73.71, 24.59),
    'Ahmedabad': (72.57, 23.02), 'Surat': (72.83, 21.17), 'Mumbai': (72.88, 19.08), 'Pune': (73.86, 18.52), 'Belagavi': (74.50, 15.85),
    'Hubballi': (75.12, 15.36), 'Puducherry': (79.81, 11.94), 'Thiruvananthapuram': (76.94, 8.52), 'Kavaratti': (72.64, 10.57), 'Panaji': (73.83, 15.49),
    'Daman': (72.83, 20.40), 'Raipur': (81.63, 21.25), 'Port Blair': (92.73, 11.62), 'Gangtok': (88.61, 27.33), 'Dispur': (91.79, 26.14),
    'Shillong': (91.89, 25.58), 'Agartala': (91.28, 23.83), 'Aizawl': (92.72, 23.73), 'Imphal': (93.94, 24.82), 'Kohima': (94.11, 25.67),
    'Itanagar': (93.62, 27.08), 'Dehradun': (78.03, 30.32), 'Shimla': (77.17, 31.10), 'Chandigarh': (76.78, 30.73), 'Amritsar': (74.87, 31.63),
    'Srinagar': (74.80, 34.08), 'Leh': (77.58, 34.15)}
# Natural Earth's names where the walk uses another.
STATE_NAMES = {'Andaman and Nicobar': 'Andaman and Nicobar Islands'}
EARTH_KM = 6371.0


def proj(region):
    lon0, lon1, lat0, lat1 = REGIONS[region]
    c = math.cos(math.radians((lat0 + lat1) / 2))
    k = 300 / ((lon1 - lon0) * c)

    def p(lon, lat):
        return ((lon - lon0) * c * k, (lat1 - lat) * k)

    return p, round((lat1 - lat0) * k, 1)


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / n
        if d > best:
            best, idx = d, i
    if best > tol:
        return dp(pts[: idx + 1], tol)[:-1] + dp(pts[idx:], tol)
    return [pts[0], pts[-1]]


def polygons(geom):
    return [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']


def path(geom, p, tol, box):
    W, H = box
    parts = []
    for poly in polygons(geom):
        pts = [p(lon, lat) for lon, lat in poly[0]]
        # skip rings entirely outside the frame (with a margin)
        if all(x < -40 or x > W + 40 or y < -40 or y > H + 40 for x, y in pts):
            continue
        # a closed ring starts and ends on one point, so split it at the point farthest from the start
        far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
        s = dp(pts[: far + 1], tol)[:-1] + dp(pts[far:], tol)
        if len(s) < 4:
            continue
        # drop specks
        xs = [q[0] for q in s]
        ys = [q[1] for q in s]
        if (max(xs) - min(xs)) < tol * 3 and (max(ys) - min(ys)) < tol * 3:
            continue
        parts.append('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in s) + 'Z')
    return ''.join(parts)


def ring_area(ring):
    """Area of a lon/lat ring on the sphere, in km² (unsigned)."""
    total = 0.0
    for (lon1, lat1), (lon2, lat2) in zip(ring, ring[1:] + ring[:1]):
        total += math.radians(lon2 - lon1) * (2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
    return abs(total) * EARTH_KM * EARTH_KM / 2


def area(geom):
    return sum(ring_area(poly[0]) - sum(ring_area(h) for h in poly[1:]) for poly in polygons(geom))


def ts(v):
    return json.dumps(v, ensure_ascii=False)


region_out = {}
for r in REGIONS:
    p, H = proj(r)
    box = (300, H)
    if r == 'india':
        ind = next(f for f in india_pov if f['properties'].get('ADM0_A3') == 'IND')
        neigh = ''.join(path(f['geometry'], p, 0.8, box) for f in india_pov if f['properties'].get('ADM0_A3') in ('PAK', 'NPL', 'BGD', 'CHN', 'BTN', 'MMR', 'LKA', 'AFG'))
        st = [{'name': STATE_NAMES.get(f['properties']['name'], f['properties']['name']), 'path': path(f['geometry'], p, 0.35, box), 'areaKm2': round(area(f['geometry'])), 'ut': f['properties']['name'] in UNION_TERRITORIES}
              for f in sorted(states, key=lambda f: f['properties']['name'])]
        region_out[r] = {'box': [0, 0, 300, H], 'outline': path(ind['geometry'], p, TOL[r], box), 'extra': neigh, 'states': st}
    else:
        # Small regions take their coast from the 10m file (the India point-of-view one; it differs only on India's borders).
        feats = [f for f in (india_pov if r in FINE else world) if f['properties'].get('ADM0_A3') in COUNTRIES[r]]
        region_out[r] = {'box': [0, 0, 300, H], 'outline': ''.join(path(f['geometry'], p, TOL[r], box) for f in feats)}

missing = {STATE_NAMES.get(n, n) for n in UNION_TERRITORIES} - {s['name'] for s in region_out['india']['states']}
assert not missing, f'union territories not found: {missing}'
india_area = sum(s['areaKm2'] for s in region_out['india']['states'])

HEADER = """/**
 * Generated by scripts/make-geo.py from Natural Earth (public domain). Do not edit by hand: change
 * scripts/geo/routes.json or the script, and run it again (see scripts/geo/README.md).
 */
"""

regions = [HEADER,
           "export type RegionKey = 'india' | 'britain' | 'med' | 'japan' | 'asia' | 'iberia' | 'greece' | 'anatolia' | 'southgeorgia' | 'papua' | 'mexico' | 'russia' | 'fergana' | 'fantasy';", '',
           'export interface Region {', '  box: [number, number, number, number];', '  outline: string;',
           '  /** Neighbouring land, drawn fainter. */', '  extra?: string;',
           '  /** India only: each state and union territory, with its area on the sphere. */',
           '  states?: { name: string; path: string; areaKm2: number; ut: boolean }[];', '}', '',
           'export const REGIONS: Record<RegionKey, Region> = {']
for r, v in region_out.items():
    regions.append(f'  {r}: {{ box: {ts(v["box"])}, outline: {ts(v["outline"])}' + (f', extra: {ts(v["extra"])}' if v.get('extra') else '') + (f', states: {ts(v["states"])}' if v.get('states') else '') + ' },')
regions.append(f'  fantasy: {{ box: {ts(FANTASY["box"])}, outline: {ts(FANTASY["outline"])} }},')
regions += ['};', '', "/** India's area: the sum of its states and union territories, in km². */", f'export const INDIA_AREA_KM2 = {india_area};', '']

route_lines = [HEADER, "import type { RegionKey } from './regions';", '',
               'export interface RouteLine {', '  region: RegionKey;', '  line: [number, number][];', '  /** The names at either end. */', '  ends: [string, string];', '}', '',
               'export const ROUTE_LINES: Record<string, RouteLine> = {']
for rid, v in routes.items():
    if 'xy' in v:
        line = v['xy']
    else:
        p, _ = proj(v['region'])
        line = [[round(x, 1), round(y, 1)] for x, y in (p(lon, lat) for lon, lat in v['points'])]
    route_lines.append(f'  {ts(rid) if "-" in rid else rid}: {{ region: {ts(v["region"])}, line: {ts(line)}, ends: {ts(v["ends"])} }},')
route_lines += ['};', '']
p, _ = proj('india')
route_lines += ["/** The main walk's chapter-1 cities on the India map. */",
                f'export const MAIN_CITIES: Record<string, [number, number]> = {ts({k: [round(c, 1) for c in p(*v)] for k, v in CITIES.items()})};', '',
                "/** Every city on the walk on the India map, from its longitude and latitude. */",
                f'export const CITY_POINTS: Record<string, [number, number]> = {ts({k: [round(c, 1) for c in p(*v)] for k, v in ALL_CITIES.items()})};', '']

os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'regions.ts'), 'w').write('\n'.join(regions))
open(os.path.join(out_dir, 'routes.ts'), 'w').write('\n'.join(route_lines))
print('regions', {r: len(v['outline']) // 1024 for r, v in region_out.items()}, 'KB; states', len(region_out['india']['states']), '; India', india_area, 'km²; routes', len(routes))
