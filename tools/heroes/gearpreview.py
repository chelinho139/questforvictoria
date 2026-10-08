import sys
from cast2 import HEROES, GEAR_PAL, ALL_ITEMS, SLOT_OF, compose, poses
from tool import render, sheet
from PIL import Image

LEATHER_KIT = dict(weapon='rusty_sword', offhand='wooden_shield', head='leather_cap', body='leather_tunic', legs='leather_trousers', feet='leather_boots')
IRON_KIT = dict(weapon='iron_sword', offhand='iron_shield', head='iron_helm', body='chainmail', legs='iron_greaves', feet='swift_boots', trinket='vigour_amulet')
AXE_KIT = dict(weapon='woodcutter_axe', head='leather_cap', body='leather_tunic', legs='leather_trousers', feet='leather_boots')

def crop_rows(g):
    ys = [y for y, r in enumerate(g.g) if any(c != '.' for c in r)]
    return [''.join(r) for r in g.g[min(ys):max(ys) + 1]]

def img(hero, gear, **p):
    g = compose(hero, gear, **p)
    # crop to a fixed window so every sprite lines up at the feet
    rows = [''.join(r[4:60]) for r in g.g[2:54]]
    return render(rows, {**hero.pal, **GEAR_PAL})

def trim(im):
    bb = im.getbbox()
    return im.crop((bb[0] - 1, 0, bb[2] + 1, im.height))

names = sys.argv[1:] or list(HEROES)
mode = 'items'
STAVES_ = ['gnarled_staff', 'ashwood_staff', 'runed_staff', 'warden_staff', 'willow_staff']
SORC_KITS = [dict(weapon=w, offhand=o) for w, o in zip(STAVES_, ['hedge_grimoire', 'crystal_orb', None, 'hedge_grimoire', 'crystal_orb'])]
if names and names[0] in ('anim', 'sorc'):
    mode = names.pop(0)
    names = names or list(HEROES)
strips = []
for n in names:
    h = HEROES[n]
    P = poses(h)
    idle = P['idle'][0]
    if mode == 'items':
        ims = [img(h, {'weapon': 'sig'}, **idle), img(h, {}, **idle)]
        ims += [img(h, {SLOT_OF[it]: it}, **idle) for it in ALL_ITEMS]
        ims += [img(h, LEATHER_KIT, **idle), img(h, IRON_KIT, **idle), img(h, AXE_KIT, **idle)]
    elif mode == 'sorc':
        # each staff: idle, two walk frames, the swing, the cast, a jump; the last kit also in full gear
        ims = []
        for kit in SORC_KITS:
            kit = {k: v for k, v in kit.items() if v}
            ims += [img(h, kit, **p) for p in [idle] + P['walk'][:2] + P['attack'] + P['shoot'] + P['jump'][1:2]]
        ims += [img(h, {**IRON_KIT, 'weapon': 'willow_staff', 'offhand': o}, **p) for o in ('hedge_grimoire', 'crystal_orb') for p in (idle, P['shoot'][2])]
    else:
        ims = []
        for kit in (LEATHER_KIT, IRON_KIT, AXE_KIT):
            ims += [img(h, kit, **p) for p in P['walk'][:3] + P['attack'] + P['jump'][:2]]
    strips.append(sheet([trim(i) for i in ims], scale=4))
W = max(s.width for s in strips); H = sum(s.height for s in strips)
out = Image.new('RGBA', (W, H), (168, 184, 172, 255))
y = 0
for s in strips:
    out.paste(s, (0, y)); y += s.height
out.save(f'gear_{mode}_{"-".join(names) if len(names) < 8 else "all"}.png')
print(out.size)
