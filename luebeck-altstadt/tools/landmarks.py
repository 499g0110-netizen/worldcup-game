"""Build the traceable landmark table from the raw OSM tiles (no guessing: every coordinate comes from an OSM element)."""
import glob, json, math, os, sys, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(__file__))
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, '..', 'data', 'osm_raw')
from build_city import local, utm32, ORIGIN_LATLON  # noqa (re-runs build, cheap enough)

nodes, ways = {}, {}
for fn in sorted(glob.glob(os.path.join(RAW, 'tile_*.osm'))):
    for el in ET.parse(fn).getroot():
        tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
        if el.tag == 'node': nodes[el.get('id')] = (float(el.get('lat')), float(el.get('lon')), tags)
        elif el.tag == 'way': ways[el.get('id')] = ([n.get('ref') for n in el.findall('nd')], tags)
FETCHED = open(os.path.join(RAW, 'fetched_at.txt')).read().strip()

def way_info(wid):
    refs, tags = ways[wid]
    pts = [nodes[r] for r in refs if r in nodes]
    lat = sum(p[0] for p in pts) / len(pts); lon = sum(p[1] for p in pts) / len(pts)
    loc = [local(p[0], p[1]) for p in pts]
    # orientation of the longest edge (degrees clockwise from north)
    best, ang = 0, None
    for a, b in zip(loc, loc[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L > best: best, ang = L, (math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) + 360) % 180
    xs, zs = [p[0] for p in loc], [p[1] for p in loc]
    return lat, lon, tags, {'w': round(max(xs) - min(xs), 1), 'd': round(max(zs) - min(zs), 1), 'long_edge_bearing_deg': round(ang or 0, 1), 'vertices': len(loc)}

def find_way(**want):
    for wid, (refs, tags) in ways.items():
        if all(tags.get(k) == v for k, v in want.items()): return wid
def find_node(**want):
    for nid, (lat, lon, tags) in nodes.items():
        if all(tags.get(k) == v for k, v in want.items()): return nid

L = []
def add(lid, zh, de, addr, osm, outline=None, height=None, height_src=None, photo=None, neighbours=None, todo=None, kind='way'):
    if kind == 'way':
        lat, lon, tags, fp = way_info(osm); oid = 'way/' + osm
    else:
        lat, lon, tags = nodes[osm]; fp = None; oid = 'node/' + osm
    x, z = local(lat, lon)
    L.append({'id': lid, 'name_zh': zh, 'name_de': de, 'address': addr, 'osm': oid,
              'lat': round(lat, 7), 'lon': round(lon, 7), 'coord_source': f'OpenStreetMap {oid} (centroid of nodes)' if kind == 'way' else f'OpenStreetMap {oid}',
              'fetched_at': FETCHED, 'local_xz_m': [x, z], 'footprint': fp,
              'height_m': height, 'height_source': height_src or ('OSM tag' if tags.get('height') else '推估 (OSM building:levels or defaults)'),
              'photo': photo, 'neighbours': neighbours, 'license': 'Geometry: © OpenStreetMap contributors, ODbL 1.0',
              'unverified': todo or []})

PH_USER = lambda d: {'file': d, 'source': '使用者提供', 'date': '未知', 'camera': '未知（未提供 EXIF）', 'authenticity': '使用者表示部分為 AI 重製，需逐張確認'}
add('holstentor', '霍爾斯滕門', 'Holstentor', 'Holstentorplatz, 23552 Lübeck', find_way(name='Holstentor', building='yes') or find_way(name='Holstentor'),
    height=38.0, height_src='OSM building:part height (towers 38 m incl. roof 19.5 m)', photo=PH_USER('Holstentor aerial / Puppenbrücke photos'),
    neighbours=['Holstentorplatz', 'Salzspeicher (east)', 'Holstenbrücke → Holstenstraße (old town)', 'Puppenbrücke (west)'])
add('salzspeicher', '鹽倉', 'Salzspeicher', 'An der Obertrave / Holstenstraße, 23552 Lübeck', find_way(name='Salzspeicher'),
    height=17.0, height_src='OSM building:part height (10–17 m)', neighbours=['Holstentor (west)', 'Trave / Obertrave (east)'])
add('st_petri', '聖伯多祿教堂', 'St. Petri zu Lübeck', 'Petrikirchhof 1, 23552 Lübeck', find_way(name='St.-Petri Kultur- und Universitätskirche'),
    height=105.0, height_src='OSM building:part height (spire 105 m)', neighbours=['Schmiedestraße', 'Holstenstraße'])
add('st_marien', '聖瑪利亞教堂', 'St. Marien zu Lübeck', 'Marienkirchhof 1, 23552 Lübeck', find_way(name='St.-Marien-Kirche'),
    height=125.0, height_src='OSM parts: towers 76 m + spire (see parts); total ≈125 m (literature value, 待核對 with parts)',
    neighbours=['Marienkirchhof', 'Rathaus (east/south-east)', 'Mengstraße (north)', 'Schüsselbuden (west)'])
add('teufel', '小惡魔銅像', 'Der Teufel (Teufelsfigur am Teufelsstein)', 'Marienkirchhof, 23552 Lübeck (St. Marien Südseite)', find_node(name='Der Teufel'), kind='node',
    height=None, height_src='推估：座像約 1 m 高，坐在花崗岩石塊上', photo=PH_USER('Teufel photo (bronze devil on granite block)'),
    neighbours=['St. Marien south wall', 'passage towards Rathaus / Breite Straße'], todo=['石塊實際長寬高', '銅像朝向（目前依照片推估面向南南東）'])
add('rathaus', '市政廳', 'Rathaus Lübeck', 'Breite Straße 64, 23552 Lübeck', find_way(name='Rathaus'),
    height=None, neighbours=['Markt', 'Breite Straße', 'St. Marien'], todo=['整體高度（OSM 只有細部分件）'])
add('niederegger', 'Niederegger 咖啡館本店', 'Café Niederegger', 'Breite Straße 89, 23552 Lübeck', find_node(name='Café Niederegger'), kind='node',
    neighbours=['Breite Straße (gegenüber Rathaus)'], todo=['建築輪廓 ID 與入口位置'])
add('hugendubel', 'Hugendubel 書店', 'Hugendubel', 'Königstraße 67a, 23552 Lübeck', find_node(name='Hugendubel'), kind='node',
    neighbours=['Königstraße'], todo=['OSM 節點沒有地址標籤；地址取自 OSM 建築 addr:housenumber=67a 的相鄰輪廓，待人工核對'])
add('junge_breite7', 'Junge 麵包店（Breite Straße 7）', 'Junge Die Bäckerei', 'Breite Straße 7, 23552 Lübeck',
    next(nid for nid, (la, lo, t) in nodes.items() if t.get('name') == 'Junge' and t.get('addr:housenumber') == '7'), kind='node',
    neighbours=['Breite Straße north, near Koberg / Jakobikirche'])
add('schiffergesellschaft', '船員公會之家', 'Haus der Schiffergesellschaft', 'Breite Straße 2, 23552 Lübeck', find_way(name='Schiffergesellschaft'),
    neighbours=['Koberg', 'St. Jakobi (across Breite Straße)'])
add('fuechtingshof', 'Füchtingshof 庭院', 'Füchtingshof', 'Glockengießerstraße 23, 23552 Lübeck', find_way(name='Füchtingshof') or find_way(name='Füchtings Hof'),
    neighbours=['Glockengießerstraße'], todo=['OSM 中只找到名為 Füchtingshof 的通道，沒有門牌 23 的建築輪廓；位置為推估'])
add('museumshafen', '博物館港', 'Museumshafen (An der Untertrave)', 'An der Untertrave, 23552 Lübeck', find_node(name='Museumshafen'), kind='node',
    neighbours=['Drehbrücke', 'Untertrave quay'])
add('drehbruecke', '旋轉橋', 'Drehbrücke', 'Drehbrückenplatz, 23552 Lübeck', find_node(name='Drehbrücke'), kind='node')
add('burgtor', '城堡門', 'Burgtor', 'Große Burgstraße, 23552 Lübeck', find_way(name='Burgtor', building='yes') or find_way(name='Burgtor'),
    height=32.0, height_src='OSM height tag', neighbours=['Große Burgstraße (south)', 'Burgtorbrücke (north)'])
add('dom', '呂貝克主教座堂', 'Dom zu Lübeck', 'Domkirchhof 1, 23552 Lübeck', find_way(name='Dom'),
    height=111.5, height_src='OSM building:part height (towers 111.5 m)', neighbours=['Mühlenteich (south-west)', 'Musterbahn'])
add('hauptbahnhof', '呂貝克中央車站', 'Lübeck Hauptbahnhof', 'Am Bahnhof 2-6, 23558 Lübeck', find_way(name='Lübeck Hauptbahnhof', **{'addr:street': 'Am Bahnhof'}),
    neighbours=['Konrad-Adenauer-Straße → Puppenbrücke → Holstentor (east)'], todo=['高度：OSM 無'])
add('puppenbruecke', '人偶橋', 'Puppenbrücke', 'Konrad-Adenauer-Straße, 23558 Lübeck', find_node(name='Puppenbrücke'), kind='node',
    photo=PH_USER('Puppenbrücke photo with statue and plaque'))

out = {'meta': {'crs': 'ETRS89/UTM32N → local metres (x east, z south)', 'origin_latlon': ORIGIN_LATLON, 'fetched_at': FETCHED,
                'note': 'POI 點不一定是建築中心或入口；入口位置尚未逐一核對。'}, 'landmarks': L}
json.dump(out, open(os.path.join(HERE, '..', 'data', 'landmarks.json'), 'w'), ensure_ascii=False, indent=1)
md = ['# 地標資料表（自動產生自 OSM 原始資料）', '', f'資料取得：{FETCHED}　座標系：ETRS89/UTM 32N → 本地公尺（原點 {ORIGIN_LATLON}，x=東、z=南）', '',
      '| ID | 中文 | 德文 | 地址 | OSM | 緯度, 經度 | 本地 x,z (m) | 高度 | 待核對 |', '|---|---|---|---|---|---|---|---|---|']
for l in L:
    md.append(f"| {l['id']} | {l['name_zh']} | {l['name_de']} | {l['address']} | {l['osm']} | {l['lat']}, {l['lon']} | {l['local_xz_m'][0]}, {l['local_xz_m'][1]} | {l['height_m'] or '—'}（{l['height_source']}） | {'；'.join(l['unverified']) or '—'} |")
open(os.path.join(HERE, '..', 'docs', 'landmarks.md'), 'w').write('\n'.join(md) + '\n')
print(len(L), 'landmarks')
