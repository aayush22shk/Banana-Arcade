/**
 * ============================================================================
 * [COMBO & STREAK ANIMATION SYSTEM]: Candy Crush-Style Feedback Engine
 * Architecture: Frontend Animation & State Module
 * Purpose: Handles real-time consecutive answer streaks, dynamic multipliers,
 *          energetic pop-up animations, particle bursts, and arcade sound effects.
 * ============================================================================
 */

const ComboManager = {
  // Sound synthesizer reference
  soundEnabled: true,

  /**
   * Returns the score multiplier corresponding to the streak count
   * Multiplier Rules:
   * - 3–4 streak: 1.5x score
   * - 5–6 streak: 2x score
   * - 7–9 streak: 2.5x score
   * - 10+ streak: 3x score
   */
  getMultiplier(streak) {
    if (streak >= 10) return 3.0;
    if (streak >= 7)  return 2.5;
    if (streak >= 5)  return 2.0;
    if (streak >= 3)  return 1.5;
    return 1.0;
  },

  /**
   * Returns milestone configuration if current streak qualifies for an exciting burst
   */
  getMilestone(streak) {
    if (streak === 2) {
      return {
        level: 2,
        title: 'NICE!',
        sub: '2 IN A ROW',
        tier: 'nice',
        color: '#00f2fe',
        glow: 'rgba(0, 242, 254, 0.8)',
        particles: 12,
        sound: 'combo_nice'
      };
    }
    if (streak === 3) {
      return {
        level: 3,
        title: 'COMBO x3!',
        sub: '1.5x MULTIPLIER ACTIVE',
        tier: 'combo',
        color: '#00e676',
        glow: 'rgba(0, 230, 118, 0.9)',
        particles: 18,
        sound: 'combo_3'
      };
    }
    if (streak === 5) {
      return {
        level: 5,
        title: 'AMAZING x5!',
        sub: '2.0x DOUBLE POINTS',
        tier: 'amazing',
        color: '#ffe135',
        glow: 'rgba(255, 225, 53, 0.95)',
        particles: 24,
        sound: 'combo_5'
      };
    }
    if (streak === 7) {
      return {
        level: 7,
        title: 'FANTASTIC x7!',
        sub: '2.5x MEGA MULTIPLIER',
        tier: 'fantastic',
        color: '#ff007f',
        glow: 'rgba(255, 0, 127, 0.95)',
        particles: 30,
        sound: 'combo_7'
      };
    }
    if (streak >= 10 && streak % 5 === 0 || streak === 10) {
      const isGod = streak >= 20;
      return {
        level: streak,
        title: isGod ? `BANANA GOD x${streak}!` : `UNSTOPPABLE x${streak}!`,
        sub: '3.0x MAXIMUM MULTIPLIER',
        tier: isGod ? 'god' : 'unstoppable',
        color: isGod ? '#ffea00' : '#ff1744',
        glow: isGod ? 'rgba(255, 234, 0, 1)' : 'rgba(255, 23, 68, 1)',
        particles: 40,
        sound: 'combo_10',
        screenShake: true
      };
    }
    return null;
  },

  /**
   * Triggers the candy-crush style burst animation on screen
   */
  trigger(streak, playerLabel = null) {
    const milestone = this.getMilestone(streak);
    if (!milestone) return;

    // Play milestone sound
    if (window.App && typeof App.playSound === 'function') {
      App.playSound(milestone.sound);
    }

    const container = document.getElementById('combo-fx-container');
    if (!container) return;

    // Screen shake on higher tiers
    if (milestone.screenShake) {
      document.body.classList.add('combo-screen-shake');
      setTimeout(() => document.body.classList.remove('combo-screen-shake'), 600);
    }

    // Create main combo badge
    const badge = document.createElement('div');
    badge.className = `combo-banner combo-tier-${milestone.tier}`;
    badge.style.setProperty('--combo-color', milestone.color);
    badge.style.setProperty('--combo-glow', milestone.glow);

    const subText = playerLabel ? `${playerLabel} • ${milestone.sub}` : milestone.sub;

    badge.innerHTML = `
      <div class="combo-halo"></div>
      <div class="combo-ribbon-tag">${subText}</div>
      <div class="combo-title-text">${milestone.title}</div>
      <div class="combo-multiplier-pill">${this.getMultiplier(streak)}x SCORE ACTIVE</div>
    `;

    container.appendChild(badge);

    // Spawn energetic star particles radiating from center
    this._spawnParticles(container, milestone.particles, milestone.color);

    // Remove badge after animation completes
    setTimeout(() => {
      badge.classList.add('fade-out');
      setTimeout(() => {
        if (badge.parentNode) badge.parentNode.removeChild(badge);
      }, 400);
    }, 1200);
  },

  /**
   * Spawns bursting particles radiating outward from center
   */
  _spawnParticles(container, count, color) {
    const symbols = ['⭐', '✨', '🍌', '💥', '✦', '★'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'combo-particle';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const distance = 80 + Math.random() * 180;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const rot = (Math.random() - 0.5) * 720;
      const sym = symbols[Math.floor(Math.random() * symbols.length)];

      p.textContent = sym;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.setProperty('--rot', `${rot}deg`);
      p.style.setProperty('--pcolor', color);
      p.style.left = '50%';
      p.style.top = '50%';

      container.appendChild(p);
      setTimeout(() => {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 1000);
    }
  }
};

window.ComboManager = ComboManager;

