import { countries } from './data.js';
import { createAutocomplete } from './search.js';

const LIMIT = 8;

const autocomplete = createAutocomplete(countries, { limit: LIMIT });

const input = document.getElementById('search-input');
const popup = document.getElementById('search-popup');
const listbox = document.getElementById('search-listbox');
const more = document.getElementById('search-more');
const empty = document.getElementById('search-empty');
const clearButton = document.querySelector('.search__clear');
const status = document.getElementById('search-status');

document.getElementById('country-count').textContent = autocomplete.size;

let suggestions = [];
let activeIndex = -1;
let statusTimer;

const optionId = (index) => `search-option-${index}`;
const isOpen = () => !popup.hidden;

function announce(message, delay = 0) {
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = message;
  }, delay);
}

function renderOption(result, index) {
  const option = document.createElement('li');
  option.id = optionId(index);
  option.className = 'search__option';
  option.setAttribute('role', 'option');
  option.setAttribute('aria-selected', 'false');
  option.dataset.index = index;

  const mark = document.createElement('mark');
  mark.textContent = result.name.slice(result.start, result.end);
  option.append(result.name.slice(0, result.start), mark, result.name.slice(result.end));
  return option;
}

function close() {
  popup.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  activeIndex = -1;
}

function setActive(index, { scroll = true } = {}) {
  listbox.querySelector('[aria-selected="true"]')?.setAttribute('aria-selected', 'false');
  activeIndex = index;
  const option = document.getElementById(optionId(index));
  if (!option) {
    input.removeAttribute('aria-activedescendant');
    return;
  }
  option.setAttribute('aria-selected', 'true');
  input.setAttribute('aria-activedescendant', option.id);
  if (scroll) option.scrollIntoView({ block: 'nearest' });
}

function update() {
  const { query, total, results } = autocomplete.search(input.value);
  suggestions = results;
  activeIndex = -1;
  input.removeAttribute('aria-activedescendant');
  clearButton.hidden = input.value === '';

  if (query === '') {
    listbox.replaceChildren();
    close();
    announce('');
    return;
  }

  listbox.replaceChildren(...results.map(renderOption));
  listbox.hidden = results.length === 0;
  more.hidden = total <= results.length;
  more.textContent = `Showing ${results.length} of ${total}. Keep typing to narrow it down.`;
  empty.hidden = total > 0;
  empty.textContent = `No results for “${input.value.trim()}”`;
  popup.hidden = false;
  input.setAttribute('aria-expanded', String(results.length > 0));

  const count = total === 1 ? '1 result' : `${total} results`;
  announce(total === 0 ? 'No results' : total > results.length ? `${count}, showing the first ${results.length}` : count, 400);
}

function select(index) {
  const result = suggestions[index];
  if (!result) return;
  input.value = result.name;
  clearButton.hidden = false;
  close();
  announce(`${result.name} selected`);
}

input.addEventListener('input', update);

input.addEventListener('keydown', (event) => {
  if (event.isComposing) return;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      event.preventDefault();
      if (!isOpen()) update();
      const count = suggestions.length;
      if (count === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const start = step === 1 ? 0 : count - 1;
      setActive(activeIndex === -1 ? start : (activeIndex + step + count) % count);
      break;
    }
    case 'Enter':
      if (isOpen() && suggestions.length > 0) {
        event.preventDefault();
        select(activeIndex === -1 ? 0 : activeIndex);
      }
      break;
    case 'Escape':
      if (isOpen()) {
        event.preventDefault();
        close();
      } else if (input.value !== '') {
        event.preventDefault();
        input.value = '';
        update();
      }
      break;
    case 'Tab':
      close();
      break;
  }
});

input.addEventListener('focus', () => {
  if (input.value !== '') update();
});

input.addEventListener('click', () => {
  if (!isOpen() && input.value !== '') update();
});

input.addEventListener('blur', close);

popup.addEventListener('mousedown', (event) => event.preventDefault());

listbox.addEventListener('click', (event) => {
  const option = event.target.closest('[role="option"]');
  if (option) select(Number(option.dataset.index));
});

listbox.addEventListener('mousemove', (event) => {
  const option = event.target.closest('[role="option"]');
  if (option && Number(option.dataset.index) !== activeIndex) {
    setActive(Number(option.dataset.index), { scroll: false });
  }
});

clearButton.addEventListener('click', () => {
  input.value = '';
  update();
  input.focus();
});
