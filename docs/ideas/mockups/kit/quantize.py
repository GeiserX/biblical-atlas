"""Comprime un PNG de maqueta por debajo de un tamaño máximo sin pérdida visible.

Uso: python quantize.py <archivo.png> <max_kb>

1. Paleta con libimagequant (paquete `imagequant`) y difuminado: en degradados suaves (mar, relieve)
   no deja manchas, a diferencia de la paleta de ImageMagick. Prueba 256, 192 y 128 colores; con
   libimagequant, 128 colores no se distinguen del original a tamaño real en estas maquetas.
2. Si aún supera el límite, baja el difuminado y los colores (96).
3. En último caso, reduce la resolución lo justo para entrar en el límite.
Escribe encima del archivo e imprime "<kb_final> <ancho>x<alto>".
"""
import io, math, sys
from PIL import Image
import imagequant

path, max_kb = sys.argv[1], float(sys.argv[2])
src = Image.open(path).convert('RGBA')


def encode(im, dither, colors=128):
    q = imagequant.quantize_pil_image(im, dithering_level=dither, max_colors=colors, min_quality=0, max_quality=100)
    buf = io.BytesIO(); q.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


best = None
for colors, dither in ((256, 1.0), (192, 1.0), (128, 1.0), (128, 0.5), (96, 0.5)):
    data = encode(src, dither, colors)
    best = data
    if len(data) / 1024 <= max_kb: break
im = src
while len(best) / 1024 > max_kb and im.width > 800:
    f = max(0.7, min(0.95, math.sqrt(max_kb / (len(best) / 1024)) * 0.97))
    im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    best = encode(im, 1.0)
open(path, 'wb').write(best)
print(f'{len(best) / 1024:.0f} {im.width}x{im.height}')
