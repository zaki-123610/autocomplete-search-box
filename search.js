export const RANK = { EXACT: 0, PREFIX: 1, WORD: 2, MIDDLE: 3 };

const fold = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’‘ʼ]/g, '')
    .replace(/[-‐‑–—]/g, ' ');

export function normalize(text) {
  return fold(text).replace(/\s+/g, ' ').trim();
}

// Same result as normalize(), plus where each key character came from in the original text.
export function normalizeWithMap(text) {
  let key = '';
  const starts = [];
  const ends = [];
  let pendingSpace = false;

  for (let i = 0; i < text.length; ) {
    const char = String.fromCodePoint(text.codePointAt(i));
    const end = i + char.length;
    const folded = fold(char);

    if (folded.trim() === '') {
      if (folded !== '') pendingSpace = key !== '';
      else if (/\p{M}/u.test(char) && ends.length > 0) ends[ends.length - 1] = end;
    } else {
      for (const out of folded) {
        if (pendingSpace) {
          key += ' ';
          starts.push(i);
          ends.push(i);
          pendingSpace = false;
        }
        key += out;
        starts.push(i);
        ends.push(end);
      }
    }
    i = end;
  }
  return { key, starts, ends };
}

export function createIndex(items) {
  return items
    .map((item) => ({ item, ...normalizeWithMap(item.name) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function locate(key, query) {
  if (key === query) return { rank: RANK.EXACT, at: 0 };
  if (key.startsWith(query)) return { rank: RANK.PREFIX, at: 0 };
  const first = key.indexOf(query);
  if (first === -1) return null;
  for (let at = first; at !== -1; at = key.indexOf(query, at + 1)) {
    if (key[at - 1] === ' ') return { rank: RANK.WORD, at };
  }
  return { rank: RANK.MIDDLE, at: first };
}

export function createAutocomplete(items, { limit = 8 } = {}) {
  const index = createIndex(items);
  let lastQuery = '';
  let lastMatches = index;

  function search(text) {
    const query = normalize(text);
    if (query === '') {
      lastQuery = '';
      lastMatches = index;
      return { query, total: 0, results: [] };
    }

    // Every name containing "land" also contains "lan": typing forward only rescans the previous matches.
    const pool = lastQuery !== '' && query.startsWith(lastQuery) ? lastMatches : index;
    const groups = [[], [], [], []];
    const matches = [];
    for (const entry of pool) {
      const match = locate(entry.key, query);
      if (match === null) continue;
      matches.push(entry);
      groups[match.rank].push({ entry, match });
    }
    lastQuery = query;
    lastMatches = matches;

    const ranked = groups.flat();
    const results = ranked.slice(0, limit).map(({ entry, match }) => ({
      id: entry.item.id,
      name: entry.item.name,
      rank: match.rank,
      start: entry.starts[match.at],
      end: entry.ends[match.at + query.length - 1],
    }));
    return { query, total: ranked.length, results };
  }

  return { search, size: index.length };
}
