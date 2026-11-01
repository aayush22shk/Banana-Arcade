/**
 * ============================================================================
 * [EVENT-DRIVEN PROGRAMMING]: Banana Arcade - Frontend Engine & UI Controller
 * Architecture: Main Application Controller (Single Page Application)
 * Key Highlights:
 *  - Event-Driven Game Loop (30-second timer)
 *  - GUI Event Listeners (Numeric Keypad, Enter key, Click events)
 *  - Reactive UI & Score Multiplier State Machine
 *  - Web Audio API Sound Synthesizer (Zero-dependency arcade SFX)
 *  - Interoperability with University Banana API
 * ============================================================================
 */

const App = {
  // Configured Difficulty Modes
  DIFFICULTIES: {
    easy: {
      id: 'easy',
      name: 'Easy',
      badge: '🟢 EASY',
      icon: '🟢',
      initialTime: 45,
      correctPoints: 10,
      correctTimeBonus: 3,     // +3 seconds added on correct answer
      wrongTimePenalty: 0,     // 0s lost on mistakes
      wrongScorePenalty: 0,    // 0 pts lost on mistakes
      skipPenalty: 2,
      multipliers: [1, 1.5, 2, 3],
      color: '#00e676',
      timerDesc: '45-second relaxed clock with +3s time bonuses per correct answer.',
      comboDesc: 'Gentle combo multipliers (up to 3x) and zero penalties on mistakes.',
      summary: '<strong>🟢 Easy Mode:</strong> 45s clock &bull; +3s per solve &bull; No wrong penalty &bull; Ideal for training.'
    },
    medium: {
      id: 'medium',
      name: 'Medium',
      badge: '🟡 MEDIUM',
      icon: '🟡',
      initialTime: 30,
      correctPoints: 20,
      correctTimeBonus: 1.5,   // +1.5s added on correct
      wrongTimePenalty: 2,     // -2s lost on mistakes
      wrongScorePenalty: 5,    // -5 pts on mistakes
      skipPenalty: 5,
      multipliers: [1, 2, 3, 5],
      color: '#ffe135',
      timerDesc: '30-second standard clock with +1.5s time bonuses & -2s penalties.',
      comboDesc: 'Classic arcade multipliers (up to 5x) with standard risk/reward.',
      summary: '<strong>🟡 Medium Mode:</strong> 30s clock &bull; +1.5s per solve &bull; -2s on wrong &bull; Classic arcade balance.'
    },
    hard: {
      id: 'hard',
      name: 'Hard',
      badge: '🔴 HARD',
      icon: '🔴',
      initialTime: 20,
      correctPoints: 35,
      correctTimeBonus: 1,     // +1s bonus only on streak >= 2
      wrongTimePenalty: 4,     // -4s lost on mistakes!
      wrongScorePenalty: 15,   // -15 pts on mistakes!
      skipPenalty: 10,
      multipliers: [1, 2, 4, 8, 10],
      color: '#ff0844',
      timerDesc: '20-second blitz countdown with brutal -4s mistake penalties.',
      comboDesc: 'High-stakes multipliers (up to 10x!) for elite arcade masters.',
      summary: '<strong>🔴 Hard Mode:</strong> 20s blitz timer &bull; -4s & -15pts on mistakes &bull; Massive 10x combo potential!'
    }
  },

  // Game State
  state: {
    isPlaying: false,
    difficulty: localStorage.getItem('banana_arcade_difficulty') || 'medium',
    intensityLevel: 1, // Dynamic adaptive difficulty level (increases on streaks, decreases on mistakes)
    score: 0,
    streak: 0,
    highestStreak: 0,
    multiplier: 1,
    puzzlesSolved: 0,
    totalAttempts: 0,
    timeLeft: 30,
    maxTime: 30,
    timerInterval: null,
    currentPuzzle: null,
    isVerifying: false,
    soundEnabled: true,
    leaderboardFilter: 'all'
  },

  // Screen Navigation State
  screenHistory: [],
  currentScreen: 'screen-splash',

  // Audio Context for Web Audio API synthesis
  audioCtx: null,

  /**
   * [EVENT-DRIVEN PROGRAMMING] Application initialization on DOMContentLoaded
   */
  init() {
    this.initAudio();
    this.bindNavigationEvents();
    this.bindGameEvents();
    this.bindDifficultyEvents();
    this.bindKeypadEvents();
    this.bindKeyboardShortcuts();
    this.updateDifficultyUI();
    this.initSplash();
    this.loadLeaderboard();
    if (window.AchievementManager) {
      AchievementManager.init();
    }
  },

  /**
   * Initializes Web Audio API Context (Lazily on user interaction)
   */
  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.', e);
    }
  },

  /**
   * Arcade Sound Synthesizer: Generates retro chip-tunes dynamically
   */
  playSound(type) {
    if (!this.state.soundEnabled || !this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    if (type === 'start') {
      // Upbeat Arpeggio
      [330, 440, 554, 659].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.16);
      });
    } else if (type === 'correct') {
      // Cheerful Arcade Ding
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'wrong') {
      // Low buzz
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'tick') {
      // Countdown tick
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'gameover') {
      // Game Over descending fanfare
      [523.25, 493.88, 440, 349.23].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.26);
      });
    } else if (type === 'combo_nice') {
      // 2 in a row: Crisp 2-tone chime
      [587.33, 880].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.19);
      });
    } else if (type === 'combo_3') {
      // 3 in a row: Ascending triad
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.25, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.21);
      });
    } else if (type === 'combo_5') {
      // 5 in a row: Fast vibrant arpeggio
      [659.25, 783.99, 987.77, 1318.51].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.28, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.26);
      });
    } else if (type === 'combo_7') {
      // 7 in a row: Major chord brilliance
      [587.33, 739.99, 880, 1174.66, 1479.98].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.3, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.31);
      });
    } else if (type === 'combo_10') {
      // 10+ in a row: Heroic arpeggio explosion
      [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.35, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.36);
      });
    } else if (type === 'achievement') {
      // Celebratory trophy fanfare: C5 -> E5 -> G5 -> C6 sustain
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = idx === 3 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.32, now + idx * 0.1);
        const duration = idx === 3 ? 0.6 : 0.2;
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + duration + 0.05);
      });
    }
  },

  // ============================================================================
  // [ARCADE SCREEN HIERARCHY & FLOW CONTROLLER]
  // ============================================================================

  /**
   * Initializes the animated Loading / Splash Screen on launch
   */
  initSplash() {
    const splash = document.getElementById('screen-splash');
    const progressBar = document.getElementById('splash-progress-bar');
    const statusText = document.getElementById('splash-status-text');
    const startPrompt = document.getElementById('splash-start-prompt');

    if (!splash) {
      this.navigateTo('screen-main-menu', false);
      return;
    }

    this.currentScreen = 'screen-splash';
    this.updateTopBar('screen-splash');

    const stages = [
      { pct: 25, msg: 'Booting arcade sound synthesizer...' },
      { pct: 55, msg: 'Connecting to University Banana Web API...' },
      { pct: 85, msg: 'Syncing 18 arcade trophies & player records...' },
      { pct: 100, msg: 'Arcade systems online! Get ready to play!' }
    ];

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < stages.length) {
        const stage = stages[stageIdx];
        if (progressBar) progressBar.style.width = `${stage.pct}%`;
        if (statusText) statusText.textContent = stage.msg;
        stageIdx++;
      } else {
        clearInterval(interval);
        if (startPrompt) startPrompt.classList.remove('hidden');

        const finishSplash = () => {
          splash.removeEventListener('click', finishSplash);
          splash.classList.add('splash-fade-out');
          setTimeout(() => {
            splash.classList.add('hidden');
            splash.style.display = 'none';
            this.navigateTo('screen-main-menu', false);
            this.playSound('start');
          }, 350);
        };

        splash.addEventListener('click', finishSplash, { once: true });
        setTimeout(finishSplash, 400);
      }
    }, 280);
  },

  /**
   * Screen Navigation Controller with History Stack for Back Navigation
   */
  navigateTo(screenId, addToHistory = true) {
    const target = document.getElementById(screenId);
    if (!target) return;

    if (addToHistory && this.currentScreen && this.currentScreen !== screenId && this.currentScreen !== 'screen-splash') {
      this.screenHistory.push(this.currentScreen);
    }

    // Hide all game screens
    document.querySelectorAll('.game-screen').forEach(screen => {
      screen.classList.add('hidden');
    });

    // Reveal target screen
    target.classList.remove('hidden');
    this.currentScreen = screenId;

    // Update top status bar state
    this.updateTopBar(screenId);

    // Screen-specific hooks & data refreshes
    if (screenId === 'screen-main-menu') {
      this.refreshMainMenuProfile();
    } else if (screenId === 'screen-leaderboard') {
      this.loadLeaderboard();
    } else if (screenId === 'screen-settings') {
      this.syncSettingsUI();
    } else if (screenId === 'screen-trophies') {
      if (window.AchievementManager) AchievementManager.fetchAchievements();
    } else if (screenId === 'screen-mp-menu') {
      if (window.Multiplayer) Multiplayer._refreshLobbyIdentity();
    } else if (screenId === 'screen-profile') {
      if (window.Auth && Auth.currentUser) Auth.updateUI(Auth.currentUser);
    }
  },

  /**
   * Navigates back to the previous screen in the stack
   */
  goBack() {
    this.playSound('tick');
    if (this.screenHistory.length > 0) {
      const prev = this.screenHistory.pop();
      this.navigateTo(prev, false);
    } else {
      this.navigateTo('screen-main-menu', false);
    }
  },

  /**
   * Updates Top Bar state based on active screen (distraction-free during gameplay)
   */
  updateTopBar(screenId) {
    const topBar = document.getElementById('game-top-bar');
    const backBtn = document.getElementById('btn-top-back');
    if (!topBar) return;

    // Splash screen or Active gameplay: Top Bar is hidden for full distraction-free arcade immersion
    if (screenId === 'screen-splash' || screenId === 'screen-gameplay-solo' || screenId === 'screen-gameplay-mp') {
      topBar.classList.add('hidden');
    } else {
      topBar.classList.remove('hidden');
      if (backBtn) {
        if (screenId === 'screen-main-menu') {
          backBtn.classList.add('hidden');
        } else {
          backBtn.classList.remove('hidden');
        }
      }
    }

    this.refreshTopBarIdentity();
  },

  /**
   * Synchronizes top bar identity chip with active player data
   */
  refreshTopBarIdentity() {
    const user = (window.Auth && Auth.currentUser) ? Auth.currentUser : null;
    const nameBadge = document.getElementById('badge-username');
    const pbBadge = document.getElementById('badge-highscore');
    const avatarBadge = document.getElementById('player-avatar');
    const logoutBtn = document.getElementById('btn-logout');

    if (nameBadge) nameBadge.textContent = user ? user.username : 'Guest Player';
    if (pbBadge) pbBadge.textContent = `PB: ${user?.stats?.high_score || 0} pts`;
    if (avatarBadge && window.AvatarHelper) {
      const avatarId = user ? (user.avatar || 'avatar-1') : 'avatar-1';
      avatarBadge.innerHTML = AvatarHelper.render(avatarId, 32);
    }
    if (logoutBtn) {
      logoutBtn.classList.toggle('hidden', !user);
    }
  },

  /**
   * Synchronizes Main Menu hub player showcase with active player data
   */
  refreshMainMenuProfile() {
    const user = (window.Auth && Auth.currentUser) ? Auth.currentUser : null;
    const avatarEl = document.getElementById('menu-player-avatar');
    const nameEl = document.getElementById('menu-player-name');
    const statusEl = document.getElementById('menu-player-status');
    const pbEl = document.getElementById('menu-player-pb');
    const gamesEl = document.getElementById('menu-player-games');
    const trophyEl = document.getElementById('menu-player-trophies');
    const badgeEl = document.getElementById('menu-trophy-badge');

    const username = user ? user.username : 'Guest Player';
    const avatarId = user ? (user.avatar || 'avatar-1') : 'avatar-1';
    const pb = user?.stats?.high_score || 0;
    const games = user?.stats?.games_played || 0;

    if (nameEl) nameEl.textContent = username;
    if (statusEl) statusEl.textContent = user ? '🟢 Virtual Identity Active' : '👤 Guest (Progress saved locally)';
    if (pbEl) pbEl.textContent = `${pb} pts`;
    if (gamesEl) gamesEl.textContent = games;

    if (avatarEl && window.AvatarHelper) {
      avatarEl.innerHTML = AvatarHelper.render(avatarId, 52);
    }

    if (window.AchievementManager && AchievementManager.data) {
      const unlocked = AchievementManager.data.totalUnlocked || 0;
      const total = AchievementManager.data.totalAvailable || 18;
      if (trophyEl) trophyEl.textContent = `${unlocked} / ${total}`;
      if (badgeEl) badgeEl.textContent = `${unlocked} / ${total}`;
    }

    this.refreshTopBarIdentity();
  },

  /**
   * Toggles Fullscreen Display Mode
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  },

  /**
   * Quits active solo match with confirmation prompt
   */
  quitMatch() {
    if (confirm('Quit current arcade game and return to the Main Menu?')) {
      clearInterval(this.state.timerInterval);
      this.state.isPlaying = false;
      this.playSound('wrong');
      this.navigateTo('screen-main-menu', false);
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Navigation View Switching Event Handlers
   */
  bindNavigationEvents() {
    // Screen Target navigation links
    document.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('[data-screen-target]');
      if (targetBtn) {
        e.preventDefault();
        const screenId = targetBtn.dataset.screenTarget;
        this.navigateTo(screenId);
        return;
      }

      // Universal Back Action
      const backBtn = e.target.closest('[data-action="back"]');
      if (backBtn) {
        e.preventDefault();
        this.goBack();
        return;
      }
    });

    // Legacy data-view-target compatibility
    const legacyNavItems = document.querySelectorAll('[data-view-target]');
    legacyNavItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.dataset.viewTarget;
        this.showView(targetView);
      });
    });

    // Top Bar Back button
    const topBackBtn = document.getElementById('btn-top-back');
    if (topBackBtn) {
      topBackBtn.addEventListener('click', () => this.goBack());
    }

    // Fullscreen toggle button
    const fsBtn = document.getElementById('btn-toggle-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Solo Quit match button
    const quitBtn = document.getElementById('btn-solo-quit');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => this.quitMatch());
    }

    // Sound toggle button listener
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.state.soundEnabled = !this.state.soundEnabled;
        this.syncSoundUI();
      });
    }

    // Settings view: Sound toggle switch
    const settingsSoundToggle = document.getElementById('settings-toggle-sound');
    if (settingsSoundToggle) {
      settingsSoundToggle.addEventListener('click', () => {
        this.state.soundEnabled = !this.state.soundEnabled;
        this.syncSoundUI();
        if (this.state.soundEnabled) this.playSound('correct');
      });
    }

    // Settings view: SFX test station
    document.querySelectorAll('.btn-sfx-test').forEach(btn => {
      btn.addEventListener('click', () => {
        const sfx = btn.dataset.sfx;
        if (sfx) this.playSound(sfx);
      });
    });

    // Settings view: Default difficulty selector (FIXED METHOD CALL)
    document.querySelectorAll('.settings-diff-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const diff = pill.dataset.diff;
        if (diff) {
          this.setDifficulty(diff);
          this.syncSettingsUI();
        }
      });
    });
  },

  /**
   * Synchronizes sound toggle UI elements across header and settings
   */
  syncSoundUI() {
    const soundBtn = document.getElementById('btn-toggle-sound');
    const soundIcon = document.getElementById('sound-icon-symbol');
    if (soundBtn) {
      soundBtn.classList.toggle('muted', !this.state.soundEnabled);
    }
    if (soundIcon) {
      soundIcon.textContent = this.state.soundEnabled ? '🔊' : '🔇';
    }
    const settingsToggle = document.getElementById('settings-toggle-sound');
    const settingsText   = document.getElementById('settings-sound-text');
    if (settingsToggle) {
      settingsToggle.classList.toggle('active', this.state.soundEnabled);
    }
    if (settingsText) {
      settingsText.textContent = this.state.soundEnabled ? 'SOUND: ON' : 'SOUND: MUTED';
    }
  },

  /**
   * Synchronizes settings panel controls to current application state
   */
  syncSettingsUI() {
    this.syncSoundUI();
    document.querySelectorAll('.settings-diff-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.diff === this.state.difficulty);
    });
  },

  /**
   * Backwards Compatibility Adapter: Maps legacy view names to screen IDs
   */
  showView(viewName) {
    const map = {
      game: 'screen-main-menu',
      solo: 'screen-solo-difficulty',
      pregame: 'screen-solo-difficulty',
      multiplayer: 'screen-mp-menu',
      trophies: 'screen-trophies',
      settings: 'screen-settings',
      leaderboard: 'screen-leaderboard',
      auth: 'screen-profile'
    };
    const targetScreen = map[viewName] || 'screen-main-menu';
    this.navigateTo(targetScreen);

    if (viewName === 'multiplayer' && window.Multiplayer) {
      Multiplayer._refreshLobbyIdentity();
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Core Game Event Listeners
   */
  bindGameEvents() {
    // 1. Start Game Button Click Event
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    // 2. Play Again Button on Game Over Screen
    const restartBtn = document.getElementById('btn-restart-game');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        const modal = document.getElementById('modal-gameover');
        if (modal) modal.classList.add('hidden');
        this.startGame();
      });
    }

    // 3. Submit Answer Button Click Event
    const submitBtn = document.getElementById('btn-submit-answer');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.handleAnswerSubmission();
      });
    }

    // 4. Skip Puzzle Button Click Event
    const skipBtn = document.getElementById('btn-skip-puzzle');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (!this.state.isPlaying) return;
        const cfg = this.DIFFICULTIES[this.state.difficulty] || this.DIFFICULTIES.medium;
        const penalty = cfg.skipPenalty || 5;
        this.showFeedback(`SKIPPED! (-${penalty} pts)`, 'warning');
        this.state.score = Math.max(0, this.state.score - penalty);
        this.state.streak = 0;
        this.state.multiplier = 1;
        this.decreaseIntensity();
        this.updateHUD();
        this.fetchNextPuzzle();
      });
    }

    // 5. Close Game Over modal button
    const closeGameOverBtn = document.getElementById('btn-close-gameover');
    if (closeGameOverBtn) {
      closeGameOverBtn.addEventListener('click', () => {
        const modal = document.getElementById('modal-gameover');
        if (modal) modal.classList.add('hidden');
        this.resetGame();
      });
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Binds Difficulty mode selectors and hero cards
   */
  bindDifficultyEvents() {
    const selector = document.getElementById('difficulty-selector');
    if (selector) {
      selector.addEventListener('click', (e) => {
        // Direct launch button on specific mode card clicked
        const launchBtn = e.target.closest('[data-launch-diff]');
        if (launchBtn) {
          e.stopPropagation();
          const diff = launchBtn.dataset.launchDiff;
          if (diff) {
            this.setDifficulty(diff);
            this.startGame();
          }
          return;
        }

        // Card clicked to select mode
        const card = e.target.closest('.diff-hero-card');
        if (card) {
          const diff = card.dataset.difficulty;
          if (diff) this.setDifficulty(diff);
        }
      });
    }

    // Leaderboard Filter Buttons
    const filterContainer = document.getElementById('leaderboard-filters');
    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.diff-filter-btn');
        if (!btn) return;
        const filter = btn.dataset.filter || 'all';
        this.loadLeaderboard(filter);
      });
    }
  },

  /**
   * Switches difficulty mode and saves preference
   */
  setDifficulty(mode) {
    if (!this.DIFFICULTIES[mode]) return;
    this.state.difficulty = mode;
    localStorage.setItem('banana_arcade_difficulty', mode);
    this.playSound('tick');
    this.updateDifficultyUI();
  },

  /**
   * Dynamically increases in-game adaptive intensity level based on streaks
   */
  increaseIntensity() {
    const prev = this.state.intensityLevel;
    if (this.state.streak >= 9) {
      this.state.intensityLevel = 4;
    } else if (this.state.streak >= 6) {
      this.state.intensityLevel = 3;
    } else if (this.state.streak >= 3) {
      this.state.intensityLevel = 2;
    }

    if (this.state.intensityLevel > prev) {
      this.playSound('correct');
      this.showFeedback(`⚡ INTENSITY UP! LEVEL ${this.state.intensityLevel} (+${(this.state.intensityLevel - 1) * 15}% PTS)`, 'success');
      this.updateHUD();
    }
  },

  /**
   * Dynamically cools down in-game adaptive intensity level on error/skip
   */
  decreaseIntensity() {
    if (this.state.intensityLevel > 1) {
      this.state.intensityLevel--;
      this.showFeedback(`❄️ DIFFICULTY COOLED: LEVEL ${this.state.intensityLevel}`, 'info');
      this.updateHUD();
    }
  },

  /**
   * Updates Pre-game screen difficulty hero cards and launch button text
   */
  updateDifficultyUI() {
    const current = this.state.difficulty;
    const cfg = this.DIFFICULTIES[current];
    if (!cfg) return;

    // Update active hero card state
    document.querySelectorAll('.diff-hero-card').forEach(card => {
      card.classList.toggle('active', card.dataset.difficulty === current);
    });

    // Update main launch button label with selected mode and timer
    const startLabel = document.getElementById('btn-start-label');
    if (startLabel) {
      startLabel.textContent = `START GAME IN ${cfg.badge} MODE (${cfg.initialTime}s)`;
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Interactive On-Screen Numeric Keypad (0-9)
   */
  bindKeypadEvents() {
    const keypadContainer = document.getElementById('arcade-keypad');
    if (!keypadContainer) return;

    keypadContainer.addEventListener('click', (e) => {
      const button = e.target.closest('.keypad-btn');
      if (!button) return;

      const action = button.dataset.action;
      const value = button.dataset.value;
      const answerInput = document.getElementById('puzzle-answer-input');

      // Visual press animation
      button.classList.add('pressed');
      setTimeout(() => button.classList.remove('pressed'), 120);

      if (action === 'digit') {
        if (answerInput) {
          answerInput.value = value;
          // [EVENT-DRIVEN PROGRAMMING] Instant submission on keypad selection for rapid arcade action!
          this.handleAnswerSubmission();
        }
      } else if (action === 'clear') {
        if (answerInput) answerInput.value = '';
      } else if (action === 'submit') {
        this.handleAnswerSubmission();
      }
    });
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Physical Keyboard Event Listener (Enter, 0-9, Backspace)
   */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Only process when game is actively running
      if (!this.state.isPlaying) return;

      const answerInput = document.getElementById('puzzle-answer-input');

      // Check if target is not another input field (e.g. login form)
      if (e.target.tagName === 'INPUT' && e.target.id !== 'puzzle-answer-input') {
        return;
      }

      // Enter key submits answer
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAnswerSubmission();
        return;
      }

      // Digits 0 through 9
      if (/^[0-9]$/.test(e.key)) {
        if (answerInput) {
          answerInput.value = e.key;
          this.highlightKeypadButton(e.key);
          this.handleAnswerSubmission();
        }
        return;
      }

      // Escape or Backspace
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (answerInput) answerInput.value = '';
      }
    });
  },

  highlightKeypadButton(digit) {
    const btn = document.querySelector(`.keypad-btn[data-value="${digit}"]`);
    if (btn) {
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 150);
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Starts the Dynamic Timed Game Loop
   */
  startGame() {
    this.playSound('start');

    const cfg = this.DIFFICULTIES[this.state.difficulty] || this.DIFFICULTIES.medium;

    // Reset game state configured by selected Difficulty Mode
    this.state.isPlaying = true;
    this.state.score = 0;
    this.state.streak = 0;
    this.state.highestStreak = 0;
    this.state.multiplier = 1;
    this.state.puzzlesSolved = 0;
    this.state.totalAttempts = 0;
    this.state.timeLeft = cfg.initialTime;
    this.state.maxTime = cfg.initialTime;
    this.state.intensityLevel = 1;
    this.state.isVerifying = false;

    // Transition directly to Distraction-Free Solo Gameplay Screen
    this.navigateTo('screen-gameplay-solo', true);

    const modal = document.getElementById('modal-gameover');
    if (modal) modal.classList.add('hidden');

    // Apply CRT theme mode classes
    const crt = document.getElementById('crt-monitor');
    if (crt) {
      crt.classList.remove('mode-easy', 'mode-hard');
      if (this.state.difficulty === 'hard') crt.classList.add('mode-hard');
      if (this.state.difficulty === 'easy') crt.classList.add('mode-easy');
    }

    this.updateHUD();
    this.fetchNextPuzzle();

    // Start Dynamic Countdown Interval Loop
    clearInterval(this.state.timerInterval);
    this.state.timerInterval = setInterval(() => {
      this.state.timeLeft -= 1;
      this.updateTimerDisplay();

      // Urgent audio tick when countdown <= 5s
      if (this.state.timeLeft <= 5 && this.state.timeLeft > 0) {
        this.playSound('tick');
      }

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  },

  /**
   * [INTEROPERABILITY] Asynchronously queries Backend Proxy for University Banana API puzzle
   */
  async fetchNextPuzzle() {
    const puzzleImg = document.getElementById('puzzle-image');
    const puzzleLoader = document.getElementById('puzzle-loader');
    const answerInput = document.getElementById('puzzle-answer-input');
    const apiStatusBadge = document.getElementById('api-status-badge');

    if (answerInput) {
      answerInput.value = '';
      answerInput.focus();
    }

    if (puzzleLoader) puzzleLoader.classList.remove('hidden');
    if (puzzleImg) puzzleImg.classList.add('opacity-0');

    try {
      // [INTEROPERABILITY] Fetch puzzle payload generated dynamically by University Banana API
      const res = await Api.game.getPuzzle();

      this.state.currentPuzzle = res;

      if (apiStatusBadge) {
        apiStatusBadge.textContent = res.isFallback ? 'API: Fallback Mode' : 'University Banana API: Active';
        apiStatusBadge.className = `api-badge ${res.isFallback ? 'fallback' : 'online'}`;
      }

      if (puzzleImg) {
        // Pre-cache puzzle image before revealing
        const tempImg = new Image();
        tempImg.onload = () => {
          puzzleImg.src = res.question;
          puzzleImg.classList.remove('opacity-0');
          if (puzzleLoader) puzzleLoader.classList.add('hidden');
        };
        tempImg.onerror = () => {
          // Fallback if image fails to load
          puzzleImg.src = res.question;
          puzzleImg.classList.remove('opacity-0');
          if (puzzleLoader) puzzleLoader.classList.add('hidden');
        };
        tempImg.src = res.question;
      }

    } catch (error) {
      console.error('[-] Failed to fetch University Banana puzzle:', error);
      this.showFeedback('Network error loading puzzle!', 'error');
      if (puzzleLoader) puzzleLoader.classList.add('hidden');
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Verifies submitted player answer & executes reactive UI updates with mode scaling
   */
  handleAnswerSubmission() {
    if (!this.state.isPlaying || this.state.isVerifying) return;

    const answerInput = document.getElementById('puzzle-answer-input');
    const answer = answerInput ? answerInput.value.trim() : '';

    if (answer === '') {
      this.showFeedback('Please enter or tap a number!', 'warning');
      return;
    }

    if (!this.state.currentPuzzle) return;

    const numericAnswer = parseInt(answer, 10);
    const expected = parseInt(this.state.currentPuzzle.solution, 10);
    const cfg = this.DIFFICULTIES[this.state.difficulty] || this.DIFFICULTIES.medium;

    this.state.totalAttempts++;

    // Answer comparison
    if (numericAnswer === expected) {
      // CORRECT ANSWER!
      this.playSound('correct');
      this.state.streak++;
      this.state.highestStreak = Math.max(this.state.highestStreak || 0, this.state.streak);
      this.state.puzzlesSolved++;

      // Dynamic time bonus added to clock
      if (cfg.correctTimeBonus > 0) {
        this.state.timeLeft = Math.min(this.state.maxTime + 15, this.state.timeLeft + cfg.correctTimeBonus);
      }

      // Dynamic Combo Multiplier (3-4: 1.5x, 5-6: 2x, 7-9: 2.5x, 10+: 3x)
      if (window.ComboManager) {
        this.state.multiplier = ComboManager.getMultiplier(this.state.streak);
        ComboManager.trigger(this.state.streak);
      } else {
        if (this.state.streak >= 10) this.state.multiplier = 3.0;
        else if (this.state.streak >= 7) this.state.multiplier = 2.5;
        else if (this.state.streak >= 5) this.state.multiplier = 2.0;
        else if (this.state.streak >= 3) this.state.multiplier = 1.5;
        else this.state.multiplier = 1.0;
      }

      // Record combo achievement progression
      if (window.AchievementManager) {
        AchievementManager.recordEvent('combo_reached', { streak: this.state.streak });
      }

      // Adaptive dynamic intensity escalation on winning streaks
      this.increaseIntensity();

      const intensityBonus = 1 + (this.state.intensityLevel - 1) * 0.15;
      const pointsEarned = Math.round(cfg.correctPoints * this.state.multiplier * intensityBonus);
      this.state.score += pointsEarned;

      const bonusNote = cfg.correctTimeBonus > 0 ? ` (+${cfg.correctTimeBonus}s)` : '';
      this.showFeedback(`+${pointsEarned} PTS! ${this.state.multiplier > 1 ? `(${this.state.multiplier}x COMBO!)` : 'CORRECT!'} 🍌${bonusNote}`, 'success');
      this.triggerScreenEffect('correct');

    } else {
      // INCORRECT ANSWER
      this.playSound('wrong');
      this.state.streak = 0;
      this.state.multiplier = 1;

      // Mode penalties for wrong answer
      if (cfg.wrongTimePenalty > 0) {
        this.state.timeLeft = Math.max(0, this.state.timeLeft - cfg.wrongTimePenalty);
      }
      if (cfg.wrongScorePenalty > 0) {
        this.state.score = Math.max(0, this.state.score - cfg.wrongScorePenalty);
      }

      // Adaptive difficulty cools down
      this.decreaseIntensity();

      const penaltyParts = [];
      if (cfg.wrongTimePenalty > 0) penaltyParts.push(`-${cfg.wrongTimePenalty}s`);
      if (cfg.wrongScorePenalty > 0) penaltyParts.push(`-${cfg.wrongScorePenalty}pts`);
      const penaltyMsg = penaltyParts.length ? ` (${penaltyParts.join(' / ')})` : '';

      this.showFeedback(`WRONG! Answer was ${expected}${penaltyMsg}`, 'error');
      this.triggerScreenEffect('wrong');
    }

    this.updateHUD();

    // Fetch next Banana API puzzle immediately
    this.fetchNextPuzzle();
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Concludes the Timed Session & Prompts Leaderboard Persistence
   */
  async endGame() {
    clearInterval(this.state.timerInterval);
    this.state.isPlaying = false;
    this.playSound('gameover');

    const maxStreak = this.state.highestStreak || this.state.streak || 0;

    // Record solo game completion for achievements
    if (window.AchievementManager) {
      AchievementManager.recordEvent('solo_game_completed', {
        score: this.state.score,
        puzzlesSolved: this.state.puzzlesSolved,
        attempts: this.state.totalAttempts,
        streak: maxStreak,
        difficulty: this.state.difficulty
      });
    }

    const cfg = this.DIFFICULTIES[this.state.difficulty] || this.DIFFICULTIES.medium;
    const accuracy = this.state.totalAttempts > 0 
      ? Math.round((this.state.puzzlesSolved / this.state.totalAttempts) * 100) 
      : 0;

    // Populate Dedicated Solo Results Screen Elements
    const resScore = document.getElementById('solo-res-score');
    const resDiff = document.getElementById('solo-res-diff');
    const resStreak = document.getElementById('solo-res-streak');
    const resSolved = document.getElementById('solo-res-solved');
    const resAccuracy = document.getElementById('solo-res-accuracy');
    const resStatus = document.getElementById('solo-res-leaderboard-status');

    if (resScore) resScore.textContent = this.state.score;
    if (resDiff) resDiff.innerHTML = `<span class="hud-diff-pill ${cfg.id}">${cfg.badge}</span>`;
    if (resStreak) resStreak.textContent = `${maxStreak} 🔥`;
    if (resSolved) resSolved.textContent = this.state.puzzlesSolved;
    if (resAccuracy) resAccuracy.textContent = `${accuracy}%`;

    // Also populate legacy modal elements for fallback
    const modal = document.getElementById('modal-gameover');
    const finalScoreEl = document.getElementById('modal-final-score');
    const puzzlesSolvedEl = document.getElementById('modal-puzzles-solved');
    const accuracyEl = document.getElementById('modal-accuracy');
    const diffModalEl = document.getElementById('modal-difficulty-mode');

    if (finalScoreEl) finalScoreEl.textContent = this.state.score;
    if (puzzlesSolvedEl) puzzlesSolvedEl.textContent = this.state.puzzlesSolved;
    if (diffModalEl) diffModalEl.innerHTML = `<span class="hud-diff-pill ${cfg.id}">${cfg.badge}</span>`;
    if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;

    // Navigate to dedicated results screen
    if (document.getElementById('screen-results-solo')) {
      this.navigateTo('screen-results-solo', false);
    } else if (modal) {
      modal.classList.remove('hidden');
    }

    // Play again button binding on results screen
    const playAgainBtn = document.getElementById('btn-solo-play-again');
    if (playAgainBtn && !playAgainBtn._bound) {
      playAgainBtn._bound = true;
      playAgainBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    // [VIRTUAL IDENTITY] Auto-persist score if player is authenticated
    if (Auth.currentUser && Api.getToken()) {
      const setStatus = (msg, cls) => {
        if (resStatus) { resStatus.textContent = msg; resStatus.className = 'status-text ' + cls; }
      };

      setStatus('Saving high score to persistent database...', 'saving');

      try {
        const res = await Api.leaderboard.submit(this.state.score, this.state.puzzlesSolved, this.state.difficulty);
        setStatus(`Score recorded (${cfg.name} Mode)! High Score: ${res.userStats?.high_score || this.state.score} pts`, 'success');
        
        Auth.setCurrentUser({ ...Auth.currentUser, stats: res.userStats });
        this.loadLeaderboard(this.state.leaderboardFilter || 'all');
      } catch (err) {
        setStatus('Failed to record score: ' + err.message, 'error');
      }
    } else {
      if (resStatus) {
        resStatus.innerHTML = 'Playing as Guest. <a href="#" id="link-save-score-solo">Log in or Register</a> to save high score to Global Leaderboard!';
        resStatus.className = 'status-text guest';

        const saveLink = document.getElementById('link-save-score-solo');
        if (saveLink) {
          saveLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('screen-profile');
          });
        }
      }
    }
  },

  /**
   * Resets game display to idle state
   */
  resetGame() {
    clearInterval(this.state.timerInterval);
    this.state.isPlaying = false;
    document.getElementById('screen-pregame').classList.remove('hidden');
    document.getElementById('screen-active-game').classList.add('hidden');
    const modal = document.getElementById('modal-gameover');
    if (modal) modal.classList.add('hidden');
  },

  /**
   * Updates HUD displays (Score, Multiplier, Streak, Puzzles, Difficulty, Intensity)
   */
  updateHUD() {
    const scoreVal = document.getElementById('hud-score-value');
    const streakVal = document.getElementById('hud-streak-value');
    const solvedVal = document.getElementById('hud-solved-value');
    const diffBadge = document.getElementById('hud-diff-badge');
    const intensityBadge = document.getElementById('hud-intensity-badge');

    const cfg = this.DIFFICULTIES[this.state.difficulty] || this.DIFFICULTIES.medium;

    if (scoreVal) scoreVal.textContent = this.state.score;
    if (streakVal) {
      streakVal.textContent = `${this.state.streak} 🔥 (${this.state.multiplier}x)`;
      streakVal.className = `streak-badge ${this.state.multiplier > 1 ? 'multiplier-active' : ''}`;
    }
    if (solvedVal) solvedVal.textContent = this.state.puzzlesSolved;

    if (diffBadge) {
      diffBadge.textContent = cfg.badge;
      diffBadge.className = `hud-diff-pill ${cfg.id}`;
    }

    if (intensityBadge) {
      intensityBadge.textContent = `LVL ${this.state.intensityLevel}`;
    }
  },

  /**
   * Updates Timer UI & urgent styling
   */
  updateTimerDisplay() {
    const timerValue = document.getElementById('hud-timer-value');
    const timerBar = document.getElementById('hud-timer-progress');
    const maxT = this.state.maxTime || 30;

    if (timerValue) {
      timerValue.textContent = `${Math.ceil(this.state.timeLeft)}s`;
      if (this.state.timeLeft <= 10) {
        timerValue.classList.add('urgent');
      } else {
        timerValue.classList.remove('urgent');
      }
    }

    if (timerBar) {
      const percentage = Math.max(0, Math.min(100, (this.state.timeLeft / maxT) * 100));
      timerBar.style.width = `${percentage}%`;

      if (this.state.timeLeft <= 10) {
        timerBar.className = 'timer-progress danger';
      } else if (this.state.timeLeft <= 20) {
        timerBar.className = 'timer-progress warning';
      } else {
        timerBar.className = 'timer-progress normal';
      }
    }
  },

  /**
   * Displays temporary feedback popup
   */
  showFeedback(text, type = 'info') {
    const feedbackEl = document.getElementById('feedback-banner');
    if (!feedbackEl) return;

    feedbackEl.textContent = text;
    feedbackEl.className = `feedback-banner active ${type}`;

    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      feedbackEl.className = 'feedback-banner';
    }, 1200);
  },

  /**
   * Screen shake or glow animation
   */
  triggerScreenEffect(type) {
    const card = document.getElementById('crt-monitor');
    if (!card) return;

    card.classList.remove('effect-correct', 'effect-wrong');
    // Force DOM reflow
    void card.offsetWidth;

    if (type === 'correct') {
      card.classList.add('effect-correct');
    } else {
      card.classList.add('effect-wrong');
    }
  },

  /**
   * [VERSION CONTROL] Loads Top 10 Leaderboard from REST API with difficulty filtering
   */
  async loadLeaderboard(filter = null) {
    const tbody = document.getElementById('leaderboard-tbody');
    const emptyState = document.getElementById('leaderboard-empty');
    if (!tbody) return;

    if (filter !== null) {
      this.state.leaderboardFilter = filter;
    }
    const currentFilter = this.state.leaderboardFilter || 'all';

    // Update filter buttons active styling
    document.querySelectorAll('.diff-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });

    try {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading top scores...</td></tr>';
      const data = await Api.leaderboard.getTop(currentFilter);

      if (!data.leaderboard || data.leaderboard.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
          emptyState.classList.remove('hidden');
          emptyState.innerHTML = `<p>No high scores recorded yet for <strong>${currentFilter.toUpperCase()}</strong> mode! Be the first player to submit a run.</p>`;
        }
        return;
      }

      if (emptyState) emptyState.classList.add('hidden');
      tbody.innerHTML = '';

      data.leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');
        row.className = rank === 1 ? 'gold-rank' : rank === 2 ? 'silver-rank' : rank === 3 ? 'bronze-rank' : '';

        const medalIcon = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : `#${rank}`;
        const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'Recent';
        const avatarHtml = window.AvatarHelper ? AvatarHelper.render(entry.avatar || 'avatar-1', 32, 'table-avatar-img') : '🍌';
        const diffMode = (entry.difficulty || 'medium').toLowerCase();

        row.innerHTML = `
          <td class="rank-col"><strong>${medalIcon}</strong></td>
          <td class="table-avatar-cell">${avatarHtml}</td>
          <td class="player-col">
            <span class="player-pill">${this.escapeHTML(entry.username)}</span>
          </td>
          <td class="mode-col">
            <span class="diff-table-pill ${diffMode}">${diffMode.toUpperCase()}</span>
          </td>
          <td class="score-col"><strong>${entry.score}</strong></td>
          <td class="puzzles-col">${entry.puzzles_solved || 0}</td>
          <td class="date-col text-muted">${dateStr}</td>
        `;
        tbody.appendChild(row);
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center error">Failed to load leaderboard: ${err.message}</td></tr>`;
    }
  },

  onUserAuthenticated(user) {
    this.loadLeaderboard();
  },

  escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
};

// [EVENT-DRIVEN PROGRAMMING] Attach global initialization listener
document.addEventListener('DOMContentLoaded', () => {
  window.App = App;

  // Synthesizer Audio Bridge for Auth and submodules
  window.Sound = {
    playFanfare: () => App.playSound('start'),
    playCorrect: () => App.playSound('correct'),
    playIncorrect: () => App.playSound('wrong'),
    playKeypad: () => App.playSound('tick')
  };

  App.init();
  Auth.init();
  // [EVENT-DRIVEN MULTIPLAYER] Initialize multiplayer controller after all modules are loaded
  if (window.Multiplayer) {
    Multiplayer.init();
  }
});
