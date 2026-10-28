/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: Client Authentication & Session Controller
 * Architecture: Frontend Controller
 * Purpose: Manages user login, registration, session persistence,
 *          and Virtual Identity UI presentation.
 * ============================================================================
 */

const Auth = {
  currentUser: null,

  /**
   * [EVENT-DRIVEN PROGRAMMING] Initializes authentication event handlers
   */
  init() {
    this.bindEvents();
    this.restoreSession();
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
          this.setLoading(true, 'Logging in...');
          const res = await Api.auth.login(username, password);
          this.setCurrentUser(res.user);
          this.showMessage('Welcome back, ' + res.user.username + '! 🎮', 'success');
          
          // Switch to Game View
          if (window.App) window.App.showView('game');
        } catch (error) {
          this.showMessage(error.message, 'error');
        } finally {
          this.setLoading(false);
        }
      });
    }

    // Register Form Submit Event
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
          const res = await Api.auth.register(username, password);
          this.setCurrentUser(res.user);
          this.showMessage('Registration successful! Welcome, ' + res.user.username + ' 🍌', 'success');
          
          // Switch to Game View
          if (window.App) window.App.showView('game');
        } catch (error) {
          this.showMessage(error.message, 'error');
        } finally {
          this.setLoading(false);
        }
      });
    }

    // Logout Button Click Event
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
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
   * [VIRTUAL IDENTITY] Validates and restores stored session on page load
   */
  async restoreSession() {
    const token = Api.getToken();
    if (!token) {
      this.updateUI(null);
      return;
    }

    try {
      const res = await Api.auth.getMe();
      if (res && res.user) {
        this.setCurrentUser(res.user);
        console.log('[VIRTUAL IDENTITY] Session restored for user:', res.user.username);
      }
    } catch (error) {
      console.warn('[VIRTUAL IDENTITY] Stored token invalid or expired. Clearing session.');
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
   * [VIRTUAL IDENTITY] Updates user badge and navigation state
   */
  updateUI(user) {
    const guestNav = document.getElementById('nav-guest');
    const userNav = document.getElementById('nav-user');
    const usernameBadge = document.getElementById('badge-username');
    const userHighScore = document.getElementById('badge-highscore');
    const playerAvatar = document.getElementById('player-avatar');

    if (user) {
      if (guestNav) guestNav.classList.add('hidden');
      if (userNav) userNav.classList.remove('hidden');
      if (usernameBadge) usernameBadge.textContent = user.username;
      if (playerAvatar) playerAvatar.textContent = user.username.charAt(0).toUpperCase();

      const pb = user.stats?.high_score || 0;
      if (userHighScore) userHighScore.textContent = `PB: ${pb} pts`;
    } else {
      if (guestNav) guestNav.classList.remove('hidden');
      if (userNav) userNav.classList.add('hidden');
      if (usernameBadge) usernameBadge.textContent = 'Guest Player';
    }
  },

  /**
   * [VIRTUAL IDENTITY] Logs out user and clears identity session
   */
  logout() {
    Api.auth.logout();
    this.currentUser = null;
    this.updateUI(null);
    this.showMessage('You have logged out successfully.', 'info');
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

  clearMessages() {
    const box = document.getElementById('auth-message');
    if (box) {
      box.textContent = '';
      box.className = 'message-box hidden';
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
