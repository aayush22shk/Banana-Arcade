/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: Arcade Avatar System
 * Purpose: Defines the 10 available Virtual Identity arcade avatars,
 *          rendering helpers, and interactive selector components.
 * ============================================================================
 */

const AVATARS = [
  { id: 'avatar-1',  name: 'Banana Hero',   icon: '🍌', file: 'avatar-1.svg',  title: 'Arcade Rookie' },
  { id: 'avatar-2',  name: 'Cyber Kong',    icon: '🦍', file: 'avatar-2.svg',  title: 'Jungle Hacker' },
  { id: 'avatar-3',  name: 'Retro Bot',     icon: '🤖', file: 'avatar-3.svg',  title: 'Logic Machine' },
  { id: 'avatar-4',  name: 'Pixel Invader', icon: '👾', file: 'avatar-4.svg',  title: 'Space Glitch' },
  { id: 'avatar-5',  name: 'Neon Fox',      icon: '🦊', file: 'avatar-5.svg',  title: 'Speed Runner' },
  { id: 'avatar-6',  name: 'Laser Tiger',   icon: '🐯', file: 'avatar-6.svg',  title: 'Claw Striker' },
  { id: 'avatar-7',  name: 'Astro Pilot',   icon: '🚀', file: 'avatar-7.svg',  title: 'Star Voyager' },
  { id: 'avatar-8',  name: 'Shadow Ninja',  icon: '🥷', file: 'avatar-8.svg',  title: 'Stealth Coder' },
  { id: 'avatar-9',  name: 'Cyber Mage',    icon: '🧙', file: 'avatar-9.svg',  title: 'Byte Sorcerer' },
  { id: 'avatar-10', name: 'Banana King',   icon: '👑', file: 'avatar-10.svg', title: 'Arcade Royalty' }
];

const AvatarHelper = {
  list: AVATARS,

  /**
   * Look up an avatar by its unique ID with fallback
   */
  get(avatarId) {
    return AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  },

  /**
   * Computes the relative or absolute URL path to an avatar SVG
   */
  getUrl(avatarId) {
    const avatar = this.get(avatarId);
    // Support subdirectory deployments (e.g. /BananaAPI)
    const base = window.location.pathname.startsWith('/BananaAPI') || window.location.pathname.startsWith('/bananaapi')
      ? '/BananaAPI'
      : '';
    return `${base}/assets/avatars/${avatar.file}`;
  },

  /**
   * Generates an HTML snippet rendering an avatar icon
   */
  render(avatarId, size = 40, className = 'avatar-img') {
    const avatar = this.get(avatarId);
    const url = this.getUrl(avatarId);
    return `<img src="${url}" alt="${avatar.name}" class="${className}" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'avatar-fallback\\'>${avatar.icon}</span>';" />`;
  },

  /**
   * Renders the 10-Avatar interactive grid selector inside a container
   */
  renderGrid(containerEl, currentSelectedId = 'avatar-1', onSelect = null) {
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="avatar-grid-wrapper">
        <label class="input-label" style="margin-bottom: 8px; display: block;">
          Choose Your Virtual Avatar (10 Arcade Characters):
        </label>
        <div class="avatar-grid">
          ${AVATARS.map(avatar => {
            const isSelected = avatar.id === currentSelectedId;
            const url = this.getUrl(avatar.id);
            return `
              <button 
                type="button" 
                class="avatar-option ${isSelected ? 'selected' : ''}" 
                data-avatar-id="${avatar.id}"
                title="${avatar.name} - ${avatar.title}"
              >
                <img src="${url}" alt="${avatar.name}" class="avatar-option-img" />
                <span class="avatar-option-name">${avatar.name}</span>
                <span class="avatar-check-badge">✓</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Attach click events to each avatar button
    const buttons = containerEl.querySelectorAll('.avatar-option');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        buttons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const selectedId = btn.dataset.avatarId;
        if (typeof onSelect === 'function') {
          onSelect(selectedId);
        }
      });
    });
  }
};

window.AVATARS = AVATARS;
window.AvatarHelper = AvatarHelper;
