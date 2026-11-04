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
 'xiling': ('Xiling Seal Engravers’ Society', '西泠印社', 'other', [30.2527, 120.1382]),
 'louwailou': ('Louwailou restaurant', '楼外楼', 'food', [30.2528, 120.1418]),
 'pier_zhongshan': ('Zhongshan Park pier', '中山公园码头', 'pier', [30.2519, 120.1433]),
 'yuemiao': ('Yue Fei Temple', '岳庙', 'other', [30.2593, 120.1355]),
 'huagang': ('Flower Harbor (Huagang)', '花港观鱼', 'other', [30.2348, 120.1428]),
 'jingci': ('Jingci Temple', '净慈寺', 'other', [30.2312, 120.1470]),
 'changqiao': ('Changqiao Park', '长桥公园', 'other', [30.2384, 120.1570]),
 'm_longxiangqiao': ('Longxiangqiao station', '龙翔桥站', 'metro', [30.2588, 120.1653]),
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

def seg(t, pts=None, note=None, tab=None, city='', atlas=False):
    return dict(t=t, tab=tab, note=note, city=city, atlas=atlas, pts=[pt(*p) if isinstance(p, tuple) else pt(p) for p in pts])

DAYS = {
 'd1': [seg('Sun 1 Nov · Old Shanghai and the Bund', city='上海', pts=[
    'hotel_sh', ('yugarden', 'metro', 'Line 8 one stop to Laoximen, Line 10 one stop to Yuyuan Garden (exit 1). Or walk 20 min east.', ['m_dashijie','m_laoximen','m_yuyuan_garden']),
    ('bund', 'walk', 'Walk 15 min north-east to the riverfront.'),
    ('ferry', 'walk', 'Walk back south along the Bund to the Jinling East Road pier, about 10 min.'),
    ('pier_dongchang', 'ferry', 'Public ferry across the Huangpu, about 10 min, 2 RMB.'),
    ('nanjingrd', 'metro', 'Metro Line 2 from Lujiazui one stop to East Nanjing Road.', ['m_lujiazui','m_east_nanjing_rd']),
    ('hotel_sh', 'walk', 'Walk 20 min back to the hotel, or Didi 10 min.')])],
 'd2': [seg('Mon 2 Nov · French Concession, posters, tower and cruise', city='上海', pts=[
    'hotel_sh', ('lailai', 'walk', 'Walk 20 min north, or Metro Line 8 one stop to People’s Square (exit 19) and 7 min on foot. Didi 8 min.'),
    ('frenchc', 'metro', 'Walk 8 min to East Nanjing Road, Metro Line 10 straight to Jiaotong University (about 20 min), walk 5 min. Or Didi 20 min.', ['m_east_nanjing_rd','m_jiaotong_univ']),
    ('ferry', 'car', 'Didi from near Wukang Mansion to the Jinling East Road ferry pier, about 30 min.'),
    ('pier_dongchang', 'ferry', 'Public ferry across the Huangpu, about 10 min, 2 RMB.'),
    ('shtower', 'walk', 'Walk about 15 min to the Shanghai Tower; tickets and entrance on B1–B2.'),
    ('pier_dongchang', 'walk', 'After dinner, walk 15 min to the Dongchang Road ferry pier.'),
    ('ferry', 'ferry', 'Public ferry back across the river, about 10 min, 2 RMB.'),
    ('rivercruise', 'walk', 'Walk 10 min south along the Bund to Shiliupu Wharf (Exit 2).'),
    ('hotel_sh', 'car', 'Didi 10 min, or walk 25 min.')])],
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
    seg('Wed 4 Nov · Hangzhou: Hefang, then Xiaohe by night', city='杭州', pts=[
    'rail_hze', ('hotel_hz', 'metro', 'Metro Line 1 straight to Wulin Square (武林广场), about 25 min, then 4 min on foot. Drop the bags.', ['rail_hze','m_wulin_sq']),
    ('huqingyu', 'metro', 'Metro Line 1 two stops to Ding’an Road, then 10 min on foot. Or Didi 10 min.', ['m_wulin_sq','m_dingan_rd']),
    ('hefang', 'walk', 'Right outside, then on to the lakeshore for sunset.'),
    ('xiaohe', 'car', 'Didi about 20 min north to Xiaohe Street on the Grand Canal (小河直街).'),
    ('xiaohepark', 'walk', 'A few minutes on foot across the Xiaohe river to the lit-up oil tanks.'),
    ('hotel_hz', 'car', 'Didi about 15 min back to the hotel.')], tab='Hangzhou evening', note='Train D3141 Suzhou → Hangzhou East, 12:37–14:24.')],
 'd5': [seg('Thu 5 Nov · West Lake: bridges, causeways, island, pagoda', city='杭州', pts=[
    'hotel_hz', ('lakenorth', 'walk', 'Walk 25 min south-west to the Broken Bridge (断桥), or Didi 8 min.'),
    ('gushan', 'walk', 'Along the Bai Causeway to Gushan, about 15 min.'),
    ('lakeboat', 'boat', 'Boat from Zhongshan pier (中山码头) on Gushan to the island, about 15 min.'),
    ('sucause', 'boat', 'Boat on to Huagang pier (花港). Flower Harbor’s fish pond is by the pier; then a short Su Causeway section, 15–20 min.'),
    ('leifeng', 'walk', 'From Huagang, walk 15–20 min east to the pagoda; be there by about 15:30 (last entry 17:00).'),
    ('changqiao', 'walk', 'Walk 10 min east along the shore to Changqiao Park for the sunset photo of the pagoda, about 17:05.'),
    ('fountain', 'car', 'Didi 10 min to Hubin for dinner and the 19:30 fountain (or walk 35 min along the east shore).'),
    ('hotel_hz', 'walk', 'Walk 15–20 min north, or Line 1 one stop from Longxiangqiao to Wulin Square.')], tab='Today’s route'),
    seg('All of West Lake: the important places', city='杭州', tab='All of West Lake', atlas=True, pts=[
    ('hotel_hz', None, 'Your hotel, 4 min from Wulin Square metro'),
    ('lakenorth', None, 'Broken Bridge and the start of the Bai Causeway (“Lingering Snow on Broken Bridge”)'),
    ('gushan', None, 'Solitary Hill island: pavilions, the free Zhejiang Museum branch (“Autumn Moon over the Calm Lake” at its east tip)'),
    ('xiling', None, 'Seal engravers’ garden, founded 1904; the best viewpoint on Gushan'),
    ('louwailou', None, 'Historic lakeside restaurant (since 1848), 30 Gushan Road'),
    ('pier_zhongshan', None, 'Boats to Three Pools Mirroring the Moon (¥55–70)'),
    ('lakeboat', None, 'The island on the 1-yuan note (“Three Pools Mirroring the Moon”)'),
    ('yuemiao', None, 'Shrine to the Song-dynasty general Yue Fei; the Su Causeway starts nearby'),
    ('sucause', None, 'Su Causeway, 2.8 km with six arched bridges (“Spring Dawn at Su Causeway”); no bikes'),
    ('huagang', None, 'Red fish ponds and gardens (“Viewing Fish at Flower Harbor”); boats land here'),
    ('leifeng', None, 'Pagoda with lifts and the old ruins inside (“Leifeng Pagoda in Evening Glow”); last entry 17:00'),
    ('jingci', None, 'Buddhist temple opposite Leifeng (“Evening Bell at Nanping Hill”), ¥10, closes 17:00'),
    ('changqiao', None, 'Lakeside park: the classic photo of the pagoda at sunset'),
    ('fountain', None, 'Hubin lakefront, in77 malls, musical fountain at 19:30'),
    ('m_longxiangqiao', None, 'Metro Line 1, nearest station to Hubin'),
    ('hefang', None, 'Old shopping street and the TCM museum (Hu Qing Yu Tang)')])],
 'd6': [seg('Fri 6 Nov · OMG Heartbeat Park', city='杭州', pts=[
    'hotel_hz', ('rail_hze', 'metro', 'Metro Line 1 Wulin Square → Hangzhou East, about 25 min.', ['m_wulin_sq','rail_hze']),
    ('rail_tonglu', 'train', 'Train Hangzhou East → Tonglu, 30–40 min.'),
    ('omg', 'car', 'Taxi or Didi 30–40 min to the park in Yaolin.'),
    ('rail_tonglu', 'car', 'Order the Didi back 15–20 min before leaving; taxis are scarce.'),
    ('rail_hze', 'train', 'Train back to Hangzhou East.'),
    ('hotel_hz', 'metro', 'Metro Line 1 to Wulin Square.', ['rail_hze','m_wulin_sq']),
    ('hefang', 'car', 'Didi 10 min, or Line 1 two stops to Ding’an Road.')])],
 'd7': [seg('Sat 7 Nov · Lingyin, tea village and the Tea Museum', city='杭州', pts=[
    'hotel_hz', ('lingyin', 'car', 'Didi 20–25 min (灵隐寺), or bus 7 from Hubin.'),
    ('longjing', 'car', 'Didi 15 min, or bus 27.'),
    ('teamuseum', 'car', 'Didi 5–10 min down the hill, or bus 27 to Shuangfeng (双峰).'),
    ('hotel_hz', 'car', 'Didi about 20 min back to the hotel for a rest.'),
    ('hefang', 'car', 'Didi 10 min to the Qinghefang lanes.'),
    ('hotel_hz', 'car', 'Didi 10 min back to the hotel.')])],
 'd8': [seg('Sun 8 Nov · The Grand Canal', city='杭州', pts=[
    'hotel_hz', ('canalmuseum', 'car', 'Didi about 15 min north to the Grand Canal Museum.'),
    ('qiaoxi', 'walk', 'Across Gongchen Bridge, 5 min.'),
    ('hotel_hz', 'car', 'Didi 20 min back for the bags.')], tab='Canal day'),
    seg('Sun 8 Nov · To the airport hotel', city='杭州', pts=[
    'hotel_hz', ('hotel_ap', 'car', 'Didi about 50 min to Terminal 4. The hotel is in the ground transport centre.')], tab='Airport hotel')],
}
# number the place stops per day, in order of first appearance
for day, segs in DAYS.items():
    n = 0; seen = {}
    for sg in segs:
        if sg.get('atlas'):
            for p in sg['pts']: p['n'] = seen.get(p['k'])
            continue
        for p in sg['pts']:
            if p.get('stop'):
                if p['k'] not in seen: n += 1; seen[p['k']] = n
                p['n'] = seen[p['k']]

# ---------- HTML edits ----------
# 1. tag stop items with their option key
name2k = {v['name']: k for k, v in TD.items()}
name2k['Flower Harbor and the Su Causeway'] = 'sucause'
for k, v in P.items():
    name2k.setdefault(v.get('name'), k)
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
 'd4': 'Luca asks whether Hu Qing Yu Tang has a herbal remedy for short legs. Please enquire. He also approves of oil tanks: excellent things to bark at.',
 'd5': 'West Lake has ducks. Luca would like it on record that he would not chase them. (He would.)',
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
