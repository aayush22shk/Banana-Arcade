/**
 * ============================================================================
 * [TROPHIES & ACHIEVEMENTS]: Trophy Collection & Progression Controller
 * Architecture: Frontend MVC Module
 * Purpose: Manages persistent trophy state, progress calculations, category
 *          filtering, unlock notifications, and sound effects.
 * ============================================================================
 */

const AchievementManager = {
  // State
  data: {
    stats: {},
    achievements: [],
    totalUnlocked: 0,
    totalAvailable: 18,
    completionPct: 0
  },

  activeFilter: 'all',
  shownUnlocks: new Set(),
  isInitialized: false,

  /**
   * Resolves player identifier (user:ID or guest:UUID)
   */
  getPlayerId() {
    if (window.Auth && Auth.currentUser && Auth.currentUser.id) {
      return `user:${Auth.currentUser.id}`;
    }
    let guestId = localStorage.getItem('banana_arcade_guest_id');
    if (!guestId) {
      guestId = 'guest:' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('banana_arcade_guest_id', guestId);
    }
    return guestId;
  },

  /**
   * Initializes the achievement manager
   */
  async init() {
    this.bindEvents();
    await this.fetchAchievements();
    this.isInitialized = true;
    console.log('[Achievements] Controller initialized.');
  },

  /**
   * Binds UI events for filter tabs
   */
  bindEvents() {
    const filtersContainer = document.getElementById('trophy-filters');
    if (filtersContainer) {
      filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.trophy-filter-btn');
        if (!btn) return;
        const filter = btn.dataset.filter || 'all';
        this.activeFilter = filter;

        // Toggle active button class
        filtersContainer.querySelectorAll('.trophy-filter-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });

        this.renderTrophyGrid();
      });
    }
  },

  /**
   * Fetches latest achievements and stats from backend
   */
  async fetchAchievements() {
    try {
      const pid = this.getPlayerId();
      const res = await Api.achievements.get(pid);
      if (res && res.success) {
        this.data = res;
        this.renderTrophyPage();
      }
    } catch (err) {
      console.warn('[-] Could not load achievements from server:', err);
    }
  },

  /**
   * Dispatches a gameplay event to the achievement evaluation engine
   */
  async recordEvent(event, eventData = {}) {
    try {
      const pid = this.getPlayerId();
      const res = await Api.achievements.recordEvent(event, eventData, pid);

      if (res && res.success) {
        this.data = res;
        this.renderTrophyPage();

        // Check for new unlocks and trigger animations
        if (Array.isArray(res.newlyUnlocked) && res.newlyUnlocked.length > 0) {
          res.newlyUnlocked.forEach(ach => {
            if (!this.shownUnlocks.has(ach.id)) {
              this.shownUnlocks.add(ach.id);
              this.showUnlockNotification(ach);
            }
          });
        }
      }
    } catch (err) {
      console.warn('[-] Failed to record achievement event:', err);
    }
  },

  /**
   * Displays an animated "Achievement Unlocked!" toast notification
   */
  showUnlockNotification(ach) {
    // Play achievement fanfare sound
    if (window.App && typeof App.playSound === 'function') {
      App.playSound('achievement');
    }

    const container = document.getElementById('achievement-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `achievement-toast tier-${ach.tier}`;
    toast.innerHTML = `
      <div class="toast-glow"></div>
      <div class="toast-trophy-icon">${ach.icon || '🏆'}</div>
      <div class="toast-body">
        <div class="toast-tag">🏆 ACHIEVEMENT UNLOCKED!</div>
        <div class="toast-title">${ach.title}</div>
        <div class="toast-desc">${ach.desc}</div>
      </div>
      <button class="toast-view-btn" title="View in Trophy Room">View</button>
    `;

    toast.querySelector('.toast-view-btn').addEventListener('click', () => {
      if (window.App && typeof App.showView === 'function') {
        App.showView('trophies');
      }
      toast.remove();
    });

    container.appendChild(toast);

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  },

  /**
   * Renders the entire Trophy Room section (Header, Stats, Filters, Grid)
   */
  renderTrophyPage() {
    this.renderHeaderStats();
    this.renderTrophyGrid();
  },

  /**
   * Updates total count and progress bar in the header
   */
  renderHeaderStats() {
    const totalEl = document.getElementById('trophy-stat-total');
    const pctEl   = document.getElementById('trophy-stat-pct');
    const barEl   = document.getElementById('trophy-stat-bar-fill');

    const unlocked = this.data.totalUnlocked || 0;
    const total    = this.data.totalAvailable || 18;
    const pct      = this.data.completionPct || Math.round((unlocked / total) * 100);

    if (totalEl) totalEl.textContent = `${unlocked} / ${total}`;
    if (pctEl)   pctEl.textContent   = `${pct}% COMPLETED`;
    if (barEl)   barEl.style.width   = `${pct}%`;

    const menuBadge = document.getElementById('menu-trophy-badge');
    const menuTrophies = document.getElementById('menu-player-trophies');
    if (menuBadge) menuBadge.textContent = `${unlocked} / ${total}`;
    if (menuTrophies) menuTrophies.textContent = `${unlocked} / ${total}`;

    // Tier counts
    const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    (this.data.achievements || []).forEach(a => {
      if (a.isUnlocked && tierCounts[a.tier] !== undefined) {
        tierCounts[a.tier]++;
      }
    });

    const bEl = document.getElementById('trophy-tier-bronze');
    const sEl = document.getElementById('trophy-tier-silver');
    const gEl = document.getElementById('trophy-tier-gold');
    const pEl = document.getElementById('trophy-tier-platinum');

    if (bEl) bEl.textContent = `${tierCounts.bronze}/5`;
    if (sEl) sEl.textContent = `${tierCounts.silver}/5`;
    if (gEl) gEl.textContent = `${tierCounts.gold}/5`;
    if (pEl) pEl.textContent = `${tierCounts.platinum}/3`;
  },

  /**
   * Renders the trophy cards grid based on active filter
   */
  renderTrophyGrid() {
    const grid = document.getElementById('trophy-cards-grid');
    if (!grid) return;

    const list = this.data.achievements || [];
    const filter = this.activeFilter;

    const filtered = list.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'unlocked') return item.isUnlocked;
      if (filter === 'locked') return !item.isUnlocked;
      return item.category === filter;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="trophy-empty-state">
          <span class="empty-icon">🔍</span>
          <p>No trophies found matching this filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(ach => this._renderCardHtml(ach)).join('');
  },

  /**
   * Generates HTML for an individual trophy card
   */
  _renderCardHtml(ach) {
    const isUnlocked = ach.isUnlocked;
    const tierClass  = `tier-${ach.tier}`;
    const statusClass = isUnlocked ? 'unlocked' : 'locked';
    const tierName   = ach.tier.toUpperCase();

    // Unlock date or progress display
    let footerHtml = '';
    if (isUnlocked) {
      const dateStr = ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : 'Unlocked';
      footerHtml = `
        <div class="trophy-unlock-badge">
          <span class="unlock-check">✅</span>
          <span class="unlock-date">Unlocked ${dateStr}</span>
        </div>
      `;
    } else {
      const current = ach.current || 0;
      const target  = ach.target || 1;
      const pct     = ach.progressPct || 0;

      footerHtml = `
        <div class="trophy-progress-container">
          <div class="trophy-progress-header">
            <span class="progress-lbl">${ach.requirement}</span>
            <span class="progress-val">${current} / ${target}</span>
          </div>
          <div class="trophy-progress-track">
            <div class="trophy-progress-fill tier-${ach.tier}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="trophy-card ${tierClass} ${statusClass}">
        <div class="trophy-card-header">
          <span class="trophy-tier-badge ${tierClass}">${tierName}</span>
          <span class="trophy-category-tag">${ach.category.toUpperCase()}</span>
        </div>

        <div class="trophy-card-body">
          <div class="trophy-icon-wrapper ${tierClass}">
            <span class="trophy-icon">${ach.icon}</span>
            ${!isUnlocked ? '<span class="trophy-lock-overlay">🔒</span>' : ''}
          </div>
          <div class="trophy-info">
            <h3 class="trophy-title">${ach.title}</h3>
            <p class="trophy-desc">${ach.desc}</p>
          </div>
        </div>

        <div class="trophy-card-footer">
          ${footerHtml}
        </div>
      </div>
    `;
  }
};

window.AchievementManager = AchievementManager;

