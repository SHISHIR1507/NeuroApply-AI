"""
Generate NeuroApply AI store screenshot (1280x800) — amber theme, v1-style clean layout.
Run: python3 generate.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1280, 800
BG    = (10, 11, 18)     # deep navy (close to v1)
AMBER = (245, 158, 11)
AMBER2= (251, 191, 36)
CYAN  = (34, 211, 238)
GREEN = (34, 197, 94)
WHITE = (250, 250, 250)
MUTED = (148, 148, 158)
DIM   = (80, 80, 90)
CARD  = (18, 20, 30)
CARD2 = (22, 24, 36)
BORDER= (255, 255, 255, 28)

def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNSText.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def add_glow(base, cx, cy, radius, color, alpha=60):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for r in range(radius, 0, -max(1, radius // 40)):
        a = int(alpha * (1 - r / radius) ** 2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    layer = layer.filter(ImageFilter.GaussianBlur(radius // 3))
    out = Image.alpha_composite(base.convert("RGBA"), layer)
    return out.convert("RGB")

# ── Build canvas ──────────────────────────────────────────────
img = Image.new("RGB", (W, H), BG)

# Subtle glow blobs (same feel as v1 navy but amber-tinted)
img = add_glow(img, 960, 300, 500, (30, 30, 60),   alpha=80)   # card area blue glow
img = add_glow(img, 200, 400, 380, (245, 158, 11),  alpha=18)   # left amber hint
img = add_glow(img, 1100, 100, 280, (34, 211, 238), alpha=12)   # top-right cyan hint

draw = ImageDraw.Draw(img)

f_sm   = load_font(13)
f_md   = load_font(15)
f_base = load_font(17)
f_lg   = load_font(20, bold=True)
f_xl   = load_font(26, bold=True)
f_h2   = load_font(38, bold=True)
f_h1a  = load_font(62, bold=True)
f_h1b  = load_font(62, bold=True)

# ══════════════════════════════════════════════════════════════
# LEFT PANEL
# ══════════════════════════════════════════════════════════════
LX = 72

# Logo
lx, ly = LX, 58
logo_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ld = ImageDraw.Draw(logo_layer)
ld.rounded_rectangle([lx, ly, lx + 44, ly + 44], radius=10, fill=(*AMBER, 255))
img = Image.alpha_composite(img.convert("RGBA"), logo_layer).convert("RGB")
draw = ImageDraw.Draw(img)
draw.text((lx + 12, ly + 9), "N", font=load_font(22, bold=True), fill=BG)
draw.text((lx + 56, ly + 13), "NeuroApply AI", font=load_font(19, bold=True), fill=WHITE)

# Headline — two lines matching v1 style
hy = 160
draw.text((LX, hy),       "Apply smarter.",  font=f_h1a, fill=WHITE)
draw.text((LX, hy + 78),  "Not harder.",     font=f_h1b, fill=AMBER)

# Sub-copy
sy = hy + 185
draw.text((LX, sy),      "AI autofill for LinkedIn Easy Apply.", font=f_base, fill=MUTED)
draw.text((LX, sy + 26), "Every form filled in seconds — accurately.", font=f_base, fill=MUTED)

# Bullets with checkmarks (v1 style: draw check lines)
bullets = [
    "Fills custom screening questions with AI",
    "ATS match score before you apply",
    "Never auto-submits — you stay in control",
]
for i, b in enumerate(bullets):
    by2 = sy + 72 + i * 44
    # checkmark circle
    cl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cld = ImageDraw.Draw(cl)
    cld.ellipse([LX, by2, LX + 26, by2 + 26], fill=(*GREEN, 30))
    img = Image.alpha_composite(img.convert("RGBA"), cl).convert("RGB")
    draw = ImageDraw.Draw(img)
    # checkmark lines
    draw.line([LX + 6, by2 + 13, LX + 11, by2 + 18], fill=GREEN, width=2)
    draw.line([LX + 11, by2 + 18, LX + 20, by2 + 7], fill=GREEN, width=2)
    draw.text((LX + 36, by2 + 3), b, font=f_base, fill=WHITE)

# CTA button
cbx, cby, cbw, cbh = LX, sy + 230, 238, 54
btn_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(btn_l)
bd.rounded_rectangle([cbx, cby, cbx + cbw, cby + cbh], radius=12, fill=(*AMBER, 255))
img = Image.alpha_composite(img.convert("RGBA"), btn_l).convert("RGB")
draw = ImageDraw.Draw(img)
cta = "Add to Chrome  —  Free"
tw = int(draw.textlength(cta, font=load_font(16, bold=True)))
draw.text((cbx + (cbw - tw) // 2, cby + 16), cta, font=load_font(16, bold=True), fill=BG)

# ══════════════════════════════════════════════════════════════
# RIGHT PANEL — single large browser card (v1 style)
# ══════════════════════════════════════════════════════════════
BRX = 570    # browser left
BRY = 50     # browser top
BRW = 670    # browser width
BRH = 700    # browser height

browser_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd2 = ImageDraw.Draw(browser_l)

# Drop shadow
for s in range(20, 0, -1):
    a = int(80 * (1 - s / 20) ** 2)
    bd2.rounded_rectangle(
        [BRX + s, BRY + s, BRX + BRW + s, BRY + BRH + s],
        radius=16, fill=(0, 0, 0, a)
    )

# Browser shell
bd2.rounded_rectangle([BRX, BRY, BRX + BRW, BRY + BRH], radius=16,
                       fill=(*CARD, 255), outline=(255, 255, 255, 30), width=1)

# Browser chrome bar
bd2.rounded_rectangle([BRX, BRY, BRX + BRW, BRY + 46], radius=16, fill=(14, 15, 24, 255))
bd2.rectangle([BRX, BRY + 30, BRX + BRW, BRY + 46], fill=(14, 15, 24, 255))
bd2.line([BRX, BRY + 46, BRX + BRW, BRY + 46], fill=(255, 255, 255, 22), width=1)

# Traffic lights
for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
    bd2.ellipse([BRX + 20 + i * 24, BRY + 16, BRX + 33 + i * 24, BRY + 29], fill=c)

# URL bar
bd2.rounded_rectangle([BRX + 100, BRY + 11, BRX + BRW - 20, BRY + 35],
                       radius=6, fill=(255, 255, 255, 12))
url = "linkedin.com/jobs/easy-apply"
bd2.text((BRX + 115, BRY + 14), url, font=load_font(13), fill=(*DIM, 255))

img = Image.alpha_composite(img.convert("RGBA"), browser_l).convert("RGB")
draw = ImageDraw.Draw(img)

# ── Form content inside browser ───────────────────────────────
FX = BRX + 28
FY = BRY + 62
FW = BRW - 56

draw.text((FX, FY), "Apply to Acme Corp", font=load_font(22, bold=True), fill=WHITE)
draw.text((FX, FY + 30), "Senior Frontend Engineer · Remote", font=f_md, fill=MUTED)

fields = [
    ("Full Name",              "Shishir Singh",            True),
    ("Email",                  "singhshishir@gmail.com",   True),
    ("Years of Experience",    "3",                        True),
    ("Expected Salary (p.a.)", "1200000",                  True),
]

for i, (label, val, ok) in enumerate(fields):
    iy = FY + 74 + i * 88
    draw.text((FX, iy), label, font=f_sm, fill=MUTED)

    # field box
    field_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fld = ImageDraw.Draw(field_l)
    fc = (34, 197, 94, 18) if ok else (255, 255, 255, 8)
    fb = (34, 197, 94, 110) if ok else (255, 255, 255, 28)
    fld.rounded_rectangle([FX, iy + 20, FX + FW, iy + 62], radius=8,
                           fill=fc, outline=fb, width=2)
    img = Image.alpha_composite(img.convert("RGBA"), field_l).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.text((FX + 16, iy + 32), val, font=load_font(17), fill=(220, 220, 228))

    if ok:
        # checkmark inside field right side
        cx4, cy4 = FX + FW - 30, iy + 40
        draw.line([cx4, cy4 + 3, cx4 + 6, cy4 + 9], fill=GREEN, width=3)
        draw.line([cx4 + 6, cy4 + 9, cx4 + 16, cy4 - 4], fill=GREEN, width=3)

# ── Extension popup overlay (v1 style, bottom-right of card) ──
POX = BRX + BRW - 240
POY = BRY + BRH - 148

popup_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
pd = ImageDraw.Draw(popup_l)

# Shadow
for s in range(14, 0, -1):
    a = int(90 * (1 - s / 14) ** 2)
    pd.rounded_rectangle(
        [POX + s, POY + s, POX + 220 + s, POY + 116 + s],
        radius=12, fill=(0, 0, 0, a)
    )

pd.rounded_rectangle([POX, POY, POX + 220, POY + 116], radius=12,
                      fill=(20, 22, 34, 248), outline=(245, 158, 11, 80), width=1)

# Header row
pd.ellipse([POX + 14, POY + 14, POX + 24, POY + 24], fill=(*GREEN, 255))
pd.text((POX + 32, POY + 13), "NeuroApply", font=load_font(13, bold=True), fill=(*WHITE, 255))

# Status line 1
pd.rounded_rectangle([POX + 10, POY + 42, POX + 210, POY + 70],
                      radius=7, fill=(245, 158, 11, 22), outline=(245, 158, 11, 60), width=1)
msg1 = "Found 4 questions to fill."
pd.text((POX + 18, POY + 49), msg1, font=load_font(13), fill=(*MUTED, 255))

# Status line 2
pd.rounded_rectangle([POX + 10, POY + 78, POX + 210, POY + 108],
                      radius=7, fill=(34, 197, 94, 18), outline=(34, 197, 94, 60), width=1)
msg2 = "All 4 filled — you're good!"
pd.text((POX + 18, POY + 86), msg2, font=load_font(14, bold=True), fill=(*GREEN, 255))

img = Image.alpha_composite(img.convert("RGBA"), popup_l).convert("RGB")

# ── Save ─────────────────────────────────────────────────────
out = "promo-1280x800-v2.png"
img.save(out, "PNG")
print(f"Saved {out} ({W}x{H})")
