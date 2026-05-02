(() => {
  // ============================
  // CONFIG
  // ============================

  const pathParts = window.location.pathname.split('/');
  const token = pathParts[2];
  const API = `/quests/${token}/api`;

  // ============================
  // SHARED STATE
  // ============================

  let activeTab = 'quests';

  // ============================
  // EMBER PARTICLES
  // ============================

  function initEmbers() {
    const canvas = document.getElementById('embers');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const COUNT = 25;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Ember {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 10;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = -(Math.random() * 0.4 + 0.15);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.fadeRate = Math.random() * 0.001 + 0.0005;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.02 + 0.01;
      }
      update() {
        this.y += this.speedY;
        this.wobble += this.wobbleSpeed;
        this.x += this.speedX + Math.sin(this.wobble) * 0.2;
        this.opacity -= this.fadeRate;
        if (this.opacity <= 0 || this.y < -10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 200, 74, ${this.opacity})`;
        ctx.fill();
        // Glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${this.opacity * 0.15})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < COUNT; i++) {
      const p = new Ember();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.update();
        p.draw();
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ============================
  // TAB NAVIGATION
  // ============================

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.getElementById(`tab-${activeTab}`).classList.remove('hidden');

      if (activeTab === 'quests') updateGlobalProgress();
      else if (activeTab === 'route') updateRouteGlobalProgress();
      else if (activeTab === 'stats') fetchStats();
      else if (activeTab === 'hof') fetchHallOfFame();
      else if (activeTab === 'items') { fetchItems(); if (itemsData) updateItemsGlobalProgress(); }
      else if (activeTab === 'leaderboard') fetchLeaderboard();
      else if (activeTab === 'dlc-predict') fetchDlcPredictions();
    });
  });

  // ============================
  // QUEST TAB
  // ============================

  let allQuests = [];
  let progress = {};
  let globalPonr = [];
  let selectedQuestId = null;
  let activeFilter = 'all';
  let activeStatusFilter = 'all';

  async function fetchData() {
    const res = await fetch(`${API}/progress`);
    const data = await res.json();
    if (!data.ok) return;
    allQuests = data.quests;
    progress = data.progress;
    globalPonr = data.globalPointsOfNoReturn || [];
    renderSidebar();
    updateGlobalProgress();
    if (selectedQuestId) renderDetail(selectedQuestId);
  }

  async function toggleStep(questId, stepId) {
    if (!progress[questId]) {
      progress[questId] = { completedSteps: [], choicesMade: {}, status: 'in_progress', notes: '' };
    }
    const p = progress[questId];
    const idx = p.completedSteps.indexOf(stepId);
    if (idx >= 0) p.completedSteps.splice(idx, 1);
    else { p.completedSteps.push(stepId); p.completedSteps.sort((a, b) => a - b); }
    if (p.completedSteps.length === 0) p.status = 'not_started';
    else if (p.status === 'not_started') p.status = 'in_progress';

    renderDetail(questId);
    renderSidebar();
    updateGlobalProgress();

    const res = await fetch(`${API}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, stepId }),
    });
    const data = await res.json();
    if (data.ok) progress[questId] = data.progress;
  }

  async function setChoice(questId, choiceIndex, optionIndex) {
    if (!progress[questId]) {
      progress[questId] = { completedSteps: [], choicesMade: {}, status: 'in_progress', notes: '' };
    }
    progress[questId].choicesMade[String(choiceIndex)] = optionIndex;
    renderDetail(questId);

    const res = await fetch(`${API}/choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, choiceIndex, optionIndex }),
    });
    const data = await res.json();
    if (data.ok) progress[questId] = data.progress;
  }

  async function setStatus(questId, status) {
    if (!progress[questId]) {
      progress[questId] = { completedSteps: [], choicesMade: {}, status: 'not_started', notes: '' };
    }
    progress[questId].status = status;
    renderSidebar();

    const res = await fetch(`${API}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, status }),
    });
    const data = await res.json();
    if (data.ok) progress[questId] = data.progress;
  }

  function getQuestStatus(quest) {
    const p = progress[quest.id];
    if (!p || p.status === 'not_started') return 'not-started';
    if (p.status === 'completed') return 'completed';
    if (p.status === 'failed') return 'failed';
    const done = p.completedSteps.length;
    const total = quest.steps.length;
    if (done === total) return 'completed';
    return 'in-progress';
  }

  function renderSidebar() {
    const list = document.getElementById('quest-list');
    const search = document.getElementById('search').value.toLowerCase();
    list.innerHTML = '';

    const categories = [
      { key: 'main', label: 'Quêtes principales' },
      { key: 'secondary', label: 'Quêtes secondaires' },
      { key: 'dlc', label: 'Shadow of the Erdtree' },
    ];

    for (const cat of categories) {
      const quests = allQuests.filter(q => q.category === cat.key);
      if (quests.length === 0) continue;
      if (activeFilter !== 'all' && activeFilter !== cat.key) continue;

      const header = document.createElement('li');
      header.className = 'quest-cat-header';
      header.textContent = cat.label;
      list.appendChild(header);

      for (const q of quests) {
        const matchSearch = q.name.toLowerCase().includes(search) || q.npc.toLowerCase().includes(search) || q.id.includes(search);
        const status = getQuestStatus(q);
        const matchStatus = activeStatusFilter === 'all' || status === activeStatusFilter;
        const li = document.createElement('li');
        if (!matchSearch || !matchStatus) li.classList.add('hidden');
        if (q.id === selectedQuestId) li.classList.add('active');

        li.innerHTML = `
          <div style="min-width:0;flex:1">
            <div class="quest-name">${esc(q.name)}</div>
            <div class="quest-npc">${esc(q.npc)} &mdash; ${esc(q.zone.split(' -')[0])}</div>
          </div>
          <div class="status-dot ${status}"></div>
        `;
        li.addEventListener('click', () => {
          selectedQuestId = q.id;
          renderSidebar();
          renderDetail(q.id);
        });
        list.appendChild(li);
      }
    }
  }

  function renderDetail(questId) {
    const main = document.getElementById('quest-detail');
    const quest = allQuests.find(q => q.id === questId);
    if (!quest) return;

    const p = progress[questId] || { completedSteps: [], choicesMade: {}, status: 'not_started', notes: '' };
    const completedCount = p.completedSteps.length;
    const totalSteps = quest.steps.length;
    const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    const catClass = `cat-${quest.category}`;
    const catLabel = quest.category === 'main' ? 'Principale' : quest.category === 'secondary' ? 'Secondaire' : 'DLC';

    let html = `
      <div class="quest-header fade-in">
        <div>
          <h2>${esc(quest.name)}</h2>
          <div class="quest-meta">
            <span class="cat-label ${catClass}">${catLabel}</span>
            <span class="quest-meta-item"><strong>PNJ:</strong> ${esc(quest.npc)}</span>
            <span class="quest-meta-item"><strong>Zone:</strong> ${esc(quest.zone)}</span>
          </div>
          ${quest.endingUnlocked ? `<div class="ending-badge">Fin : ${esc(quest.endingUnlocked)}</div>` : ''}
          ${quest.guide ? `<a class="guide-link" href="${quest.guide}" target="_blank" rel="noopener">Guide FR &rarr;</a>` : ''}
        </div>
        <select class="quest-status-select" onchange="window.__setStatus('${questId}', this.value)">
          <option value="not_started" ${p.status === 'not_started' ? 'selected' : ''}>Non commencée</option>
          <option value="in_progress" ${p.status === 'in_progress' ? 'selected' : ''}>En cours</option>
          <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>Terminée</option>
          <option value="failed" ${p.status === 'failed' ? 'selected' : ''}>Échouée</option>
        </select>
      </div>

      <div class="quest-progress-section fade-in stagger-1">
        <div class="quest-progress-info">${completedCount} / ${totalSteps} étapes (${pct}%)</div>
        <div class="progress-bar-large"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;

    // Points of no return
    const questPonr = quest.pointsOfNoReturn || [];
    const globalForQuest = globalPonr.filter(g => g.affectedQuests.includes(questId));
    if (questPonr.length > 0 || globalForQuest.length > 0) {
      html += `<div class="section-title fade-in stagger-2">Points de non-retour</div>`;
      for (const ponr of questPonr) {
        html += `<div class="warning-box severe fade-in stagger-2"><span class="warning-label">Attention</span><br><span class="warning-text">${esc(ponr.event)}</span><br><span class="warning-effect">${esc(ponr.effect)}</span></div>`;
      }
      for (const g of globalForQuest) {
        html += `<div class="warning-box fade-in stagger-2"><span class="warning-label">Global</span><br><span class="warning-text">${esc(g.event)}</span><br><span class="warning-effect">${esc(g.warning)}</span></div>`;
      }
    }

    // Steps
    html += `<div class="section-title fade-in stagger-3">Étapes</div>`;
    html += `<div class="steps-container">`;
    for (const step of quest.steps) {
      const checked = p.completedSteps.includes(step.id);
      html += `
        <div class="step ${checked ? 'completed' : ''} fade-in" style="animation-delay:${0.05 * step.id}s; opacity:0">
          <input type="checkbox" class="step-checkbox-hidden" id="step_${questId}_${step.id}" ${checked ? 'checked' : ''}
            onchange="window.__toggleStep('${questId}', ${step.id})">
          <label class="step-check ${checked ? 'checked' : ''}" for="step_${questId}_${step.id}"></label>
          <div class="step-text">
            <div class="step-desc"><span class="step-num">${step.id}.</span>${esc(step.description)}</div>
            ${step.detail ? `<div class="step-detail">${esc(step.detail)}</div>` : ''}
            ${step.zone ? `<div class="step-zone">${esc(step.zone)}</div>` : ''}
          </div>
        </div>
      `;
    }
    html += `</div>`;

    // Fail conditions
    if (quest.failConditions.length > 0) {
      html += `<div class="section-title">Conditions d'échec</div>`;
      for (const fc of quest.failConditions) {
        const isSevere = fc.severity === 'permanent';
        html += `
          <div class="warning-box ${isSevere ? 'severe' : ''}">
            <span class="warning-label">${isSevere ? 'Permanent' : 'Récupérable'}</span><br>
            <span class="warning-text">${esc(fc.trigger)}</span><br>
            <span class="warning-effect">${esc(fc.consequence)}</span>
            ${fc.fix ? `<div class="warning-fix">Fix : ${esc(fc.fix)}</div>` : ''}
          </div>
        `;
      }
    }

    // Choices
    if (quest.choices.length > 0) {
      html += `<div class="section-title">Choix</div>`;
      quest.choices.forEach((choice, ci) => {
        const selectedOpt = p.choicesMade[String(ci)];
        html += `<div class="choice-group"><div class="choice-title">${esc(choice.description)}</div>`;
        choice.options.forEach((opt, oi) => {
          const isSelected = selectedOpt === oi;
          html += `
            <div class="choice-option">
              <div class="choice-radio-wrap">
                <input type="radio" class="choice-radio-hidden" name="choice_${questId}_${ci}" id="ch_${questId}_${ci}_${oi}" ${isSelected ? 'checked' : ''}
                  onchange="window.__setChoice('${questId}', ${ci}, ${oi})">
                <label class="choice-radio-visual" for="ch_${questId}_${ci}_${oi}"></label>
              </div>
              <div>
                <div class="choice-label">${esc(opt.choice)}</div>
                <div class="choice-consequence">${esc(opt.consequence)}</div>
                <div class="choice-reward">${esc(opt.reward)}</div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      });
    }

    // Rewards
    if (quest.rewards.length > 0) {
      html += `<div class="section-title">Récompenses</div><div class="reward-list">`;
      for (const r of quest.rewards) {
        html += `<span class="reward-tag">${esc(r)}</span>`;
      }
      html += `</div>`;
    }

    // Related quests
    if (quest.relatedQuests.length > 0) {
      const related = quest.relatedQuests.map(id => allQuests.find(q => q.id === id)).filter(Boolean);
      if (related.length > 0) {
        html += `<div class="section-title">Quêtes liées</div><div class="reward-list">`;
        for (const rq of related) {
          html += `<span class="related-tag" onclick="window.__selectQuest('${rq.id}')">${esc(rq.name)}</span>`;
        }
        html += `</div>`;
      }
    }

    main.innerHTML = html;
  }

  function updateGlobalProgress() {
    let totalSteps = 0;
    let completedSteps = 0;
    for (const q of allQuests) {
      totalSteps += q.steps.length;
      const p = progress[q.id];
      if (p) completedSteps += p.completedSteps.length;
    }
    const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    document.getElementById('global-progress-text').textContent = `${completedSteps} / ${totalSteps} étapes (${pct}%)`;
    document.getElementById('global-progress-bar').style.width = `${pct}%`;
  }

  // ============================
  // ROUTE TAB
  // ============================

  let routeRegions = [];
  let killedBosses = {};
  let selectedRegionIdx = null;
  let activeRouteFilter = 'all';

  async function fetchRoute() {
    const res = await fetch(`${API}/route`);
    const data = await res.json();
    if (!data.ok) return;
    routeRegions = data.regions;
    killedBosses = data.killedBosses;
    renderRegionList();
  }

  function isBossKilled(bossName, bossZone) {
    const kills = killedBosses[bossName];
    if (!kills) return false;
    return kills.some(k => {
      const zoneMatch = !k.zone || k.zone === bossZone || k.zone === bossZone.split(' - ')[0];
      return zoneMatch && k.kills > 0;
    });
  }

  function getBossKillData(bossName) {
    return killedBosses[bossName] || null;
  }

  function getRegionStats(region) {
    let total = region.bosses.length;
    let killed = 0;
    for (const boss of region.bosses) {
      if (isBossKilled(boss.name, boss.zone)) killed++;
    }
    return { total, killed };
  }

  function renderRegionList() {
    const list = document.getElementById('region-list');
    const search = document.getElementById('route-search').value.toLowerCase();
    list.innerHTML = '';

    for (let i = 0; i < routeRegions.length; i++) {
      const region = routeRegions[i];
      const stats = getRegionStats(region);

      const matchingBosses = region.bosses.filter(b => {
        const matchSearch = !search || b.name.toLowerCase().includes(search) || b.zone.toLowerCase().includes(search);
        const killed = isBossKilled(b.name, b.zone);
        const matchFilter = activeRouteFilter === 'all'
          || (activeRouteFilter === 'killed' && killed)
          || (activeRouteFilter === 'alive' && !killed)
          || (activeRouteFilter === 'required' && b.required);
        return matchSearch && matchFilter;
      });

      if (matchingBosses.length === 0) continue;

      const li = document.createElement('li');
      if (i === selectedRegionIdx) li.classList.add('active');

      const pct = stats.total > 0 ? Math.round((stats.killed / stats.total) * 100) : 0;
      const statusClass = stats.killed === stats.total ? 'completed' : stats.killed > 0 ? 'in-progress' : 'not-started';

      li.innerHTML = `
        <div style="flex:1;min-width:0">
          <div class="quest-name">${esc(region.name)}</div>
          <div class="quest-npc">${stats.killed} / ${stats.total} boss${stats.total > 1 ? 'es' : ''}</div>
          <div class="region-progress-mini"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="status-dot ${statusClass}"></div>
      `;
      li.addEventListener('click', () => {
        selectedRegionIdx = i;
        renderRegionList();
        renderRouteDetail(i);
      });
      list.appendChild(li);
    }
  }

  function renderRouteDetail(regionIdx) {
    const main = document.getElementById('route-detail');
    const region = routeRegions[regionIdx];
    if (!region) return;

    const stats = getRegionStats(region);
    const pct = stats.total > 0 ? Math.round((stats.killed / stats.total) * 100) : 0;
    const search = document.getElementById('route-search').value.toLowerCase();

    let html = `
      <div class="region-header fade-in">
        <h2>${esc(region.name)}</h2>
        <div class="region-stats">${stats.killed} / ${stats.total} boss${stats.total > 1 ? 'es' : ''} vaincus</div>
      </div>
      <div class="quest-progress-section fade-in stagger-1">
        <div class="quest-progress-info">${stats.killed} / ${stats.total} (${pct}%)</div>
        <div class="progress-bar-large"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;

    let bossIdx = 0;
    for (const boss of region.bosses) {
      const matchSearch = !search || boss.name.toLowerCase().includes(search) || boss.zone.toLowerCase().includes(search);
      const killed = isBossKilled(boss.name, boss.zone);
      const matchFilter = activeRouteFilter === 'all'
        || (activeRouteFilter === 'killed' && killed)
        || (activeRouteFilter === 'alive' && !killed)
        || (activeRouteFilter === 'required' && boss.required);

      if (!matchSearch || !matchFilter) continue;
      bossIdx++;

      const killData = getBossKillData(boss.name);
      const deaths = killData ? killData.reduce((sum, k) => sum + k.deaths, 0) : 0;
      const kills = killData ? killData.reduce((sum, k) => sum + (k.kills || 0), 0) : 0;
      const phase1Deaths = killData ? killData.reduce((sum, k) => sum + (k.phase1Deaths || 0), 0) : 0;
      const phase2Deaths = killData ? killData.reduce((sum, k) => sum + (k.phase2Deaths || 0), 0) : 0;
      const hasPhases = killData ? killData.some(k => k.phase2Deaths !== undefined) : false;
      const totalAttempts = hasPhases ? (deaths + kills) : 0;
      const location = boss.zone.includes(' - ') ? boss.zone.split(' - ').slice(1).join(' - ') : boss.zone;
      const wikiBase = 'https://eldenring.wiki.fextralife.com/';
      const delay = Math.min(bossIdx * 0.04, 0.5);

      // Image or icon
      let thumbHtml;
      if (boss.image) {
        thumbHtml = `<div class="boss-thumb" style="background-image:url('${boss.image}')"></div>`;
      } else {
        const icon = killed ? '\u2620' : boss.required ? '\u2694' : '\u25CB';
        thumbHtml = `<div class="boss-no-thumb">${icon}</div>`;
      }

      const scaduRange = boss.scadutree
        ? (boss.scadutree.min === boss.scadutree.max ? `${boss.scadutree.min}` : `${boss.scadutree.min}-${boss.scadutree.max}`)
        : null;
      const scaduTitle = boss.scadutree ? esc(boss.scadutree.comment || '') : '';

      html += `
        <div class="boss-card ${killed ? 'boss-killed' : ''} fade-in" style="animation-delay:${delay}s;opacity:0" data-boss="${esc(boss.name)}">
          ${thumbHtml}
          <div class="boss-body">
            <div class="boss-name-row">
              <span class="boss-name">${esc(boss.name)}</span>
              ${boss.required ? '<span class="boss-badge badge-required">Obligatoire</span>' : ''}
              ${boss.quest ? `<span class="boss-badge badge-quest">${esc(boss.quest)}</span>` : ''}
            </div>
            <div class="boss-location">${esc(location)}</div>
            <div class="boss-meta-row">
              <span class="boss-level">Niv. ${esc(boss.level)}</span>
              ${scaduRange ? `<span class="boss-scadu" title="${scaduTitle}">Arbre-Occulte ${scaduRange}</span>` : ''}
              ${hasPhases && totalAttempts > 0 ? `<span class="boss-deaths">${totalAttempts} tentative${totalAttempts > 1 ? 's' : ''}${phase2Deaths > 0 ? ` (${phase2Deaths + kills} en P2)` : ''}</span>` : ''}
              ${!hasPhases && deaths > 0 ? `<span class="boss-deaths">${deaths} mort${deaths > 1 ? 's' : ''}</span>` : ''}
              ${killed ? '<span class="boss-defeated">Vaincu</span>' : ''}
              ${killed ? `<button class="remove-kill-btn" onclick="window.__removeKill('${esc(boss.name).replace(/'/g, "\\'")}', '${esc(boss.zone).replace(/'/g, "\\'")}', this)">&times;</button>` : ''}
              ${!killed ? `<button class="add-kill-btn" onclick="window.__showAddKill('${esc(boss.name).replace(/'/g, "\\'")}', '${esc(boss.zone).replace(/'/g, "\\'")}', this)">+ Vaincu</button>` : ''}
            </div>
          </div>
          <div class="boss-links">
            ${boss.wiki ? `<a class="boss-link-btn" href="${wikiBase}${boss.wiki}" target="_blank" rel="noopener" title="Voir sur le wiki">Wiki</a>` : ''}
            ${boss.map ? `<a class="boss-link-btn" href="${wikiBase}${boss.map}" target="_blank" rel="noopener" title="Voir sur la carte">Carte</a>` : ''}
          </div>
        </div>
      `;
    }

    main.innerHTML = html;
  }

  function updateRouteGlobalProgress() {
    let total = 0;
    let killed = 0;
    for (const region of routeRegions) {
      const s = getRegionStats(region);
      total += s.total;
      killed += s.killed;
    }
    const pct = total > 0 ? Math.round((killed / total) * 100) : 0;
    document.getElementById('global-progress-text').textContent = `${killed} / ${total} boss (${pct}%)`;
    document.getElementById('global-progress-bar').style.width = `${pct}%`;
  }

  // ============================
  // HELPERS
  // ============================

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ============================
  // EVENT HANDLERS
  // ============================

  window.__toggleStep = toggleStep;
  window.__setChoice = setChoice;
  window.__setStatus = setStatus;
  window.__selectQuest = (id) => {
    selectedQuestId = id;
    renderSidebar();
    renderDetail(id);
  };

  // Quest search
  document.getElementById('search').addEventListener('input', () => renderSidebar());

  // Quest category filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.cat;
      renderSidebar();
    });
  });

  // Quest status filters
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatusFilter = btn.dataset.status;
      renderSidebar();
    });
  });

  // Route search
  document.getElementById('route-search').addEventListener('input', () => {
    renderRegionList();
    if (selectedRegionIdx !== null) renderRouteDetail(selectedRegionIdx);
  });

  // Route filters
  document.querySelectorAll('.route-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.route-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRouteFilter = btn.dataset.filter;
      renderRegionList();
      if (selectedRegionIdx !== null) renderRouteDetail(selectedRegionIdx);
    });
  });

  // ============================
  // SSE — LIVE UPDATES
  // ============================

  function connectSSE() {
    const evtSource = new EventSource(`${API}/events`);

    evtSource.addEventListener('boss_kill', () => {
      statsData = null;
      hofData = null;
      lbData = null;
      fetchRoute().then(() => {
        if (activeTab === 'route') {
          updateRouteGlobalProgress();
          if (selectedRegionIdx !== null) renderRouteDetail(selectedRegionIdx);
        }
        if (activeTab === 'stats') fetchStats();
        if (activeTab === 'hof') fetchHallOfFame();
        if (activeTab === 'leaderboard') fetchLeaderboard();
      });
    });

    evtSource.addEventListener('player_death', (e) => {
      const data = JSON.parse(e.data);
      const bossName = data.bossName;
      if (killedBosses[bossName]) {
        killedBosses[bossName][0].deaths++;
      } else {
        killedBosses[bossName] = [{ zone: null, deaths: 1, kills: 0 }];
      }
      statsData = null;
      hofData = null;
      lbData = null;
      if (activeTab === 'route' && selectedRegionIdx !== null) {
        renderRouteDetail(selectedRegionIdx);
      }
      if (activeTab === 'stats') fetchStats();
    });

    evtSource.addEventListener('boss_encounter', (e) => {
      const data = JSON.parse(e.data);
      if (activeTab === 'route') {
        const cards = document.querySelectorAll('.boss-card');
        for (const card of cards) {
          if (card.dataset.boss === data.bossName) {
            card.classList.add('boss-active');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => card.classList.remove('boss-active'), 3600);
            break;
          }
        }
      }
    });

    evtSource.onerror = () => {
      evtSource.close();
      setTimeout(connectSSE, 5000);
    };
  }

  // ============================
  // STATS TAB
  // ============================

  let statsData = null;

  async function fetchStats() {
    if (statsData) { renderStats(); return; }
    const res = await fetch(`${API}/stats`);
    const data = await res.json();
    if (!data.ok) return;
    statsData = data.stats;
    renderStats();
  }

  function formatTime(seconds) {
    if (!seconds || seconds === 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function renderStats() {
    const container = document.getElementById('tab-stats');
    if (!statsData) {
      container.innerHTML = '<div class="tab-loading">Aucune donnée disponible.</div>';
      return;
    }
    const s = statsData;
    const completion = s.bossesEncountered > 0
      ? Math.round((s.bossesDefeated / s.bossesEncountered) * 100)
      : 0;

    let html = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${s.totalKills}</div><div class="stat-label">Boss vaincus</div></div>
        <div class="stat-card"><div class="stat-value">${s.totalAllDeaths}</div><div class="stat-label">Morts totales</div></div>
        <div class="stat-card"><div class="stat-value">${s.bossesDefeated}/${s.bossesEncountered}</div><div class="stat-label">Boss connus</div></div>
        <div class="stat-card"><div class="stat-value">${s.firstTryCount}</div><div class="stat-label">First tries</div></div>
        <div class="stat-card"><div class="stat-value">${formatTime(s.totalFightTime)}</div><div class="stat-label">Temps de combat</div></div>
        <div class="stat-card"><div class="stat-value">${completion}%</div><div class="stat-label">Completion</div></div>
      </div>
    `;

    if (s.nemesis) {
      const n = s.nemesis;
      const thumbStyle = n.image ? `background-image:url('${n.image}')` : '';
      html += `
        <div class="stats-section">
          <div class="stats-section-title">Nemesis</div>
          <div class="nemesis-card">
            ${n.image ? `<div class="nemesis-thumb" style="${thumbStyle}"></div>` : ''}
            <div class="nemesis-info">
              <div class="nemesis-name">${esc(n.bossName.includes('::') ? n.bossName.split('::')[0] : n.bossName)}</div>
              ${n.bossName.includes('::') ? `<div class="first-try-zone" style="margin-bottom:4px">${esc(n.bossName.split('::')[1])}</div>` : ''}
              <div class="nemesis-detail">${n.deaths} mort${n.deaths > 1 ? 's' : ''} &mdash; ${n.defeated ? 'Vaincu' : 'Non vaincu'}</div>
            </div>
          </div>
        </div>
      `;
    }

    if (s.firstTryBossesWithImages && s.firstTryBossesWithImages.length > 0) {
      html += `<div class="stats-section"><div class="stats-section-title">First Tries (${s.firstTryBossesWithImages.length})</div><div class="first-try-grid">`;
      // Count how many times each plain boss name appears to detect duplicates
      const ftNameCount = {};
      for (const b of s.firstTryBossesWithImages) {
        const plain = b.name.includes('::') ? b.name.split('::')[0] : b.name;
        ftNameCount[plain] = (ftNameCount[plain] || 0) + 1;
      }
      for (const b of s.firstTryBossesWithImages) {
        const thumbStyle = b.image ? `background-image:url('${b.image}')` : `background:var(--bg-surface)`;
        const plain = b.name.includes('::') ? b.name.split('::')[0] : b.name;
        const zone = b.name.includes('::') ? b.name.split('::')[1] : '';
        const showZone = zone && ftNameCount[plain] > 1;
        html += `
          <div class="first-try-card">
            <div class="first-try-thumb" style="${thumbStyle}"></div>
            <div class="first-try-name">${esc(plain)}</div>
            ${showZone ? `<div class="first-try-zone">${esc(zone)}</div>` : ''}
          </div>
        `;
      }
      html += `</div></div>`;
    }

    container.innerHTML = html;
  }

  // ============================
  // HALL OF FAME TAB
  // ============================

  let hofData = null;
  let hofUsernames = {};

  async function fetchHallOfFame() {
    if (hofData) { renderHallOfFame(); return; }
    const res = await fetch(`${API}/hall-of-fame`);
    const data = await res.json();
    if (!data.ok) return;
    hofData = data.hallOfFame;
    hofUsernames = data.usernames || {};
    renderHallOfFame();
  }

  function renderHallOfFame() {
    const container = document.getElementById('tab-hof');
    if (!hofData) {
      container.innerHTML = '<div class="tab-loading">Aucune donnée disponible.</div>';
      return;
    }
    const h = hofData;
    const u = hofUsernames;
    const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
    const medals = ['I', 'II', 'III'];

    let html = '<div class="hof-grid">';

    // First Try Kings
    html += `<div class="hof-card"><div class="hof-card-title">First Try Kings</div>`;
    if (h.mostFirstTries && h.mostFirstTries.length > 0) {
      for (let i = 0; i < h.mostFirstTries.length; i++) {
        const e = h.mostFirstTries[i];
        html += `
          <div class="hof-entry">
            <div class="hof-rank ${rankClass(i)}">${medals[i]}</div>
            <div class="hof-player">${esc(u[e.discordId] || '???')}</div>
            <div class="hof-value">${e.count} boss</div>
          </div>
        `;
      }
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun first try</div></div>`;
    }
    html += `</div>`;

    // Completionists
    html += `<div class="hof-card"><div class="hof-card-title">Completionists</div>`;
    if (h.mostBossesDefeated && h.mostBossesDefeated.length > 0) {
      for (let i = 0; i < h.mostBossesDefeated.length; i++) {
        const e = h.mostBossesDefeated[i];
        html += `
          <div class="hof-entry">
            <div class="hof-rank ${rankClass(i)}">${medals[i]}</div>
            <div class="hof-player">${esc(u[e.discordId] || '???')}</div>
            <div class="hof-value">${e.count} boss</div>
          </div>
        `;
      }
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun boss vaincu</div></div>`;
    }
    html += `</div>`;

    // Speed Kill
    html += `<div class="hof-card hof-speed"><div class="hof-card-title">Kill le plus rapide</div>`;
    if (h.fastestKill) {
      const fkImg = h.fastestKill.image;
      html += `
        <div class="hof-single">
          ${fkImg ? `<div class="hof-single-thumb" style="background-image:url('${fkImg}')"></div>` : ''}
          <div class="hof-single-value">${esc(h.fastestKill.bossName)}</div>
          <div class="hof-single-detail">${esc(u[h.fastestKill.discordId] || '???')} &mdash; ${formatTime(h.fastestKill.duration)}</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun kill enregistré</div></div>`;
    }
    html += `</div>`;

    // Worst Wall
    html += `<div class="hof-card hof-highlight"><div class="hof-card-title">Mur de la honte</div>`;
    if (h.worstWall) {
      const wwImg = h.worstWall.image;
      html += `
        <div class="hof-single">
          ${wwImg ? `<div class="hof-single-thumb" style="background-image:url('${wwImg}')"></div>` : ''}
          <div class="hof-single-value">${esc(h.worstWall.bossName)}</div>
          <div class="hof-single-detail">${esc(u[h.worstWall.discordId] || '???')} &mdash; ${h.worstWall.deaths} morts</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun mur</div></div>`;
    }
    html += `</div>`;

    // Unbeaten Wall
    html += `<div class="hof-card hof-unbeaten"><div class="hof-card-title">Boss invaincu</div>`;
    if (h.unbeatenWall) {
      const ubImg = h.unbeatenWall.image;
      html += `
        <div class="hof-single">
          ${ubImg ? `<div class="hof-single-thumb" style="background-image:url('${ubImg}')"></div>` : ''}
          <div class="hof-single-value">${esc(h.unbeatenWall.bossName)}</div>
          <div class="hof-single-detail">${h.unbeatenWall.totalDeaths} morts au total</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Tous les boss ont été vaincus !</div></div>`;
    }
    html += `</div>`;

    // Le Persévérant
    html += `<div class="hof-card hof-perseverant"><div class="hof-card-title">Le Persévérant</div>`;
    if (h.perseverant) {
      const pImg = h.perseverant.image;
      html += `
        <div class="hof-single">
          ${pImg ? `<div class="hof-single-thumb" style="background-image:url('${pImg}')"></div>` : ''}
          <div class="hof-single-value">${esc(h.perseverant.bossName.split('::')[0])}</div>
          <div class="hof-single-detail">${esc(u[h.perseverant.discordId] || '???')} &mdash; ${h.perseverant.deathsBeforeKill} morts avant la victoire</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun comeback</div></div>`;
    }
    html += `</div>`;

    // Le Gladiateur (top 3)
    html += `<div class="hof-card"><div class="hof-card-title">Le Gladiateur</div>`;
    if (h.gladiators && h.gladiators.length > 0) {
      for (let i = 0; i < h.gladiators.length; i++) {
        const e = h.gladiators[i];
        html += `
          <div class="hof-entry">
            <div class="hof-rank ${rankClass(i)}">${medals[i]}</div>
            <div class="hof-player">${esc(u[e.discordId] || '???')}</div>
            <div class="hof-value">${formatTime(e.totalFightTime)}</div>
          </div>
        `;
      }
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun combat</div></div>`;
    }
    html += `</div>`;

    // Boss le plus facile
    html += `<div class="hof-card hof-easy"><div class="hof-card-title">Boss le plus facile</div>`;
    if (h.easiestBoss) {
      const ebImg = h.easiestBoss.image;
      html += `
        <div class="hof-single">
          ${ebImg ? `<div class="hof-single-thumb" style="background-image:url('${ebImg}')"></div>` : ''}
          <div class="hof-single-value">${esc(h.easiestBoss.bossName)}</div>
          <div class="hof-single-detail">First try par ${h.easiestBoss.count} joueur${h.easiestBoss.count > 1 ? 's' : ''}${h.easiestBoss.fastestKillDuration ? ` &mdash; ${formatTime(h.easiestBoss.fastestKillDuration)}` : ''}</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucun first try</div></div>`;
    }
    html += `</div>`;

    // Le No-Life
    html += `<div class="hof-card hof-nolife"><div class="hof-card-title">Le No-Life</div>`;
    if (h.noLife) {
      html += `
        <div class="hof-single">
          <div class="hof-single-value">${esc(u[h.noLife.discordId] || '???')}</div>
          <div class="hof-single-detail">Session de ${formatTime(h.noLife.duration)}</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucune session</div></div>`;
    }
    html += `</div>`;

    // Serial First Try
    html += `<div class="hof-card hof-serial"><div class="hof-card-title">Serial First Try</div>`;
    if (h.serialFirstTry) {
      html += `
        <div class="hof-single">
          <div class="hof-single-value">${esc(u[h.serialFirstTry.discordId] || '???')}</div>
          <div class="hof-single-detail">${h.serialFirstTry.streak} boss d'affilée</div>
        </div>
      `;
    } else {
      html += `<div class="hof-single"><div class="hof-single-detail">Aucune série</div></div>`;
    }
    html += `</div>`;

    html += '</div>';
    container.innerHTML = html;
  }

  // ============================
  // LEADERBOARD TAB
  // ============================

  let lbData = null;
  let lbUsernames = {};
  let lbCurrentPlayerId = null;
  let activeLbSort = 'byKills';

  async function fetchLeaderboard() {
    if (lbData) { renderLeaderboard(); return; }
    const res = await fetch(`${API}/leaderboard`);
    const data = await res.json();
    if (!data.ok) return;
    lbData = data.leaderboard;
    lbUsernames = data.usernames || {};
    lbCurrentPlayerId = data.currentPlayerId;
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const container = document.getElementById('tab-leaderboard');
    if (!lbData) {
      container.innerHTML = '<div class="tab-loading">Aucune donnée disponible.</div>';
      return;
    }

    const sorts = [
      { key: 'byKills', label: 'Kills' },
      { key: 'byDeaths', label: 'Morts' },
      { key: 'byTime', label: 'Temps de jeu' },
    ];

    let html = '<div class="lb-tabs">';
    for (const s of sorts) {
      html += `<button class="lb-tab-btn ${activeLbSort === s.key ? 'active' : ''}" onclick="window.__setLbSort('${s.key}')">${s.label}</button>`;
    }
    html += '</div>';

    const entries = lbData[activeLbSort] || [];
    const valueKey = activeLbSort === 'byKills' ? 'kills' : activeLbSort === 'byDeaths' ? 'deaths' : 'totalTime';
    const valueLabel = activeLbSort === 'byKills' ? 'Kills' : activeLbSort === 'byDeaths' ? 'Morts' : 'Temps';
    const fillClass = activeLbSort === 'byKills' ? 'fill-gold' : activeLbSort === 'byDeaths' ? 'fill-crimson' : 'fill-grace';

    const maxVal = entries.reduce((max, e) => {
      const v = valueKey === 'totalTime' ? e[valueKey] : e[valueKey];
      return v > max ? v : max;
    }, 1);

    html += `
      <table class="lb-table">
        <thead><tr>
          <th>#</th>
          <th>Joueur</th>
          <th>${valueLabel}</th>
          <th>Boss vaincus</th>
        </tr></thead>
        <tbody>
    `;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const isCurrent = e.discordId === lbCurrentPlayerId;
      const rawVal = e[valueKey];
      const val = valueKey === 'totalTime' ? formatTime(rawVal) : rawVal;
      const pct = maxVal > 0 ? Math.round((rawVal / maxVal) * 100) : 0;
      html += `
        <tr class="${isCurrent ? 'lb-current' : ''}">
          <td class="lb-rank">${i + 1}</td>
          <td>${esc(lbUsernames[e.discordId] || '???')}</td>
          <td><div class="lb-bar-cell"><span class="lb-bar-value">${val}</span><div class="lb-bar-track"><div class="lb-bar-fill ${fillClass}" style="width:${pct}%"></div></div></div></td>
          <td>${e.bossesDefeated}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  window.__setLbSort = (key) => {
    activeLbSort = key;
    renderLeaderboard();
  };

  // ============================
  // MANUAL KILL ENTRY
  // ============================

  window.__showAddKill = (bossName, bossZone, btn) => {
    const existing = document.querySelector('.add-kill-form');
    if (existing) existing.remove();

    const card = btn.closest('.boss-card');
    const form = document.createElement('div');
    form.className = 'add-kill-form';
    form.innerHTML = `
      <label>Tentatives :</label>
      <input type="number" min="1" value="1" id="kill-attempts">
      <button class="add-kill-confirm" onclick="window.__submitKill('${bossName.replace(/'/g, "\\'")}', '${bossZone.replace(/'/g, "\\'")}')">Confirmer</button>
      <button class="add-kill-cancel" onclick="this.closest('.add-kill-form').remove()">Annuler</button>
    `;
    card.appendChild(form);
    form.querySelector('input').focus();
  };

  window.__submitKill = async (bossName, bossZone) => {
    const input = document.getElementById('kill-attempts');
    const attempts = parseInt(input.value) || 1;
    const form = input.closest('.add-kill-form');

    const res = await fetch(`${API}/add-kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bossName, bossZone, attempts }),
    });
    const data = await res.json();
    if (data.ok) {
      form.remove();
      await fetchRoute();
      if (selectedRegionIdx !== null) renderRouteDetail(selectedRegionIdx);
      renderRegionList();
      updateRouteGlobalProgress();
      statsData = null;
    }
  };

  window.__removeKill = async (bossName, bossZone, btn) => {
    if (!confirm(`Annuler le kill de ${bossName} ?`)) return;
    btn.disabled = true;
    const res = await fetch(`${API}/remove-kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bossName, bossZone }),
    });
    const data = await res.json();
    if (data.ok) {
      await fetchRoute();
      if (selectedRegionIdx !== null) renderRouteDetail(selectedRegionIdx);
      renderRegionList();
      updateRouteGlobalProgress();
      statsData = null;
    }
  };

  // ============================
  // ITEMS TAB
  // ============================

  let itemsData = null;
  let itemsProgress = {};

  async function fetchItems() {
    if (itemsData) { renderItems(); return; }
    const container = document.getElementById('tab-items');
    container.innerHTML = '<div class="tab-loading">Chargement des items...</div>';
    try {
      const res = await fetch(`${API}/items`);
      const data = await res.json();
      if (!data.ok) throw new Error('Items fetch failed');
      itemsData = { legendary: data.legendary, dlc: data.dlc, missable: data.missable };
      itemsProgress = data.progress || {};
      renderItems();
    } catch (e) {
      container.innerHTML = '<div class="tab-loading">Erreur de chargement des items.</div>';
    }
  }

  const itemsCategoryIcons = {
    'Armements légendaires': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
    'Talismans légendaires': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'Sorcelleries et incantations légendaires': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    "Cendres d'esprits légendaires": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.8-.1 2.6-.4"/><path d="M15 2.2c1.3.7 2.5 1.7 3.4 2.9"/><path d="M20 17c-1 2-3 4.5-8 5"/><circle cx="12" cy="12" r="3"/></svg>',
    "Esquilles de l'Arbre-Occulte (DLC)": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C12 2 6 10 6 16C6 20 8 22 12 22C16 22 18 20 18 16C18 10 12 2 12 2Z"/><path d="M12 8C12 8 9 13 9 17"/></svg>',
    'Cendres spirituelles vénérées (DLC)': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>',
    'Armes de Souvenir (DLC)': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'Armes légendaires (DLC)': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'Talismans (DLC)': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    "Ensembles d'armures (DLC)": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v6c0 5.5 4.3 10.3 10 11.4 5.7-1.1 10-5.9 10-11.4V7l-10-5z"/><path d="M12 22V2"/></svg>',
  };

  // Track collapsed state per category (key → boolean)
  const itemsCategoryCollapsed = {};

  function getItemsTotals() {
    let totalItems = 0, totalDone = 0;
    const allCats = [...(itemsData.legendary || []), ...(itemsData.dlc || [])];
    for (const cat of allCats) {
      const catKey = getCatKey(cat.name);
      const collected = itemsProgress[catKey] || [];
      const flatItems = [];
      for (const item of cat.items) {
        if (item.rewards) {
          for (const r of item.rewards) flatItems.push(r);
        } else {
          flatItems.push(item);
        }
      }
      totalItems += flatItems.length;
      totalDone += flatItems.filter(i => collected.includes(i.name)).length;
    }
    return { totalItems, totalDone };
  }

  function updateItemsGlobalProgress() {
    const { totalItems, totalDone } = getItemsTotals();
    const pct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
    document.getElementById('global-progress-text').textContent = `${totalDone} / ${totalItems} items (${pct}%)`;
    document.getElementById('global-progress-bar').style.width = `${pct}%`;
  }

  function renderItems() {
    const container = document.getElementById('tab-items');
    let html = '<div class="items-container">';

    // Total progress summary
    const { totalItems, totalDone } = getItemsTotals();
    const totalPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
    html += `<div class="items-summary">`;
    html += `<div class="items-summary-header">`;
    html += `<span class="items-summary-title">Collection totale</span>`;
    html += `<span class="items-summary-count" style="color:${totalPct === 100 ? 'var(--emerald)' : 'var(--gold-bright)'}">${totalDone} / ${totalItems} items (${totalPct}%)</span>`;
    html += `</div>`;
    html += `<div class="progress-bar-large"><div class="progress-fill" style="width:${totalPct}%;${totalPct === 100 ? 'background:linear-gradient(90deg,#4ade80,#22c55e);' : ''}"></div></div>`;
    html += `</div>`;

    // Missable warning banner
    const missable = itemsData.missable || [];
    if (missable.length > 0) {
      html += `<div class="items-missable-banner">`;
      html += `<div class="items-missable-title">Items ratables</div>`;
      for (const m of missable) {
        const icon = m.permanent ? '&#x1F534;' : '&#x1F7E1;';
        const collected = (itemsProgress[getCatKey(m.category)] || []).includes(m.name);
        const cls = collected ? ' class="items-missable-done"' : '';
        html += `<div class="items-missable-row"${cls}>${icon} <strong>${esc(m.name)}</strong> <span class="items-missable-reason">— ${esc(m.reason)}</span>`;
        if (m.wiki) html += ` <a href="${m.wiki}" target="_blank" rel="noopener" class="items-wiki-link">[wiki]</a>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    // Legendary categories (base game achievements)
    html += `<div class="items-section-title">Jeu de base — Succes legendaires</div>`;
    for (const cat of itemsData.legendary) {
      html += renderItemCategory(cat, true);
    }

    // DLC categories
    html += `<div class="items-section-title" style="margin-top:2rem;">DLC — Shadow of the Erdtree</div>`;
    for (const cat of itemsData.dlc) {
      html += renderItemCategory(cat, false);
    }

    html += '</div>';
    container.innerHTML = html;
    updateItemsGlobalProgress();
  }

  function getCatKey(categoryName) {
    const map = {
      'Armements légendaires': 'legendaryWeapons',
      'Talismans légendaires': 'legendaryTalismans',
      'Sorcelleries et incantations légendaires': 'legendarySorceries',
      "Cendres d'esprits légendaires": 'legendaryAshes',
      "Esquilles de l'Arbre-Occulte (DLC)": 'dlcScadutree',
      'Cendres spirituelles vénérées (DLC)': 'dlcReveredAshes',
      'Armes de Souvenir (DLC)': 'dlcRemembranceWeapons',
      'Armes légendaires (DLC)': 'dlcLegendaryWeapons',
      'Talismans (DLC)': 'dlcTalismans',
      'Ensembles d\'armures (DLC)': 'dlcArmorSets',
    };
    return map[categoryName] || categoryName;
  }

  function renderItemCategory(cat, isLegendary) {
    const catKey = getCatKey(cat.name);
    const collected = itemsProgress[catKey] || [];
    const flatItems = [];
    for (const item of cat.items) {
      if (item.rewards) {
        for (const r of item.rewards) {
          flatItems.push({ ...r, boss: item.boss, wiki: r.wiki || item.wiki });
        }
      } else {
        flatItems.push(item);
      }
    }
    const total = flatItems.length;
    const done = flatItems.filter(i => collected.includes(i.name)).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const achievement = cat.achievement ? ` <span class="items-cat-achievement">— ${esc(cat.achievement)}</span>` : '';
    const icon = itemsCategoryIcons[cat.name] || '';

    // Default collapsed state: legendary expanded, DLC long lists collapsed
    if (!(catKey in itemsCategoryCollapsed)) {
      itemsCategoryCollapsed[catKey] = !isLegendary && (
        catKey === 'dlcTalismans' ||
        catKey === 'dlcArmorSets' ||
        catKey === 'dlcScadutree' ||
        catKey === 'dlcReveredAshes'
      );
    }
    const collapsed = itemsCategoryCollapsed[catKey];

    let html = `<div class="items-category-card${pct === 100 ? ' items-category-complete' : ''}">`;
    html += `<div class="items-category-header" onclick="window.__toggleItemCategory('${catKey}')">`;
    html += `<div class="items-category-header-left">`;
    html += `<span class="items-category-chevron${collapsed ? '' : ' items-category-chevron-open'}">\u25B6</span>`;
    if (icon) html += `<span class="items-category-icon">${icon}</span>`;
    html += `<span class="items-category-name">${esc(cat.name)}${achievement}</span>`;
    html += `</div>`;
    html += `<div class="items-category-count" style="color:${pct === 100 ? 'var(--emerald)' : 'var(--gold)'};">${done}/${total} (${pct}%)</div>`;
    html += `</div>`;
    html += `<div class="progress-track" style="margin-bottom:0.75rem;"><div class="progress-fill" style="width:${pct}%;${pct === 100 ? 'background:linear-gradient(90deg,#4ade80,#22c55e);' : ''}"></div></div>`;

    html += `<div class="items-category-body${collapsed ? ' items-category-collapsed' : ''}">`;
    html += `<div class="items-grid">`;

    for (const item of flatItems) {
      const checked = collected.includes(item.name);
      const missableFlag = item.missable ? ' <span class="items-missable-flag">RATABLE</span>' : '';
      const bossPrefix = item.boss ? `<span class="items-boss-prefix">${esc(item.boss)} &rarr;</span> ` : '';
      const typeTag = item.type ? ` <span class="items-type-tag">(${esc(item.type)})</span>` : '';
      const effectTag = item.effect ? ` <span class="items-effect-tag">— ${esc(item.effect)}</span>` : '';
      const sourceTag = item.source ? ` <span class="items-source-tag">— ${esc(item.source)}</span>` : '';
      const locationTag = item.location ? ` <span class="items-location-tag">${esc(item.location)}</span>` : '';
      const wikiLink = item.wiki ? ` <a href="${item.wiki}" target="_blank" rel="noopener" class="items-wiki-link" title="Voir sur le wiki (carte + screenshots)">[wiki]</a>` : '';

      html += `<div class="item-row${checked ? ' item-row-checked' : ''}">`;
      html += `<label class="item-checkbox-label">`;
      html += `<input type="checkbox" ${checked ? 'checked' : ''} onchange="window.__toggleItem('${catKey}','${esc(item.name).replace(/'/g, "\\'")}',this)" class="item-checkbox-input">`;
      html += `<span class="item-checkbox-custom"></span>`;
      html += `</label>`;
      html += `<div class="item-row-content">${bossPrefix}<strong class="${checked ? 'item-name-checked' : ''}">${esc(item.name)}</strong>${typeTag}${missableFlag}${effectTag}${sourceTag}${wikiLink}${locationTag}</div>`;
      html += `</div>`;
    }

    html += `</div></div></div>`;
    return html;
  }

  window.__toggleItemCategory = (catKey) => {
    itemsCategoryCollapsed[catKey] = !itemsCategoryCollapsed[catKey];
    renderItems();
  };

  window.__toggleItem = async (catKey, itemName, checkbox) => {
    const res = await fetch(`${API}/items/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryKey: catKey, itemName }),
    });
    const data = await res.json();
    if (data.ok) {
      itemsProgress = data.progress;
      renderItems();
    } else {
      checkbox.checked = !checkbox.checked;
    }
  };

  // ============================
  // DLC PREDICTIONS TAB (multi-runs)
  // ============================

  let dlcData = null;
  let dlcSelectedRunId = null;

  async function fetchDlcPredictions() {
    const container = document.getElementById('tab-dlc-predict');
    if (!dlcData) container.innerHTML = '<div class="tab-loading">Chargement des pronostics DLC...</div>';
    try {
      const res = await fetch(`${API}/dlc-predictions`);
      const data = await res.json();
      if (!data.ok) throw new Error('DLC fetch failed');
      dlcData = data;
      renderDlcPredictions();
    } catch (e) {
      container.innerHTML = '<div class="tab-loading">Erreur de chargement des pronostics DLC.</div>';
    }
  }

  function fmtScore(s) { return s.toFixed(2); }

  function pickDefaultRun(allRuns, me) {
    if (allRuns.length === 0) return null;
    // Prefer: my unlocked run > any unlocked > most recent locked
    const sortedByDate = [...allRuns].sort((a, b) => new Date(b.initializedAt) - new Date(a.initializedAt));
    return sortedByDate.find(r => r.owner === me && !r.lockedAt)
        || sortedByDate.find(r => !r.lockedAt)
        || sortedByDate[0];
  }

  function renderDlcPredictions() {
    if (!dlcData) return;
    const { me, myUsername, bosses, runs } = dlcData;
    const container = document.getElementById('tab-dlc-predict');
    const allRuns = Object.values(runs || {});

    // Auto-select default if none or stale
    if (!dlcSelectedRunId || !runs[dlcSelectedRunId]) {
      dlcSelectedRunId = pickDefaultRun(allRuns, me)?.runId || null;
    }

    const iHaveActiveRun = allRuns.some(r => r.owner === me && !r.lockedAt);

    let html = '<div class="dlc-container">';

    // ============== Header ==============
    html += '<div class="dlc-header">';
    html += '<div class="dlc-header-title">🌳 Pronostics DLC — Shadow of the Erdtree</div>';
    html += `<div class="dlc-header-meta">Tu es identifié comme <strong>${esc(myUsername || me)}</strong> <button class="dlc-edit-name-btn" onclick="window.__dlcEditName()" title="Modifier ton nom">✏️ Modifier</button></div>`;
    html += '</div>';

    // ============== Runs picker ==============
    html += '<div class="dlc-runs-bar">';
    if (allRuns.length === 0) {
      html += '<div class="dlc-no-runs">Aucune run en cours. Lance la tienne pour commencer 👇</div>';
    } else {
      html += '<div class="dlc-runs-tabs">';
      const sortedByDate = [...allRuns].sort((a, b) => new Date(b.initializedAt) - new Date(a.initializedAt));
      for (const r of sortedByDate) {
        const isSelected = r.runId === dlcSelectedRunId;
        const isMine = r.owner === me;
        const status = r.lockedAt ? '🔒' : '🟢';
        const dateLabel = new Date(r.initializedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const predCount = Object.keys(r.predictions || {}).length;
        html += `<button class="dlc-run-tab${isSelected ? ' dlc-run-tab-active' : ''}${isMine ? ' dlc-run-tab-mine' : ''}" onclick="window.__dlcSelectRun('${r.runId}')">`;
        html += `<div class="dlc-run-tab-status">${status}</div>`;
        html += `<div class="dlc-run-tab-info">`;
        html += `<div class="dlc-run-tab-owner">${esc(r.ownerUsername || r.owner)}${isMine ? ' <span class="dlc-tag-me">toi</span>' : ''}</div>`;
        html += `<div class="dlc-run-tab-date">${dateLabel} • ${predCount} parieur${predCount > 1 ? 's' : ''}</div>`;
        html += `</div>`;
        html += `</button>`;
      }
      html += '</div>';
    }

    if (!iHaveActiveRun) {
      html += '<button class="dlc-btn-primary dlc-btn-init" onclick="window.__dlcInit()">🚀 Démarrer ma run DLC</button>';
    }
    html += '</div>';

    // ============== Selected run details ==============
    if (dlcSelectedRunId && runs[dlcSelectedRunId]) {
      html += renderDlcRunDetails(runs[dlcSelectedRunId], me, myUsername, bosses);
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function renderDlcRunDetails(run, me, myUsername, bosses) {
    const isLocked = !!run.lockedAt;
    const isOwner = run.owner === me;
    const predictions = run.predictions || {};
    const actuals = run.actuals || {};
    const leaderboard = run.leaderboard || [];

    // Group bosses by zone
    const groups = new Map();
    for (const b of bosses) {
      if (!groups.has(b.group)) groups.set(b.group, []);
      groups.get(b.group).push(b);
    }

    const myEntry = predictions[me];
    const myPreds = myEntry?.predictions || {};
    const myDone = Object.keys(myPreds).length;

    let html = '<div class="dlc-run-detail">';

    // Sub-header
    const initDate = new Date(run.initializedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    html += '<div class="dlc-run-header">';
    html += `<div class="dlc-run-title">Run de <strong>${esc(run.ownerUsername || run.owner)}</strong>${isOwner ? ' <span class="dlc-tag-me">toi</span>' : ''}</div>`;
    html += `<div class="dlc-run-meta">Lancée le ${initDate}`;
    if (isLocked) {
      const lockDate = new Date(run.lockedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      html += ` • 🔒 Verrouillée le ${lockDate}`;
    } else {
      html += ' • 🟢 Ouverte aux pronostics';
    }
    html += '</div></div>';

    // === Parieurs cards ===
    const allPlayers = Object.entries(predictions);
    if (allPlayers.length > 0) {
      html += '<div class="dlc-section-title">👥 Parieurs</div>';
      html += '<div class="dlc-players-grid">';
      for (const [pid, e] of allPlayers) {
        const isMe = pid === me;
        const total = Object.keys(e.predictions || {}).length;
        const sumAttempts = Object.values(e.predictions || {}).reduce((s, v) => s + v, 0);
        html += `<div class="dlc-player-card${isMe ? ' dlc-player-me' : ''}">`;
        html += `<div class="dlc-player-head">`;
        html += `<span class="dlc-player-name">${esc(e.username)}${isMe ? ' <span class="dlc-tag-me">toi</span>' : ''}</span>`;
        html += `<span class="dlc-player-count">${total}/${bosses.length} pronos</span>`;
        html += `</div>`;
        if (total > 0) {
          html += `<div class="dlc-player-sum">Total tentatives prédites : <strong>${sumAttempts}</strong></div>`;
          html += `<details class="dlc-player-details"><summary>Voir tous ses paris</summary>`;
          html += `<ul class="dlc-player-bets">`;
          for (const b of bosses) {
            const v = e.predictions?.[b.name];
            if (v == null) continue;
            html += `<li><span class="dlc-bet-boss">${esc(b.name)}</span><span class="dlc-bet-val">${v}</span></li>`;
          }
          html += `</ul></details>`;
        }
        html += `</div>`;
      }
      html += '</div>';
    }

    // === LEADERBOARD ===
    const defeatedBosses = Object.values(actuals || {}).filter(a => a && a.defeated).length;
    if (leaderboard && leaderboard.length > 0 && defeatedBosses > 0) {
      html += '<div class="dlc-section-title">🏆 Classement live</div>';
      html += '<div class="dlc-leaderboard">';
      leaderboard.slice(0, 20).forEach((row, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const exact = row.exactCount > 0 ? `<span class="dlc-exact" title="Pronostics exacts">🎯 ×${row.exactCount}</span>` : '';
        html += '<div class="dlc-lb-row">';
        html += `<span class="dlc-lb-rank">${medal}</span>`;
        html += `<span class="dlc-lb-name">${esc(row.username)}</span>`;
        html += `<span class="dlc-lb-score">score ${fmtScore(row.total)} <span class="dlc-lb-sub">/ ${row.scoredBosses} boss</span></span>`;
        html += exact;
        html += '</div>';
      });
      html += '</div>';
    }

    // === FORM / MATRIX ===
    if (!isLocked) {
      html += `<div class="dlc-section-title">📋 Ta fiche — ${myDone}/${bosses.length} pronostics</div>`;
      html += '<div class="dlc-form-help">Remplis le nombre estimé de tentatives (morts + 1 kill). Sauvegarde auto à la sortie du champ.</div>';
    } else {
      html += '<div class="dlc-section-title">📋 Pronostics</div>';
    }

    const otherPlayers = Object.entries(predictions).filter(([id]) => id !== me);

    html += '<div class="dlc-matrix-wrap">';
    html += '<table class="dlc-matrix">';
    html += '<thead><tr>';
    html += '<th class="dlc-th-boss">Boss</th>';
    html += `<th class="dlc-th-user dlc-th-me">${esc(myUsername || 'Toi')} <span class="dlc-th-tag">(toi)</span></th>`;
    for (const [, e] of otherPlayers) {
      html += `<th class="dlc-th-user">${esc(e.username)}</th>`;
    }
    if (defeatedBosses > 0) {
      html += '<th class="dlc-th-actual">Réel</th>';
    }
    html += '</tr></thead><tbody>';

    for (const [group, gbosses] of groups) {
      const colSpan = 2 + otherPlayers.length + (defeatedBosses > 0 ? 1 : 0);
      html += `<tr class="dlc-group-row"><td colspan="${colSpan}">${esc(group)}</td></tr>`;
      for (const b of gbosses) {
        const actual = actuals && actuals[b.name];
        const star = b.required ? '⚔️ ' : (b.final ? '👑 ' : '');
        const myValue = myPreds[b.name];

        html += '<tr>';
        html += `<td class="dlc-td-boss">${star}${esc(b.name)}<div class="dlc-td-hint">typ. ${b.hint}</div></td>`;

        if (!isLocked) {
          const val = myValue != null ? String(myValue) : '';
          html += `<td class="dlc-td-input">`;
          html += `<input type="number" min="0" max="9999" value="${val}" data-boss="${esc(b.name)}" data-runid="${esc(run.runId)}" placeholder="—" onblur="window.__dlcSave(this)" onkeydown="if(event.key==='Enter')this.blur()">`;
          html += `</td>`;
        } else {
          let cls = 'dlc-td-pred';
          let label = '—';
          if (myValue != null) {
            label = String(myValue);
            if (actual && actual.defeated) {
              if (myValue === actual.attempts) cls += ' dlc-pred-exact';
              else if (Math.abs(myValue - actual.attempts) <= Math.max(2, actual.attempts * 0.2)) cls += ' dlc-pred-close';
            }
          }
          html += `<td class="${cls}">${label}</td>`;
        }

        for (const [, e] of otherPlayers) {
          const v = e.predictions?.[b.name];
          let cls = 'dlc-td-pred';
          let label = '—';
          if (v != null) {
            label = String(v);
            if (actual && actual.defeated) {
              if (v === actual.attempts) cls += ' dlc-pred-exact';
              else if (Math.abs(v - actual.attempts) <= Math.max(2, actual.attempts * 0.2)) cls += ' dlc-pred-close';
            }
          }
          html += `<td class="${cls}">${label}</td>`;
        }

        if (defeatedBosses > 0) {
          if (actual && (actual.attempts > 0 || actual.defeated)) {
            const checkmark = actual.defeated ? ' ✓' : '';
            html += `<td class="dlc-td-actual${actual.defeated ? ' dlc-defeated' : ''}">${actual.attempts}${checkmark}</td>`;
          } else {
            html += `<td class="dlc-td-actual">—</td>`;
          }
        }
        html += '</tr>';
      }
    }
    html += '</tbody></table></div>';

    // === Reset (only owner can reset their run) ===
    if (isOwner) {
      html += '<div class="dlc-footer-actions">';
      html += `<button class="dlc-btn-danger" onclick="window.__dlcReset('${esc(run.runId)}')">🔄 Reset cette run</button>`;
      html += '</div>';
    }

    html += '</div>'; // .dlc-run-detail
    return html;
  }

  window.__dlcSelectRun = (runId) => {
    dlcSelectedRunId = runId;
    renderDlcPredictions();
  };

  window.__dlcInit = async () => {
    if (!confirm('Démarrer une nouvelle run DLC ? Tu seras le owner et tes morts seront comparées aux pronostics.')) return;
    const res = await fetch(`${API}/dlc-predictions/init`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      dlcSelectedRunId = data.run.runId; // auto-select the new run
      fetchDlcPredictions();
    } else if (data.error === 'already_active') {
      alert('Tu as déjà une run active. Termine-la (lock auto au 1er boss) ou reset-la avant d\'en lancer une autre.');
      fetchDlcPredictions();
    } else {
      alert('Erreur: ' + (data.error || 'inconnue'));
    }
  };

  window.__dlcSave = async (input) => {
    const boss = input.dataset.boss;
    const runId = input.dataset.runid;
    const raw = input.value.trim();
    if (raw === '') return;
    const value = parseInt(raw, 10);
    if (isNaN(value) || value < 0 || value > 9999) {
      input.classList.add('dlc-input-error');
      return;
    }
    input.classList.remove('dlc-input-error');
    input.classList.add('dlc-input-saving');
    try {
      const res = await fetch(`${API}/dlc-predictions/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, boss, value }),
      });
      const data = await res.json();
      input.classList.remove('dlc-input-saving');
      if (!data.ok) {
        input.classList.add('dlc-input-error');
        if (data.error === 'locked') {
          alert('🔒 Cette run est verrouillée.');
          fetchDlcPredictions();
        } else if (data.error === 'run_not_found') {
          alert('Run introuvable, rechargement.');
          fetchDlcPredictions();
        }
        return;
      }
      input.classList.add('dlc-input-saved');
      setTimeout(() => input.classList.remove('dlc-input-saved'), 800);
      fetchDlcPredictions();
    } catch (e) {
      input.classList.remove('dlc-input-saving');
      input.classList.add('dlc-input-error');
    }
  };

  window.__dlcEditName = async () => {
    const current = dlcData?.myUsername || '';
    const name = prompt('Comment veux-tu apparaître dans les pronostics DLC ?', current);
    if (name === null) return; // cancel
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      alert('Nom vide, ignoré.');
      return;
    }
    if (trimmed.length > 32) {
      alert('Nom trop long (32 caractères max).');
      return;
    }
    try {
      const res = await fetch(`${API}/me/name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchDlcPredictions();
      } else {
        alert('Erreur: ' + (data.error || 'inconnue'));
      }
    } catch (e) {
      alert('Erreur réseau');
    }
  };

  window.__dlcReset = async (runId) => {
    if (!confirm('⚠️ Supprimer cette run et tous ses pronostics ? Action irréversible.')) return;
    const res = await fetch(`${API}/dlc-predictions/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    });
    const data = await res.json();
    if (data.ok) {
      dlcSelectedRunId = null;
      dlcData = null;
      fetchDlcPredictions();
    } else if (data.error === 'not_owner') {
      alert('Seul le owner de la run peut la reset.');
    } else {
      alert('Erreur: ' + (data.error || 'inconnue'));
    }
  };

  // ============================
  // INIT
  // ============================

  initEmbers();
  fetchData();
  fetchRoute();
  connectSSE();
})();
