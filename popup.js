const tabsEl = document.getElementById('tabs');
const countEl = document.getElementById('count');
const eatenEl = document.getElementById('eaten');
const hintEl = document.getElementById('hint');
const puff = document.getElementById('puff');
const mouth = document.getElementById('mouth');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let eaten = 0;
let busy = false;
let currentTabs = [];
let hintTimer = null;

function renderTabs(tabs) {
  currentTabs = tabs || [];
  tabsEl.innerHTML = '';

  if (!currentTabs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'no tabs. inbox-zero but for chaos. ✨';
    tabsEl.appendChild(empty);
    countEl.textContent = '0 tabs';
    return;
  }

  currentTabs.forEach((tab) => {
    const el = document.createElement('div');
    el.className = 'tab';
    el.dataset.tabId = String(tab.id);

    const favicon = document.createElement('span');
    favicon.className = 'favicon';
    favicon.textContent = tab.favIconUrl ? '•' : '⇢';

    const title = document.createElement('span');
    title.className = 'ttl';
    title.textContent = tab.title || 'Untitled';

    el.appendChild(favicon);
    el.appendChild(title);
    el.addEventListener('click', () => {
      if (!busy) inhaleOneTab(el, tab.id);
    });

    tabsEl.appendChild(el);
  });

  updateCount();
}

function updateCount() {
  const count = tabsEl.querySelectorAll('.tab').length;
  countEl.textContent = `${count} ${count === 1 ? 'tab' : 'tabs'}`;
}

function getMouthCenter() {
  const r = mouth.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function inhaleOneTab(card, tabId, opts = {}) {
  if (card.classList.contains('flying')) return;

  const r = card.getBoundingClientRect();
  card.style.width = r.width + 'px';
  card.style.height = r.height + 'px';
  card.style.left = r.left + 'px';
  card.style.top = r.top + 'px';
  card.classList.add('flying');

  puff.classList.add('inhaling');
  card.offsetWidth;

  const m = getMouthCenter();
  const dx = m.x - (r.left + r.width / 2);
  const dy = m.y - (r.top + r.height / 2);
  const spin = (Math.random() * 60) - 30;
  const dur = reduce ? 0.15 : 0.5;

  card.style.transition = `transform ${dur}s cubic-bezier(.5,.1,.9,.5), opacity ${dur}s ease-in`;
  card.style.transform = `translate(${dx}px, ${dy}px) scale(0.05) rotate(${spin}deg)`;
  card.style.opacity = '0.2';

  const done = () => {
    card.removeEventListener('transitionend', done);
    card.remove();
    eaten++;
    eatenEl.textContent = String(eaten);
    chomp();
    updateCount();

    chrome.tabs.remove(tabId);

    if (!opts.batch) {
      puff.classList.remove('inhaling');
      if (tabsEl.querySelectorAll('.tab').length === 0) {
        setHint('no tabs. inbox-zero but for chaos.');
      }
      busy = false;
    }
  };

  card.addEventListener('transitionend', done);
  setTimeout(done, dur * 1000 + 120);
}

function chomp() {
  puff.classList.remove('eating');
  void puff.offsetWidth;
  puff.classList.add('eating');
}

function setHint(txt) {
  hintEl.textContent = txt;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    hintEl.textContent = 'a tidy browser is a happy browser';
  }, 3200);
}

function inhaleAllTabs() {
  const cards = [...tabsEl.querySelectorAll('.tab')];
  if (!cards.length || busy) return;

  busy = true;
  puff.classList.add('inhaling');
  setHint('nom nom nom…');

  const gap = reduce ? 40 : 110;
  const tabIds = currentTabs.map((tab) => tab.id);

  cards.forEach((card, i) => {
    const tabId = tabIds[i];
    if (tabId !== undefined) {
      setTimeout(() => inhaleOneTab(card, tabId, { batch: true }), i * gap);
    }
  });

  setTimeout(() => {
    puff.classList.remove('inhaling');
    busy = false;
    setHint('all gone. that felt good, huh?');
  }, cards.length * gap + (reduce ? 200 : 650));
}

function refreshTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    renderTabs(tabs);
  });
}

document.getElementById('inhaleAll').addEventListener('click', inhaleAllTabs);
puff.addEventListener('click', inhaleAllTabs);

document.getElementById('newTab').addEventListener('click', () => {
  chrome.tabs.create({ active: false });
});

const closeTarget = (id) => {
  if (id === undefined) return;
  chrome.tabs.remove(id);
};

chrome.tabs.onRemoved.addListener(() => {
  refreshTabs();
});

chrome.tabs.onCreated.addListener(() => {
  refreshTabs();
});

chrome.tabs.query({ currentWindow: true }, (tabs) => {
  renderTabs(tabs);
});

window.addEventListener('load', () => {
  refreshTabs();
});

setHint('a tidy browser is a happy browser');
