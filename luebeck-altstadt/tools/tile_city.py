"""Split data/city.json into 250 m tiles so the page can stream only the blocks around the player.
Output: data/base.json (water, meta) and data/tiles/<i>_<j>.json + data/tiles/index.json."""
import json, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, '..', 'data')
T = 250
d = json.load(open(os.path.join(D, 'city.json')))
def key(x, z): return f'{math.floor(x / T)}_{math.floor(z / T)}'
def cen(o): n = len(o) // 2; return sum(o[0::2]) / n, sum(o[1::2]) / n
tiles = {}
def put(k, kind, v): tiles.setdefault(k, {'buildings': [], 'parts': [], 'roads': [], 'green': [], 'trees': [], 'lamps': []})[kind].append(v)
for kind in ('buildings', 'parts', 'green'):
    for f in d[kind]: put(key(*cen(f['o'])), kind, f)
for r in d['roads']: put(key(*cen(r['p'])), 'roads', r)
for kind in ('trees', 'lamps'):
    for p in d[kind]: put(key(*p), kind, p)
os.makedirs(os.path.join(D, 'tiles'), exist_ok=True)
for f in os.listdir(os.path.join(D, 'tiles')): os.remove(os.path.join(D, 'tiles', f))
index = {}
for k, v in tiles.items():
    json.dump(v, open(os.path.join(D, 'tiles', k + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    index[k] = sum(len(x) for x in v.values())
json.dump({'size': T, 'tiles': index}, open(os.path.join(D, 'tiles', 'index.json'), 'w'))
json.dump({'meta': d['meta'], 'water': d['water'], 'bridges': d.get('bridges', []), 'rings': d.get('rings', [])}, open(os.path.join(D, 'base.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
sizes = sorted(os.path.getsize(os.path.join(D, 'tiles', k + '.json')) for k in tiles)
print(len(tiles), 'tiles; base', os.path.getsize(os.path.join(D, 'base.json')) // 1024, 'KB; tile KB min/median/max', sizes[0] // 1024, sizes[len(sizes) // 2] // 1024, sizes[-1] // 1024)
