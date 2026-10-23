# Autocomplete Search Box

A client-side country search with autocomplete, built for the GDG Algiers frontend challenge in vanilla HTML, CSS and JavaScript. The matching algorithm is hand-written: no search library and no framework.

**Live demo:** https://zaki-123610.github.io/autocomplete-search-box/ <!-- replace after deploying -->

## Features

- **Mid-word matches:** `land` finds Finland, Iceland, Ireland, Netherlands, New Zealand, Poland and Switzerland.
- **Forgiving input:** accents, apostrophes (`'` and `’`), hyphens, capitals and extra spaces are all ignored. `cote divoire`, `côte d’ivoire` and `COTE D'IVOIRE` all find Côte d'Ivoire, `sao tome` finds São Tomé and Príncipe, and `guinea bissau` finds Guinea-Bissau.
- **Ranking:** exact match first, then names that start with the query, then names with a word that starts with it, then other matches. Each group is alphabetical, ignoring accents.
- **Highlighting on the original name:** typing `sao tome` highlights **São Tomé**, accents included.
- **Instant:** the top 8 suggestions update on every keystroke, with a "Showing 8 of N" line when more matches exist.
- **Keyboard and mouse:** `↑` `↓` move through suggestions (wrapping around), `Enter` selects (the first suggestion if none is highlighted), `Esc` closes the list and a second `Esc` clears the input. Clicking a suggestion also selects it.
- **Accessible:** follows the WAI-ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"` / `"option"`). The result count and selections are announced to screen readers.
- **Responsive**, with light and dark themes. Shows a "No results" message when nothing matches.

## How the algorithm works

All the matching lives in [`search.js`](search.js), which has no DOM access. [`app.js`](app.js) only renders the results and handles input.

**1. Normalize.** Text is lowercased, decomposed with `NFD` so that accents become separate combining marks, and those marks are removed. Apostrophes are deleted, hyphens become spaces, and runs of spaces collapse into one:

```
"Côte d’Ivoire"  →  "cote divoire"
"Guinea-Bissau"  →  "guinea bissau"
```

**2. Build the index once, at load time.** Each name is stored with its normalized key and, for every character of the key, its start and end position in the original name. The index is sorted alphabetically by key, so `São Tomé` sorts as `sao tome`, before `Saudi Arabia`.

**3. On each keystroke,** only the query is normalized. One pass over the index runs `indexOf(query)` on each key and puts every match into one of four buckets:

| Rank | Condition | `guinea` example |
| --- | --- | --- |
| 0, exact | key equals the query | Guinea |
| 1, prefix | key starts with the query | Guinea-Bissau |
| 2, word start | the query starts a later word | Equatorial Guinea, Papua New Guinea |
| 3, mid-word | anywhere else | (none) |

The index is already alphabetical, so concatenating the buckets gives the final order without any sorting per keystroke.

**4. Highlight.** The match position in the normalized key is mapped back to the original name through the position arrays. That's how `sao tome` highlights `São Tomé`, and how `divoire` highlights `d'Ivoire` including the apostrophe.

**Typing forward is cheaper.** Every name that contains `land` also contains `lan`. When the new query extends the previous one, only the previous matches are rescanned, not the whole index. A search over the 110 countries takes about 2 µs, so there's no need for debouncing.

## Project structure

```
index.html            markup and ARIA combobox structure
style.css             design, light/dark themes, responsive layout
app.js                UI: rendering, keyboard, mouse, announcements
search.js             normalization, index, ranking, highlight ranges (no DOM)
data.js               the provided dataset, unchanged
tests/search.test.js  unit tests for search.js
```

## Running locally

The page uses ES modules (`import { countries } from "./data.js"`). Browsers block module imports from `file://`, so serve the folder over HTTP with any static server, then open http://localhost:8000:

```sh
python -m http.server 8000
# or
npx serve -l 8000
```

The VS Code **Live Server** extension also works.

## Tests

The tests use Node's built-in test runner and need Node 18 or later. There's nothing to install:

```sh
node --test
```

They cover normalization, mid-word matches, accents, apostrophes, hyphens, ranking, highlight positions, the result limit, and the typing-forward shortcut.
