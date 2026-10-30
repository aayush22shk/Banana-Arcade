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
  // Game State
  state: {
    isPlaying: false,
    score: 0,
    streak: 0,
    multiplier: 1,
    puzzlesSolved: 0,
    totalAttempts: 0,
    timeLeft: 30,
    timerInterval: null,
    currentPuzzle: null,
    isVerifying: false,
    soundEnabled: true
  },

  // Audio Context for Web Audio API synthesis
  audioCtx: null,

  /**
   * [EVENT-DRIVEN PROGRAMMING] Application initialization on DOMContentLoaded
   */
  init() {
    this.initAudio();
    this.bindNavigationEvents();
    this.bindGameEvents();
    this.bindKeypadEvents();
    this.bindKeyboardShortcuts();
    this.showView('game');
    this.loadLeaderboard();
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
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Navigation View Switching Event Handlers
   */
  bindNavigationEvents() {
    const navItems = document.querySelectorAll('[data-view-target]');
    navItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.dataset.viewTarget;
        this.showView(targetView);
      });
    });

    // Sound toggle button listener
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.state.soundEnabled = !this.state.soundEnabled;
        soundBtn.textContent = this.state.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        soundBtn.classList.toggle('muted', !this.state.soundEnabled);
      });
    }
  },

  /**
   * Controls Single Page Application (SPA) view transitions
   */
  showView(viewName) {
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.add('hidden'));

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.remove('hidden');
    }

    const navButtons = document.querySelectorAll('.nav-link');
    navButtons.forEach(nb => {
      if (nb.dataset.viewTarget === viewName) {
        nb.classList.add('active');
      } else {
        nb.classList.remove('active');
      }
    });

    if (viewName === 'leaderboard') {
      this.loadLeaderboard();
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
        this.showFeedback('SKIPPED! (-5 pts)', 'warning');
        this.state.score = Math.max(0, this.state.score - 5);
        this.state.streak = 0;
        this.state.multiplier = 1;
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
   * [EVENT-DRIVEN PROGRAMMING] Starts the 30-Second Timed Game Loop
   */
  startGame() {
    this.playSound('start');

    // Reset game state
    this.state.isPlaying = true;
    this.state.score = 0;
    this.state.streak = 0;
    this.state.multiplier = 1;
    this.state.puzzlesSolved = 0;
    this.state.totalAttempts = 0;
    this.state.timeLeft = 30;
    this.state.isVerifying = false;

    // Toggle HUD & screens
    document.getElementById('screen-pregame').classList.add('hidden');
    document.getElementById('screen-active-game').classList.remove('hidden');
    const modal = document.getElementById('modal-gameover');
    if (modal) modal.classList.add('hidden');

    this.updateHUD();
    this.fetchNextPuzzle();

    // Start 30-Second Countdown Interval Loop
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
   * [EVENT-DRIVEN PROGRAMMING] Verifies submitted player answer & executes reactive UI updates
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

    this.state.totalAttempts++;

    // Answer comparison
    if (numericAnswer === expected) {
      // CORRECT ANSWER!
      this.playSound('correct');
      this.state.streak++;
      this.state.puzzlesSolved++;

      // Progressive combo multiplier: 1x -> 2x -> 3x -> 5x
      if (this.state.streak >= 8) this.state.multiplier = 5;
      else if (this.state.streak >= 5) this.state.multiplier = 3;
      else if (this.state.streak >= 2) this.state.multiplier = 2;
      else this.state.multiplier = 1;

      const pointsEarned = 10 * this.state.multiplier;
      this.state.score += pointsEarned;

      this.showFeedback(`+${pointsEarned} PTS! ${this.state.multiplier > 1 ? `(${this.state.multiplier}x COMBO!)` : 'CORRECT!'} 🍌`, 'success');
      this.triggerScreenEffect('correct');

    } else {
      // INCORRECT ANSWER
      this.playSound('wrong');
      this.state.streak = 0;
      this.state.multiplier = 1;
      this.showFeedback(`WRONG! Answer was ${expected}`, 'error');
      this.triggerScreenEffect('wrong');
    }

    this.updateHUD();

    // Fetch next Banana API puzzle immediately
    this.fetchNextPuzzle();
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Concludes the 30-Second Timed Session & Prompts Leaderboard Persistence
   */
  async endGame() {
    clearInterval(this.state.timerInterval);
    this.state.isPlaying = false;
    this.playSound('gameover');

    // Display Game Over Modal
    const modal = document.getElementById('modal-gameover');
    const finalScoreEl = document.getElementById('modal-final-score');
    const puzzlesSolvedEl = document.getElementById('modal-puzzles-solved');
    const accuracyEl = document.getElementById('modal-accuracy');
    const leaderboardStatusEl = document.getElementById('modal-leaderboard-status');

    if (finalScoreEl) finalScoreEl.textContent = this.state.score;
    if (puzzlesSolvedEl) puzzlesSolvedEl.textContent = this.state.puzzlesSolved;

    const accuracy = this.state.totalAttempts > 0 
      ? Math.round((this.state.puzzlesSolved / this.state.totalAttempts) * 100) 
      : 0;
    if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;

    if (modal) modal.classList.remove('hidden');

    // [VIRTUAL IDENTITY] Auto-persist score if player is authenticated
    if (Auth.currentUser && Api.getToken()) {
      if (leaderboardStatusEl) {
        leaderboardStatusEl.textContent = 'Saving high score to persistent database...';
        leaderboardStatusEl.className = 'status-text saving';
      }

      try {
        const res = await Api.leaderboard.submit(this.state.score, this.state.puzzlesSolved);
        if (leaderboardStatusEl) {
          leaderboardStatusEl.textContent = `Score recorded! High Score: ${res.userStats?.high_score || this.state.score} pts`;
          leaderboardStatusEl.className = 'status-text success';
        }
        // Update user badge PB
        Auth.setCurrentUser({ ...Auth.currentUser, stats: res.userStats });
        this.loadLeaderboard();
      } catch (err) {
        if (leaderboardStatusEl) {
          leaderboardStatusEl.textContent = 'Failed to record score: ' + err.message;
          leaderboardStatusEl.className = 'status-text error';
        }
      }
    } else {
      if (leaderboardStatusEl) {
        leaderboardStatusEl.innerHTML = 'Playing as Guest. <a href="#" id="link-save-score">Log in or Register</a> to save high score to Global Leaderboard!';
        leaderboardStatusEl.className = 'status-text guest';

        const saveLink = document.getElementById('link-save-score');
        if (saveLink) {
          saveLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) modal.classList.add('hidden');
            this.showView('auth');
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
   * Updates HUD displays (Score, Multiplier, Streak, Puzzles)
   */
  updateHUD() {
    const scoreVal = document.getElementById('hud-score-value');
    const streakVal = document.getElementById('hud-streak-value');
    const solvedVal = document.getElementById('hud-solved-value');

    if (scoreVal) scoreVal.textContent = this.state.score;
    if (streakVal) {
      streakVal.textContent = `${this.state.streak} 🔥 (${this.state.multiplier}x)`;
      streakVal.className = `streak-badge ${this.state.multiplier > 1 ? 'multiplier-active' : ''}`;
    }
    if (solvedVal) solvedVal.textContent = this.state.puzzlesSolved;
  },

  /**
   * Updates Timer UI & urgent styling
   */
  updateTimerDisplay() {
    const timerValue = document.getElementById('hud-timer-value');
    const timerBar = document.getElementById('hud-timer-progress');

    if (timerValue) {
      timerValue.textContent = `${this.state.timeLeft}s`;
      if (this.state.timeLeft <= 10) {
        timerValue.classList.add('urgent');
      } else {
        timerValue.classList.remove('urgent');
      }
    }

    if (timerBar) {
      const percentage = Math.max(0, (this.state.timeLeft / 30) * 100);
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
   * [VERSION CONTROL] Loads Top 10 Leaderboard from REST API
   */
  async loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    const emptyState = document.getElementById('leaderboard-empty');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading top scores...</td></tr>';
      const data = await Api.leaderboard.getTop();

      if (!data.leaderboard || data.leaderboard.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
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

        row.innerHTML = `
          <td class="rank-col"><strong>${medalIcon}</strong></td>
          <td class="table-avatar-cell">${avatarHtml}</td>
          <td class="player-col">
            <span class="player-pill">${this.escapeHTML(entry.username)}</span>
          </td>
          <td class="score-col"><strong>${entry.score}</strong></td>
          <td class="puzzles-col">${entry.puzzles_solved || 0}</td>
          <td class="date-col text-muted">${dateStr}</td>
        `;
        tbody.appendChild(row);
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center error">Failed to load leaderboard: ${err.message}</td></tr>`;
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
  App.init();
  Auth.init();
});
