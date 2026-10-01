from PIL import Image, ImageDraw

# Icône : fond dégradé violet, trois cartes en éventail.
def fond(size):
    img = Image.new("RGB", (size, size))
    haut, bas = (99, 102, 241), (46, 30, 110)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        d.line([(0, y), (size, y)], fill=tuple(int(haut[i] + (bas[i] - haut[i]) * t) for i in range(3)))
    return img

def carte(size, echelle, angle, couleur):
    w, h = size * echelle * 0.62, size * echelle * 0.40
    c = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h * 0.16, fill=couleur)
    d.rectangle([w * 0.1, h * 0.62, w * 0.55, h * 0.72], fill=(255, 255, 255, 190))
    d.ellipse([w * 0.72, h * 0.14, w * 0.88, h * 0.14 + w * 0.16], fill=(255, 255, 255, 220))
    return c.rotate(angle, expand=True, resample=Image.BICUBIC)

def icone(size, echelle, maskable):
    img = fond(size).convert("RGBA")
    for angle, couleur, dy in ((14, (236, 72, 153, 255), -0.10), (0, (14, 165, 233, 255), 0.0), (-14, (250, 204, 21, 255), 0.10)):
        c = carte(size, echelle, angle, couleur)
        img.alpha_composite(c, (int((size - c.width) / 2), int(size / 2 - c.height / 2 + dy * size * echelle)))
    if not maskable:
        masque = Image.new("L", (size, size), 0)
        ImageDraw.Draw(masque).rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=255)
        sortie = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        sortie.paste(img, (0, 0), masque)
        return sortie
    return img

for s in (192, 512):
    icone(s, 1.0, False).save(f"icons/icon-{s}.png")
    icone(s, 0.78, True).save(f"icons/icon-{s}-maskable.png")
# Icône Windows (.ico) pour le raccourci bureau.
icone(256, 1.0, False).save("icons/vallet.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icons ok")
