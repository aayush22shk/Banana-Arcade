/**
 * ============================================================================
 * [EVENT-DRIVEN MULTIPLAYER]: Banana Arcade – 1v1 Versus Arena Controller
 * Architecture: Frontend Controller (Polling-based Real-Time Sync Engine)
 * ============================================================================
 *
 * Flow:
 *  HOST  → Create Room → Waiting Lobby (polls for guest) → Host clicks Start → Arena
 *  GUEST → Enter Code  → Join Room     → Waiting Lobby  → Polls until playing → Arena
 *
 * Real-Time Sync: Server-side state stored in MySQL, polled every 1.5 seconds.
 * All game-critical validation (HP deduction, win condition) happens server-side.
 * ============================================================================
 */

const Multiplayer = {

  // ── State ──────────────────────────────────────────────────────────────────
  state: {
    roomCode:    null,
    role:        null,    // 'host' | 'guest'
    pollTimer:   null,
    lastEventMsg: null,
    isSubmitting: false,
    myName:      null,
    myAvatar:    null,
    opponentName: null,
    opponentAvatar: null,
    currentPuzzle: null,  // { question, solution } cached from server room
    puzzleImageLoaded: false,
    gameOver: false,
    waitingForStart: false // host created room, waiting for manual start
  },

  // ── Constants ──────────────────────────────────────────────────────────────
  POLL_INTERVAL_MS: 1500,   // Polling frequency in milliseconds
  MAX_POLL_ERRORS:  5,      // Abort polling after this many consecutive failures
  _pollErrorCount: 0,

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * [EVENT-DRIVEN PROGRAMMING] Bind all multiplayer UI event listeners.
   * Called once on DOMContentLoaded.
   */
  init() {
    this._bindLobbyEvents();
    this._bindWaitingRoomEvents();
    this._bindArenaEvents();
    this._bindModalEvents();
    this._showScreen('lobby');
    console.log('[Multiplayer] Controller initialized.');
  },

  // ============================================================================
  // EVENT BINDING
  // ============================================================================

  _bindLobbyEvents() {
    // Host: Generate Room Code button
    const btnCreate = document.getElementById('mp-btn-create-room');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => this._handleCreateRoom());
    }

    // Join: Enter Battle button
    const btnJoin = document.getElementById('mp-btn-join-room');
    if (btnJoin) {
      btnJoin.addEventListener('click', () => this._handleJoinRoom());
    }

    // Join: Paste clipboard into code input
    const btnPaste = document.getElementById('mp-btn-paste-code');
    if (btnPaste) {
      btnPaste.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          const input = document.getElementById('mp-join-code-input');
          if (input) {
            input.value = text.trim().toUpperCase().slice(0, 7);
            input.focus();
          }
        } catch (_) { /* clipboard permission denied */ }
      });
    }

    // Join: Allow pressing Enter in code input
    const joinInput = document.getElementById('mp-join-code-input');
    if (joinInput) {
      joinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._handleJoinRoom();
        }
        // Auto-uppercase
        setTimeout(() => {
          joinInput.value = joinInput.value.toUpperCase();
        }, 0);
      });
    }

    // Update host identity preview from current Auth session
    this._refreshLobbyIdentity();
  },

  _bindWaitingRoomEvents() {
    // Copy room code to clipboard
    const btnCopy = document.getElementById('mp-btn-copy-code');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => this._copyRoomCode());
    }

    // Cancel / leave waiting room
    const btnCancel = document.getElementById('mp-btn-cancel-waiting');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => this._handleCancelWaiting());
    }

    // Host "Start Match" button (shown once guest has joined)
    const btnStart = document.getElementById('mp-btn-start-match');
    if (btnStart) {
      btnStart.addEventListener('click', () => this._handleHostStartGame());
    }
  },

  _bindArenaEvents() {
    // ── Strike (Submit Answer) ────────────────────────────────────────────────
    const btnAttack = document.getElementById('mp-btn-attack');
    if (btnAttack) {
      btnAttack.addEventListener('click', () => this._handleSubmitAnswer());
    }

    // Keypad digits
    document.querySelectorAll('.mp-kp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        const input = document.getElementById('mp-answer-input');
        if (input) {
          input.value = val;
          btn.classList.add('pressed');
          setTimeout(() => btn.classList.remove('pressed'), 120);
          // Instant submission like solo mode keypad
          this._handleSubmitAnswer();
        }
      });
    });

    // CLR button
    const kpClear = document.getElementById('mp-kp-clear');
    if (kpClear) {
      kpClear.addEventListener('click', () => {
        const input = document.getElementById('mp-answer-input');
        if (input) input.value = '';
      });
    }

    // GO (submit) button
    const kpGo = document.getElementById('mp-kp-go');
    if (kpGo) {
      kpGo.addEventListener('click', () => this._handleSubmitAnswer());
    }

    // Keyboard support in arena
    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      // Only listen if arena is visible and focus isn't in a non-arena input
      if (this._currentScreen() !== 'arena') return;
      if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id !== 'mp-answer-input') return;

      const input = document.getElementById('mp-answer-input');
      if (e.key === 'Enter') {
        e.preventDefault();
        this._handleSubmitAnswer();
      } else if (/^[0-9]$/.test(e.key)) {
        if (input) {
          input.value = e.key;
          this._handleSubmitAnswer();
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        if (input) input.value = '';
      }
    });

    // Leave / Surrender button
    const btnLeave = document.getElementById('mp-btn-leave-match');
    if (btnLeave) {
      btnLeave.addEventListener('click', () => this._handleLeaveMatch());
    }
  },

  _bindModalEvents() {
    // Rematch button
    const btnRematch = document.getElementById('mp-btn-rematch');
    if (btnRematch) {
      btnRematch.addEventListener('click', () => this._handleRematch());
    }

    // Exit to Lobby button
    const btnExit = document.getElementById('mp-btn-close-battleover');
    if (btnExit) {
      btnExit.addEventListener('click', () => this._handleExitToLobby());
    }
  },

  // ============================================================================
  // LOBBY ACTIONS
  // ============================================================================

  /**
   * Refresh the host identity preview card with current auth state
   */
  _refreshLobbyIdentity() {
    const user = (window.Auth && Auth.currentUser) ? Auth.currentUser : null;
    const name   = user ? user.username : 'Guest Player';
    const avatar = user ? (user.avatar || 'avatar-1') : 'avatar-1';

    const hostNameEl   = document.getElementById('mp-lobby-host-name');
    const hostAvatarEl = document.getElementById('mp-lobby-host-avatar');

    if (hostNameEl)   hostNameEl.textContent = name;
    if (hostAvatarEl) {
      if (window.AvatarHelper) {
        hostAvatarEl.innerHTML = AvatarHelper.render(avatar, 36, 'avatar-img');
      } else {
        hostAvatarEl.textContent = '🍌';
      }
    }
  },

  /**
   * [EVENT-DRIVEN] Host clicks "Generate Room Code"
   */
  async _handleCreateRoom() {
    const btn = document.getElementById('mp-btn-create-room');
    this._setButtonLoading(btn, true, '⏳ Creating Room...');
    this._hideLobbyAlert();

    try {
      const user = (window.Auth && Auth.currentUser) ? Auth.currentUser : null;
      const username = user ? user.username : 'Player 1';
      const avatar   = user ? (user.avatar || 'avatar-1') : 'avatar-1';

      const res = await Api.multiplayer.create(username, avatar);

      if (!res.success) throw new Error(res.error || 'Failed to create room.');

      // Store session state
      this.state.roomCode   = res.roomCode;
      this.state.role       = 'host';
      this.state.myName     = username;
      this.state.myAvatar   = avatar;
      this._pollErrorCount  = 0;
      this.state.gameOver   = false;
      this.state.waitingForStart = false;

      // Show waiting room with the generated code
      this._enterWaitingRoom(res.roomCode, 'host');

    } catch (err) {
      this._showLobbyAlert('❌ ' + (err.message || 'Could not create room. Try again.'), 'error');
    } finally {
      this._setButtonLoading(btn, false, '⚡ GENERATE ROOM CODE');
    }
  },

  /**
   * [EVENT-DRIVEN] Guest clicks "Enter Battle" with entered room code
   */
  async _handleJoinRoom() {
    const input    = document.getElementById('mp-join-code-input');
    const rawCode  = input ? input.value.trim().toUpperCase() : '';

    if (!rawCode || rawCode.length < 4) {
      this._showLobbyAlert('⚠️ Please enter a valid room code (e.g. BN-1234).', 'error');
      return;
    }

    const btn = document.getElementById('mp-btn-join-room');
    this._setButtonLoading(btn, true, '⏳ Joining Battle...');
    this._hideLobbyAlert();

    try {
      const user     = (window.Auth && Auth.currentUser) ? Auth.currentUser : null;
      const username = user ? user.username : 'Challenger';
      const avatar   = user ? (user.avatar || 'avatar-2') : 'avatar-2';

      const res = await Api.multiplayer.join(rawCode, username, avatar);

      if (!res.success) throw new Error(res.error || 'Could not join room.');

      // Store session state
      this.state.roomCode      = res.roomCode;
      this.state.role          = 'guest';
      this.state.myName        = username;
      this.state.myAvatar      = avatar;
      this._pollErrorCount     = 0;
      this.state.gameOver      = false;
      this.state.waitingForStart = true; // waiting for host to click start

      // Enter waiting room as guest (waiting for start)
      this._enterWaitingRoom(res.roomCode, 'guest', res.room);

    } catch (err) {
      let msg = err.message || 'Could not join room.';
      // User-friendly messages for common errors
      if (msg.toLowerCase().includes('not found')) {
        msg = `❌ Room code "${rawCode}" not found. Check the code and try again.`;
      } else if (msg.toLowerCase().includes('progress') || msg.toLowerCase().includes('completed')) {
        msg = `⚠️ This room is full or the match has already started.`;
      } else {
        msg = '❌ ' + msg;
      }
      this._showLobbyAlert(msg, 'error');
    } finally {
      this._setButtonLoading(btn, false, '🚀 ENTER BATTLE');
    }
  },

  // ============================================================================
  // WAITING ROOM
  // ============================================================================

  /**
   * Transitions to waiting room screen and starts polling
   */
  _enterWaitingRoom(roomCode, role, initialRoom = null) {
    // Display room code prominently
    const codeEl = document.getElementById('mp-waiting-code');
    if (codeEl) codeEl.textContent = roomCode;

    // Update arena room label (for later)
    const arenaRoomLabel = document.getElementById('mp-arena-room-label');
    if (arenaRoomLabel) arenaRoomLabel.textContent = `ROOM: ${roomCode}`;

    // Populate host slot in waiting room
    const p1AvatarEl = document.getElementById('mp-wait-p1-avatar');
    const p1NameEl   = document.getElementById('mp-wait-p1-name');
    if (role === 'host') {
      const av = this.state.myAvatar || 'avatar-1';
      if (p1AvatarEl && window.AvatarHelper) p1AvatarEl.innerHTML = AvatarHelper.render(av, 40, 'avatar-img');
      if (p1NameEl) p1NameEl.textContent = this.state.myName || 'Player 1';
    }

    // Guest slot is dynamically updated by polling
    this._resetGuestSlot();

    // Show/hide the "Start Match" button — only host sees it
    const btnStart = document.getElementById('mp-btn-start-match');
    if (btnStart) {
      btnStart.classList.add('hidden');   // Hidden until guest joins
    }

    // Update waiting badge text for guest perspective
    const badgeEl = document.querySelector('#mp-screen-waiting .mp-badge-tag');
    if (role === 'guest' && badgeEl) {
      badgeEl.textContent = '⏳ Player Joined • Waiting for Host to Start';
    } else if (badgeEl) {
      badgeEl.innerHTML = '📡 Waiting for Player &bull; Share Room Code';
    }

    // If guest joined with room data, populate host identity
    if (role === 'guest' && initialRoom) {
      if (p1AvatarEl && window.AvatarHelper) {
        p1AvatarEl.innerHTML = AvatarHelper.render(initialRoom.host_avatar || 'avatar-1', 40, 'avatar-img');
      }
      if (p1NameEl) p1NameEl.textContent = initialRoom.host_name || 'Host';

      // Store opponent info for arena display
      this.state.opponentName   = initialRoom.host_name;
      this.state.opponentAvatar = initialRoom.host_avatar;
    }

    this._showScreen('waiting');
    this._startPolling();
  },

  /**
   * Reset the guest slot display to "awaiting" state
   */
  _resetGuestSlot() {
    const guestSlot = document.querySelector('#mp-screen-waiting .guest-slot');
    if (!guestSlot) return;
    const avatarEl = guestSlot.querySelector('.slot-avatar');
    const nameEl   = guestSlot.querySelector('.slot-name');
    const statusEl = guestSlot.querySelector('.slot-status');

    if (avatarEl) { avatarEl.innerHTML = '❓'; avatarEl.classList.add('pending'); }
    if (nameEl)   { nameEl.textContent = 'Awaiting Player 2...'; nameEl.classList.add('text-muted'); }
    if (statusEl) { statusEl.textContent = 'Waiting for Player'; statusEl.className = 'slot-status waiting'; }
  },

  /**
   * Copy the current room code to the clipboard
   */
  async _copyRoomCode() {
    const code = this.state.roomCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      const iconEl = document.getElementById('mp-copy-icon');
      const textEl = document.getElementById('mp-copy-text');
      if (iconEl) iconEl.textContent = '✅';
      if (textEl) textEl.textContent = 'Copied!';
      setTimeout(() => {
        if (iconEl) iconEl.textContent = '📋';
        if (textEl) textEl.textContent = 'Copy Code';
      }, 2000);
    } catch (_) { /* clipboard not available */ }
  },

  /**
   * Host clicks "Cancel" in waiting room — leaves and returns to lobby
   */
  async _handleCancelWaiting() {
    this._stopPolling();
    if (this.state.roomCode && this.state.role) {
      try {
        await Api.multiplayer.sendAction(this.state.roomCode, this.state.role, 'leave');
      } catch (_) {}
    }
    this._resetState();
    this._showScreen('lobby');
    this._refreshLobbyIdentity();
  },

  /**
   * Host clicks "Start Match" after guest has joined the waiting room
   */
  async _handleHostStartGame() {
    if (this.state.role !== 'host') return;
    const btn = document.getElementById('mp-btn-start-match');
    this._setButtonLoading(btn, true, '🚀 Game Starting...');

    const badgeEl = document.querySelector('#mp-screen-waiting .mp-badge-tag');
    if (badgeEl) badgeEl.innerHTML = '🚀 Game Starting &bull; Entering Arena...';

    try {
      const res = await Api.multiplayer.sendAction(
        this.state.roomCode, 'host', 'start_game'
      );
      if (res.success) {
        // Polling will detect 'playing' status and transition to arena
        this.state.waitingForStart = false;
      } else {
        throw new Error(res.error || 'Could not start game.');
      }
    } catch (err) {
      console.error('[Multiplayer] Start game error:', err);
      this._setButtonLoading(btn, false, '⚡ START MATCH!');
    }
  },

  // ============================================================================
  // POLLING ENGINE (Real-Time Sync via HTTP Polling)
  // ============================================================================

  /**
   * Starts the room polling interval — the heartbeat of multiplayer sync
   */
  _startPolling() {
    this._stopPolling();
    this._pollErrorCount = 0;
    this.state.pollTimer = setInterval(() => {
      this._pollRoomState();
    }, this.POLL_INTERVAL_MS);
    // Immediate first poll
    this._pollRoomState();
  },

  /**
   * Stops polling (cleanup)
   */
  _stopPolling() {
    if (this.state.pollTimer) {
      clearInterval(this.state.pollTimer);
      this.state.pollTimer = null;
    }
  },

  /**
   * [REAL-TIME SYNC] Polls server for latest room state and reacts to changes
   */
  async _pollRoomState() {
    if (!this.state.roomCode) return;

    try {
      const res = await Api.multiplayer.getStatus(this.state.roomCode);

      if (!res.success || !res.room) {
        throw new Error(res.error || 'Room not found');
      }

      this._pollErrorCount = 0;
      const room = res.room;
      const currentScreen = this._currentScreen();

      // ── WAITING ROOM POLLING ─────────────────────────────────────────────
      if (currentScreen === 'waiting') {

        if (room.status === 'waiting') {
          // Still waiting for guest — keep host info fresh
          const p1AvatarEl = document.getElementById('mp-wait-p1-avatar');
          const p1NameEl   = document.getElementById('mp-wait-p1-name');
          if (p1AvatarEl && window.AvatarHelper) {
            p1AvatarEl.innerHTML = AvatarHelper.render(room.host_avatar || 'avatar-1', 40, 'avatar-img');
          }
          if (p1NameEl) p1NameEl.textContent = room.host_name || 'Player 1';

        } else if (room.status === 'ready') {
          // Guest joined, host must click Start Match
          this._updateGuestSlotJoined(room);
          if (this.state.role === 'host') {
            this._onGuestJoined(room);
          }
          // Guest sits in waiting room until host clicks Start

        } else if (room.status === 'playing') {
          // Host clicked Start — both players go to arena
          this._stopPolling();
          this._transitionToArena(room);

        } else if (room.status === 'finished') {
          this._stopPolling();
          this._resetState();
          this._showScreen('lobby');
        }

      // ── ARENA POLLING ─────────────────────────────────────────────────────
      } else if (currentScreen === 'arena') {
        this._syncArenaState(room);
      }

    } catch (err) {
      this._pollErrorCount++;
      console.warn(`[Multiplayer] Poll error #${this._pollErrorCount}:`, err.message);
      if (this._pollErrorCount >= this.MAX_POLL_ERRORS) {
        this._stopPolling();
        this._handleConnectionError();
      }
    }
  },

  // ============================================================================
  // WAITING ROOM UI UPDATES
  // ============================================================================

  /**
   * Called when guest has joined the room — update waiting room UI
   */
  _onGuestJoined(room) {
    this._updateGuestSlotJoined(room);

    // Host: store opponent info and show Start button
    if (this.state.role === 'host') {
      this.state.opponentName   = room.guest_name;
      this.state.opponentAvatar = room.guest_avatar;
      const btnStart = document.getElementById('mp-btn-start-match');
      if (btnStart) btnStart.classList.remove('hidden');

      // Update badge
      const badgeEl = document.querySelector('#mp-screen-waiting .mp-badge-tag');
      if (badgeEl) badgeEl.innerHTML = '✅ Player Joined &bull; Host Can Start Match!';
    }
  },

  /**
   * Update the guest slot in the waiting room to show joined player
   */
  _updateGuestSlotJoined(room) {
    const guestSlot = document.querySelector('#mp-screen-waiting .guest-slot');
    if (!guestSlot) return;

    const avatarEl = guestSlot.querySelector('.slot-avatar');
    const nameEl   = guestSlot.querySelector('.slot-name');
    const statusEl = guestSlot.querySelector('.slot-status');

    if (avatarEl) {
      avatarEl.classList.remove('pending');
      if (window.AvatarHelper) {
        avatarEl.innerHTML = AvatarHelper.render(room.guest_avatar || 'avatar-2', 40, 'avatar-img');
      } else {
        avatarEl.textContent = '🦍';
      }
    }
    if (nameEl) {
      nameEl.textContent = room.guest_name || 'Challenger';
      nameEl.classList.remove('text-muted');
    }
    if (statusEl) {
      statusEl.textContent = 'Player Joined';
      statusEl.className = 'slot-status ready';
    }
  },

  // ============================================================================
  // ARENA TRANSITION & RENDERING
  // ============================================================================

  /**
   * Transitions from waiting room to arena, populates all fighter HUD elements
   */
  _transitionToArena(room) {
    this.state.gameOver   = false;
    this.state.currentPuzzle = {
      question: room.current_puzzle_question,
      solution: parseInt(room.current_puzzle_solution, 10)
    };

    // Populate fighter HUD – P1 is always host, P2 is always guest
    this._populateArenaHUD(room);

    // Load puzzle image
    this._loadArenaPuzzle(room.current_puzzle_question);

    // Clear event banner
    const bannerEl = document.getElementById('mp-event-banner');
    if (bannerEl) {
      bannerEl.textContent = '⚔️ Match Started! First to lose 3 health bars loses!';
      bannerEl.className = 'mp-event-banner';
    }

    // Reset answer input
    const input = document.getElementById('mp-answer-input');
    if (input) { input.value = ''; input.focus(); }

    this._showScreen('arena');
    this._startPolling(); // Resume polling for arena sync
  },

  /**
   * Populate both fighter cards in the arena HUD
   */
  _populateArenaHUD(room) {
    // Player 1 (Host) — always LEFT card
    const p1AvatarEl = document.getElementById('mp-arena-p1-avatar');
    const p1NameEl   = document.getElementById('mp-arena-p1-name');
    const p1TagEl    = document.getElementById('mp-arena-p1-tag');
    const p1ScoreEl  = document.getElementById('mp-arena-p1-score');

    if (p1AvatarEl && window.AvatarHelper) {
      p1AvatarEl.innerHTML = AvatarHelper.render(room.host_avatar || 'avatar-1', 40, 'avatar-img');
    }
    if (p1NameEl) p1NameEl.textContent = room.host_name || 'Player 1';
    if (p1TagEl)  p1TagEl.textContent  = this.state.role === 'host' ? 'YOU (HOST)' : 'HOST';
    if (p1ScoreEl) p1ScoreEl.textContent = `${room.host_score || 0} PTS`;

    // Player 2 (Guest) — always RIGHT card
    const p2AvatarEl = document.getElementById('mp-arena-p2-avatar');
    const p2NameEl   = document.getElementById('mp-arena-p2-name');
    const p2TagEl    = document.getElementById('mp-arena-p2-tag');
    const p2ScoreEl  = document.getElementById('mp-arena-p2-score');

    if (p2AvatarEl && window.AvatarHelper) {
      p2AvatarEl.innerHTML = AvatarHelper.render(room.guest_avatar || 'avatar-2', 40, 'avatar-img');
    }
    if (p2NameEl) p2NameEl.textContent = room.guest_name || 'Player 2';
    if (p2TagEl)  p2TagEl.textContent  = this.state.role === 'guest' ? 'YOU (CHALLENGER)' : 'CHALLENGER';
    if (p2ScoreEl) p2ScoreEl.textContent = `${room.guest_score || 0} PTS`;

    // HP bars
    this._renderHP('p1', parseInt(room.host_hp, 10));
    this._renderHP('p2', parseInt(room.guest_hp, 10));

    // Round indicator
    const roundEl = document.getElementById('mp-arena-round');
    if (roundEl) roundEl.textContent = `ROUND ${room.puzzle_number || 1}`;
  },

  /**
   * Asynchronously loads the puzzle image into the arena CRT monitor
   */
  _loadArenaPuzzle(imgUrl) {
    const loader    = document.getElementById('mp-puzzle-loader');
    const imgEl     = document.getElementById('mp-puzzle-image');

    if (!imgUrl) return;

    this.state.puzzleImageLoaded = false;
    if (loader) loader.classList.remove('hidden');
    if (imgEl)  imgEl.classList.add('opacity-0');

    const temp = new Image();
    temp.onload = () => {
      if (imgEl) {
        imgEl.src = imgUrl;
        imgEl.classList.remove('opacity-0');
      }
      if (loader) loader.classList.add('hidden');
      this.state.puzzleImageLoaded = true;
    };
    temp.onerror = () => {
      // Still show even if broken
      if (imgEl) {
        imgEl.src = imgUrl;
        imgEl.classList.remove('opacity-0');
      }
      if (loader) loader.classList.add('hidden');
      this.state.puzzleImageLoaded = true;
    };
    temp.src = imgUrl;
  },

  // ============================================================================
  // ARENA SYNC (Polling Reactions)
  // ============================================================================

  /**
   * Called on every poll tick while arena is active.
   * Detects state changes (HP, score, new puzzle, game over) and updates UI.
   */
  _syncArenaState(room) {
    if (this.state.gameOver) return;

    // ── Check for game over ──────────────────────────────────────────────────
    if (room.status === 'finished') {
      this._stopPolling();
      this.state.gameOver = true;
      this._showBattleOverModal(room);
      return;
    }

    // ── Update scores ────────────────────────────────────────────────────────
    const p1ScoreEl = document.getElementById('mp-arena-p1-score');
    const p2ScoreEl = document.getElementById('mp-arena-p2-score');
    if (p1ScoreEl) p1ScoreEl.textContent = `${room.host_score || 0} PTS`;
    if (p2ScoreEl) p2ScoreEl.textContent = `${room.guest_score || 0} PTS`;

    // ── Update HP bars (smooth transitions) ──────────────────────────────────
    this._renderHP('p1', parseInt(room.host_hp, 10));
    this._renderHP('p2', parseInt(room.guest_hp, 10));

    // ── Update round number ───────────────────────────────────────────────────
    const roundEl = document.getElementById('mp-arena-round');
    if (roundEl) roundEl.textContent = `ROUND ${room.puzzle_number || 1}`;

    // ── Sync event banner if message changed ──────────────────────────────────
    if (room.last_event_msg && room.last_event_msg !== this.state.lastEventMsg) {
      this.state.lastEventMsg = room.last_event_msg;
      this._updateEventBanner(room.last_event_msg);
    }

    // ── Sync puzzle image if question changed (opponent may have advanced it) ─
    const serverPuzzle = room.current_puzzle_question;
    if (serverPuzzle && this.state.currentPuzzle &&
        serverPuzzle !== this.state.currentPuzzle.question) {
      this.state.currentPuzzle = {
        question: room.current_puzzle_question,
        solution: parseInt(room.current_puzzle_solution, 10)
      };
      this._loadArenaPuzzle(serverPuzzle);
    }
  },

  // ============================================================================
  // ANSWER SUBMISSION
  // ============================================================================

  /**
   * [EVENT-DRIVEN] Player submits an answer — sends to server for validation
   */
  async _handleSubmitAnswer() {
    if (this.state.isSubmitting || this.state.gameOver) return;
    if (this._currentScreen() !== 'arena') return;

    const input  = document.getElementById('mp-answer-input');
    const answer = input ? input.value.trim() : '';

    if (answer === '') return;

    const numAnswer = parseInt(answer, 10);
    if (isNaN(numAnswer) || numAnswer < 0 || numAnswer > 9) {
      this._updateEventBanner('⚠️ Enter a digit from 0 to 9!');
      return;
    }

    this.state.isSubmitting = true;

    // Visually disable submit during network round-trip
    const btnAttack = document.getElementById('mp-btn-attack');
    if (btnAttack) { btnAttack.disabled = true; btnAttack.innerHTML = '<span>⏳ Checking...</span>'; }

    try {
      const res = await Api.multiplayer.sendAction(
        this.state.roomCode,
        this.state.role,
        'submit_answer',
        { answer: numAnswer }
      );

      if (!res.success) throw new Error(res.error || 'Server error');

      const room = res.room;

      // Clear input immediately
      if (input) { input.value = ''; }

      // Determine if our answer was correct
      // Server updates puzzle question on correct answers, HP on wrong answers
      const prevPuzzle = this.state.currentPuzzle;
      const newPuzzle  = room.current_puzzle_question;
      const isCorrect  = prevPuzzle && newPuzzle !== prevPuzzle.question;

      if (window.App) {
        if (isCorrect) {
          window.App.playSound('correct');
        } else {
          window.App.playSound('wrong');
        }
      }

      // Update puzzle cache
      this.state.currentPuzzle = {
        question: room.current_puzzle_question,
        solution: parseInt(room.current_puzzle_solution, 10)
      };

      // Update UI from server response
      this._syncArenaState(room);

      // Load new puzzle if it changed
      if (isCorrect && newPuzzle) {
        this._loadArenaPuzzle(newPuzzle);
      }

    } catch (err) {
      console.error('[Multiplayer] Submit answer error:', err);
      this._updateEventBanner('⚠️ Connection error. Try again!');
    } finally {
      this.state.isSubmitting = false;
      if (btnAttack) { btnAttack.disabled = false; btnAttack.innerHTML = '<span>⚔️ STRIKE!</span>'; }
      if (input) input.focus();
    }
  },

  // ============================================================================
  // GAME OVER MODAL
  // ============================================================================

  /**
   * Renders the Battle Over modal with winner/loser information
   */
  _showBattleOverModal(room) {
    if (window.App) window.App.playSound('gameover');

    const isHost  = this.state.role === 'host';
    const myName  = isHost ? room.host_name  : room.guest_name;
    const oppName = isHost ? room.guest_name : room.host_name;
    const myHP    = isHost ? parseInt(room.host_hp, 10)  : parseInt(room.guest_hp, 10);
    const oppHP   = isHost ? parseInt(room.guest_hp, 10) : parseInt(room.host_hp, 10);
    const myScore = isHost ? room.host_score : room.guest_score;

    const winner    = room.winner || '';
    const didIWin   = winner === myName;

    // Outcome badge (victory or defeat)
    const outcomeBadge = document.getElementById('mp-outcome-badge');
    if (outcomeBadge) {
      outcomeBadge.textContent = didIWin ? '🏆 VICTORY!' : '💀 DEFEATED!';
      outcomeBadge.className   = `gameover-title ${didIWin ? 'victory' : 'defeat'}`;
    }

    // Winner avatar
    const winnerAvatarEl = document.getElementById('mp-winner-avatar');
    if (winnerAvatarEl) {
      const winnerAvatarId = didIWin
        ? (isHost ? room.host_avatar : room.guest_avatar)
        : (isHost ? room.guest_avatar : room.host_avatar);
      if (window.AvatarHelper) {
        winnerAvatarEl.innerHTML = AvatarHelper.render(winnerAvatarId || 'avatar-1', 80, 'avatar-img');
      } else {
        winnerAvatarEl.textContent = didIWin ? '🏆' : '💀';
      }
    }

    // Heading and reason
    const winnerHeading = document.getElementById('mp-winner-heading');
    const winnerReason  = document.getElementById('mp-winner-reason');
    if (winnerHeading) winnerHeading.textContent = `🏆 ${winner} Won the Match!`;
    if (winnerReason) {
      const loserName = winner === myName ? oppName : myName;
      winnerReason.textContent = `💀 ${loserName} lost all 3 health bars!`;
    }

    // Stats: Display final remaining lives of BOTH players
    const statRounds = document.getElementById('mp-stat-rounds');
    const statP1Lbl  = document.getElementById('mp-stat-p1-lbl');
    const statP1HP   = document.getElementById('mp-stat-p1-hp');
    const statP2Lbl  = document.getElementById('mp-stat-p2-lbl');
    const statP2HP   = document.getElementById('mp-stat-p2-hp');
    const statScore  = document.getElementById('mp-stat-myscore');

    const hostHP  = Math.max(0, parseInt(room.host_hp, 10));
    const guestHP = Math.max(0, parseInt(room.guest_hp, 10));

    if (statRounds) statRounds.textContent = room.puzzle_number || '1';
    if (statP1Lbl)  statP1Lbl.textContent  = `${room.host_name} (Host)`;
    if (statP1HP)   statP1HP.textContent   = hostHP > 0 ? ('❤️'.repeat(hostHP) + ` (${hostHP}/3)`) : '💀 0/3 HP';
    if (statP2Lbl)  statP2Lbl.textContent  = `${room.guest_name || 'Challenger'} (Guest)`;
    if (statP2HP)   statP2HP.textContent   = guestHP > 0 ? ('❤️'.repeat(guestHP) + ` (${guestHP}/3)`) : '💀 0/3 HP';
    if (statScore)  statScore.textContent  = `${myScore || 0} PTS`;

    // Show modal
    const modal = document.getElementById('mp-modal-battleover');
    if (modal) modal.classList.remove('hidden');
  },

  // ============================================================================
  // MATCH ACTIONS (Rematch, Leave, Exit)
  // ============================================================================

  /**
   * [EVENT-DRIVEN] Rematch: reset room and restart both players in arena
   */
  async _handleRematch() {
    const btn = document.getElementById('mp-btn-rematch');
    this._setButtonLoading(btn, true, '⏳ Starting rematch...');

    try {
      const res = await Api.multiplayer.sendAction(
        this.state.roomCode, this.state.role, 'rematch'
      );

      if (!res.success) throw new Error(res.error || 'Rematch failed.');

      const modal = document.getElementById('mp-modal-battleover');
      if (modal) modal.classList.add('hidden');

      this.state.gameOver = false;
      this.state.lastEventMsg = null;

      // Transition directly into arena with fresh state
      this._transitionToArena(res.room);

    } catch (err) {
      console.error('[Multiplayer] Rematch error:', err);
    } finally {
      this._setButtonLoading(btn, false, '🔄 REMATCH (RESET 3 HP)');
    }
  },

  /**
   * [EVENT-DRIVEN] Player surrenders mid-match
   */
  async _handleLeaveMatch() {
    if (!confirm('Are you sure you want to surrender and exit the match?')) return;

    this._stopPolling();
    try {
      await Api.multiplayer.sendAction(this.state.roomCode, this.state.role, 'leave');
    } catch (_) {}

    const modal = document.getElementById('mp-modal-battleover');
    if (modal) modal.classList.add('hidden');

    this._resetState();
    this._showScreen('lobby');
    this._refreshLobbyIdentity();
  },

  /**
   * Exit to dashboard from the battle-over modal
   */
  async _handleExitToLobby() {
    this._stopPolling();
    // Send leave if still in a room
    if (this.state.roomCode && this.state.role) {
      try {
        await Api.multiplayer.sendAction(this.state.roomCode, this.state.role, 'leave');
      } catch (_) {}
    }
    const modal = document.getElementById('mp-modal-battleover');
    if (modal) modal.classList.add('hidden');

    this._resetState();
    if (window.App) {
      window.App.showView('game');
    } else {
      this._showScreen('lobby');
      this._refreshLobbyIdentity();
    }
  },

  // ============================================================================
  // HP RENDERING
  // ============================================================================

  /**
   * Renders HP hearts and bar for a given player slot ('p1' = host, 'p2' = guest)
   */
  _renderHP(player, hp) {
    const heartsContainer = document.getElementById(`mp-${player}-hearts`);
    const hpText          = document.getElementById(`mp-${player}-hp-text`);
    const hpBar           = document.getElementById(`mp-${player}-hp-bar`);

    const clampedHP = Math.max(0, Math.min(3, hp));

    if (hpText) hpText.textContent = `${clampedHP} / 3 HP`;

    // Render hearts
    if (heartsContainer) {
      const hearts = heartsContainer.querySelectorAll('.heart-hp');
      hearts.forEach((heart, idx) => {
        const heartIndex = idx + 1; // 1-indexed
        if (heartIndex <= clampedHP) {
          if (!heart.classList.contains('active') || heart.classList.contains('lost')) {
            heart.className = 'heart-hp active';
          }
        } else {
          if (!heart.classList.contains('lost')) {
            // Trigger damage shake animation before going lost
            heart.classList.add('damage-shake');
            setTimeout(() => {
              heart.className = 'heart-hp lost';
            }, 600);
          }
        }
      });
    }

    // HP progress bar color
    if (hpBar) {
      const pct = (clampedHP / 3) * 100;
      hpBar.style.width = `${pct}%`;
      if (clampedHP <= 1) {
        hpBar.className = 'hp-bar-fill danger';
      } else if (clampedHP <= 2) {
        hpBar.className = 'hp-bar-fill warning';
      } else {
        hpBar.className = 'hp-bar-fill';
      }
    }
  },

  // ============================================================================
  // EVENT BANNER
  // ============================================================================

  /**
   * Updates the arena event banner with latest server message
   */
  _updateEventBanner(msg) {
    const bannerEl = document.getElementById('mp-event-banner');
    if (!bannerEl) return;

    bannerEl.textContent = msg;

    // Determine banner type from message content
    const isHit  = msg.includes('💔') || msg.includes('lost their final') || msg.includes('wrong');
    const isSolve = msg.includes('🎯') || msg.includes('correctly');

    bannerEl.className = `mp-event-banner ${isHit ? 'hit' : isSolve ? 'solve' : ''}`;

    // Remove animation class so it replays
    bannerEl.classList.remove('hit', 'solve');
    void bannerEl.offsetWidth; // Force reflow
    if (isHit)   bannerEl.classList.add('hit');
    if (isSolve) bannerEl.classList.add('solve');
  },

  // ============================================================================
  // SCREEN NAVIGATION
  // ============================================================================

  /**
   * Shows one of the multiplayer sub-screens ('lobby', 'waiting', 'arena')
   */
  _showScreen(name) {
    const screens = ['mp-screen-lobby', 'mp-screen-waiting', 'mp-screen-arena'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(`mp-screen-${name}`);
    if (target) target.classList.remove('hidden');
    this._currentScreenName = name;
  },

  /**
   * Returns the name of the currently visible multiplayer screen
   */
  _currentScreen() {
    return this._currentScreenName || 'lobby';
  },

  // ============================================================================
  // CONNECTION ERROR HANDLING
  // ============================================================================

  /**
   * Called when polling fails too many times consecutively
   */
  _handleConnectionError() {
    console.error('[Multiplayer] Lost connection to room. Returning to lobby.');
    const screen = this._currentScreen();

    if (screen === 'arena') {
      const bannerEl = document.getElementById('mp-event-banner');
      if (bannerEl) {
        bannerEl.textContent = '⚠️ Connection lost! Please return to lobby.';
        bannerEl.className = 'mp-event-banner hit';
      }
      // Give user time to see the error before redirecting
      setTimeout(() => {
        this._resetState();
        this._showScreen('lobby');
        const modal = document.getElementById('mp-modal-battleover');
        if (modal) modal.classList.add('hidden');
      }, 3000);
    } else if (screen === 'waiting') {
      this._resetState();
      this._showScreen('lobby');
    }
  },

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  /**
   * Resets all multiplayer session state
   */
  _resetState() {
    this._stopPolling();
    this.state.roomCode       = null;
    this.state.role           = null;
    this.state.myName         = null;
    this.state.myAvatar       = null;
    this.state.opponentName   = null;
    this.state.opponentAvatar = null;
    this.state.currentPuzzle  = null;
    this.state.lastEventMsg   = null;
    this.state.isSubmitting   = false;
    this.state.gameOver       = false;
    this.state.waitingForStart = false;
    this._pollErrorCount      = 0;
    this._currentScreenName   = 'lobby';
  },

  _showLobbyAlert(msg, type = 'error') {
    const alertEl = document.getElementById('mp-lobby-alert');
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className   = `mp-alert ${type}`;
    alertEl.classList.remove('hidden');
  },

  _hideLobbyAlert() {
    const alertEl = document.getElementById('mp-lobby-alert');
    if (alertEl) alertEl.classList.add('hidden');
  },

  _setButtonLoading(btn, loading, text) {
    if (!btn) return;
    btn.disabled = loading;
    if (text) btn.innerHTML = `<span>${text}</span>`;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────
window.Multiplayer = Multiplayer;
