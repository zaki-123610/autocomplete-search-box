import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countries } from '../data.js';
import { createAutocomplete, normalize, normalizeWithMap, RANK } from '../search.js';

const searchAll = (query) => createAutocomplete(countries, { limit: Infinity }).search(query);
const names = (query) => searchAll(query).results.map((r) => r.name);
const highlighted = (result) => result.name.slice(result.start, result.end);

test('normalize lowercases, strips accents and apostrophes, turns hyphens into spaces and collapses spaces', () => {
  assert.equal(normalize('  Côte  d’Ivoire '), 'cote divoire');
  assert.equal(normalize("Côte d'Ivoire"), 'cote divoire');
  assert.equal(normalize('São Tomé and Príncipe'), 'sao tome and principe');
  assert.equal(normalize('Guinea-Bissau'), 'guinea bissau');
  assert.equal(normalize('GUINEA - BISSAU'), 'guinea bissau');
  assert.equal(normalize(" ' ’ "), '');
});

test('the indexed form matches normalize() for every country and tricky inputs', () => {
  const samples = [...countries.map((c) => c.name), ' A  -  B ', 'São Tomé', "l'été d’hiver", 'İstanbul'];
  for (const text of samples) assert.equal(normalizeWithMap(text).key, normalize(text), text);
});

test('mid-word matches', () => {
  assert.deepEqual(names('land'), ['Finland', 'Iceland', 'Ireland', 'Netherlands', 'New Zealand', 'Poland', 'Switzerland']);
  assert.ok(names('stan').includes('Kazakhstan'));
  assert.ok(names('ingdo').includes('United Kingdom'));
});

test('accents and apostrophes are ignored', () => {
  for (const query of ["cote d'ivoire", 'cote divoire', 'côte d’ivoire', 'CÔTE D‘IVOIRE', 'Cote  Divoire']) {
    const [first] = searchAll(query).results;
    assert.equal(first.name, "Côte d'Ivoire", query);
    assert.equal(first.rank, RANK.EXACT, query);
  }
  for (const query of ['sao tome', 'São Tomé', 'SAO TOME AND PRINCIPE', 'principe']) {
    assert.deepEqual(names(query), ['São Tomé and Príncipe'], query);
  }
});

test('hyphens, case and extra spaces are ignored', () => {
  for (const query of ['guinea bissau', 'guinea-bissau', '  GUINEA   Bissau ', 'guinea‑bissau', 'bissau']) {
    assert.deepEqual(names(query), ['Guinea-Bissau'], query);
  }
});

test('ranking: exact, then prefix, then word start, then mid-word, alphabetical in each group', () => {
  const guinea = searchAll('guinea').results;
  assert.deepEqual(guinea.map((r) => r.name), ['Guinea', 'Guinea-Bissau', 'Equatorial Guinea', 'Papua New Guinea']);
  assert.deepEqual(guinea.map((r) => r.rank), [RANK.EXACT, RANK.PREFIX, RANK.WORD, RANK.WORD]);

  assert.deepEqual(names('sudan'), ['Sudan', 'South Sudan']);
  assert.deepEqual(names('united'), ['United Arab Emirates', 'United Kingdom', 'United States']);
  assert.deepEqual(names('new'), ['New Zealand', 'Papua New Guinea']);

  const ar = searchAll('ar').results;
  assert.deepEqual(ar.slice(0, 4).map((r) => r.name), ['Argentina', 'Armenia', 'Saudi Arabia', 'United Arab Emirates']);
  const middle = ar.filter((r) => r.rank === RANK.MIDDLE).map((r) => r.name);
  assert.ok(middle.length > 0);
  assert.deepEqual(middle, [...middle].sort((a, b) => normalize(a).localeCompare(normalize(b))));
});

test('alphabetical order ignores accents', () => {
  assert.deepEqual(names('sa'), ['São Tomé and Príncipe', 'Saudi Arabia', 'El Salvador', 'Guinea-Bissau']);
});

test('highlights map back to the original name, accents included', () => {
  const first = (query) => searchAll(query).results[0];
  assert.equal(highlighted(first('cote')), 'Côte');
  assert.equal(highlighted(first('divoire')), "d'Ivoire");
  assert.equal(highlighted(first('cote divoire')), "Côte d'Ivoire");
  assert.equal(highlighted(first('sao tome')), 'São Tomé');
  assert.equal(highlighted(first('principe')), 'Príncipe');
  assert.equal(highlighted(first('guinea bissau')), 'Guinea-Bissau');
  assert.equal(highlighted(searchAll('land').results.find((r) => r.name === 'New Zealand')), 'land');
  assert.equal(highlighted(searchAll('guinea').results[2]), 'Guinea');

  const decomposed = createAutocomplete([{ id: 1, name: 'São Tomé' }]).search('tome').results[0];
  assert.equal(highlighted(decomposed), 'Tomé');
});

test('limits the suggestions but reports the total', () => {
  const { results, total } = createAutocomplete(countries, { limit: 5 }).search('a');
  assert.equal(results.length, 5);
  assert.ok(total > 5);
});

test('no results and empty queries', () => {
  assert.deepEqual(searchAll('xyz'), { query: 'xyz', total: 0, results: [] });
  assert.deepEqual(searchAll("  ' - "), { query: '', total: 0, results: [] });
});

test('typing forward reuses previous matches without changing the results', () => {
  const typed = createAutocomplete(countries, { limit: Infinity });
  for (const query of ['s', 'su', 'sud', 'su', 's', 'sw', 'swi', '', 'l', 'la', 'lan', 'land', 'lan', 'xland', 'land']) {
    assert.deepEqual(typed.search(query), searchAll(query), query);
  }
});
