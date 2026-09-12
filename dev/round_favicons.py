"""
Rounds the corners of every favicon PNG (and rebuilds favicon.ico) so the
site's tab icon reads as a friendly rounded app-icon instead of a hard
square. Supersamples the rounded-rect mask at 4x and downsamples with
LANCZOS so small sizes (16px) still get a smooth, anti-aliased curve
instead of a jagged corner.

Also swaps the original flat sky-blue background for white before rounding
(the source art's background is one exact solid color, so this is a plain
color replacement, not a masking guess) so the icon reads as a clean white
app-icon instead of carrying the page's blue sky into the browser tab.
Run this against the ORIGINAL square PNGs (e.g. restored from git) - running
it twice on an already-rounded/whitened set is harmless but pointless.
"""
import os
from PIL import Image, ImageDraw

FAVICON_DIR = os.path.join(os.path.dirname(__file__), '..', 'favicon')
RADIUS_FRAC = 0.22  # corner radius as a fraction of the icon's shortest side
SUPERSAMPLE = 4
BG_COLOR = (92, 148, 252)   # the source art's flat sky-blue background
WHITE = (255, 255, 255)

PNG_SIZES = [16, 32, 48, 180, 192, 512]


def rounded_mask(size, radius_frac, supersample=SUPERSAMPLE):
    big = size * supersample
    radius = int(big * radius_frac)
    mask_big = Image.new('L', (big, big), 0)
    draw = ImageDraw.Draw(mask_big)
    draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=255)
    return mask_big.resize((size, size), Image.LANCZOS)


def whiten_background(im, bg_color=BG_COLOR):
    """Swap every pixel of the exact background color for white, leaving
    every other color (the character art) untouched."""
    im = im.convert('RGBA')
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if (r, g, b) == bg_color:
                pixels[x, y] = (WHITE[0], WHITE[1], WHITE[2], a)
    return im


def round_image(im, radius_frac=RADIUS_FRAC):
    im = im.convert('RGBA')
    w, h = im.size
    side = min(w, h)
    mask = rounded_mask(side, radius_frac)
    if (w, h) != (side, side):
        mask = mask.resize((w, h), Image.LANCZOS)
    r, g, b, a = im.split()
    new_a = Image.composite(a, Image.new('L', im.size, 0), mask)
    return Image.merge('RGBA', (r, g, b, new_a))


def main():
    rounded_by_size = {}
    for size in PNG_SIZES:
        path = os.path.join(FAVICON_DIR, f'favicon-{size}.png')
        if not os.path.exists(path):
            print(f'skip (not found): {path}')
            continue
        im = Image.open(path)
        im = whiten_background(im)
        rounded = round_image(im)
        rounded.save(path)
        rounded_by_size[size] = rounded
        print(f'whitened + rounded {path} ({im.size} -> corners r={RADIUS_FRAC*100:.0f}%)')

    # PIL's ICO writer wants ONE high-res source image plus a `sizes` list
    # it downsamples that source itself for each entry. Use the largest
    # rounded PNG as the source so every embedded size is crisp + rounded.
    ico_path = os.path.join(FAVICON_DIR, 'favicon.ico')
    ico_sizes = [16, 32, 48]
    source_size = max(rounded_by_size)
    source = rounded_by_size[source_size]
    source.save(ico_path, format='ICO', sizes=[(s, s) for s in ico_sizes])
    print(f'rebuilt {ico_path} from {source_size}px source with sizes {ico_sizes}')


if __name__ == '__main__':
    main()
