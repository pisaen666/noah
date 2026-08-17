/**
 * =============================================================================
 * test-dom-ui.js — DOM & UI integration tester for Rewards Tab, Settings & Map
 * =============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Simple DOM Mock environment
class MockElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach((c) => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach((c) => this.classList._classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c),
    };
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.children = [];
    this.disabled = false;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
    }
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    list.forEach((fn) => fn({ ...event, currentTarget: this, target: this }));
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  querySelector(sel) {
    return this._findDescendant((el) => matchSelector(el, sel));
  }

  querySelectorAll(sel) {
    const res = [];
    this._collectDescendants((el) => {
      if (matchSelector(el, sel)) res.push(el);
    });
    return res;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  remove() {
    // detach
  }

  _findDescendant(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._findDescendant(predicate);
      if (found) return found;
    }
    return null;
  }

  _collectDescendants(collector) {
    for (const child of this.children) {
      collector(child);
      child._collectDescendants(collector);
    }
  }
}

function matchSelector(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel === el.tagName.toLowerCase()) return true;
  return false;
}

// Setup global mock DOM
const elementsById = new Map();
function getOrCreate(id, tag = 'div') {
  if (!elementsById.has(id)) {
    elementsById.set(id, new MockElement(tag, id));
  }
  return elementsById.get(id);
}

global.document = {
  getElementById: (id) => elementsById.get(id) || null,
  createElement: (tag) => new MockElement(tag),
  head: new MockElement('head'),
  body: new MockElement('body'),
  addEventListener: () => {},
};

global.window = {
  addEventListener: () => {},
  google: undefined,
};

global.navigator = {
  onLine: true,
};

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

async function runDOMTests() {
  console.log('\n🧪 Running DOM & Rewards Tab Integration Tests...\n');

  // Register required elements from index.html
  const appOverlays = getOrCreate('app-overlays');
  const missionStartBtn = getOrCreate('mission-start-btn', 'button');
  const tabContentMap = getOrCreate('tab-content-map', 'section');
  const tabContentRewards = getOrCreate('tab-content-rewards', 'section');
  const rewardsViewContainer = getOrCreate('rewards-view-container');
  tabContentRewards.appendChild(rewardsViewContainer);

  const navTabMap = getOrCreate('nav-tab-map', 'button');
  const navTabRewards = getOrCreate('nav-tab-rewards', 'button');
  const navTabSettings = getOrCreate('nav-tab-settings', 'button');

  const desktopTabMap = getOrCreate('desktop-tab-map', 'button');
  const desktopTabRewards = getOrCreate('desktop-tab-rewards', 'button');
  const desktopTabSettings = getOrCreate('desktop-tab-settings', 'button');

  const headerStarsVal = getOrCreate('header-stars-val', 'span');
  const headerStreakVal = getOrCreate('header-streak-val', 'span');
  const headerStarsBadge = getOrCreate('header-stars-badge');

  // Load UI module
  const { initUI, switchTab, showSettingsModal } = await import('../src/ui.js');
  const { saveParentRewardConfig } = await import('../src/rewards.js');

  initUI({ overlayRoot: appOverlays, missionBtn: missionStartBtn });

  let passed = 0;

  // 1. Initial State
  assert.strictEqual(tabContentRewards.classList.contains('hidden'), false);
  console.log('  ✅ [PASS] initUI binds successfully to DOM nodes');
  passed++;

  // 2. Switch to Rewards Tab
  switchTab('rewards');
  assert.strictEqual(tabContentMap.classList.contains('hidden'), true);
  assert.strictEqual(tabContentRewards.classList.contains('hidden'), false);
  console.log('  ✅ [PASS] switchTab("rewards") toggles map and rewards views');
  passed++;

  // 3. Switch back to Map Tab
  switchTab('map');
  assert.strictEqual(tabContentMap.classList.contains('hidden'), false);
  assert.strictEqual(tabContentRewards.classList.contains('hidden'), true);
  console.log('  ✅ [PASS] switchTab("map") toggles back to map view');
  passed++;

  // 4. Test Parent Custom Reward Settings persistence
  saveParentRewardConfig({
    rewardText: 'พาไปกินไอศกรีมมื้อพิเศษ 🍨',
    targetStars: 4,
  });
  assert.strictEqual(store['dwq_parent_reward_text'], 'พาไปกินไอศกรีมมื้อพิเศษ 🍨');
  assert.strictEqual(store['dwq_parent_target_stars'], '4');
  console.log('  ✅ [PASS] Custom Parent Reward persists properly in localStorage');
  passed++;

  // 5. Test Character Speech Bubble messages
  const { updateCharacterSpeech, SPEECH_MESSAGES } = await import('../src/ui.js');
  const speechTextEl = getOrCreate('character-speech-text', 'span');

  updateCharacterSpeech(false);
  assert.strictEqual(speechTextEl.textContent, 'อ๊ะ ๆ  โนอาห์วันนี้ได้เวลาปฏิบัติภารกิจแล้วนะ..ลงมือทำเลย');
  console.log('  ✅ [PASS] Speech bubble shows "อ๊ะ ๆ  โนอาห์วันนี้ได้เวลาปฏิบัติภารกิจแล้วนะ..ลงมือทำเลย" when mission incomplete');
  passed++;

  updateCharacterSpeech(true);
  assert.strictEqual(speechTextEl.textContent, 'เก่งมากโนอาห์ วันนี้ปฏิบัติการณ์ได้เยี่ยมมาก');
  console.log('  ✅ [PASS] Speech bubble shows "เก่งมากโนอาห์ วันนี้ปฏิบัติการณ์ได้เยี่ยมมาก" when mission completed');
  passed++;

  console.log(`\n----------------------------------------`);
  console.log(`DOM Test Results: ${passed} Passed, 0 Failed`);
  console.log(`----------------------------------------\n`);
}

runDOMTests().catch((err) => {
  console.error('DOM Test Error:', err);
  process.exit(1);
});
