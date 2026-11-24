"""Convert raw OSM tiles (api.openstreetmap.org, ODbL) into the scene's local metre grid.

Projection: ETRS89 / UTM zone 32N (EPSG:25832), Krüger series on GRS80.
Scene frame: x = east, z = south (north = -z), y = up; metres from ORIGIN below.
ORIGIN is fixed (not data-derived) so coordinates stay stable between rebuilds.
"""
import glob, json, math, os, sys, xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'data', 'osm_raw')
OUT = os.path.join(HERE, '..', 'data', 'city.json')

def utm32(lat, lon):
    a, f = 6378137.0, 1 / 298.257222101
    k0, lon0 = 0.9996, math.radians(9.0)
    n = f / (2 - f); A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64)
    al = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16, 13 * n * n / 48 - 3 * n ** 3 / 5, 61 * n ** 3 / 240]
    phi, lam = math.radians(lat), math.radians(lon) - lon0
    e = 2 * math.sqrt(n) / (1 + n)
    t = math.sinh(math.atanh(math.sin(phi)) - e * math.atanh(e * math.sin(phi)))
    xi, eta = math.atan2(t, math.cos(lam)), math.atanh(math.sin(lam) / math.sqrt(1 + t * t))
    E = eta + sum(al[j] * math.cos(2 * (j + 1) * xi) * math.sinh(2 * (j + 1) * eta) for j in range(3))
    N = xi + sum(al[j] * math.sin(2 * (j + 1) * xi) * math.cosh(2 * (j + 1) * eta) for j in range(3))
    return 500000 + k0 * A * E, k0 * A * N

ORIGIN_LATLON = (53.8665, 10.6850)          # near St. Marien / Markt
E0, N0 = utm32(*ORIGIN_LATLON)
def local(lat, lon):
    e, n = utm32(lat, lon)
    return round(e - E0, 2), round(-(n - N0), 2)

nodes, ways, rels = {}, {}, {}
for fn in sorted(glob.glob(os.path.join(RAW, 'tile_*.osm'))):
    root = ET.parse(fn).getroot()
    for el in root:
        if el.tag == 'node':
            nodes[el.get('id')] = (float(el.get('lat')), float(el.get('lon')), {t.get('k'): t.get('v') for t in el.findall('tag')})
        elif el.tag == 'way':
            ways[el.get('id')] = ([nd.get('ref') for nd in el.findall('nd')], {t.get('k'): t.get('v') for t in el.findall('tag')})
        elif el.tag == 'relation':
            rels[el.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in el.findall('member')], {t.get('k'): t.get('v') for t in el.findall('tag')})

def way_pts(refs):
    out = []
    for r in refs:
        if r not in nodes: return None
        out.append(local(nodes[r][0], nodes[r][1]))
    return out

def assemble(way_ids):
    segs = [list(ways[w][0]) for w in way_ids if w in ways]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]: ring += s[1:]
                elif s[-1] == ring[-1]: ring += s[::-1][1:]
                elif s[-1] == ring[0]: ring = s + ring[1:]
                elif s[0] == ring[0]: ring = s[::-1] + ring[1:]
                else: continue
                segs.pop(i); changed = True; break
        if ring[0] == ring[-1]:
            p = way_pts(ring)
            if p: rings.append(p)
    return rings

def num(v):
    if v is None: return None
    try: return float(str(v).replace(',', '.').split()[0].rstrip('m'))
    except ValueError: return None

def flat(pts): return [c for p in pts[:-1] for c in p]   # drop closing duplicate

KEEP = ['name', 'addr:street', 'addr:housenumber', 'building', 'building:part', 'roof:shape', 'roof:colour', 'roof:material',
        'building:colour', 'building:material', 'amenity', 'shop', 'tourism', 'historic', 'wikidata', 'heritage']
def feature(tags, outer, inner=()):
    h, mh = num(tags.get('height')), num(tags.get('min_height'))
    lv, mlv, rl = num(tags.get('building:levels')), num(tags.get('building:min_level')), num(tags.get('roof:levels'))
    rh = num(tags.get('roof:height'))
    return {
        'o': flat(outer), 'i': [flat(r) for r in inner] or None,
        'h': h, 'mh': mh, 'lv': lv, 'mlv': mlv, 'rl': rl, 'rh': rh,
        't': {k: tags[k] for k in KEEP if k in tags},
    }

buildings, parts, water, green, roads, rails, pois = [], [], [], [], [], [], []
used_as_outer = set()
for rid, (members, tags) in rels.items():
    if tags.get('type') != 'multipolygon': continue
    outers = assemble([r for t, r, role in members if t == 'way' and role in ('outer', '')])
    inners = assemble([r for t, r, role in members if t == 'way' and role == 'inner'])
    for t, r, role in members:
        if t == 'way' and role in ('outer', ''): used_as_outer.add(r)
    for o in outers:
        if 'building' in tags: buildings.append(feature(tags, o, inners))
        elif 'building:part' in tags: parts.append(feature(tags, o, inners))
        elif tags.get('natural') == 'water' or tags.get('waterway') == 'riverbank' or tags.get('water'):
            water.append({'o': flat(o), 'i': [flat(r) for r in inners] or None, 'n': tags.get('name')})
        elif tags.get('leisure') in ('park', 'garden') or tags.get('landuse') in ('grass', 'meadow', 'village_green', 'recreation_ground'):
            green.append({'o': flat(o), 'i': [flat(r) for r in inners] or None})

for wid, (refs, tags) in ways.items():
    closed = len(refs) > 3 and refs[0] == refs[-1]
    pts = None
    def P():
        return way_pts(refs)
    if closed and 'building' in tags and tags['building'] != 'no':
        p = P();  (p and buildings.append(feature(tags, p)))
    elif closed and 'building:part' in tags:
        p = P();  (p and parts.append(feature(tags, p)))
    elif closed and (tags.get('natural') == 'water' or tags.get('waterway') == 'riverbank'):
        p = P();  (p and water.append({'o': flat(p), 'i': None, 'n': tags.get('name')}))
    elif closed and (tags.get('leisure') in ('park', 'garden') or tags.get('landuse') in ('grass', 'meadow', 'village_green', 'recreation_ground')):
        p = P();  (p and green.append({'o': flat(p), 'i': None}))
    elif 'highway' in tags and not closed or (tags.get('highway') == 'pedestrian' and tags.get('area') != 'yes' and not closed):
        p = P()
        if p: roads.append({'p': [c for q in p for c in q], 'k': tags['highway'], 'n': tags.get('name'), 'w': num(tags.get('width')),
                            'l': num(tags.get('lanes')), 's': tags.get('surface'), 'b': tags.get('bridge') == 'yes', 'o': tags.get('oneway')})
    elif tags.get('railway') in ('rail',) :
        p = P();  (p and rails.append([c for q in p for c in q]))

trees, lamps = [], []
for nid, (lat, lon, tags) in nodes.items():
    if tags.get('natural') == 'tree': trees.append(local(lat, lon))
    elif tags.get('highway') == 'street_lamp': lamps.append(local(lat, lon))
for nid, (lat, lon, tags) in nodes.items():
    if 'name' in tags and any(k in tags for k in ('tourism', 'historic', 'amenity', 'shop', 'artwork_type', 'memorial')):
        x, z = local(lat, lon)
        pois.append({'x': x, 'z': z, 'lat': lat, 'lon': lon, 'id': 'n' + nid, 't': {k: v for k, v in tags.items() if k in ('name', 'tourism', 'historic', 'amenity', 'shop', 'addr:street', 'addr:housenumber', 'artwork_type', 'wikidata', 'website')}})

# ---- spatial helpers -------------------------------------------------------
def pip(x, z, o):
    inside, n = False, len(o) // 2
    j = n - 1
    for i in range(n):
        xi, zi, xj, zj = o[2*i], o[2*i+1], o[2*j], o[2*j+1]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi: inside = not inside
        j = i
    return inside
CELL = 40
def bbox(o): xs, zs = o[0::2], o[1::2]; return min(xs), min(zs), max(xs), max(zs)
def index(feats):
    g = {}
    for k, f in enumerate(feats):
        a, b, c, d = bbox(f['o'])
        for gx in range(int(a // CELL), int(c // CELL) + 1):
            for gz in range(int(b // CELL), int(d // CELL) + 1): g.setdefault((gx, gz), []).append(k)
    return g
def hit(g, feats, x, z, skip=-1):
    for k in g.get((int(x // CELL), int(z // CELL)), []):
        if k != skip and pip(x, z, feats[k]['o']): return k
    return -1
# buildings that are drawn through their building:part pieces (OSM Simple 3D Buildings)
gb = index(buildings)
for f in parts:
    o = f['o']; cx, cz = sum(o[0::2]) / (len(o) // 2), sum(o[1::2]) / (len(o) // 2)
    k = hit(gb, buildings, cx, cz)
    if k >= 0: buildings[k]['hasParts'] = 1
# party walls: an edge whose outside midpoint lies in another building gets no windows/door
for k, f in enumerate(buildings):
    o, n, flags = f['o'], len(f['o']) // 2, []
    area2 = sum(o[2*i] * o[2*((i+1)%n)+1] - o[2*((i+1)%n)] * o[2*i+1] for i in range(n))
    sgn = 1 if area2 > 0 else -1
    for i in range(n):
        x1, z1, x2, z2 = o[2*i], o[2*i+1], o[2*((i+1)%n)], o[2*((i+1)%n)+1]
        L = math.hypot(x2 - x1, z2 - z1) or 1
        # outward normal for this winding (x east, z south)
        nx, nz = sgn * (z2 - z1) / L, -sgn * (x2 - x1) / L
        mx, mz = (x1 + x2) / 2 + nx * 0.8, (z1 + z2) / 2 + nz * 0.8
        flags.append('0' if hit(gb, buildings, mx, mz, k) >= 0 or pip(mx, mz, o) else '1')
    f['ew'] = ''.join(flags)

# de-duplicate (tiles overlap at edges; same way can appear twice only via ids, ways dict already unique)
out = {
    'meta': {
        'source': 'OpenStreetMap contributors, ODbL 1.0 (api.openstreetmap.org /api/0.6/map)',
        'fetched_at': open(os.path.join(RAW, 'fetched_at.txt')).read().strip(),
        'crs': 'ETRS89 / UTM 32N (EPSG:25832) -> local metres, x=east, z=south',
        'origin_latlon': ORIGIN_LATLON, 'origin_utm': [round(E0, 2), round(N0, 2)],
    },
    'buildings': buildings, 'parts': parts, 'water': water, 'green': green, 'roads': roads, 'rails': rails, 'pois': pois, 'trees': trees, 'lamps': lamps,
}
json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: len(v) for k, v in out.items() if isinstance(v, list)}, os.path.getsize(OUT) // 1024, 'KB')
