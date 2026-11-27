import json, math, sys
RAWS, OUT = sys.argv[1:-1], sys.argv[-1]
LAT0, LON0 = 7.0058506, 100.4716957       # Lee Gardens Plaza (OSM)
MLAT = 110580.0
MLON = 111320.0*math.cos(math.radians(LAT0))
def xy(lon, lat):  # x east, z south
    return [round((lon-LON0)*MLON,1), round(-(lat-LAT0)*MLAT,1)]
seen = {}
for RAW in RAWS:
    raw = json.load(open(RAW))
    for k, lst in raw.items():
        for r in lst:
            key = (r['osm_type'], r['osm_id'])
            if abs((float(r['lon'])-LON0)*MLON) > 20000 or abs((float(r['lat'])-LAT0)*MLAT) > 20000: continue
            if key not in seen: seen[key] = (k, r)
roads, blds, pois, water, aero = [], [], [], [], []
def lines(g):
    if g['type']=='LineString': return [g['coordinates']]
    if g['type']=='MultiLineString': return g['coordinates']
    return []
def polys(g):
    if g['type']=='Polygon': return [g['coordinates'][0]]
    if g['type']=='MultiPolygon': return [p[0] for p in g['coordinates']]
    return []
for (ot,oid),(k,r) in seen.items():
    g = r.get('geojson'); cat, typ = r.get('category'), r.get('type')
    name = r.get('name') or (r.get('extratags') or {}).get('name:en') or ''
    et = r.get('extratags') or {}
    if not g: continue
    if cat=='highway' and g['type'] in ('LineString','MultiLineString'):
        for l in lines(g):
            roads.append({'t':typ,'n':name,'p':[xy(*c) for c in l]})
    elif cat=='waterway' or (cat=='natural' and typ=='water'):
        for l in lines(g): water.append({'t':typ,'n':name,'p':[xy(*c) for c in l]})
        for p in polys(g): water.append({'t':'area','n':name,'p':[xy(*c) for c in p]})
    elif cat=='aeroway':
        for l in lines(g): aero.append({'t':typ,'n':name,'p':[xy(*c) for c in l]})
        for p in polys(g): aero.append({'t':typ,'n':name,'p':[xy(*c) for c in p],'poly':1})
    elif g['type'] in ('Polygon','MultiPolygon'):
        for p in polys(g):
            if len(p)>=4:
                blds.append({'c':cat,'t':typ,'n':name,'lv':et.get('building:levels'),'h':et.get('height'),'p':[xy(*c) for c in p]})
    if g['type']=='Point' or (cat in ('tourism','amenity','shop','man_made','railway','leisure','place') and name):
        pois.append({'c':cat,'t':typ,'n':name,'p':xy(float(r['lon']),float(r['lat'])),'src':k})
json.dump({'roads':roads,'blds':blds,'pois':pois,'water':water,'aero':aero}, open(OUT,'w'), ensure_ascii=False, separators=(',',':'))
print(len(roads),'roads',len(blds),'bldgs',len(pois),'pois',len(water),'water',len(aero),'aero')
