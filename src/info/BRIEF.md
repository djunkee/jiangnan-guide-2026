# Brief: offline place guide content (China trip, 1–9 Nov 2026)

Moritz and Lisa (from Singapore; first time in China, curious, like gardens, museums, history, TCM) are on the trip NOW.
Their phone guide needs a built-in "About this place" sheet for each stop that works with no internet.
You research a group of places and write ONE JSON file. No HTML, no other files.

## Output file
Write `/home/claude/info/<group>.json` (group name given in your task). Top-level object:
{
  "places": { "<key>": PLACE, ... },        // keys exactly as given in your task
  "pois":   { "<poi_key>": POI, ... }        // stations, piers, hotels, entrances you were asked for
}

PLACE = {
  "name": "English name", "zh": "中文名", "pinyin": "Yùyuán",
  "glance": "2–3 sentences: what it is and why it matters. The first thing they read.",
  "history": ["paragraph", "paragraph"],      // 120–220 words total; dynasty + years, who built it, what happened since, restorations
  "meaning": "60–140 words: the significance/symbolism. E.g. garden design ideas (borrowed scenery, yin–yang of rock and water, poems in the names), Buddhist iconography, why the place matters to Chinese people today, the meaning of the name.",
  "highlights": [ {"name":"…","zh":"… (optional)","what":"1–2 sentences: what it is and what to look for"} ],   // 4–7 items, in a sensible walking order where possible
  "tips": ["3–5 short, practical, specific tips (where to start, quiet corners, photo spots, what to skip, local food nearby)"],
  "facts": [ ["Built","1559–1577"], ["Area","2 ha"], ... ],   // 3–6 checkable key facts
  "ratings": {
    "china_grade": "AAAAA" | "AAAA" | null,         // China's official tourist attraction grade, only if you found it stated
    "unesco": "e.g. 'Classical Gardens of Suzhou (1997)'" | null,
    "visitor": {"score": 4.7, "of": 5, "count": "12,000+ reviews", "site": "Trip.com", "url": "…", "checked": "2026-11-01"} | null,
    "verdict": {"stars": 1-5, "line": "One honest line for these two travellers: must-see / worth it / skip if tired, and why."}
  },
  "time": "How long to allow, e.g. '1.5–2 h'",
  "best": "Best time to go and why, one sentence",
  "coord": [lat, lng],             // WGS84, the main entrance / where they'd start; see below
  "coord_src": "Wikipedia" | "OpenStreetMap" | "approx",
  "sources": [ ["Title", "url"], ... ]   // 2–6 pages you actually used
}

POI = { "name": "English", "zh": "中文", "kind": "metro"|"rail"|"pier"|"hotel"|"entrance"|"airport"|"food"|"other",
        "coord": [lat, lng], "coord_src": "…", "note": "optional one line, e.g. which exit" }

## Standards
- Facts must come from pages you read (Wikipedia, UNESCO, official sites, China Daily/Travel China Guide, Trip.com). Do not invent years, numbers or scores. If unsure, leave the fact out.
- Visitor score: only a number you saw on a page you fetched (Trip.com, Tripadvisor, Google via a page that shows it). Otherwise `null`. Never estimate.
- China grade: many places are listed as "AAAAA" (5A) or "AAAA" (4A) on Wikipedia or official pages. Only if stated.
- Voice: plain, warm, concrete English for a smart non-specialist. Short sentences. No marketing words ("must-visit gem", "breathtaking", "nestled"). Explain Chinese terms once. Give Chinese names in characters for things they'll see on signs.
- Coordinates MUST be WGS84 (what GPS and OpenStreetMap use). Wikipedia/Wikidata coordinates are WGS84 — use them. Do NOT take coordinates from Amap/Gaode, Baidu or Chinese map sites: they are deliberately offset by 300–600 m. If you can only get an approximate point, still give your best WGS84 estimate and set coord_src "approx". The file `/home/claude/info/stops-index.json` has our current rough coordinates (unverified) for reference.
- Web access: use WebSearch, then WebFetch on result links (fetching URLs you made up is usually refused). Wikipedia articles are reliable for coordinates and history.
- Budget: be efficient — roughly 3–6 searches/fetches per place. Prefer depth on the main sights; small items (a ferry, a street) can be shorter but still useful.
- Validate your JSON (e.g. `python3 -c "import json;json.load(open(PATH))"`) before finishing. Your final message: just the path, the number of places and POIs, and any places where you could not verify something important.

## Shopping (Lisa wants shopping options, placed in sequence within each day)
Also add a top-level "shops": [ SHOP, ... ] with 3–8 good shopping options that sit ON or right next to the routes of your places
(a short walk from a stop), so the guide can slot them into the day after the stop they're near.
SHOP = {
  "name": "English", "zh": "中文", "kind": "street"|"market"|"mall"|"shop"|"bookstore"|"food",
  "near": "<place key it is next to>", "walk": "e.g. '3 min from the garden exit'",
  "buy": "What is genuinely good to buy here (local specialities: silk, tea, fans, embroidery, ceramics, snacks, design goods, books…) and rough prices in RMB if you found them",
  "watch": "One honest warning if relevant (tourist-trap prices, fake silk, tea-house scams, bargaining)",
  "hours": "if found", "coord": [lat,lng], "coord_src": "…", "sources": [["Title","url"]]
}
Prefer places with character (time-honoured brands 老字号, designer shops, markets locals use) over generic chain malls; one good mall per city is fine for rain.
