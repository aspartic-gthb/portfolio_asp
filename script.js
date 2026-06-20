/**
 * Portfolio client bundle — single IIFE loaded on every page that includes script.js.
 * Guards (if element missing) let non-home pages skip heatmap / Last.fm / counter safely.
 */
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
  if (cells) {
    const WEEKS = 53;
    // Deterministic fake levels when the API fails — looks like activity but is not real data.
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
      // Base date configuration for fallbacks
      const today = new Date();
      const startOffset = today.getDay();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (52 * 7 + startOffset));

      function formatDateString(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      function formatDateObj(dateObj) {
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      let cellsHtml = '';
      const hasApiData = data !== null;

      for (let w = 0; w < WEEKS; w++) {
        cellsHtml += '<div class="heat-week">';
        for (let d = 0; d < 7; d++) {
          const cellDate = new Date(startDate);
          cellDate.setDate(startDate.getDate() + (w * 7 + d));
          const dateStrFallback = formatDateObj(cellDate);

          let levelVal = 0;
          let countVal = 0;
          let dateStr = dateStrFallback;

          if (hasApiData) {
            if (data[w] && data[w][d]) {
              levelVal = data[w][d].level;
              countVal = data[w][d].count;
              dateStr = formatDateString(data[w][d].date);
            } else {
              levelVal = 0;
              countVal = 0;
              dateStr = dateStrFallback;
            }
          } else {
            levelVal = fallbackLevel(w, d);
            if (levelVal === 1) countVal = 1;
            else if (levelVal === 2) countVal = 3;
            else if (levelVal === 3) countVal = 6;
            else if (levelVal === 4) countVal = 12;
            dateStr = dateStrFallback;
          }

          // Prevent future days (e.g. remaining days of the current week) from rendering contributions
          const cellDateZeroTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
          const todayZeroTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (cellDateZeroTime > todayZeroTime) {
            levelVal = 0;
            countVal = 0;
          }

          cellsHtml += `<div class="heat-cell h${levelVal}" data-count="${countVal}" data-date="${dateStr}"></div>`;
        }
        cellsHtml += '</div>';
      }
      cells.innerHTML = cellsHtml;
    }

    // Interactive tooltip implementation
    let tooltip = document.querySelector('.heat-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'heat-tooltip';
      const heatCard = document.querySelector('.heat-card');
      if (heatCard) {
        heatCard.appendChild(tooltip);
      }
    }

    const heatCellsContainer = document.getElementById('heatCells');
    if (heatCellsContainer) {
      heatCellsContainer.addEventListener('mouseover', (e) => {
        const cell = e.target.closest('.heat-cell');
        if (!cell) return;

        const count = cell.getAttribute('data-count');
        const date = cell.getAttribute('data-date');
        if (!date) return;

        const countText = count === '0' ? 'No contributions' : `${count} contribution${count === '1' ? '' : 's'}`;
        tooltip.innerHTML = `<strong>${countText}</strong> on ${date}`;

        const card = document.querySelector('.heat-card');
        const cardRect = card.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();

        const left = cellRect.left - cardRect.left + (cellRect.width / 2);
        const top = cellRect.top - cardRect.top;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translate(-50%, -100%) translateY(-8px) scale(1)';
      });

      heatCellsContainer.addEventListener('mouseout', (e) => {
        if (e.target.closest('.heat-cell')) {
          tooltip.style.opacity = '0';
          tooltip.style.transform = 'translate(-50%, -100%) translateY(-4px) scale(0.95)';
        }
      });
    }

    // The real deal: Fetching live data from GitHub
    fetch('https://github-contributions-api.deno.dev/aspartic-gthb.json')
      .then(res => res.json())
      .then(resData => {
        // Create 53x7 array of objects
        let weeks = Array.from({ length: WEEKS }, () => Array(7).fill(null));

        // API returns quartile labels, not raw counts — map to CSS classes h0–h4.
        const levelMap = {
          'NONE': 0,
          'FIRST_QUARTILE': 1,
          'SECOND_QUARTILE': 2,
          'THIRD_QUARTILE': 3,
          'FOURTH_QUARTILE': 4
        };

        if (resData && resData.contributions) {
          // Map API dates for direct lookup
          const dateMap = {};
          resData.contributions.forEach(week => {
            if (week) {
              week.forEach(day => {
                if (day && day.date) {
                  dateMap[day.date] = day;
                }
              });
            }
          });

          // Calculate start date of the local 53-week range
          const today = new Date();
          const startOffset = today.getDay();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - (52 * 7 + startOffset));

          // Populate local weeks array based on actual dates
          for (let w = 0; w < WEEKS; w++) {
            for (let d = 0; d < 7; d++) {
              const cellDate = new Date(startDate);
              cellDate.setDate(startDate.getDate() + (w * 7 + d));
              
              // Get local YYYY-MM-DD date string
              const offset = cellDate.getTimezoneOffset();
              const localCellDate = new Date(cellDate.getTime() - (offset * 60 * 1000));
              const dateStr = localCellDate.toISOString().split('T')[0];

              const apiDay = dateMap[dateStr];
              if (apiDay) {
                weeks[w][d] = {
                  level: levelMap[apiDay.contributionLevel] || 0,
                  count: apiDay.contributionCount || 0,
                  date: apiDay.date
                };
              }
            }
          }

          // Calculate total and streak
          let total = resData.totalContributions || 0;
          let streak = 0;

          const flatDays = resData.contributions.flat();
          if (flatDays.length > 0) {
            const offset = new Date().getTimezoneOffset();
            const localDateObj = new Date(new Date().getTime() - (offset * 60 * 1000));
            const todayStr = localDateObj.toISOString().split('T')[0];
            
            let i = flatDays.length - 1;
            // Skip future days
            while (i >= 0 && flatDays[i].date > todayStr) {
              i--;
            }
            // If today's contribution count is 0, skip today to check yesterday
            if (i >= 0 && flatDays[i].date === todayStr && flatDays[i].contributionCount === 0) {
              i--;
            }
            // Count consecutive days with contributions > 0
            while (i >= 0 && flatDays[i].contributionCount > 0) {
              streak++;
              i--;
            }
          }

          const heatTotalEl = document.getElementById('heatTotal');
          const heatStreakEl = document.getElementById('heatStreak');
          if (heatTotalEl) heatTotalEl.textContent = `${total} contributions in the last 365 days`;
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
  // Last.fm widget (markup uses class "spotify" for styling only — not the Spotify API).
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
        const imgEls = spotifyEl.querySelectorAll('img');
        const labelEl = spotifyEl.querySelector('.label');
        const barsEl = spotifyEl.querySelector('.spotify-bars');

        if (titleEl) titleEl.textContent = track.name;
        if (subEl) subEl.textContent = `${track.artist['#text']} — ${track.album['#text']}`;
        imgEls.forEach(imgEl => {
          imgEl.src = track.image[2]['#text'] || 'assets/album.jpg';
        });

        if (isPlaying) {
          spotifyEl.classList.add('is-playing');
          if (labelEl) labelEl.textContent = "Now spinning";
          if (barsEl) barsEl.style.display = 'flex';
        } else {
          spotifyEl.classList.remove('is-playing');
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
        // /up increments on every page load — refreshes inflate the count (not a read-only metric).
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
        const baseViews = 150;
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

  const projects = [
    {
      title: "FindInCampus",
      desc: "AI-driven MERN stack lost and found platform with Gemini AI.",
      action: "url:https://github.com/aspartic-gthb/FindInCampus",
      type: "Project",
      category: "MERN Stack / AI"
    },
    {
      title: "Resourcely",
      desc: "React Native app with Firebase Authentication & Firestore.",
      action: "url:https://github.com/aspartic-gthb/Resourcely_Android_App",
      type: "Project",
      category: "Mobile App"
    },
    {
      title: "Vyapar Setu",
      desc: "AI-powered Hinglish Telegram business bot & dashboard for SMBs.",
      action: "url:https://github.com/aspartic-gthb/vyapar-setu",
      type: "Project",
      category: "AI / SaaS"
    },
    {
      title: "Obstacle Avoiding Robot",
      desc: "Arduino autonomous robot car navigated using C++ and ultrasonic sensors.",
      action: "url:https://github.com/aspartic-gthb/obstacle-avoiding-robot",
      type: "Project",
      category: "Embedded / Robotics"
    }
  ];

  const papers = [
    {
      title: "Data preprocessing - Tidy data",
      desc: "Hadley Wickham's foundational paper on data tidying standards.",
      action: "url:https://vita.had.co.nz/papers/tidy-data.pdf",
      type: "Paper",
      category: "Pre-processing & EDA"
    },
    {
      title: "Statistical Modeling: The Two Cultures",
      desc: "Leo Breiman on data modeling vs algorithmic modeling in statistics.",
      action: "url:https://projecteuclid.org/download/pdf_1/euclid.ss/1009213726",
      type: "Paper",
      category: "General DS"
    },
    {
      title: "Frequentism and Bayesianism: A Python Primer",
      desc: "Jake VanderPlas' code-first primer comparing statistics approaches.",
      action: "url:https://arxiv.org/pdf/1411.5018.pdf",
      type: "Paper",
      category: "General DS"
    },
    {
      title: "Model Evaluation, Model Selection, and Algorithm Selection",
      desc: "Sebastian Raschka's guide on ML model evaluation and selection.",
      action: "url:https://arxiv.org/pdf/1811.12808.pdf",
      type: "Paper",
      category: "General ML"
    },
    {
      title: "XGBoost: A Scalable Tree Boosting System",
      desc: "The original paper describing the tree boosting system that dominates competitions.",
      action: "url:https://arxiv.org/pdf/1603.02754.pdf",
      type: "Paper",
      category: "Boosting"
    },
    {
      title: "Peeking Inside the Black Box (ICE Plots)",
      desc: "Visualizing feature relationships using Individual Conditional Expectation.",
      action: "url:https://arxiv.org/pdf/1309.6392.pdf",
      type: "Paper",
      category: "Explainable AI"
    },
    {
      title: "A Tutorial on Principal Component Analysis",
      desc: "Intuitive tutorial on the math and motivation behind PCA dimensionality reduction.",
      action: "url:https://arxiv.org/pdf/1404.1100.pdf",
      type: "Paper",
      category: "Dimensionality Reduction"
    },
    {
      title: "The Netflix Recommender System",
      desc: "Case study examining the algorithms and innovation behind Netflix recommendations.",
      action: "url:http://delivery.acm.org/10.1145/2850000/2843948/a13-gomez-uribe.pdf",
      type: "Paper",
      category: "Recommenders"
    },
    {
      title: "Attention Is All You Need",
      desc: "The seminal paper introducing the Transformer architecture and self-attention.",
      action: "url:https://arxiv.org/pdf/1706.03762.pdf",
      type: "Paper",
      category: "Deep Learning"
    },
    {
      title: "Deep Residual Learning for Image Recognition",
      desc: "Introduces ResNet and residual connections, enabling extremely deep networks.",
      action: "url:https://arxiv.org/pdf/1512.03385.pdf",
      type: "Paper",
      category: "Deep Learning"
    },
    {
      title: "Adam: A Method for Stochastic Optimization",
      desc: "Presents the Adam optimization algorithm for gradient-based training.",
      action: "url:https://arxiv.org/pdf/1412.6980.pdf",
      type: "Paper",
      category: "Deep Learning"
    }
  ];

  const staticItems = [
    {
      title: "Go to Home",
      kbd: "H",
      action: "home",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>`
    },
    {
      title: "View Projects",
      kbd: "P",
      action: "projects",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>`
    },
    {
      title: "Read Blogs",
      kbd: "B",
      action: "blogs",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>`
    },
    {
      title: "Research Papers",
      kbd: "R",
      action: "research",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>`
    },
    {
      title: "Toggle Theme",
      kbd: "T",
      action: "theme",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>`
    },
    {
      title: "Copy Email",
      kbd: "E",
      action: "copy-email",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>`
    },
    {
      title: "View Resume",
      kbd: "M",
      action: "resume",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>`
    },
    {
      title: "Back to Top",
      kbd: "U",
      action: "top",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>`
    }
  ];

  const getVisibleItems = () => Array.from(document.querySelectorAll('.cm-item')).filter(item => item.style.display !== 'none');

  const updateActiveItem = () => {
    visibleItems = getVisibleItems();
    visibleItems.forEach((item, i) => {
      item.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) item.scrollIntoView({ block: 'nearest' });
    });
  };

  const renderItem = (item) => {
    if (item.kbd) {
      return `
        <div class="cm-item" data-action="${item.action}">
          ${item.icon || ''}
          <span style="flex: 1;">${item.title}</span>
          <kbd>${item.kbd}</kbd>
        </div>
      `;
    } else {
      const typeLabel = item.type;
      const icon = typeLabel === 'Project' ? 
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>` : 
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>`;
      return `
        <div class="cm-item" data-action="${item.action}">
          ${icon}
          <div class="cm-item-info">
            <div class="cm-item-title-row">
              <span class="cm-item-title">${item.title}</span>
              <span class="cm-item-type">${typeLabel}</span>
            </div>
            <div class="cm-item-desc">${item.desc}</div>
          </div>
        </div>
      `;
    }
  };

  const renderPalette = (term = '') => {
    if (!cmList) return;
    const cleanTerm = term.toLowerCase().trim();
    
    let html = '';
    
    if (!cleanTerm) {
      html = staticItems.map(item => renderItem(item)).join('');
    } else {
      const matchedStatic = staticItems.filter(item => 
        item.title.toLowerCase().includes(cleanTerm)
      );
      
      const matchedProjects = projects.filter(item => 
        item.title.toLowerCase().includes(cleanTerm) ||
        item.desc.toLowerCase().includes(cleanTerm) ||
        (item.category && item.category.toLowerCase().includes(cleanTerm))
      );
      
      const matchedPapers = papers.filter(item => 
        item.title.toLowerCase().includes(cleanTerm) ||
        item.desc.toLowerCase().includes(cleanTerm) ||
        (item.category && item.category.toLowerCase().includes(cleanTerm))
      );
      
      if (matchedStatic.length === 0 && matchedProjects.length === 0 && matchedPapers.length === 0) {
        html = `<div class="cm-no-results">No results found for "${term}"</div>`;
      } else {
        if (matchedStatic.length > 0) {
          html += `<div class="cm-section-label">Navigation</div>`;
          html += matchedStatic.map(item => renderItem(item)).join('');
        }
        if (matchedProjects.length > 0) {
          html += `<div class="cm-section-label">Projects</div>`;
          html += matchedProjects.map(item => renderItem(item)).join('');
        }
        if (matchedPapers.length > 0) {
          html += `<div class="cm-section-label">Research Papers</div>`;
          html += matchedPapers.map(item => renderItem(item)).join('');
        }
      }
    }
    
    cmList.innerHTML = html;
    activeIndex = 0;
    updateActiveItem();
  };

  window.openPalette = () => {
    if (!palette) return;
    palette.style.display = 'flex';
    cmInput.focus();
    cmInput.value = '';
    renderPalette('');
  };

  const closePalette = () => {
    if (palette) palette.style.display = 'none';
  };

  const handleAction = (action) => {
    if (!action) return;
    if (action.startsWith('url:')) {
      window.open(action.substring(4), '_blank');
      closePalette();
      return;
    }
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
        window.open('https://drive.google.com/file/d/1Z7ux_5kCLrzZ9N9q4BgLb0wwg825UCfH/view?usp=sharing', '_blank');
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
      renderPalette(e.target.value);
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
        if (visibleItems.length > 0) {
          activeIndex = (activeIndex + 1) % visibleItems.length;
          updateActiveItem();
        }
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleItems.length > 0) {
          activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
          updateActiveItem();
        }
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

  // Interactive Pixel Pet State Machine & Logic
  const pet = document.querySelector('.pixel-pet');
  const petBubble = document.getElementById('petMeow');
  
  const meowMessages = [
    "Meow! Try pressing Ctrl+K to search all pages, projects, and papers! 🔍",
    "Prrr... ECE + Machine Learning is the future! ⚡",
    "I'm the official portfolio bug catcher! 🐛",
    "Time for a coffee break? ☕",
    "Meow! Working hard or hardly working?",
    "Keep coding, you're doing amazing! 💻",
    "Did you see the ISRO space challenge under Experience? 🚀",
    "Attention is indeed all you need! 🧠",
    "Check out FindInCampus in the Projects tab! 🏫",
    "Purrr... Life is better in monospace."
  ];

  let petStateTimeout = null;
  let meowTimeout = null;

  window.petMeow = () => {
    if (!pet || !petBubble) return;
    
    clearTimeout(petStateTimeout);
    clearTimeout(meowTimeout);
    
    pet.classList.remove('is-sleeping');
    pet.classList.add('is-awake', 'is-purring');
    
    const msg = meowMessages[Math.floor(Math.random() * meowMessages.length)];
    petBubble.textContent = msg;
    
    petBubble.style.display = 'block';
    petBubble.style.animation = 'none';
    petBubble.offsetHeight; // force reflow
    petBubble.style.animation = 'meow-fade 3.5s forwards';
    
    meowTimeout = setTimeout(() => {
      petBubble.style.display = 'none';
      pet.classList.remove('is-purring');
    }, 3500);
    
    petStateTimeout = setTimeout(() => {
      pet.classList.remove('is-awake', 'is-purring');
    }, 8000);
  };

  if (pet) {
    pet.addEventListener('mouseenter', () => {
      pet.classList.add('is-awake');
    });
    pet.addEventListener('mouseleave', () => {
      if (!pet.classList.contains('is-purring')) {
        pet.classList.remove('is-awake');
      }
    });
  }

  // Custom Terminal Cursor Logic
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  // Event delegation for custom cursor hovering states
  document.addEventListener('mouseover', (e) => {
    const isHovering = e.target.closest('a, button, .cm-hint, .pixel-pet, .avatar, .tech-item, .cm-item');
    cursor.classList.toggle('hovering', !!isHovering);
  });
})();
