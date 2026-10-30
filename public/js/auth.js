/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: Client Authentication & Session Controller
 * Architecture: Frontend Controller
 * Purpose: Manages user login, registration, session persistence (PHP Sessions & Cookies),
 *          avatar selection (10 arcade avatars), and Virtual Identity presentation.
 * ============================================================================
 */

const Auth = {
  currentUser: null,
  selectedRegisterAvatar: 'avatar-1',
  selectedWardrobeAvatar: 'avatar-1',

  /**
   * [EVENT-DRIVEN PROGRAMMING] Initializes authentication event handlers & avatars
   */
  init() {
    this.renderRegisterAvatars();
    this.bindEvents();
    this.restoreSession();
  },

  /**
   * Mounts the 10-Avatar grid selector on the registration form
   */
  renderRegisterAvatars() {
    const container = document.getElementById('register-avatar-picker');
    if (container && window.AvatarHelper) {
      AvatarHelper.renderGrid(container, this.selectedRegisterAvatar, (newAvatarId) => {
        this.selectedRegisterAvatar = newAvatarId;
        if (window.Sound) Sound.playKeypad();
      });
    }
  },

  /**
   * [EVENT-DRIVEN PROGRAMMING] Attach DOM event listeners for Auth components
   */
  bindEvents() {
    // Tab toggles between Login and Register
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        this.clearMessages();
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
        this.renderRegisterAvatars();
        this.clearMessages();
      });
    }

    // Login Form Submit Event
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
          this.showMessage('Please enter both username and password.', 'error');
          return;
        }

        try {
          this.setLoading(true, 'Verifying identity...');
          const res = await Api.auth.login(username, password);
          this.setCurrentUser(res.user);
          this.showMessage('Welcome back, ' + res.user.username + '! 🎮', 'success');
          
          if (window.Sound) Sound.playCorrect();
          // Switch to Game View
          if (window.App) window.App.showView('game');
        } catch (error) {
          this.showMessage(error.message, 'error');
          if (window.Sound) Sound.playIncorrect();
        } finally {
          this.setLoading(false);
        }
      });
    }

    // Register Form Submit Event (with selected avatar)
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (password !== confirm) {
          this.showMessage('Passwords do not match.', 'error');
          return;
        }

        if (password.length < 6) {
          this.showMessage('Password must be at least 6 characters.', 'error');
          return;
        }

        try {
          this.setLoading(true, 'Creating virtual identity...');
          const res = await Api.auth.register(username, password, this.selectedRegisterAvatar);
          this.setCurrentUser(res.user);
          this.showMessage('Virtual identity created! Welcome, ' + res.user.username + ' 🍌', 'success');
          
          if (window.Sound) Sound.playFanfare();
          // Switch to Game View
          if (window.App) window.App.showView('game');
        } catch (error) {
          this.showMessage(error.message, 'error');
          if (window.Sound) Sound.playIncorrect();
        } finally {
          this.setLoading(false);
        }
      });
    }

    // Header Logout Button Click Event
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Profile View Logout Button
    const profileLogoutBtn = document.getElementById('btn-profile-logout');
    if (profileLogoutBtn) {
      profileLogoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Profile View Play Game Button
    const profilePlayBtn = document.getElementById('btn-profile-play');
    if (profilePlayBtn) {
      profilePlayBtn.addEventListener('click', () => {
        if (window.App) window.App.showView('game');
      });
    }

    // Avatar Wardrobe Save Button
    const btnSaveAvatar = document.getElementById('btn-save-avatar');
    if (btnSaveAvatar) {
      btnSaveAvatar.addEventListener('click', async () => {
        if (!this.currentUser) return;
        try {
          btnSaveAvatar.disabled = true;
          btnSaveAvatar.textContent = 'Saving Avatar...';
          const res = await Api.auth.updateAvatar(this.selectedWardrobeAvatar);
          this.currentUser.avatar = res.avatar;
          this.updateUI(this.currentUser);
          this.showWardrobeMessage('Avatar updated successfully! Your identity is customized. 🍌', 'success');
          if (window.Sound) Sound.playCorrect();
        } catch (err) {
          this.showWardrobeMessage(err.message || 'Failed to update avatar.', 'error');
          if (window.Sound) Sound.playIncorrect();
        } finally {
          btnSaveAvatar.disabled = false;
          btnSaveAvatar.textContent = 'SAVE AVATAR CHANGE';
        }
      });
    }

    // Switch account button inside game view
    const switchAccountBtn = document.getElementById('btn-switch-account');
    if (switchAccountBtn) {
      switchAccountBtn.addEventListener('click', () => {
        if (window.App) window.App.showView('auth');
      });
    }
  },

  /**
   * [VIRTUAL IDENTITY] Validates and restores stored session & cookies on page load
   */
  async restoreSession() {
    try {
      // getMe checks both Authorization Bearer header AND native PHP Session / Cookies
      const res = await Api.auth.getMe();
      if (res && res.user) {
        this.setCurrentUser(res.user);
        console.log('[VIRTUAL IDENTITY] Session restored via PHP Session/Cookie/Token:', res.user.username);
      } else {
        this.updateUI(null);
      }
    } catch (error) {
      // Guest player state
      Api.clearToken();
      this.updateUI(null);
    }
  },

  /**
   * Updates state and UI with active Virtual Identity
   */
  setCurrentUser(user) {
    this.currentUser = user;
    this.updateUI(user);
    if (window.App && user) {
      window.App.onUserAuthenticated(user);
    }
  },

  /**
   * [VIRTUAL IDENTITY] Updates user badge, avatar, and navigation state
   */
  updateUI(user) {
    const guestNav = document.getElementById('nav-guest');
    const userNav = document.getElementById('nav-user');
    const usernameBadge = document.getElementById('badge-username');
    const userHighScore = document.getElementById('badge-highscore');
    const playerAvatar = document.getElementById('player-avatar');

    const authGuestBox = document.getElementById('auth-guest-box');
    const authProfileBox = document.getElementById('auth-profile-box');

    if (user) {
      const avatarId = user.avatar || 'avatar-1';
      this.selectedWardrobeAvatar = avatarId;

      if (guestNav) guestNav.classList.add('hidden');
      if (userNav) userNav.classList.remove('hidden');
      if (usernameBadge) usernameBadge.textContent = user.username;

      // Render player avatar in header
      if (playerAvatar && window.AvatarHelper) {
        playerAvatar.innerHTML = AvatarHelper.render(avatarId, 36);
      }

      const pb = user.stats?.high_score || 0;
      if (userHighScore) userHighScore.textContent = `PB: ${pb} pts`;

      // Show Profile Card, hide Guest registration/login forms
      if (authGuestBox) authGuestBox.classList.add('hidden');
      if (authProfileBox) {
        authProfileBox.classList.remove('hidden');

        // Populate Profile Card Elements
        const profileAvatarDisplay = document.getElementById('profile-avatar-display');
        const profileUsernameDisplay = document.getElementById('profile-username-display');
        const profileMemberSince = document.getElementById('profile-member-since');
        const statHighscore = document.getElementById('profile-stat-highscore');
        const statGames = document.getElementById('profile-stat-games');
        const statPuzzles = document.getElementById('profile-stat-puzzles');

        if (profileAvatarDisplay && window.AvatarHelper) {
          profileAvatarDisplay.innerHTML = AvatarHelper.render(avatarId, 84);
        }
        if (profileUsernameDisplay) profileUsernameDisplay.textContent = user.username;
        if (profileMemberSince && user.createdAt) {
          profileMemberSince.textContent = `Registered: ${new Date(user.createdAt).toLocaleDateString()}`;
        }
        if (statHighscore) statHighscore.textContent = user.stats?.high_score || 0;
        if (statGames) statGames.textContent = user.stats?.games_played || 0;
        if (statPuzzles) statPuzzles.textContent = user.stats?.total_puzzles || 0;

        // Render in-profile Avatar Wardrobe
        const wardrobeSelector = document.getElementById('profile-avatar-selector');
        if (wardrobeSelector && window.AvatarHelper) {
          AvatarHelper.renderGrid(wardrobeSelector, avatarId, (newId) => {
            this.selectedWardrobeAvatar = newId;
            if (window.Sound) Sound.playKeypad();
          });
        }
      }
    } else {
      if (guestNav) guestNav.classList.remove('hidden');
      if (userNav) userNav.classList.add('hidden');
      if (usernameBadge) usernameBadge.textContent = 'Guest Player';
      if (playerAvatar) playerAvatar.innerHTML = '🍌';

      // Show Guest registration/login forms, hide Profile Card
      if (authGuestBox) authGuestBox.classList.remove('hidden');
      if (authProfileBox) authProfileBox.classList.add('hidden');
      this.renderRegisterAvatars();
    }
  },

  /**
   * [VIRTUAL IDENTITY] Logs out user and clears identity session & cookies
   */
  async logout() {
    await Api.auth.logout();
    this.currentUser = null;
    this.updateUI(null);
    this.showMessage('You have logged out successfully. Sessions & cookies cleared.', 'info');
    if (window.App) {
      window.App.showView('auth');
      window.App.resetGame();
    }
  },

  showMessage(msg, type = 'info') {
    const box = document.getElementById('auth-message');
    if (!box) return;
    box.textContent = msg;
    box.className = `message-box ${type}`;
    box.classList.remove('hidden');
  },

  showWardrobeMessage(msg, type = 'info') {
    const box = document.getElementById('profile-wardrobe-msg');
    if (!box) return;
    box.textContent = msg;
    box.className = `message-box ${type}`;
    box.classList.remove('hidden');
  },

  clearMessages() {
    const box = document.getElementById('auth-message');
    if (box) {
      box.textContent = '';
      box.className = 'message-box hidden';
    }
    const wardrobeBox = document.getElementById('profile-wardrobe-msg');
    if (wardrobeBox) {
      wardrobeBox.textContent = '';
      wardrobeBox.className = 'message-box hidden';
    }
  },

  setLoading(isLoading, text = 'Loading...') {
    const submitBtns = document.querySelectorAll('#form-login button[type="submit"], #form-register button[type="submit"]');
    submitBtns.forEach(btn => {
      btn.disabled = isLoading;
      if (isLoading) {
        btn.dataset.origText = btn.textContent;
        btn.textContent = text;
      } else if (btn.dataset.origText) {
        btn.textContent = btn.dataset.origText;
      }
    });
  }
};

window.Auth = Auth;
