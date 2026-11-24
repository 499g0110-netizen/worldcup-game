"""Side-by-side + 50 % overlay of a reference photo and a render from the matching reference camera."""
import sys
from PIL import Image, ImageDraw, ImageFont
ref, ren, out, title = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else ''
a = Image.open(ref).convert('RGB'); b = Image.open(ren).convert('RGB').resize(a.size)
W, H = a.size; s = 0.5
a2, b2 = a.resize((int(W * s), int(H * s))), b.resize((int(W * s), int(H * s)))
ov = Image.blend(a2, b2, 0.5)
canvas = Image.new('RGB', (a2.width * 3 + 40, a2.height + 60), (24, 24, 26))
for i, (im, lab) in enumerate([(a2, 'reference photo'), (b2, '3D render (same reference camera)'), (ov, '50% overlay')]):
    canvas.paste(im, (10 + i * (a2.width + 10), 50))
    d = ImageDraw.Draw(canvas)
    try: f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22)
    except OSError: f = ImageFont.load_default()
    d.text((14 + i * (a2.width + 10), 14), lab, fill=(235, 235, 230), font=f)
if title:
    ImageDraw.Draw(canvas).text((canvas.width - 380, 14), title, fill=(200, 200, 190), font=f)
canvas.save(out, quality=88)
