# Builds photo textures from the user's reference photos (rectified facade crops, sky-keyed cut-outs).
import sys, numpy as np
from PIL import Image, ImageFilter
U = sys.argv[1]; OUT = sys.argv[2]
def coeffs(dst, src):
    A = []; B = []
    for (x, y), (X, Y) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); B.append(X)
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); B.append(Y)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()
def rect(im, quad, w, h):
    return im.transform((w, h), Image.PERSPECTIVE, coeffs([(0, 0), (w, 0), (w, h), (0, h)], quad), Image.BICUBIC)
street = Image.open(U + '/660f5ab9-image.png').convert('RGB')
quads = [  # TL, TR, BR, BL of each upper facade (above the arcade beam)
    [(66, 96), (478, 182), (478, 540), (66, 505)],      # yellow
    [(480, 184), (855, 296), (855, 560), (480, 545)],   # blue
    [(857, 326), (1050, 380), (1050, 560), (857, 560)], # coral
    [(1052, 384), (1162, 428), (1162, 562), (1052, 560)]# ochre
]
atlas = Image.new('RGB', (1024, 768))
for i, q in enumerate(quads):
    f = rect(street, q, 512, 384)
    atlas.paste(f, ((i % 2) * 512, (i // 2) * 384))
atlas.save(OUT + '/facades.webp', 'WEBP', quality=82)
# arcade (ground floor) strip from the yellow/blue buildings – grilles & columns
arc = rect(street, [(280, 545), (480, 560), (480, 800), (280, 800)], 256, 256); arc.save(OUT + '/arcade.webp', 'WEBP', quality=80)
# ornate hall: key out sky (blue) and bright clouds above the roofline
t = Image.open(U + '/ede59f1d-image.jpg').convert('RGB').resize((1024, 768), Image.LANCZOS)
a = np.asarray(t).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
sky = ((b > r + 30) & (b > g + 5)) | ((r > 200) & (g > 200) & (b > 200) & (np.arange(768)[:, None] < 420))
alpha = np.where(sky, 0, 255).astype(np.uint8)
al = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
t.putalpha(al); t.save(OUT + '/temple.webp', 'WEBP', quality=84)
# Greenway tent fascia + food-station sign
gw = Image.open(U + '/5e9c3e8d-image.jpg').convert('RGB'); rect(gw, [(130, 40), (460, 70), (455, 205), (140, 200)], 512, 200).save(OUT + '/greenway.webp', 'WEBP', quality=85)
gw2 = Image.open(U + '/5e9c3e8d-image.jpg').convert('RGB'); rect(gw2, [(0, 200), (440, 200), (440, 363), (0, 363)], 512, 190).save(OUT + '/greenway_in.webp', 'WEBP', quality=80)
fs = Image.open(U + '/cda200f8-image.jpg').convert('RGB'); fs.crop((20, 20, 205, 100)).resize((370, 160), Image.LANCZOS).save(OUT + '/foodstation.webp', 'WEBP', quality=85)
# airport terminal facade band (repeatable)
ap = Image.open(U + '/0c2bd05b-image.jpg').convert('RGB'); rect(ap, [(0, 62), (277, 92), (277, 150), (0, 158)], 512, 140).save(OUT + '/terminal.webp', 'WEBP', quality=82)
print('ok')
