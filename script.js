// Theme toggle: Saving your visual preference
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) root.classList.add('dark');

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.classList.toggle('dark');
      localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
    });
  });

  // GitHub Heatmap: Fetching my recent coding activity
  const cells = document.getElementById('heatCells');
  const months = document.getElementById('heatMonths');
  if (cells && months) {
    const WEEKS = 53;
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Visual placeholder for when the API is taking a nap
    function fallbackLevel(w, d) {
      const v = (Math.sin(w * 12.9898 + d * 78.233) * 43758.5453) % 1;
      const r = Math.abs(v);
      if (r < 0.55) return 0;
      if (r < 0.75) return 1;
      if (r < 0.88) return 2;
      if (r < 0.96) return 3;
      return 4;
    }

    function renderHeatmap(data) {
      let monthsHtml = '';
      for (let w = 0; w < WEEKS; w++) {
        const idx = Math.floor((w / WEEKS) * 12);
        const prev = w === 0 ? -1 : Math.floor(((w - 1) / WEEKS) * 12);
        monthsHtml += `<span>${idx !== prev ? MONTHS[idx] : ''}</span>`;
      }
      months.innerHTML = monthsHtml;

      let cellsHtml = '';
      // data format expected: array of 53 weeks, each containing 7 days of contribution levels (0-4)
      for (let w = 0; w < WEEKS; w++) {
        cellsHtml += '<div class="heat-week">';
        for (let d = 0; d < 7; d++) {
          let levelVal = fallbackLevel(w, d);
          if (data && data[w] && data[w][d] !== undefined) {
            levelVal = data[w][d];
          }
          cellsHtml += `<div class="heat-cell h${levelVal}"></div>`;
        }
        cellsHtml += '</div>';
      }
      cells.innerHTML = cellsHtml;
    }

    // The real deal: Fetching live data from GitHub
    fetch('https://github-contributions-api.deno.dev/aspartic-gthb.json')
      .then(res => res.json())
      .then(resData => {
        // Create 53x7 array
        let weeks = Array.from({ length: WEEKS }, () => Array(7).fill(0));

        const levelMap = {
          'NONE': 0,
          'FIRST_QUARTILE': 1,
          'SECOND_QUARTILE': 2,
          'THIRD_QUARTILE': 3,
          'FOURTH_QUARTILE': 4
        };

        if (resData && resData.contributions) {
          let flatDays = [];
          for (let w = 0; w < resData.contributions.length; w++) {
            if (w >= WEEKS) break;
            for (let d = 0; d < resData.contributions[w].length; d++) {
              if (d >= 7) break;
              let dayData = resData.contributions[w][d];
              weeks[w][d] = levelMap[dayData.contributionLevel] || 0;
              flatDays.push(dayData);
            }
          }

          // Calculate total and streak
          let total = resData.totalContributions || 0;
          let streak = 0;
          if (flatDays.length > 0) {
            let i = flatDays.length - 1;
            if (flatDays[i].contributionCount === 0) {
              i--; // if today is 0, start from yesterday
            }
            while (i >= 0 && flatDays[i].contributionCount > 0) {
              streak++;
              i--;
            }
          }

          const heatTotalEl = document.getElementById('heatTotal');
          const heatStreakEl = document.getElementById('heatStreak');
          if (heatTotalEl) heatTotalEl.textContent = `${total} contributions in the last year`;
          if (heatStreakEl) {
            heatStreakEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-4 4-8z" /></svg> ${streak} day streak`;
          }
        }
        renderHeatmap(weeks);
      })
      .catch(err => {
        console.error("Failed to fetch github contributions", err);
        renderHeatmap(null); // use fallback on error
      });
  }
  // Music Status: Showing what's currently fueling my sessions via Last.fm
  const lastFmUser = typeof CONFIG !== 'undefined' ? CONFIG.LASTFM_USER : "asparticlistens";
  const lastFmKey = typeof CONFIG !== 'undefined' ? CONFIG.LASTFM_API_KEY : "";

  const spotifyEl = document.querySelector('.spotify');
  if (lastFmUser && lastFmKey && spotifyEl) {
    const updateSpotify = async () => {
      try {
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lastFmUser}&api_key=${lastFmKey}&format=json&limit=1`);
        const data = await res.json();

        if (!data.recenttracks || !data.recenttracks.track[0]) return;

        const track = data.recenttracks.track[0];
        const isPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';

        const titleEl = spotifyEl.querySelector('.title');
        const subEl = spotifyEl.querySelector('.sub');
        const imgEl = spotifyEl.querySelector('img');
        const labelEl = spotifyEl.querySelector('.label');
        const barsEl = spotifyEl.querySelector('.spotify-bars');

        if (titleEl) titleEl.textContent = track.name;
        if (subEl) subEl.textContent = `${track.artist['#text']} — ${track.album['#text']}`;
        if (imgEl) imgEl.src = track.image[2]['#text'] || 'assets/album.jpg';

        if (isPlaying) {
          if (labelEl) labelEl.textContent = "Now spinning";
          if (barsEl) barsEl.style.display = 'flex';
        } else {
          if (labelEl) labelEl.textContent = "Recently played";
          if (barsEl) barsEl.style.display = 'none';
        }
      } catch (err) {
        console.error("Last.fm fetch error:", err);
      }
    };

    updateSpotify();
    setInterval(updateSpotify, 30000); // Update every 30s
  }

  // Visitor Counter: Real-time traffic tracking via CounterAPI
  const viewCountEl = document.getElementById('viewCount');
  if (viewCountEl) {
    const updateCounter = async () => {
      try {
        const namespace = "aspartic-portfolio";
        const key = "main-visits";
        // Up increments the counter and returns the new value
        const response = await fetch(`https://api.counterapi.dev/v1/${namespace}/${key}/up`);
        const data = await response.json();
        
        if (data && data.count) {
          const totalViews = data.count;
          // Counting up animation for the visitor tally
          let current = Math.max(0, totalViews - 20);
          const interval = setInterval(() => {
            current++;
            viewCountEl.textContent = current.toLocaleString();
            if (current >= totalViews) clearInterval(interval);
          }, 50);
        }
      } catch (err) {
        console.error("CounterAPI error:", err);
        // Fallback to simulation if API fails so the UI doesn't look broken
        const launchDate = new Date('2026-01-01');
        const now = new Date();
        const diffDays = Math.floor((now - launchDate) / (1000 * 60 * 60 * 24));
        const baseViews = 12450;
        const totalViews = baseViews + (diffDays * 12);
        viewCountEl.textContent = totalViews.toLocaleString();
      }
    };
    updateCounter();
  }

  // Scroll Animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('section.block').forEach((el) => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // Mobile Menu Toggle
  window.toggleMobileMenu = () => {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('open');
  };

  // Command palette logic
  const palette = document.getElementById('commandPalette');
  const cmInput = document.getElementById('cmInput');
  const cmList = document.getElementById('cmList');
  let activeIndex = 0;
  let visibleItems = [];

  const getVisibleItems = () => Array.from(document.querySelectorAll('.cm-item')).filter(item => item.style.display !== 'none');

  const updateActiveItem = () => {
    visibleItems = getVisibleItems();
    visibleItems.forEach((item, i) => {
      item.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) item.scrollIntoView({ block: 'nearest' });
    });
  };

  window.openPalette = () => {
    if (!palette) return;
    palette.style.display = 'flex';
    cmInput.focus();
    activeIndex = 0;
    // Reset filtering
    document.querySelectorAll('.cm-item').forEach(item => item.style.display = 'flex');
    cmInput.value = '';
    updateActiveItem();
  };

  const closePalette = () => {
    if (palette) palette.style.display = 'none';
  };

  const handleAction = (action) => {
    if (!action) return;
    switch (action) {
      case 'home': window.location.href = './'; break;
      case 'projects': window.location.href = 'projects.html'; break;
      case 'blogs': window.location.href = 'blogs.html'; break;
      case 'research': window.location.href = 'research.html'; break;
      case 'theme': 
        const themeBtn = document.querySelector('[data-theme-toggle]');
        if (themeBtn) themeBtn.click();
        break;
      case 'resume':
        window.open('https://drive.google.com/file/d/1nQBybvVzQ36ZllzWKMCyJ9vp54wuCQe9/view?usp=sharing', '_blank');
        break;
      case 'top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'copy-email': 
        navigator.clipboard.writeText('anirudhsahu6001@gmail.com');
        const emailItem = document.querySelector('[data-action="copy-email"] span');
        if (emailItem) {
          const originalText = emailItem.textContent;
          emailItem.textContent = 'Copied!';
          setTimeout(() => { emailItem.textContent = originalText; }, 2000);
        }
        return; 
    }
    closePalette();
  };

  // Filter items as you type
  if (cmInput) {
    cmInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const allItems = document.querySelectorAll('.cm-item');
      allItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
      });
      activeIndex = 0;
      updateActiveItem();
    });
  }

  document.addEventListener('keydown', (e) => {
    // Open palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }

    if (palette && palette.style.display === 'flex') {
      visibleItems = getVisibleItems();

      if (e.key === 'Escape') closePalette();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % visibleItems.length;
        updateActiveItem();
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
        updateActiveItem();
      }
      
      if (e.key === 'Enter' && visibleItems[activeIndex]) {
        const action = visibleItems[activeIndex].getAttribute('data-action');
        handleAction(action);
      }

      // Quick shortcuts (only when not searching)
      if (!cmInput.value) {
        const key = e.key.toLowerCase();
        const shortcuts = {
          'h': 'home', 'p': 'projects', 'b': 'blogs', 'r': 'research',
          't': 'theme', 'e': 'copy-email', 'u': 'top', 'm': 'resume'
        };
        if (shortcuts[key]) {
          e.preventDefault();
          handleAction(shortcuts[key]);
        }
      }
    }
  });

  if (palette) {
    palette.addEventListener('click', (e) => {
      if (e.target === palette) closePalette();
    });
  }

  // Delegate clicks to items (works even after filtering)
  if (cmList) {
    cmList.addEventListener('click', (e) => {
      const item = e.target.closest('.cm-item');
      if (item) handleAction(item.getAttribute('data-action'));
    });
    
    cmList.addEventListener('mouseover', (e) => {
      const item = e.target.closest('.cm-item');
      if (item) {
        visibleItems = getVisibleItems();
        const idx = visibleItems.indexOf(item);
        if (idx !== -1) {
          activeIndex = idx;
          updateActiveItem();
        }
      }
    });
  }

  // Pixel pet click interaction
  window.petMeow = () => {
    const bubble = document.getElementById('petMeow');
    if (bubble) {
      bubble.style.display = 'block';
      bubble.style.animation = 'none';
      bubble.offsetHeight; // trigger reflow
      bubble.style.animation = 'meow-fade 2s forwards';
      setTimeout(() => { bubble.style.display = 'none'; }, 2000);
    }
  };

  // Custom Terminal Cursor Logic
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  const addHoverEffects = () => {
    const interactables = document.querySelectorAll('a, button, .cm-hint, .pixel-pet, .avatar, .tech-item');
    interactables.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
  };
  addHoverEffects();
})();
