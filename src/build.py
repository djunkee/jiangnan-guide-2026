#!/usr/bin/env python3
"""Augment a guide base HTML with info sheets, day maps, shopping, now-marker and Luca.
usage: build.py BASE OUT"""
import sys, re, json, glob, html, os
BASE, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(BASE).read()
E = html.escape

# ---------- data ----------
td = open('/home/claude/trip-data.js').read()
TD = {}
for m in re.finditer(r"\n(\w+):\{city:'(\w+)',n:'([^']*)',zh:'([^']*)',c:\[([\d.]+),([\d.]+)\]", td):
    k, c, n, zh, la, lo = m.groups(); TD[k] = dict(city=c, name=n, zh=zh, coord=[float(la), float(lo)])
P, POIS, SHOPS = {}, {}, []
for f in sorted(glob.glob('/home/claude/info/*.json')):
    if f.endswith('stops-index.json'): continue
    try: d = json.load(open(f))
    except Exception as e: print('skip', f, e); continue
    P.update(d.get('places', {})); POIS.update(d.get('pois', {})); SHOPS += d.get('shops', [])
FALLBACK = {  # rough WGS84, used only when research has no point
 'hotel_sh': ('Metropolo YMCA hotel', '锦江都城经典酒店', 'hotel', [31.2277, 121.4797]),
 'rail_sh': ('Shanghai Station', '上海站', 'rail', [31.2496, 121.4555]),
 'pier_jinling': ('Jinling East Rd ferry pier', '金陵东路轮渡站', 'pier', [31.2347, 121.4930]),
 'pier_dongchang': ('Dongchang Rd ferry pier', '东昌路轮渡站', 'pier', [31.2365, 121.5010]),
 'zhihe': ('Zhihe Herbal Bar', '襄阳北路100号', 'food', [31.2210, 121.4520]),
 'rail_sz': ('Suzhou Station', '苏州站', 'rail', [31.3315, 120.6100]),
 'hotel_sz': ('Pan Pacific Suzhou', '苏州吴宫泛太平洋酒店', 'hotel', [31.2952, 120.6083]),
 'rail_hze': ('Hangzhou East Station', '杭州东站', 'rail', [30.2906, 120.2128]),
 'hotel_hz': ('Yitel West Lake', '和颐至尚酒店', 'hotel', [30.2502, 120.1688]),
 'rail_tonglu': ('Tonglu Station', '桐庐站', 'rail', [29.7900, 119.6600]),
 'hotel_ap': ('Hyatt Place Airport T4', '杭州国际机场凯悦嘉轩酒店', 'hotel', [30.2347, 120.4340]),
 'su_cause_s': ('Su Causeway south end', '苏堤南口', 'entrance', [30.2353, 120.1456]),
 'su_cause_n': ('Su Causeway north end', '苏堤北口', 'entrance', [30.2562, 120.1408]),
}
SHORT = {'hotel_sh': 'Hotel', 'hotel_sz': 'Hotel', 'hotel_hz': 'Hotel', 'hotel_ap': 'Airport hotel'}

def pt(k, m=None, d=None, via=None):
    r = _pt(k, m, d)
    if via: r['via'] = [dict(k=v, name=_pt(v)['name'], zh=_pt(v).get('zh'), ll=_pt(v)['ll']) for v in via]
    return r

def _pt(k, m=None, d=None):
    if k in P or k in TD:
        i = P.get(k, {}); t = TD.get(k, {})
        ll = i.get('coord') or t.get('coord')
        return dict(k=k, name=i.get('name') or t.get('name'), zh=i.get('zh') or t.get('zh'), ll=ll, stop=True, m=m, d=d)
    i = POIS.get(k); f = FALLBACK.get(k)
    if i and i.get('coord'):
        return dict(k=k, name=SHORT.get(k) or i.get('name'), zh=i.get('zh'), ll=i['coord'], kind=i.get('kind'), m=m, d=d)
    if f:
        return dict(k=k, name=SHORT.get(k) or f[0], zh=f[1], kind=f[2], ll=f[3], m=m, d=d)
    raise SystemExit('no coords for ' + k)

def seg(t, pts=None, note=None, tab=None, city=''):
    return dict(t=t, tab=tab, note=note, city=city, pts=[pt(*p) if isinstance(p, tuple) else pt(p) for p in pts])

DAYS = {
 'd1': [seg('Sun 1 Nov · Old Shanghai and the skyline', city='上海', pts=[
    'hotel_sh', ('yugarden', 'metro', 'Line 8 one stop to Laoximen, Line 10 one stop to Yuyuan Garden (exit 1). Or walk 20 min east.', ['m_dashijie','m_laoximen','m_yuyuan_garden']),
    ('bund', 'walk', 'Walk 15 min north-east to the riverfront.'),
    ('ferry', 'walk', 'Walk back south along the Bund to the Jinling East Road pier, about 10 min.'),
    ('pier_dongchang', 'ferry', 'Public ferry across the Huangpu, about 10 min, 2 RMB.'),
    ('shtower', 'walk', 'Walk 15 min to the tower; tickets and entrance on B1–B2.'),
    ('nanjingrd', 'metro', 'Metro Line 2 from Lujiazui one stop to East Nanjing Road.', ['m_lujiazui','m_east_nanjing_rd']),
    ('rivercruise', 'walk', 'Walk 15 min south along the Bund to Shiliupu Wharf (Exit 2), or Didi 5 min.'),
    ('hotel_sh', 'car', 'Didi 10 min, or walk 25 min.')])],
 'd2': [seg('Mon 2 Nov · French Concession, posters, Jing’an', city='上海', pts=[
    'hotel_sh', ('frenchc', 'metro', 'Line 8 one stop to Laoximen, Line 10 west 4 stops to Jiaotong University, walk 5 min. Or Didi 20 min.', ['m_dashijie','m_laoximen','m_jiaotong_univ']),
    ('propaganda', 'car', 'Didi 10 min from Anfu Road. Floor 7, Room K, 726 Yan’an West Road.'),
    ('jingan', 'metro', 'Walk 15 min to Jiangsu Road, Line 2 one stop to Jing’an Temple. Or Didi 10 min.', ['m_jiangsu_rd','m_jingan_temple']),
    ('zhihe', 'walk', 'The citywalk south: Julu Road, Fumin Road, Xinle Road, about 2.5 km with stops.'),
    ('hotel_sh', 'metro', 'Walk 10 min to Shaanxi South Road, Line 1 two stops to People’s Square, walk 10 min. Or Didi 15 min.', ['m_shaanxi_s_rd','m_peoples_sq'])])],
 'd3': [seg('Tue 3 Nov · Suzhou: gardens and the Pei museum', city='苏州', pts=[
    'rail_sz', ('hotel_sz', 'car', 'South exit (南出口), then Didi about 20 min. Drop the bags.'),
    ('humble', 'car', 'Didi about 20 min to the ticket office (拙政园售票处).'),
    ('lion', 'walk', 'Walk 3 min west.'),
    ('szmuseum', 'walk', 'Walk 5 min back east, next to the big garden.'),
    ('pingjiang', 'walk', 'Walk 10–15 min south-east.'),
    ('hotel_sz', 'car', 'Didi 15 min to check in.'),
    ('moatboat', 'walk', 'Optional night boat: a few minutes’ walk to the Xinshi Bridge pier.')],
    note='Morning: 08:00 Didi to Shanghai Station, train D2906 08:41 → Suzhou 09:09.')],
 'd4': [seg('Wed 4 Nov · Suzhou morning', city='苏州', pts=[
    'hotel_sz', ('nets', 'car', 'Didi 10–15 min.'), ('panmen', 'car', 'Didi 10 min.'),
    ('hotel_sz', 'walk', 'About 5 min walk back for breakfast and check-out.'),
    ('rail_sz', 'car', 'Didi 20–25 min to Suzhou Station.')], tab='Suzhou morning'),
    seg('Wed 4 Nov · Hangzhou afternoon', city='杭州', pts=[
    'rail_hze', ('hotel_hz', 'metro', 'Metro Line 1 to Ding’an Road, 30 min. Drop the bags.', ['rail_hze','m_dingan_rd']),
    ('huqingyu', 'walk', 'Walk 10 min south to Dajing Lane.'),
    ('hefang', 'walk', 'Right outside, then on to the lakeshore for sunset.'),
    ('lakenorth', 'walk', 'Along the lakeshore north to the Broken Bridge, 20–30 min.'),
    ('hotel_hz', 'car', 'Walk back 25 min, or Didi 10 min.')], tab='Hangzhou afternoon', note='Train Suzhou → Hangzhou East around midday (still to book).')],
 'd5': [seg('Thu 5 Nov · Xixi Wetland and the lake', city='杭州', pts=[
    'hotel_hz', ('xixi', 'car', 'Didi 30–50 min to the south gate, or Metro Line 3 to Xixi Wetland South.'),
    ('gushan', 'car', 'Didi 25 min to Gushan (孤山).'),
    ('lakenorth', 'walk', 'Along the Bai Causeway to the Broken Bridge for sunset.'),
    ('fountain', 'walk', 'Walk 20 min along the shore to Hubin.'),
    ('hotel_hz', 'walk', 'Walk 10 min.')])],
 'd6': [seg('Fri 6 Nov · OMG Heartbeat Park', city='杭州', pts=[
    'hotel_hz', ('rail_hze', 'metro', 'Metro Line 1 Ding’an Road → Hangzhou East, 25 min.', ['m_dingan_rd','rail_hze']),
    ('rail_tonglu', 'train', 'Train Hangzhou East → Tonglu, 30–40 min.'),
    ('omg', 'car', 'Taxi or Didi 30–40 min to the park in Yaolin.'),
    ('rail_tonglu', 'car', 'Order the Didi back 15–20 min before leaving; taxis are scarce.'),
    ('rail_hze', 'train', 'Train back to Hangzhou East.'),
    ('hotel_hz', 'metro', 'Metro Line 1 to Ding’an Road.', ['rail_hze','m_dingan_rd']),
    ('hefang', 'walk', 'Easy dinner 10 min from the hotel.')])],
 'd7': [seg('Sat 7 Nov · Lingyin, tea, causeway, Leifeng', city='杭州', pts=[
    'hotel_hz', ('lingyin', 'car', 'Didi 20–25 min (灵隐寺), or bus 7 from Hubin.'),
    ('longjing', 'car', 'Didi 15 min, or bus 27.'),
    ('sucause', 'car', 'Didi 15 min to the north end by Yue Fei Temple.'),
    ('su_cause_s', 'walk', 'Walk the causeway south, about 2.8 km (no bikes allowed on it).'),
    ('leifeng', 'walk', 'Walk 15 min east to the pagoda; be there by about 16:00 (last entry 17:00).'),
    ('hefang', 'car', 'Didi 10 min to the Qinghefang lanes.'),
    ('hotel_hz', 'walk', 'Walk 10 min.')])],
 'd8': [seg('Sun 8 Nov · The Grand Canal', city='杭州', pts=[
    'hotel_hz', ('canalmuseum', 'metro', 'Metro Line 5 to Gongchen Bridge East, or Didi 20 min.', ['m_dingan_rd','m_gongchen_e']),
    ('qiaoxi', 'walk', 'Across Gongchen Bridge, 5 min.'),
    ('xiaohe', 'walk', 'Walk 20 min south along the canal.'),
    ('hotel_hz', 'car', 'Didi 20 min back for the bags.')], tab='Canal day'),
    seg('Sun 8 Nov · To the airport hotel', city='杭州', pts=[
    'hotel_hz', ('hotel_ap', 'car', 'Didi about 50 min to Terminal 4. The hotel is in the ground transport centre.')], tab='Airport hotel')],
}
# number the place stops per day, in order of first appearance
for day, segs in DAYS.items():
    n = 0; seen = {}
    for sg in segs:
        for p in sg['pts']:
            if p.get('stop'):
                if p['k'] not in seen: n += 1; seen[p['k']] = n
                p['n'] = seen[p['k']]

# ---------- HTML edits ----------
# 1. tag stop items with their option key
name2k = {v['name']: k for k, v in TD.items()}
def tag(m):
    nm = html.unescape(m.group(3)).strip()
    k = name2k.get(nm)
    return m.group(1) + (f' data-o="{k}"' if k else '') + m.group(2) + m.group(3)
s, ntag = re.subn(r'(<li class="it stop[^"]*")(><span class="t">[^<]*</span><div class="c">\s*<h4>)([^<]+?)(?= <span)', tag, s)
print('tagged stops', ntag, 'with key', s.count('data-o='))

s = s.replace('<h4>Su Causeway, on foot or by bike <span', '<h4>Su Causeway on foot <span')
# 1b. weather slot in every day header
WXLOC = {'d0':'sh','d1':'sh','d2':'sh','d3':'sz','d4':'hz','d5':'hz','d6':'tl','d7':'hz','d8':'hz','d9':'hz'}
for day, loc in WXLOC.items():
    i = s.index(f'id="{day}"'); j = s.index('</header>', i) + len('</header>')
    s = s[:j] + f'\n    <div class="wx" data-loc="{loc}"></div>' + s[j:]
# 2. maps after each day header
for day in DAYS:
    i = s.index(f'id="{day}"'); j = s.index('</header>', i) + len('</header>')
    w = s.find('<div class="wx"', j)
    if 0 <= w - j < 12: j = s.index('</div>', w) + len('</div>')
    s = s[:j] + f'\n    <div class="dmap" data-day="{day}"></div>' + s[j:]

# 3. shopping, slotted after the first stop it belongs to
BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h3l1 14H3L4 7h3Zm2 0h6V6a3 3 0 0 0-6 0v1Zm-2.9 2-.7 10h13.2l-.7-10H17v2h-2V9H9v2H7V9h-.9Z"/></svg>'
KIND = {'street': 'Shopping street', 'market': 'Market', 'mall': 'Mall', 'shop': 'Shop', 'bookstore': 'Bookstore', 'food': 'Food shop'}
def maplinks(name, zh, ll):
    if not ll: return ''
    q = (zh or name)
    am = f'https://uri.amap.com/marker?position={ll[1]},{ll[0]}&name={E(q)}&coordinate=wgs84&callnative=1'
    ap = f'https://maps.apple.com/?ll={ll[0]},{ll[1]}&q={E(q)}'
    return f'<p class="maps"><a href="{am}">Amap</a><a href="{ap}">Apple Maps</a></p>'
def shopcard(x):
    meta = ' · '.join(filter(None, [KIND.get(x.get('kind'), 'Shop'), x.get('walk'), x.get('hours')]))
    h = f'<article class="sh"><h5>{E(x["name"])} <span class="zh">{E(x.get("zh",""))}</span></h5><p class="kind">{E(meta)}</p>'
    if x.get('buy'): h += f'<p><b>Buy:</b> {E(x["buy"])}</p>'
    if x.get('watch'): h += f'<p class="watch"><b>Watch out:</b> {E(x["watch"])}</p>'
    return h + maplinks(x['name'], x.get('zh'), x.get('coord')) + '</article>'
by_near = {}
for x in SHOPS: by_near.setdefault(x.get('near'), []).append(x)
placed = set()
for near, lst in by_near.items():
    m = re.search(r'<li class="it stop[^"]*" data-o="%s">' % re.escape(str(near)), s)
    if not m: print('shop near not found', near, [x['name'] for x in lst]); continue
    end = s.index('</div></li>', m.end()) + len('</div></li>')
    names = ' · '.join(x['name'] for x in lst)
    li = f'<li class="it shop"><span class="t">{BAG}</span><div class="c"><details class="shopd"><summary>Shopping nearby: {E(names)}</summary><div class="shops">' + ''.join(shopcard(x) for x in lst) + '</div></details></div></li>'
    s = s[:end] + li + s[end:]; placed.add(near)

# shopping overview section + nav link
if SHOPS:
    city_of = lambda x: {'sh': 'Shanghai', 'sz': 'Suzhou', 'hz': 'Hangzhou'}.get(TD.get(x.get('near'), {}).get('city'), 'Other')
    sec = '<section class="sec shopsec" id="shopping"><h2>Shopping</h2><p class="muted">Every shop also appears in the day it fits, right after the stop it is next to.</p>'
    for c in ['Shanghai', 'Suzhou', 'Hangzhou']:
        lst = [x for x in SHOPS if city_of(x) == c]
        if not lst: continue
        sec += f'<span class="city">{c}</span><div class="shops">' + ''.join(shopcard(x).replace('<p class="kind">', f'<p class="kind">Near {E(TD.get(x.get("near"),{}).get("name",""))} · ', 1) for x in lst) + '</div>'
    s = s.replace('<section class="sec" id="hotels">', sec + '</section>\n<section class="sec" id="hotels">', 1)
    s = s.replace('<a class="sec" href="#hotels">Hotels</a>', '<a class="sec" href="#shopping">Shopping</a><a class="sec" href="#hotels">Hotels</a>', 1)

# 4. Luca tips at the end of each day
LUCA = open(os.path.join(HERE, 'assets/luca.svg')).read().strip()
LUCA_HEAD = LUCA.replace('viewBox="0 -8 132 92"', 'viewBox="80 -8 48 56"')
TIPS = {
 'd0': 'Luca has been sitting by the door since you left. He is fine. He is being dramatic.',
 'd1': 'Luca’s rule for soup dumplings: nibble, sip, then eat. Also: photos for Luca, please.',
 'd2': 'Luca walks 2.5 km on 10 cm legs without complaining. You can do the citywalk.',
 'd3': 'Zigzag bridges keep evil spirits out, because spirits only go in straight lines. Corgis zigzag on purpose.',
 'd4': 'Luca asks whether Hu Qing Yu Tang has a herbal remedy for short legs. Please enquire.',
 'd5': 'Xixi has ducks. Luca would like it on record that he would not chase them. (He would.)',
 'd6': 'The cliff swing is a firm no from Luca. He requests video evidence that you did it.',
 'd7': 'Longjing tea is best after a nap, says Luca, who naps professionally.',
 'd8': 'Last night! Luca’s checklist: passports, chargers, and a souvenir he can chew.',
 'd9': 'Luca is at the door. He has heard the suitcase wheels from Changi.',
}
for day, txt in TIPS.items():
    i = s.index(f'id="{day}"'); j = s.index('<a class="top"', i)
    s = s[:j] + f'<div class="lucatip">{LUCA_HEAD}<span>{E(txt)}</span></div>\n    ' + s[j:]

# 5. inject styles, data and scripts
lcss = open(os.path.join(HERE, 'node_modules/leaflet/dist/leaflet.css')).read()
ljs = open(os.path.join(HERE, 'node_modules/leaflet/dist/leaflet.js')).read()
acss = open(os.path.join(HERE, 'assets/app.css')).read()
ajs = open(os.path.join(HERE, 'assets/app.js')).read()
shops_rt = [dict(name=x['name'], near=x.get('near'), ll=x.get('coord')) for x in SHOPS]
data = dict(P=P, DAYS=DAYS, SHOPS=shops_rt, LUCA=LUCA, LUCA_HEAD=LUCA_HEAD,
    BARKS=['汪汪! (wāng wāng = woof)', 'Drink some water. — Luca', 'Did you pack my souvenir?', 'Two more stops, then snacks.', 'Luca approves this itinerary.', 'Shoes off at the hotel. Paws too.'],
    LUCA_SHEET={'lion': 'Luca thinks a rock maze is the perfect hide-and-seek course. Short legs, big advantage.',
                'xixi': 'Luca on wetlands: excellent mud, poor management (no dogs allowed).',
                'longjing': 'Luca suggests buying tea in the village, not on the walk back. He’s not a tea expert. He’s a dog.',
                'shtower': '632 m tall. That is about 2,500 corgis standing on each other’s heads, Luca estimates.'})
s = s.replace('</head>', '<style>\n' + lcss + '\n</style>\n<style>\n' + acss + '\n</style>\n</head>', 1)
blob = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
s = s.replace('</body>', '<script>\n' + ljs + '\n</script>\n<script>window.JN=' + blob + ';</script>\n<script>\n' + ajs + '\n</script>\n</body>', 1)
open(OUT, 'w').write(s)
print('wrote', OUT, len(s), 'bytes; places', len(P), 'pois', len(POIS), 'shops', len(SHOPS), 'placed', len(placed))
