/**
 * =============================================================================
 * ui.js — DOM Bridge & UI Orchestrator
 * =============================================================================
 * Responsibilities:
 *  - Character Speech Bubble: Updates dynamically based on today's mission status:
 *      * Completed: "เก่งมากโนอาห์ วันนี้ปฏิบัติการณ์ได้เยี่ยมมาก"
 *      * Incomplete: "อ๊ะ ๆ  โนอาห์วันนี้ได้เวลาปฏิบัติภารกิจแล้วนะ..ลงมือทำเลย"
 *  - Tab Switching: Map (แผนที่) ↔ Rewards (ของรางวัล) ↔ Settings (ตั้งค่า)
 *  - Weekly Reward System & Progress Dashboard UI:
 *      * Trophy & Star Shelf (หิ้งเกียรติยศ)
 *      * Parent's Real-World Reward Goal Tracker with live progress bar
 *      * 4-Week ISO Monday–Sunday visual history timeline & daily status matrix
 *      * Parent Settings Modal (Custom Reward editor, Target Star selector, Sync, Sign Out)
 *  - Kid-friendly quiz overlays & mission completion celebrations
 *  - Google Auth gating & Login overlay
 *  - Real-time online / offline detection & toast notifications
 *  - Header metrics sync (Stars, Streak, Level)
 * =============================================================================
 */

import { signIn, signOut, isSignedIn } from './auth.js';
import {
  useCalendarData,
  useWeeklyRewards,
  completeDailyMission,
  saveParentRewardConfig,
  getParentRewardConfig,
  getCachedRewardsData,
} from './calendarHooks.js';
import { CHILD_NAME } from './config.js';

// ---------------------------------------------------------------------------
// Character Speech Bubble Messages
// ---------------------------------------------------------------------------
export const SPEECH_MESSAGES = {
  COMPLETED: 'เก่งมากโนอาห์ วันนี้ปฏิบัติการณ์ได้เยี่ยมมาก',
  INCOMPLETE: 'อ๊ะ ๆ  โนอาห์วันนี้ได้เวลาปฏิบัติภารกิจแล้วนะ..ลงมือทำเลย',
};

// ---------------------------------------------------------------------------
// DOM References & State
// ---------------------------------------------------------------------------
let $overlayRoot = null;
let $missionBtn = null;
let $offlineToast = null;
let currentTab = 'map';
let lastRewardsData = null;
let todayMissionCompleted = false;

// ---------------------------------------------------------------------------
// Initializer — called from app.js
// ---------------------------------------------------------------------------

/**
 * Wires up all UI event listeners, tab navigation, and initial state.
 * @param {object} opts
 * @param {HTMLElement} opts.overlayRoot - The #app-overlays mount point
 * @param {HTMLElement} opts.missionBtn  - The "เริ่มภารกิจ 15 คำศัพท์" button
 */
export function initUI({ overlayRoot, missionBtn }) {
  $overlayRoot = overlayRoot;
  $missionBtn = missionBtn;

  // Set initial speech bubble state (default incomplete)
  updateCharacterSpeech(false);

  // Wire up the mission button
  if ($missionBtn) {
    $missionBtn.addEventListener('click', handleMissionClick);
  }

  // Wire up Tab Navigation (Mobile & Desktop)
  setupTabNavigation();

  // Setup real-time online / offline network listeners
  setupNetworkListeners();

  // Load and populate initial header metrics from cache
  const cached = getCachedRewardsData();
  if (cached) {
    updateHeaderMetrics(cached);
  }

  // If already signed in, quietly sync today's mission status & fresh rewards
  if (isSignedIn()) {
    useCalendarData().then((data) => {
      if (data) {
        todayMissionCompleted = Boolean(data.isCompleted);
        updateCharacterSpeech(todayMissionCompleted);
        if (data.isCompleted) {
          setMissionBtnState('completed');
        }
      }
    }).catch((err) => {
      console.warn('[DWQ] Initial calendar check error:', err);
    });

    useWeeklyRewards(false).then((data) => {
      lastRewardsData = data;
      updateHeaderMetrics(data);
    }).catch((err) => {
      console.warn('[DWQ] Initial rewards sync error:', err);
    });
  }
}

/**
 * Shows the login overlay if the user is not yet authenticated.
 * Called by app.js on startup.
 */
export function checkAndShowLoginOverlay() {
  if (!isSignedIn()) {
    showLoginOverlay();
  }
}

// ---------------------------------------------------------------------------
// Character Speech Bubble Controller
// ---------------------------------------------------------------------------

/**
 * Updates the Fox character speech bubble text based on today's mission status.
 * @param {boolean} isCompleted - Whether Noah has completed today's mission
 */
export function updateCharacterSpeech(isCompleted) {
  todayMissionCompleted = isCompleted;
  const textEl = document.getElementById('character-speech-text');
  const bubbleEl = document.getElementById('character-speech-bubble');

  if (textEl) {
    textEl.textContent = isCompleted ? SPEECH_MESSAGES.COMPLETED : SPEECH_MESSAGES.INCOMPLETE;
  }

  if (bubbleEl) {
    bubbleEl.style.animation = 'none';
    void bubbleEl.offsetWidth; // trigger reflow
    bubbleEl.style.animation = 'celebrationPop 0.35s ease-out';
  }
}

// ---------------------------------------------------------------------------
// Tab Navigation System
// ---------------------------------------------------------------------------

function setupTabNavigation() {
  // Mobile Nav
  document.getElementById('nav-tab-map')?.addEventListener('click', () => switchTab('map'));
  document.getElementById('nav-tab-rewards')?.addEventListener('click', () => switchTab('rewards'));
  document.getElementById('nav-tab-settings')?.addEventListener('click', () => switchTab('settings'));

  // Desktop Nav
  document.getElementById('desktop-tab-map')?.addEventListener('click', () => switchTab('map'));
  document.getElementById('desktop-tab-rewards')?.addEventListener('click', () => switchTab('rewards'));
  document.getElementById('desktop-tab-settings')?.addEventListener('click', () => switchTab('settings'));

  // Header Stars Badge -> Quick jump to Rewards
  document.getElementById('header-stars-badge')?.addEventListener('click', () => switchTab('rewards'));
}

/**
 * Switches the active tab view.
 * @param {'map' | 'rewards' | 'settings'} tabName
 */
export function switchTab(tabName) {
  if (tabName === 'settings') {
    showSettingsModal();
    return;
  }

  currentTab = tabName;
  const isMap = tabName === 'map';
  const isRewards = tabName === 'rewards';

  // Update Mobile Nav classes
  const mapBtn = document.getElementById('nav-tab-map');
  const rewardsBtn = document.getElementById('nav-tab-rewards');

  if (mapBtn) {
    mapBtn.className = isMap
      ? 'flex flex-col items-center justify-center bg-primary-container text-on-surface rounded px-stack-md py-unit translate-y-[-4px] border-b-4 border-on-primary-container transition-all duration-100 ease-out active:translate-y-0 active:border-b-0 cursor-pointer'
      : 'flex flex-col items-center justify-center text-on-surface-variant px-stack-md py-unit transition-all duration-100 ease-out active:translate-y-1 hover:bg-surface-variant hover:text-on-surface rounded cursor-pointer';
  }

  if (rewardsBtn) {
    rewardsBtn.className = isRewards
      ? 'flex flex-col items-center justify-center bg-primary-container text-on-surface rounded px-stack-md py-unit translate-y-[-4px] border-b-4 border-on-primary-container transition-all duration-100 ease-out active:translate-y-0 active:border-b-0 cursor-pointer'
      : 'flex flex-col items-center justify-center text-on-surface-variant px-stack-md py-unit transition-all duration-100 ease-out active:translate-y-1 hover:bg-surface-variant hover:text-on-surface rounded cursor-pointer';
  }

  // Update Desktop Nav classes
  const dMapBtn = document.getElementById('desktop-tab-map');
  const dRewardsBtn = document.getElementById('desktop-tab-rewards');

  if (dMapBtn) {
    dMapBtn.className = isMap
      ? 'flex items-center gap-2 px-3 py-1.5 rounded font-label-bold text-sm text-on-surface bg-primary-container border-b-2 border-on-primary-container hover:bg-primary-container/90 transition cursor-pointer'
      : 'flex items-center gap-2 px-3 py-1.5 rounded font-label-bold text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition cursor-pointer';
  }

  if (dRewardsBtn) {
    dRewardsBtn.className = isRewards
      ? 'flex items-center gap-2 px-3 py-1.5 rounded font-label-bold text-sm text-on-surface bg-primary-container border-b-2 border-on-primary-container hover:bg-primary-container/90 transition cursor-pointer'
      : 'flex items-center gap-2 px-3 py-1.5 rounded font-label-bold text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition cursor-pointer';
  }

  // Toggle View Sections
  const mapSection = document.getElementById('tab-content-map');
  const rewardsSection = document.getElementById('tab-content-rewards');

  if (mapSection) mapSection.classList.toggle('hidden', !isMap);
  if (rewardsSection) {
    rewardsSection.classList.toggle('hidden', !isRewards);
    if (isRewards) {
      loadAndRenderRewards();
    }
  }

  if (isMap) {
    updateCharacterSpeech(todayMissionCompleted);
  }
}

// ---------------------------------------------------------------------------
// Header Metrics Synchronizer
// ---------------------------------------------------------------------------

function updateHeaderMetrics(data) {
  if (!data) return;
  const starsEl = document.getElementById('header-stars-val');
  const streakEl = document.getElementById('header-streak-val');

  if (starsEl && typeof data.totalStars === 'number') {
    starsEl.textContent = String(data.totalStars);
  }
  if (streakEl && typeof data.currentStreak === 'number') {
    streakEl.textContent = String(data.currentStreak);
  }
}

// ---------------------------------------------------------------------------
// Rewards & Collection Shelf Tab
// ---------------------------------------------------------------------------

async function loadAndRenderRewards(forceRefresh = false) {
  const container = document.getElementById('rewards-view-container');
  if (!container) return;

  const cached = lastRewardsData || getCachedRewardsData();
  if (cached && container.innerHTML.trim() === '') {
    renderRewardsView(cached);
  } else if (!cached && container.innerHTML.trim() === '') {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <span class="material-symbols-outlined text-[48px] text-primary-container animate-spin">progress_activity</span>
        <p class="text-on-surface-variant font-bold">กำลังคำนวณและดึงประวัติของรางวัล...</p>
      </div>
    `;
  }

  try {
    const data = await useWeeklyRewards(forceRefresh);
    lastRewardsData = data;
    updateHeaderMetrics(data);
    renderRewardsView(data);
  } catch (err) {
    console.error('[DWQ] Error loading rewards view:', err);
    if (cached) {
      renderRewardsView(cached);
    } else {
      container.innerHTML = `
        <div class="dwq-card text-center p-6 border border-error-container">
          <p class="text-error font-bold mb-2">ไม่สามารถโหลดข้อมูลของรางวัลได้</p>
          <p class="text-on-surface-variant text-sm mb-4">${err.message}</p>
          <button id="btn-retry-rewards" class="dwq-btn-primary">ลองใหม่อีกครั้ง</button>
        </div>
      `;
      container.querySelector('#btn-retry-rewards')?.addEventListener('click', () => loadAndRenderRewards(true));
    }
  }
}

/**
 * Renders the full Rewards & Progress view.
 * @param {import('./rewards.js').RewardsCalculationResult & { isOffline?: boolean, error?: string | null }} data
 */
function renderRewardsView(data) {
  const container = document.getElementById('rewards-view-container');
  if (!container) return;

  const { totalStars, totalCompletedMissions, currentStreak, weeks, parentReward } = data;

  // Build 3D Stars badge rack items
  const starIcons = Array.from({ length: Math.max(1, totalStars) }, (_, i) => {
    const isEarned = i < totalStars;
    return `
      <div class="w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-all ${
        isEarned
          ? 'bg-secondary-container/20 border-[#ffd700] text-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105'
          : 'bg-surface-container border-outline-variant text-outline opacity-40'
      }">
        <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' ${isEarned ? 1 : 0};">star</span>
      </div>
    `;
  }).join('');

  // 4 Weeks Cards HTML
  const weeksHtml = weeks.map((week) => {
    const isSuccessWeek = week.isWeekCompleted;

    const daysHtml = week.days.map((day) => {
      let icon = 'lock';
      let bgClass = 'bg-surface-container-high border-outline-variant text-outline opacity-40';
      let title = `${day.dayName} ${day.formattedDate}: ยังไม่ถึง`;

      if (day.isCompleted) {
        icon = 'star';
        bgClass = 'bg-secondary-container border-on-secondary-container text-on-surface shadow-[0_2px_8px_rgba(0,229,64,0.4)]';
        title = `${day.dayName} ${day.formattedDate}: ทำภารกิจสำเร็จแล้ว! ⭐`;
      } else if (day.isToday) {
        icon = 'explore';
        bgClass = 'bg-primary-container border-on-primary-container text-on-surface animate-pulse shadow-[0_0_10px_rgba(0,162,255,0.5)]';
        title = `${day.dayName} วันนี้: รอเริ่มภารกิจ`;
      } else if (day.isPast) {
        icon = 'close';
        bgClass = 'bg-surface-variant border-outline text-outline-variant';
        title = `${day.dayName} ${day.formattedDate}: พักผ่อน / ไม่ได้ทำ`;
      }

      return `
        <div class="flex flex-col items-center gap-1">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded border-b-2 border-r-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${bgClass}" title="${title}">
            <span class="material-symbols-outlined text-[18px] sm:text-[20px]" style="font-variation-settings: 'FILL' 1;">${icon}</span>
          </div>
          <span class="text-[11px] font-bold ${day.isToday ? 'text-primary' : 'text-on-surface-variant'}">${day.dayShort}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-surface-container-low border ${
        isSuccessWeek ? 'border-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.15)]' : 'border-surface-container-high'
      } rounded-lg p-4 flex flex-col gap-3">
        <!-- Week Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-headline-md text-base sm:text-lg font-bold text-on-surface">
              ${week.label}
            </span>
            <span class="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded">
              ${week.dateRangeLabel}
            </span>
          </div>
          <div>
            ${
              isSuccessWeek
                ? `<span class="bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">military_tech</span> พิชิต 7 วัน! (+1 ⭐)
                   </span>`
                : `<span class="text-xs font-bold text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded">
                    ${week.completedCount} / 7 วัน
                   </span>`
            }
          </div>
        </div>

        <!-- 7-Day Matrix -->
        <div class="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1 pb-1">
          ${daysHtml}
        </div>

        <!-- Weekly Progress Bar -->
        <div class="flex flex-col gap-1 mt-1">
          <div class="flex justify-between text-[11px] text-on-surface-variant font-medium">
            <span>ความคืบหน้ารายสัปดาห์</span>
            <span>${week.progressPercentage}% (${week.completedCount}/7 วัน)</span>
          </div>
          <div class="w-full h-2 bg-surface-container-highest rounded overflow-hidden">
            <div class="h-full transition-all duration-500 rounded ${
              isSuccessWeek ? 'bg-[#ffd700]' : 'bg-gradient-to-r from-secondary to-primary-container'
            }" style="width: ${week.progressPercentage}%;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Top Shelf: Trophy & Star Collection -->
    <div class="bg-surface-container border border-surface-variant rounded-lg p-5 flex flex-col gap-4 shadow-lg">
      <div class="flex items-center justify-between border-b border-surface-container-highest pb-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded bg-[#ffd700]/10 border-2 border-[#ffd700] flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.25)]">
            <span class="material-symbols-outlined text-[#ffd700] text-[32px]" style="font-variation-settings: 'FILL' 1;">star</span>
          </div>
          <div>
            <h2 class="font-headline-md text-xl font-black text-on-surface m-0 leading-tight">
              หิ้งเกียรติยศของ ${CHILD_NAME}
            </h2>
            <p class="text-xs text-on-surface-variant m-0">สะสมดาวทองจากการทำภารกิจครบ 7 วันใน 1 สัปดาห์</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-3xl font-black text-[#ffd700] leading-none">${totalStars}</div>
          <div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">ดาวทองสะสม</div>
        </div>
      </div>

      <!-- Star Collection Shelf Rack -->
      <div class="flex items-center gap-3 overflow-x-auto py-2 px-1">
        ${starIcons}
      </div>

      <!-- Quick Stats Strip -->
      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container-highest">
        <div class="bg-surface-container-low p-2.5 rounded flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary text-[22px]" style="font-variation-settings: 'FILL' 1;">task_alt</span>
          <div>
            <div class="text-sm font-bold text-on-surface">${totalCompletedMissions} วัน</div>
            <div class="text-[10px] text-on-surface-variant">ภารกิจสำเร็จทั้งหมด</div>
          </div>
        </div>
        <div class="bg-surface-container-low p-2.5 rounded flex items-center gap-2">
          <span class="material-symbols-outlined text-primary-container text-[22px]" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
          <div>
            <div class="text-sm font-bold text-on-surface">${currentStreak} วันติดกัน</div>
            <div class="text-[10px] text-on-surface-variant">Streak การเรียนรู้</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Parent's Real-World Reward Goal Tracker Card -->
    <div class="bg-surface-container-low border-2 ${
      parentReward.isUnlocked
        ? 'border-[#00e540] shadow-[0_0_30px_rgba(0,229,64,0.25)]'
        : 'border-primary-container shadow-[0_4px_20px_rgba(0,162,255,0.15)]'
    } rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">${parentReward.isUnlocked ? '🎉' : '🎁'}</span>
          <div>
            <span class="text-xs font-bold text-primary uppercase tracking-wider">เป้าหมายรางวัลใหญ่จากผู้ปกครอง</span>
            <h3 class="font-headline-md text-lg font-black text-on-surface m-0 leading-tight">
              ${parentReward.rewardText}
            </h3>
          </div>
        </div>
        <button id="dwq-btn-edit-reward" class="text-xs text-on-surface-variant hover:text-primary font-bold flex items-center gap-1 bg-surface-container px-2.5 py-1.5 rounded border border-surface-variant hover:border-primary transition cursor-pointer shrink-0">
          <span class="material-symbols-outlined text-[14px]">edit</span> แก้ไข
        </button>
      </div>

      <!-- Goal Progress Bar -->
      <div class="flex flex-col gap-1.5 mt-1">
        <div class="flex justify-between items-center text-xs">
          <span class="text-on-surface font-bold">
            สะสมได้ <span class="text-[#ffd700] font-black text-sm">${totalStars}</span> / ${parentReward.targetStars} ดาวทอง
          </span>
          <span class="text-xs font-bold ${parentReward.isUnlocked ? 'text-[#00e540]' : 'text-primary'}">
            ${parentReward.progressPercent}%
          </span>
        </div>
        <div class="w-full h-4 bg-surface-container-highest rounded border border-surface-variant overflow-hidden p-0.5">
          <div class="h-full rounded transition-all duration-700 ${
            parentReward.isUnlocked
              ? 'bg-gradient-to-r from-[#00e540] to-[#71ff74]'
              : 'bg-gradient-to-r from-primary-container to-[#ffd700]'
          }" style="width: ${parentReward.progressPercent}%;"></div>
        </div>
      </div>

      <!-- Status Footer Notice -->
      <div class="bg-surface-container/60 p-2.5 rounded text-xs leading-relaxed flex items-center gap-2">
        ${
          parentReward.isUnlocked
            ? `<span class="material-symbols-outlined text-[#00e540] text-[20px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
               <span class="text-[#00e540] font-bold">ปลดล็อกรางวัลสำเร็จแล้ว! แสดงหน้านี้ให้คุณพ่อคุณแม่ดูเพื่อรับรางวัลได้เลย 🍨</span>`
            : `<span class="material-symbols-outlined text-primary-container text-[20px]">info</span>
               <span class="text-on-surface-variant">อีกเพียง <strong class="text-primary font-bold">${parentReward.remainingStars} ดาวทอง</strong> จะปลดล็อกรางวัลนี้! สู้ๆ นะ ${CHILD_NAME} 🚀</span>`
        }
      </div>
    </div>

    <!-- 4-Week Progress Timeline Breakdown -->
    <div class="flex flex-col gap-3 mt-1">
      <div class="flex items-center justify-between px-1">
        <h3 class="font-headline-md text-base font-bold text-on-surface flex items-center gap-2 m-0">
          <span class="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
          ประวัติภารกิจ 4 สัปดาห์ย้อนหลัง
        </h3>
        <button id="dwq-btn-refresh-history" class="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer" title="รีเฟรชประวัติจาก Google Calendar">
          <span class="material-symbols-outlined text-[16px]">sync</span> ซิงค์
        </button>
      </div>

      ${weeksHtml}
    </div>
  `;

  // Attach event handlers
  container.querySelector('#dwq-btn-edit-reward')?.addEventListener('click', () => {
    showSettingsModal();
  });

  container.querySelector('#dwq-btn-refresh-history')?.addEventListener('click', () => {
    loadAndRenderRewards(true);
  });
}

// ---------------------------------------------------------------------------
// PARENT SETTINGS & CUSTOM REWARD MODAL
// ---------------------------------------------------------------------------

export function showSettingsModal() {
  const overlay = createOverlay('dwq-settings-modal');
  const currentConfig = getParentRewardConfig();

  overlay.innerHTML = `
    <div class="dwq-card" style="width:min(96vw,480px); max-height:90vh; overflow-y:auto;" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3f4852; padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="font-size:24px; color:#00a2ff;">settings</span>
          <h2 id="settings-title" style="font-size:18px; font-weight:800; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#e5e2e1; margin:0;">
            การตั้งค่าสำหรับผู้ปกครอง
          </h2>
        </div>
        <button id="dwq-settings-close" class="dwq-btn-secondary" style="padding:4px 10px; font-size:12px;">✕ ปิด</button>
      </div>

      <!-- Reward Customization Form -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <label style="display:block; font-size:13px; font-weight:700; color:#bec7d4; margin-bottom:6px;">
            🎁 ของรางวัลเมื่อสะสมดาวทองครบกำหนด:
          </label>
          <input
            id="dwq-input-reward-text"
            type="text"
            value="${escapeHtml(currentConfig.rewardText)}"
            placeholder="เช่น พาไปกินไอศกรีมมื้อพิเศษ & ซื้อเลโก้"
            style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #3f4852; border-radius:4px; padding:10px 12px; color:#e5e2e1; font-size:14px; font-family:'Noto Sans Thai','Inter',sans-serif;"
          />
        </div>

        <!-- Quick Presets -->
        <div>
          <span style="font-size:11px; color:#89919d; display:block; margin-bottom:6px;">เลือกของรางวัลแนะนำด่วน:</span>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            <button class="dwq-preset-btn dwq-btn-secondary" style="font-size:12px; padding:4px 8px;" data-text="พาไปกินไอศกรีม Haagen-Dazs 🍨">🍨 กินไอศกรีม</button>
            <button class="dwq-preset-btn dwq-btn-secondary" style="font-size:12px; padding:4px 8px;" data-text="ซื้อตัวต่อ LEGO ชุดใหม่ 🧱">🧱 ซื้อ LEGO</button>
            <button class="dwq-preset-btn dwq-btn-secondary" style="font-size:12px; padding:4px 8px;" data-text="เที่ยวสวนสนุก & สวนสัตว์ 🎡">🎡 เที่ยวสวนสนุก</button>
            <button class="dwq-preset-btn dwq-btn-secondary" style="font-size:12px; padding:4px 8px;" data-text="เล่นเกมเพิ่ม 1 ชั่วโมง 🎮">🎮 เล่นเกมเพิ่ม 1 ชม.</button>
            <button class="dwq-preset-btn dwq-btn-secondary" style="font-size:12px; padding:4px 8px;" data-text="ซื้อหนังสือการ์ตูนเล่มโปรด 📚">📚 ซื้อหนังสือการ์ตูน</button>
          </div>
        </div>

        <!-- Target Stars Stepper -->
        <div>
          <label style="display:block; font-size:13px; font-weight:700; color:#bec7d4; margin-bottom:6px;">
            ⭐ จำนวนดาวทองเป้าหมาย (1 สัปดาห์ = 1 ดาวทอง):
          </label>
          <div style="display:flex; align-items:center; gap:10px;">
            <input
              id="dwq-input-target-stars"
              type="number"
              min="1"
              max="20"
              value="${currentConfig.targetStars}"
              style="width:80px; background:#0e0e0e; border:1px solid #3f4852; border-radius:4px; padding:8px 10px; color:#ffd700; font-size:16px; font-weight:bold; text-align:center;"
            />
            <span style="font-size:12px; color:#89919d;">(แนะนำ 4 ดาวทอง = ครบ 1 เดือนของการเรียนรู้สม่ำเสมอ)</span>
          </div>
        </div>

        <button id="dwq-save-settings-btn" class="dwq-btn-primary" style="margin-top:4px;">
          💾 บันทึกการตั้งค่ารางวัล
        </button>
      </div>

      <!-- Account & Sync Section -->
      <div style="border-top:1px solid #3f4852; padding-top:16px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#e5e2e1;">สถานะ Google Calendar</div>
            <div style="font-size:11px; color:#89919d;">${isSignedIn() ? '✅ เชื่อมต่อและเข้าสู่ระบบแล้ว' : '⏳ ยังไม่ได้เข้าสู่ระบบ'}</div>
          </div>
          <button id="dwq-sync-now-btn" class="dwq-btn-secondary" style="font-size:12px; padding:6px 12px; display:flex; align-items:center; gap:4px;">
            <span class="material-symbols-outlined" style="font-size:16px;">sync</span> ซิงค์ตอนนี้
          </button>
        </div>

        <button id="dwq-modal-signout-btn" class="dwq-btn-secondary" style="border-color:#93000a; color:#ffb4ab; margin-top:6px;">
          🚪 ออกจากระบบ Google (Sign Out)
        </button>
      </div>
    </div>
  `;

  // Quick preset click handlers
  overlay.querySelectorAll('.dwq-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = overlay.querySelector('#dwq-input-reward-text');
      if (input && btn.dataset.text) {
        input.value = btn.dataset.text;
      }
    });
  });

  // Save button
  overlay.querySelector('#dwq-save-settings-btn')?.addEventListener('click', () => {
    const textInput = overlay.querySelector('#dwq-input-reward-text');
    const starsInput = overlay.querySelector('#dwq-input-target-stars');

    const rewardText = textInput?.value || currentConfig.rewardText;
    const targetStars = parseInt(starsInput?.value || '4', 10);

    saveParentRewardConfig({ rewardText, targetStars });

    closeOverlay('dwq-settings-modal');
    showSaveSuccessToast('บันทึกการตั้งค่ารางวัลสำเร็จแล้ว! 🎉');

    // Reload rewards view if open
    loadAndRenderRewards(false);
  });

  // Sync button
  overlay.querySelector('#dwq-sync-now-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px; animation:spin 1s linear infinite;">progress_activity</span> กำลังซิงค์...`;

    await loadAndRenderRewards(true);
    btn.disabled = false;
    btn.innerHTML = `✅ ซิงค์สำเร็จ!`;
    setTimeout(() => {
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">sync</span> ซิงค์ตอนนี้`;
    }, 2000);
  });

  // Sign out button
  overlay.querySelector('#dwq-modal-signout-btn')?.addEventListener('click', async () => {
    if (confirm('คุณต้องการออกจากระบบ Google ใช่หรือไม่?')) {
      closeOverlay('dwq-settings-modal');
      await handleSignOut();
    }
  });

  // Close button
  overlay.querySelector('#dwq-settings-close')?.addEventListener('click', () => {
    closeOverlay('dwq-settings-modal');
  });
}

function showSaveSuccessToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    z-index: 10000; padding: 10px 20px; border-radius: 6px; font-size: 14px;
    font-weight: 700; font-family: 'Noto Sans Thai', 'Inter', sans-serif;
    background: #003909; color: #71ff74; border: 2px solid #00e540;
    box-shadow: 0 4px 14px rgba(0,0,0,0.6); animation: slideUp 0.25s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Network & Offline Status Listeners
// ---------------------------------------------------------------------------

function setupNetworkListeners() {
  window.addEventListener('offline', () => {
    showNetworkToast(false);
  });

  window.addEventListener('online', () => {
    showNetworkToast(true);
    if (isSignedIn()) {
      useWeeklyRewards(true).then((data) => {
        lastRewardsData = data;
        updateHeaderMetrics(data);
        if (currentTab === 'rewards') {
          renderRewardsView(data);
        }
      });
    }
  });
}

function showNetworkToast(isOnline) {
  if ($offlineToast) {
    $offlineToast.remove();
    $offlineToast = null;
  }

  const toast = document.createElement('div');
  $offlineToast = toast;
  toast.style.cssText = `
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 10000; padding: 10px 20px; border-radius: 8px; font-size: 14px;
    font-weight: 700; font-family: 'Noto Sans Thai', 'Inter', sans-serif;
    display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.6);
    animation: slideDownToast 0.3s ease-out;
    background: ${isOnline ? '#003909' : '#690005'};
    color: ${isOnline ? '#71ff74' : '#ffdad6'};
    border: 2px solid ${isOnline ? '#00e540' : '#ff6d60'};
  `;

  toast.innerHTML = isOnline
    ? `<span class="material-symbols-outlined" style="font-size:20px;">wifi</span> กลับมาออนไลน์แล้ว! เชื่อมต่อสำเร็จ`
    : `<span class="material-symbols-outlined" style="font-size:20px;">wifi_off</span> สัญญาณหลุดไปแล้ว! ตรวจสอบอินเทอร์เน็ตนะ 🚀`;

  document.body.appendChild(toast);

  if (isOnline) {
    setTimeout(() => {
      if ($offlineToast === toast) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }
}

// ---------------------------------------------------------------------------
// Mission Button Handler
// ---------------------------------------------------------------------------

async function handleMissionClick() {
  if (!navigator.onLine) {
    showNetworkToast(false);
    return;
  }

  if ($missionBtn) $missionBtn.disabled = true;

  if (!isSignedIn()) {
    showLoginOverlay();
    if ($missionBtn) $missionBtn.disabled = false;
    return;
  }

  setMissionBtnState('loading');
  showLoadingOverlay();

  // Ensure loading animation is visible for at least 800ms for smooth kid-friendly feel
  const [data] = await Promise.all([
    useCalendarData(),
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]);

  closeLoadingOverlay();

  if (data.isOffline) {
    setMissionBtnState('idle');
    if ($missionBtn) $missionBtn.disabled = false;
    showNetworkToast(false);
    return;
  }

  if (data.isEmpty) {
    setMissionBtnState('idle');
    if ($missionBtn) $missionBtn.disabled = false;
    showEmptyStateOverlay();
    return;
  }

  if (data.error) {
    setMissionBtnState('idle');
    if ($missionBtn) $missionBtn.disabled = false;
    showErrorOverlay(data.error);
    return;
  }

  if (data.isCompleted) {
    todayMissionCompleted = true;
    updateCharacterSpeech(true);
    setMissionBtnState('completed');
    if ($missionBtn) $missionBtn.disabled = false;
    showAlreadyCompletedOverlay();
    return;
  }

  setMissionBtnState('idle');
  if ($missionBtn) $missionBtn.disabled = false;
  showQuizOverlay(data.event, data.words);
}

// ---------------------------------------------------------------------------
// Mission Button State Machine
// ---------------------------------------------------------------------------

const MISSION_BTN_STATES = {
  idle: {
    icon: 'explore',
    label: 'เริ่มภารกิจ 15 คำศัพท์',
    classes: ['bg-primary-container', 'border-on-primary-container', 'pulse-glow'],
    remove: ['bg-secondary-container', 'border-on-secondary-container', 'bg-surface-container-high', 'border-outline', 'opacity-70'],
  },
  loading: {
    icon: 'hourglass_top',
    label: 'กำลังโหลดภารกิจ...',
    classes: ['bg-primary-container', 'border-on-primary-container', 'opacity-70'],
    remove: ['pulse-glow', 'bg-secondary-container', 'border-on-secondary-container'],
  },
  completed: {
    icon: 'military_tech',
    label: '🎉 ภารกิจสำเร็จแล้ว!',
    classes: ['bg-secondary-container', 'border-on-secondary-container'],
    remove: ['bg-primary-container', 'border-on-primary-container', 'pulse-glow', 'opacity-70'],
  },
  error: {
    icon: 'error',
    label: 'เกิดข้อผิดพลาด — แตะเพื่อลองอีกครั้ง',
    classes: ['bg-surface-container-high', 'border-outline'],
    remove: ['bg-primary-container', 'border-on-primary-container', 'pulse-glow', 'bg-secondary-container', 'opacity-70'],
  },
};

function setMissionBtnState(state) {
  if (!$missionBtn) return;
  const cfg = MISSION_BTN_STATES[state];
  if (!cfg) return;

  const iconEl = $missionBtn.querySelector('.material-symbols-outlined');
  const labelEl = $missionBtn.querySelector('span:last-child');

  if (iconEl) iconEl.textContent = cfg.icon;
  if (labelEl) labelEl.textContent = cfg.label;

  cfg.remove?.forEach((cls) => $missionBtn.classList.remove(cls));
  cfg.classes?.forEach((cls) => $missionBtn.classList.add(cls));
}

// ---------------------------------------------------------------------------
// Overlay Factory Helper
// ---------------------------------------------------------------------------

function createOverlay(id) {
  document.getElementById(id)?.remove();

  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: fadeInOverlay 0.25s ease-out;
    font-family: 'Noto Sans Thai', 'Inter', sans-serif;
    padding: 16px;
  `;

  if (!document.getElementById('dwq-overlay-styles')) {
    const style = document.createElement('style');
    style.id = 'dwq-overlay-styles';
    style.textContent = `
      @keyframes fadeInOverlay {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDownToast {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to   { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes celebrationPop {
        0%   { transform: scale(0.5); opacity: 0; }
        70%  { transform: scale(1.08); }
        100% { transform: scale(1);   opacity: 1; }
      }
      @keyframes floatBounce {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50%      { transform: translateY(-12px) rotate(4deg); }
      }
      @keyframes pulseRing {
        0%   { transform: scale(0.9); opacity: 0.8; }
        50%  { transform: scale(1.15); opacity: 0.4; }
        100% { transform: scale(0.9); opacity: 0.8; }
      }
      @keyframes revealWord {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .dwq-card {
        background: #1c1b1b;
        border: 1px solid #3f4852;
        border-radius: 8px;
        box-shadow: 4px 4px 0px #000000, 0 0 40px rgba(0,162,255,0.15);
        animation: slideUp 0.3s ease-out;
        width: min(92vw, 440px);
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #e5e2e1;
      }
      .dwq-btn-primary {
        width: 100%;
        background: #00a2ff;
        color: #001d34;
        border: none;
        border-bottom: 4px solid #003659;
        border-radius: 4px;
        padding: 14px;
        font-size: 16px;
        font-weight: 700;
        font-family: 'Noto Sans Thai', 'Inter', sans-serif;
        cursor: pointer;
        transition: transform 0.1s, border-bottom-width 0.1s;
        letter-spacing: 0.02em;
      }
      .dwq-btn-primary:active {
        transform: translateY(2px);
        border-bottom-width: 2px;
      }
      .dwq-btn-primary:hover {
        background: #33b5ff;
      }
      .dwq-btn-secondary {
        background: transparent;
        color: #89919d;
        border: 1px solid #3f4852;
        border-radius: 4px;
        padding: 10px;
        font-size: 14px;
        font-family: 'Noto Sans Thai', 'Inter', sans-serif;
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s;
      }
      .dwq-btn-secondary:hover { color: #e5e2e1; border-color: #89919d; }
      .dwq-progress-bar-track {
        width: 100%;
        height: 8px;
        background: #2a2a2a;
        border-radius: 0;
        overflow: hidden;
      }
      .dwq-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #00e540, #00a2ff);
        transition: width 0.4s ease;
        border-radius: 0;
      }
      .dwq-word-card {
        background: #201f1f;
        border: 2px solid #3f4852;
        border-radius: 8px;
        padding: 28px 20px;
        text-align: center;
        min-height: 160px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        position: relative;
      }
      .dwq-english-word {
        font-size: 36px;
        font-weight: 900;
        font-family: 'Montserrat', sans-serif;
        color: #99cbff;
        letter-spacing: -0.01em;
        animation: revealWord 0.3s ease-out;
      }
      .dwq-thai-word {
        font-size: 20px;
        font-weight: 600;
        color: #71ff74;
        animation: revealWord 0.3s ease-out 0.1s both;
      }
      .dwq-word-index {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #89919d;
        text-transform: uppercase;
      }
    `;
    document.head.appendChild(style);
  }

  $overlayRoot.appendChild(overlay);
  return overlay;
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.animation = 'none';
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 200);
  }
}

// ---------------------------------------------------------------------------
// KID-FRIENDLY LOADING ANIMATION OVERLAY
// ---------------------------------------------------------------------------

export function showLoadingOverlay() {
  const overlay = createOverlay('dwq-loading-overlay');
  overlay.innerHTML = `
    <div class="dwq-card" style="text-align:center; align-items:center; gap:20px; border-color:#00a2ff; width:min(90vw, 360px);">
      <div style="position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; inset:0; border-radius:50%; border:3px dashed #00a2ff; animation:pulseRing 2s infinite ease-in-out;"></div>
        <span class="material-symbols-outlined" style="font-size:52px; color:#99cbff; animation:floatBounce 2s infinite ease-in-out; font-variation-settings:'FILL' 1;">
          auto_stories
        </span>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <h3 style="font-size:18px; font-weight:800; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#99cbff; margin:0;">
          กำลังเปิดสมุดภารกิจ...
        </h3>
        <p style="font-size:13px; color:#bec7d4; margin:0;">
          กำลังดึง 15 คำศัพท์เวทมนตร์จาก Google Calendar ✨
        </p>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <div style="width:8px; height:8px; border-radius:50%; background:#00e540; animation:floatBounce 1s infinite alternate 0s;"></div>
        <div style="width:8px; height:8px; border-radius:50%; background:#00a2ff; animation:floatBounce 1s infinite alternate 0.2s;"></div>
        <div style="width:8px; height:8px; border-radius:50%; background:#71ff74; animation:floatBounce 1s infinite alternate 0.4s;"></div>
      </div>
    </div>
  `;
}

export function closeLoadingOverlay() {
  closeOverlay('dwq-loading-overlay');
}

// ---------------------------------------------------------------------------
// EMPTY STATE OVERLAY (When parent hasn't created mission today)
// ---------------------------------------------------------------------------

export function showEmptyStateOverlay() {
  const overlay = createOverlay('dwq-empty-overlay');
  overlay.innerHTML = `
    <div class="dwq-card" style="text-align:center; align-items:center; gap:16px; border-color:#00a2ff;">
      <div style="font-size:56px; animation:floatBounce 2.5s infinite ease-in-out;">🏕️</div>
      <h2 style="font-size:22px; font-weight:900; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#99cbff; margin:0; line-height:1.2;">
        วันนี้ไม่มีภารกิจ!
      </h2>
      <p style="font-size:15px; color:#e5e2e1; margin:0; line-height:1.6;">
        พักผ่อนได้เลย หรือเตรียมตัวสำหรับด่านต่อไป 🎮✨
      </p>
      <div style="background:#0e0e0e; border:1px solid #3f4852; border-radius:6px; padding:12px; font-size:13px; color:#89919d; line-height:1.6; text-align:left; width:100%;">
        💡 <strong style="color:#bec7d4;">วิธีให้ผู้ปกครองสร้างภารกิจ:</strong><br>
        1. เปิด Google Calendar วันนี้<br>
        2. ตั้งชื่อกิจกรรมว่า <span style="color:#71ff74;">"คำศัพท์วันนี้"</span><br>
        3. ใส่คำศัพท์ในช่องรายละเอียด (เช่น 1. Apple - แอปเปิ้ล)
      </div>
      <button id="dwq-empty-close" class="dwq-btn-primary">
        🎮 ทราบแล้ว กลับสู่แผนที่
      </button>
    </div>
  `;

  overlay.querySelector('#dwq-empty-close')?.addEventListener('click', () => {
    closeOverlay('dwq-empty-overlay');
  });
}

// ---------------------------------------------------------------------------
// LOGIN OVERLAY
// ---------------------------------------------------------------------------

export function showLoginOverlay() {
  const overlay = createOverlay('dwq-login-overlay');

  overlay.innerHTML = `
    <div class="dwq-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div style="text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px;">
        <span class="material-symbols-outlined" style="font-size:48px; color:#00a2ff; font-variation-settings:'FILL' 1;">shield_person</span>
        <h2 id="login-title" style="font-size:20px; font-weight:800; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#e5e2e1; margin:0;">
          ยืนยันตัวตนผู้ปกครอง
        </h2>
        <p style="font-size:14px; color:#bec7d4; margin:0; line-height:1.6;">
          ผู้ปกครองต้องล็อกอินด้วย Google<br>เพื่อให้ ${CHILD_NAME} เข้าถึงภารกิจประจำวัน
        </p>
      </div>

      <div style="background:#0e0e0e; border:1px solid #3f4852; border-radius:6px; padding:14px 16px; font-size:13px; color:#89919d; line-height:1.6;">
        <strong style="color:#bec7d4;">สิทธิ์ที่จะขอ:</strong><br>
        📅 อ่านและแก้ไขกิจกรรมใน Google Calendar
      </div>

      <button id="dwq-google-signin-btn" class="dwq-btn-primary" style="display:flex; align-items:center; justify-content:center; gap:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        เข้าสู่ระบบด้วย Google
      </button>

      <p style="font-size:12px; color:#89919d; text-align:center; margin:0; line-height:1.5;">
        Token จะถูกเก็บไว้ชั่วคราวในเบราว์เซอร์นี้เท่านั้น<br>และจะถูกลบเมื่อปิดแท็บ
      </p>
    </div>
  `;

  overlay.querySelector('#dwq-google-signin-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:20px; animation: spin 1s linear infinite;">progress_activity</span>
      กำลังเข้าสู่ระบบ...
    `;
    if (!document.getElementById('dwq-spin-style')) {
      const s = document.createElement('style');
      s.id = 'dwq-spin-style';
      s.textContent = '@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }';
      document.head.appendChild(s);
    }

    try {
      await signIn();
      closeOverlay('dwq-login-overlay');
      setMissionBtnState('idle');

      // Refresh today's mission and rewards
      useCalendarData().then((data) => {
        if (data) {
          todayMissionCompleted = Boolean(data.isCompleted);
          updateCharacterSpeech(todayMissionCompleted);
          if (data.isCompleted) setMissionBtnState('completed');
        }
      });
      loadAndRenderRewards(true);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `⚠️ ${err.message} — ลองอีกครั้ง`;
      btn.style.background = '#93000a';
      btn.style.color = '#ffdad6';
    }
  });
}

// ---------------------------------------------------------------------------
// QUIZ OVERLAY
// ---------------------------------------------------------------------------

export function showQuizOverlay(event, words) {
  const overlay = createOverlay('dwq-quiz-overlay');

  let currentIndex = 0;
  let thaiRevealed = false;
  const total = words.length;

  function renderWord() {
    const word = words[currentIndex];
    const progress = Math.round((currentIndex / total) * 100);
    thaiRevealed = false;

    overlay.innerHTML = `
      <div class="dwq-card" style="width:min(96vw,460px);" role="dialog" aria-modal="true" aria-label="คำศัพท์ที่ ${word.index}">

        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:700; letter-spacing:0.08em; color:#89919d; text-transform:uppercase;">
            ภารกิจวันนี้
          </span>
          <button id="dwq-quiz-close" class="dwq-btn-secondary" style="padding:4px 10px; font-size:12px;">✕ ออก</button>
        </div>

        <!-- Progress -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; color:#89919d;">
            <span>ความคืบหน้า</span>
            <span id="dwq-progress-text">${currentIndex}/${total} คำ</span>
          </div>
          <div class="dwq-progress-bar-track">
            <div id="dwq-progress-fill" class="dwq-progress-bar-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <!-- Word Card -->
        <div class="dwq-word-card" id="dwq-word-card">
          <div class="dwq-word-index">คำที่ ${word.index} / ${total}</div>
          <div class="dwq-english-word" id="dwq-english">${word.english}</div>
          <div id="dwq-thai-reveal" style="min-height:32px; display:flex; align-items:center; justify-content:center;">
            <button id="dwq-reveal-btn" class="dwq-btn-secondary" style="font-size:14px; padding:8px 20px;">
              👁 แสดงคำแปล
            </button>
          </div>
        </div>

        <!-- Next Button -->
        <button id="dwq-next-btn" class="dwq-btn-primary" ${thaiRevealed ? '' : 'style="opacity:0.4;"'}>
          ${currentIndex === total - 1 ? '🏆 เสร็จสิ้นภารกิจ!' : 'คำถัดไป →'}
        </button>

        <!-- Word counter dots -->
        <div style="display:flex; justify-content:center; gap:5px; flex-wrap:wrap;">
          ${words.map((_, i) => `
            <div style="
              width:8px; height:8px; border-radius:2px;
              background: ${i < currentIndex ? '#00e540' : i === currentIndex ? '#00a2ff' : '#2a2a2a'};
              border: 1px solid ${i === currentIndex ? '#99cbff' : 'transparent'};
              transition: background 0.3s;
            "></div>
          `).join('')}
        </div>
      </div>
    `;

    overlay.querySelector('#dwq-reveal-btn')?.addEventListener('click', () => {
      thaiRevealed = true;
      const revealZone = overlay.querySelector('#dwq-thai-reveal');
      const currentWord = words[currentIndex];
      revealZone.innerHTML = `<div class="dwq-thai-word">${currentWord.thai}</div>`;

      const nextBtn = overlay.querySelector('#dwq-next-btn');
      if (nextBtn) nextBtn.style.opacity = '1';
    });

    overlay.querySelector('#dwq-next-btn')?.addEventListener('click', async () => {
      if (!thaiRevealed) {
        const card = overlay.querySelector('#dwq-word-card');
        card.style.animation = 'none';
        card.style.border = '2px solid #ff6d60';
        setTimeout(() => { card.style.border = '2px solid #3f4852'; }, 600);
        return;
      }

      if (currentIndex < total - 1) {
        currentIndex++;
        renderWord();
      } else {
        await handleMissionComplete(event);
      }
    });

    overlay.querySelector('#dwq-quiz-close')?.addEventListener('click', () => {
      if (confirm('ออกจากภารกิจ? ความคืบหน้าจะไม่ถูกบันทึก')) {
        closeOverlay('dwq-quiz-overlay');
        setMissionBtnState('idle');
      }
    });
  }

  renderWord();
}

// ---------------------------------------------------------------------------
// MISSION COMPLETE HANDLER
// ---------------------------------------------------------------------------

async function handleMissionComplete(event) {
  const overlay = document.getElementById('dwq-quiz-overlay');
  if (overlay) {
    overlay.innerHTML = `
      <div class="dwq-card" style="text-align:center; align-items:center; gap:16px;">
        <span class="material-symbols-outlined" style="font-size:48px; color:#00a2ff; animation:spin 1s linear infinite;">progress_activity</span>
        <p style="color:#bec7d4; margin:0;">กำลังบันทึกผลไปยัง Google Calendar...</p>
      </div>
    `;
  }

  try {
    await completeDailyMission(event.id, event.description || '');
    todayMissionCompleted = true;
    updateCharacterSpeech(true);
    setMissionBtnState('completed');
    closeOverlay('dwq-quiz-overlay');
    showCompletionOverlay();

    // Trigger fresh rewards calculation & sync header metrics
    loadAndRenderRewards(true);
  } catch (err) {
    closeOverlay('dwq-quiz-overlay');
    setMissionBtnState('error');
    showErrorOverlay(`บันทึกผลไม่สำเร็จ: ${err.message}\n\nภารกิจเสร็จสิ้นแล้ว แต่ไม่สามารถอัปเดตปฏิทินได้`);
  }
}

// ---------------------------------------------------------------------------
// COMPLETION OVERLAY
// ---------------------------------------------------------------------------

function showCompletionOverlay() {
  const overlay = createOverlay('dwq-completion-overlay');

  const stars = Array.from({ length: 12 }, () =>
    ['⭐', '🌟', '✨', '💫'][Math.floor(Math.random() * 4)]
  ).join(' ');

  overlay.innerHTML = `
    <div class="dwq-card" style="text-align:center; align-items:center; gap:16px; border-color:#00e540; box-shadow:4px 4px 0px #000, 0 0 60px rgba(0,229,64,0.25);">
      <div style="font-size:72px; animation:celebrationPop 0.5s ease-out;">🏆</div>
      <h2 style="font-size:24px; font-weight:900; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#71ff74; margin:0; line-height:1.2;">
        ภารกิจสำเร็จ!
      </h2>
      <p style="font-size:18px; color:#e5e2e1; margin:0;">🎉 ${CHILD_NAME}ทำภารกิจสำเร็จแล้ว!</p>
      <p style="font-size:14px; color:#89919d; margin:0; line-height:1.6;">
        ผู้ปกครองจะได้รับการแจ้งเตือนในปฏิทิน Google<br>
        <span style="color:#71ff74;">🟢 สีเขียว (Basil Green)</span> = ภารกิจเสร็จสิ้น
      </p>
      <div style="font-size:20px; letter-spacing:4px;">${stars}</div>
      <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
        <button id="dwq-complete-rewards-btn" class="dwq-btn-primary" style="background:#ffd700; border-color:#998100; color:#2e2400;">
          ⭐ ดูของรางวัลที่สะสมได้
        </button>
        <button id="dwq-complete-close" class="dwq-btn-secondary">
          🎮 กลับสู่แผนที่
        </button>
      </div>
    </div>
  `;

  overlay.querySelector('#dwq-complete-rewards-btn')?.addEventListener('click', () => {
    closeOverlay('dwq-completion-overlay');
    switchTab('rewards');
  });

  overlay.querySelector('#dwq-complete-close')?.addEventListener('click', () => {
    closeOverlay('dwq-completion-overlay');
  });

  setTimeout(() => closeOverlay('dwq-completion-overlay'), 12000);
}

// ---------------------------------------------------------------------------
// ALREADY COMPLETED OVERLAY
// ---------------------------------------------------------------------------

function showAlreadyCompletedOverlay() {
  const overlay = createOverlay('dwq-already-done-overlay');
  overlay.innerHTML = `
    <div class="dwq-card" style="text-align:center; align-items:center; gap:16px; border-color:#00e540;">
      <span class="material-symbols-outlined" style="font-size:56px; color:#71ff74; font-variation-settings:'FILL' 1;">task_alt</span>
      <h2 style="font-size:20px; font-weight:800; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#71ff74; margin:0;">
        ทำไปแล้ว!
      </h2>
      <p style="font-size:16px; color:#e5e2e1; margin:0;">
        ${CHILD_NAME}ทำภารกิจวันนี้เสร็จแล้ว 🎉<br>
        <span style="font-size:14px; color:#89919d;">รอภารกิจวันพรุ่งนี้ได้เลย!</span>
      </p>
      <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
        <button id="dwq-already-rewards-btn" class="dwq-btn-primary" style="background:#ffd700; border-color:#998100; color:#2e2400;">
          ⭐ ดูของรางวัลและประวัติ
        </button>
        <button id="dwq-already-close" class="dwq-btn-secondary">
          ✅ โอเค
        </button>
      </div>
    </div>
  `;

  overlay.querySelector('#dwq-already-rewards-btn')?.addEventListener('click', () => {
    closeOverlay('dwq-already-done-overlay');
    switchTab('rewards');
  });

  overlay.querySelector('#dwq-already-close')?.addEventListener('click', () => {
    closeOverlay('dwq-already-done-overlay');
  });
}

// ---------------------------------------------------------------------------
// ERROR OVERLAY
// ---------------------------------------------------------------------------

export function showErrorOverlay(message) {
  const overlay = createOverlay('dwq-error-overlay');
  const lines = message.split('\n').map(l => `<span>${l}</span>`).join('<br>');

  overlay.innerHTML = `
    <div class="dwq-card" style="text-align:center; align-items:center; gap:16px; border-color:#ff6d60;">
      <span class="material-symbols-outlined" style="font-size:48px; color:#ff6d60; font-variation-settings:'FILL' 1;">error</span>
      <h2 style="font-size:18px; font-weight:800; font-family:'Montserrat','Noto Sans Thai',sans-serif; color:#ffb4ab; margin:0;">
        เกิดข้อผิดพลาด
      </h2>
      <p style="font-size:14px; color:#bec7d4; margin:0; line-height:1.7;">${lines}</p>
      <button id="dwq-error-close" class="dwq-btn-primary" style="background:#93000a; border-color:#410002; color:#ffdad6;">
        ตกลง
      </button>
    </div>
  `;
  overlay.querySelector('#dwq-error-close')?.addEventListener('click', () => {
    closeOverlay('dwq-error-overlay');
  });
}

// ---------------------------------------------------------------------------
// SIGN OUT — exposed for settings nav use
// ---------------------------------------------------------------------------

export async function handleSignOut() {
  await signOut();
  setMissionBtnState('idle');
  showLoginOverlay();
}
