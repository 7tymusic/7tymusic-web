(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var spark = '<svg><use href="#s-spark"/></svg>';
  var WA = 'https://wa.me/34673721316?text=';
  function blobUrl(v) { v = String(v || ''); return (PREVIEW && PREVIEW.media[v]) || v; }
  function shareBase() { return location.href.split('#')[0]; }
  var toastT = null;
  /* estadísticas: cada acción cuenta una vez por visita; quien las guarda se engancha con addTracker */
  var TRACKERS = [], trackLog = [], tracked = {}, STATS = { on: false, via: '' };
  function track(name, title) {
    if (!name || tracked[name]) return; tracked[name] = 1; trackLog.push([name, title || '']);
    TRACKERS.forEach(function (fn) { try { fn(name, title || ''); } catch (e) {} });
  }
  function addTracker(fn) { TRACKERS.push(fn); trackLog.forEach(function (e) { try { fn(e[0], e[1]); } catch (x) {} }); }
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-track]'); if (t) track(t.dataset.track, t.dataset.trackT); }, true);
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2800); }

  /* reloj */
  function tick() { var d = new Date(), t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); $('#clock').textContent = t; $('#ps-time').textContent = t; }
  tick(); setInterval(tick, 15000);

  /* marquee */
  var mq = ['Prod.7ty', 'Beats', 'Mezcla', 'Master', 'Grabación', 'Packs mensuales', 'Booking'], h = '';
  for (var k = 0; k < 2; k++) mq.forEach(function (w) { h += '<span>' + w + '</span><b>✦</b>'; });
  $('#mq').innerHTML = h;

  /* ── reproductor global (7TY.POD) ── */
  var audio = new Audio(); audio.preload = 'none';
  var Q = { list: [], i: -1, kind: '' }, retried = {};
  var ipod = $('#ipod');
  try { var sv = parseFloat(localStorage.getItem('7ty-vol')); audio.volume = isFinite(sv) ? Math.min(1, Math.max(0, sv)) : 0.85; } catch (e) { audio.volume = 0.85; }
  function fmtT(s) { if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function curItem() { return Q.list[Q.i] || null; }
  function isPlaying(kind, id) { var c = curItem(); return !!c && c.kind === kind && c.id === id && !audio.paused; }
  function isCurrent(kind, id) { var c = curItem(); return !!c && c.kind === kind && c.id === id; }
  function showPlayer() { if (ipod.hidden) { ipod.hidden = false; document.body.classList.add('has-player'); } }
  function refreshAll() { renderBeats(); renderHits(); syncIpod(); }
  function playQueue(list, i, kind) {
    var it = list[i]; if (!it) return;
    var same = isCurrent(it.kind, it.id) && audio.src;
    if (kind !== 'radio') { stopVoice(); radioTuning = false; }
    Q = { list: list, i: i, kind: kind };
    showPlayer();
    if (!it.url) { audio.pause(); audio.removeAttribute('src'); audio.load(); syncTime(); refreshAll(); return; }
    if (!same) { audio.src = it.url; audio.currentTime = 0; }
    var pr = audio.play();
    if (pr && pr.catch) pr.catch(function () { syncIpod('NO SE PUDO REPRODUCIR'); });
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: it.t, artist: it.kind === 'beat' ? 'prod.7ty · beat' : it.sub, album: kind === 'radio' ? 'Radio 7TY' : '7TY Music' }); } catch (e) {}
    }
    refreshAll();
  }
  function togglePlay() { if (!curItem() || !curItem().url) return; if (audio.paused) audio.play().catch(function () {}); else audio.pause(); }
  function step(d) { if (!Q.list.length) return; playQueue(Q.list, (Q.i + d + Q.list.length) % Q.list.length, Q.kind); }
  function syncIpod(msg) {
    var it = curItem(); if (!it) return;
    if (!it.url) msg = 'AUDIO PRÓXIMAMENTE';
    ipod.classList.toggle('playing', !audio.paused);
    var rad = radioOn();
    $('#ip-state').textContent = rad && !msg ? 'RADIO 7TY · ' + (radioTuning ? 'SINTONIZANDO…' : audio.paused ? 'PAUSA' : 'EN EL AIRE') : msg || (audio.paused ? (audio.ended ? 'FIN' : (Q.cued && !audio.currentTime ? 'LISTO · DALE AL PLAY' : 'PAUSA')) : 'NOW PLAYING');
    $('#ip-pos').textContent = rad ? 'ON AIR' : ('0' + (Q.i + 1)).slice(-2) + '/' + ('0' + Q.list.length).slice(-2);
    $('#ip-title').textContent = rad && radioTuning ? 'RADIO 7TY' : it.t;
    $('#ip-sub').textContent = rad && radioTuning ? 'ESTÁS ESCUCHANDO RADIO 7TY · PROD.7TY' : it.sub;
    syncRadioUi();
    $('#ip-hub').setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
    $('#ip-hub-i').innerHTML = '<use href="#i-' + (audio.paused ? 'play' : 'pausa') + '"/>';
    var act = $('#ip-act'), link = $('#ip-link');
    act.hidden = it.kind !== 'beat' || !!it.sold;
    $('#ip-share').hidden = it.kind !== 'beat';
    if (it.bs) { act.href = it.bs; act.target = '_blank'; act.rel = 'noopener'; $('#ip-act-l').textContent = 'Comprar ↗'; act.dataset.track = 'bs-beat-' + it.id; act.dataset.trackT = 'BeatStars · ' + it.t; }
    else { act.href = '#beats'; act.removeAttribute('target'); act.removeAttribute('rel'); $('#ip-act-l').textContent = 'Licencia'; delete act.dataset.track; }
    if (it.kind === 'beat') { link.href = '#beats'; link.textContent = 'Ver en tienda'; link.removeAttribute('target'); link.removeAttribute('rel'); }
    else { link.href = it.link || PLAYLIST; link.textContent = 'Spotify'; link.target = '_blank'; link.rel = 'noopener'; }
    link.hidden = it.kind === 'snippet';
  }
  function syncTime() {
    var d = audio.duration, c = audio.currentTime;
    var f = isFinite(d) && d > 0 ? c / d : 0;
    $('#ip-fill').style.width = (f * 100) + '%';
    if (!seeking) $('#ip-seek').value = Math.round(f * 1000);
    $('#ip-cur').textContent = fmtT(c); $('#ip-dur').textContent = '-' + fmtT((isFinite(d) ? d : 0) - c);
  }
  var seeking = false;
  $('#ip-seek').addEventListener('input', function () { seeking = true; var d = audio.duration; if (isFinite(d)) { audio.currentTime = d * this.value / 1000; } });
  $('#ip-seek').addEventListener('change', function () { seeking = false; });
  audio.addEventListener('timeupdate', syncTime); audio.addEventListener('loadedmetadata', syncTime);
  audio.addEventListener('play', function () { stopExtras(); var c = curItem(); if (c && c.url) track((c.kind === 'beat' ? 'play-beat-' : 'play-proj-') + c.id, '▶ ' + c.t); refreshAll(); }); audio.addEventListener('pause', function () { refreshAll(); });
  audio.addEventListener('waiting', function () { syncIpod('CARGANDO…'); }); audio.addEventListener('playing', function () { syncIpod(); });
  audio.addEventListener('ended', function () { if (radioOn()) { radioNext(); return; } if (Q.list.length > 1) step(1); else refreshAll(); });
  audio.addEventListener('error', function () {
    var it = curItem(); if (!it) return;
    // Los audios subidos van en MP4 con frames MP3: si el navegador no lo abre, se extraen los frames y se reproducen como MP3.
    if (/\/_blob\//.test(it.url) && !retried[it.url]) {
      retried[it.url] = true;
      fetch(it.url).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        var u = new Uint8Array(b), p = 0;
        while (p + 8 <= u.length) {
          var size = ((u[p] << 24) >>> 0) + (u[p + 1] << 16) + (u[p + 2] << 8) + u[p + 3], type = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]);
          if (type === 'mdat') { it.url = URL.createObjectURL(new Blob([u.subarray(p + 8, p + size)], { type: 'audio/mpeg' })); audio.src = it.url; audio.play().catch(function () {}); return; }
          if (size < 8) break; p += size;
        }
        syncIpod('AUDIO NO DISPONIBLE');
      }).catch(function () { syncIpod('AUDIO NO DISPONIBLE'); });
      return;
    }
    syncIpod('AUDIO NO DISPONIBLE');
  });
  $('#ip-hub').onclick = togglePlay; $('#ip-pp').onclick = togglePlay;
  $('#ip-prev').onclick = function () { if (audio.currentTime > 3) audio.currentTime = 0; else step(-1); };
  $('#ip-next').onclick = function () { step(1); };
  $('#ip-menu').onclick = function () { var it = curItem(); var t = document.getElementById(it && it.kind === 'project' ? 'proyectos' : 'beats'); if (t) t.scrollIntoView({ behavior: 'smooth' }); };
  $('#ip-close').onclick = function () { audio.pause(); ipod.hidden = true; document.body.classList.remove('has-player'); };
  $('#ip-share').onclick = function () { var it = curItem(); if (it && it.kind === 'beat') shareBeat(it.id); };
  $('#ip-act').onclick = function (e) { var it = curItem(); if (it && it.kind === 'beat' && !it.bs) { e.preventDefault(); openLic(it.id); } };
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', togglePlay); navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); }); navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); });
    } catch (e) {}
  }
  /* rueda: girar = volumen */
  var volTimer = null;
  function setVol(v) {
    audio.volume = Math.min(1, Math.max(0, v));
    try { localStorage.setItem('7ty-vol', String(audio.volume)); } catch (e) {}
    var n = Math.round(audio.volume * 10), el = $('#ip-vol');
    el.textContent = 'VOL ' + '▮'.repeat(n) + '▯'.repeat(10 - n); el.classList.add('on');
    clearTimeout(volTimer); volTimer = setTimeout(function () { el.classList.remove('on'); }, 1300);
  }
  (function () {
    var w = $('#ip-wheel'), active = false, last = 0, acc = 0, turned = false, pid = null;
    function ang(e) { var r = w.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
    w.addEventListener('pointerdown', function (e) {
      var r = w.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < r.width * 0.22) return; // botón central
      active = true; turned = false; acc = 0; last = ang(e); pid = e.pointerId;
    });
    w.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== pid) return;
      var a = ang(e), d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360; last = a; acc += d;
      if (!turned && Math.abs(acc) > 12) { turned = true; w.classList.add('turning'); try { w.setPointerCapture(pid); } catch (x) {} }
      if (turned) setVol(audio.volume + d / 300);
    });
    function end() { if (!active) return; active = false; w.classList.remove('turning'); if (turned) { w.dataset.turned = '1'; setTimeout(function () { delete w.dataset.turned; }, 0); } }
    w.addEventListener('pointerup', end); w.addEventListener('pointercancel', end);
    w.addEventListener('click', function (e) { if (w.dataset.turned) { e.stopPropagation(); e.preventDefault(); } }, true);
    w.addEventListener('keydown', function (e) {
      if (e.target !== w) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setVol(audio.volume + 0.05); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setVol(audio.volume - 0.05); e.preventDefault(); }
      if (e.key === ' ' || e.key === 'Enter') { togglePlay(); e.preventDefault(); }
    });
  })();

  /* ── bio (editable desde el panel) ── */
  var BIO = { text: "Uno de los talentos en ascenso más destacados de la **escena underground en España**. Su visión y su enfoque creativo lo han convertido en una figura clave de la nueva generación de artistas urbanos.\n\nSu música fusiona la esencia del **reggaetón** con influencias electrónicas y arriesgadas. Además de cantar, 7TY **produce y mezcla** sus propias canciones.\n\nHa colaborado con Sticky M.A., Tarchi, Orslok y Tobi. Su mayor hit hasta ahora es la producción de **«Gema Rosa» de Orslok**, con más de 10 millones de streams.", streams: '13M', listeners: '20.000', listenersShort: '20K', presskit: '' };
  var DEFAULT_PK = 'media/presskit/7ty-presskit.pdf';
  function presskitUrl() { return BIO.presskit ? blobUrl(BIO.presskit) : DEFAULT_PK; }
  function bioHtml(t) {
    return String(t || '').split(/\n\s*\n/).map(function (p) { p = p.trim(); if (!p) return ''; return '<p>' + esc(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function renderBio() {
    $('#bio-text').innerHTML = bioHtml(BIO.text);
    $('#stat-streams').textContent = BIO.streams; $('#stat-streams-h').textContent = BIO.streams;
    $('#stat-listeners').textContent = BIO.listeners; $('#stat-listeners-h').textContent = BIO.listenersShort || BIO.listeners;
    var pk = presskitUrl();
    Array.prototype.forEach.call(document.querySelectorAll('.pk-dl'), function (a) { a.href = pk; });
    var st = $('#pk-st'); if (st) { st.textContent = BIO.presskit ? 'Ahora se descarga el presskit que subiste.' : 'Ahora se descarga el presskit de serie (versión 2025).'; $('#pk-reset').hidden = !BIO.presskit; }
  }
  function renderMiniStats() {
    var ranked = HITS.slice().sort(function (a, b) { return b.v - a.v; });
    [['#mini-2', ranked[1]], ['#mini-3', ranked[2]]].forEach(function (p) {
      var el = $(p[0]); if (!p[1]) { el.hidden = true; return; } el.hidden = false;
      el.innerHTML = '<b>' + esc(p[1].n || '—') + '</b><span>«' + esc(p[1].t) + '» · ' + esc(p[1].a) + '</span>';
    });
  }

  /* ── proyectos (editables desde el panel) ── */
  var STATIC_HITS = [
    { id: 'gema-rosa', t: 'Gema Rosa', a: 'Orslok', n: '10M+', roles: ['Producción'], order: 1 },
    { id: 'madrid', t: 'Madrid', a: 'Faxu', n: '1,5M+', roles: ['Producción'], order: 2 },
    { id: 'fenix', t: 'Fénix', a: 'Tarchi', n: '700K+', roles: ['Producción'], order: 3 }
  ];
  var PLAYLIST = 'https://open.spotify.com/playlist/1fCjrFfKvooe629mZi1zDm';
  var HITS = [], ALL_P = [], projAudio = {}, cur = 0, meter = $('#p-meter');
  for (var m = 0; m < 20; m++) meter.appendChild(document.createElement('i'));
  function streamsValue(n) {
    var mm = String(n || '').replace(/\s/g, '').replace(',', '.').match(/([\d.]+)\s*([kKmM])?/); if (!mm) return 0;
    var v = parseFloat(mm[1]) || 0, u = (mm[2] || '').toUpperCase();
    return u === 'M' ? v : u === 'K' ? v / 1000 : v / 1e6;
  }
  function fileOf(t) { return normalize(t).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') + '.MP3'; }
  function setProjects(list) {
    ALL_P = list.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).map(function (x) {
      return Object.assign({}, x, { v: streamsValue(x.n), f: fileOf(x.t), cv: blobUrl(x.cover) });
    });
    projAudio = {}; ALL_P.forEach(function (x) { if (x.audio) projAudio[x.id] = x.audio; });
    var curId = HITS[cur] && HITS[cur].id;
    HITS = ALL_P.filter(function (x) { return !x.hidden; });
    if (!HITS.length) HITS = STATIC_HITS.map(function (x) { return Object.assign({}, x, { v: streamsValue(x.n), f: fileOf(x.t) }); });
    var keep = HITS.findIndex(function (x) { return x.id === curId; });
    $('#hits-count').textContent = HITS.length + (HITS.length === 1 ? ' destacado' : ' destacados');
    var top = HITS.slice().sort(function (a, b) { return b.v - a.v; })[0];
    var names = [], seen = {};
    HITS.map(function (x) { return x.a; }).concat(['Orslok', 'Faxu', 'Tarchi', 'Sticky M.A.', 'Tobi']).forEach(function (n) {
      String(n || '').split(/\s*(?:,|&|\+| y | x )\s*/i).forEach(function (p) { p = p.trim(); var k = normalize(p); if (p && !seen[k]) { seen[k] = 1; names.push(p); } });
    });
    $('#collab-tags').innerHTML = names.slice(0, 10).map(function (n) { return '<span class="tag">' + esc(n) + '</span>'; }).join('');
    renderMiniStats();
    if (top) { $('#stat-top-n').textContent = '+' + String(top.n).replace(/\+$/, ''); $('#stat-top-t').textContent = '«' + top.t + '»'; }
    sel(keep >= 0 ? keep : Math.min(cur, HITS.length - 1));
    if (panelOpen) renderPanelProjects();
  }
  function projQueue() {
    return HITS.map(function (x) {
      return { kind: 'project', id: x.id, t: x.t, sub: x.a + ' · prod.7ty' + (x.n ? ' · ' + x.n + ' streams' : ''), url: blobUrl(projAudio[x.id]), link: x.sp || PLAYLIST };
    });
  }
  function rolesOf(x) { return Array.isArray(x.roles) ? x.roles : ['Producción']; }
  function playProject(id) { var q = projQueue(), i = q.findIndex(function (x) { return x.id === id; }); if (i < 0) return false; if (isCurrent('project', id)) togglePlay(); else playQueue(q, i, 'project'); return true; }
  function renderHits() {
    if (!HITS.length) return;
    $('#hits').innerHTML = HITS.map(function (x, i) {
      var has = !!projAudio[x.id], on = isPlaying('project', x.id);
      var cr = rolesOf(x).map(function (r) { return '<span>' + esc(r) + '</span>'; }).join('') + (x.year ? '<span class="y">' + esc(x.year) + '</span>' : '');
      return '<button class="hit" type="button" data-i="' + i + '" aria-pressed="' + (i === cur) + '" aria-label="' + (on ? 'Pausar ' : 'Escuchar ') + esc(x.t) + '"><span class="knob' + (on ? ' main' : '') + '" aria-hidden="true"><svg><use href="#i-' + (on ? 'pausa' : 'play') + '"/></svg></span>' +
        '<span class="hit-cv" aria-hidden="true">' + (x.cv ? '<img src="' + esc(x.cv) + '" alt="" loading="lazy">' : '<b>' + esc(String(x.t).charAt(0)) + '</b><svg><use href="#s-spark"/></svg>') + '</span>' +
        '<span><span class="hit-t">' + esc(x.t) + '</span><span class="hit-a">' + esc(x.a) + ' · <span class="hit-src">' + (has ? 'escuchar aquí' : 'audio próximamente') + '</span></span>' + (cr ? '<span class="hit-cr">' + cr + '</span>' : '') + '</span><span class="hit-n">' + esc(x.n || '—') + '<small>streams</small></span></button>';
    }).join('');
    var x = HITS[cur], on = isPlaying('project', x.id);
    var go = $('#p-go');
    go.setAttribute('aria-label', (on ? 'Pausar ' : 'Escuchar ') + x.t);
    go.innerHTML = '<svg><use href="#i-' + (on ? 'pausa' : 'play') + '"/></svg>';
    $('#p-file').textContent = (on ? '▶ ' : '') + x.f;
    $('#p-sp').href = x.sp || PLAYLIST;
  }
  function sel(i) {
    if (!HITS.length) return;
    cur = (i + HITS.length) % HITS.length; var x = HITS[cur];
    $('#p-art').textContent = String(x.a).toUpperCase();
    var cv = $('#p-cv');
    if (x.cv) { if (cv.getAttribute('src') !== x.cv) cv.src = x.cv; cv.alt = 'Portada de «' + x.t + '»'; cv.hidden = false; }
    else { cv.hidden = true; cv.removeAttribute('src'); cv.alt = ''; }
    $('#p-screen').classList.toggle('has-cv', !!x.cv);
    $('#p-now').textContent = ('0' + (cur + 1)).slice(-2) + '/' + ('0' + HITS.length).slice(-2) + (x.n ? ' · ' + x.n + ' STREAMS' : '');
    var on = Math.max(2, Math.min(20, Math.round(Math.sqrt(x.v / 10) * 20)));
    Array.prototype.forEach.call(meter.children, function (el, j) { el.className = j < on ? 'on' : ''; });
    renderHits();
  }
  $('#hits').addEventListener('click', function (e) { var b = e.target.closest('.hit'); if (!b) return; sel(+b.dataset.i); playProject(HITS[cur].id); });
  $('#p-prev').onclick = function () { sel(cur - 1); }; $('#p-next').onclick = function () { sel(cur + 1); };
  $('#p-go').addEventListener('click', function () { if (HITS[cur]) playProject(HITS[cur].id); });
  setProjects(STATIC_HITS);

  /* licencias */
  var LIC = [
    { id: 'std', n: 'Lease Standard', p: 40, f: 'MP3 320 kbps', s: 'Hasta 80.000 streams' },
    { id: 'pre', n: 'Lease Premium', p: 60, f: 'WAV 48 kHz / 24 bits', s: 'Hasta 150.000 streams' },
    { id: 'stm', n: 'Lease Stems', p: 170, f: 'Pistas por separado en WAV 48 kHz / 24 bits', s: 'Hasta 250.000 streams' },
    { id: 'exc', n: 'Lease Exclusivo', p: null, f: 'Pistas por separado en WAV 48 kHz / 24 bits', s: 'Sin límite de streams' }
  ];
  var eur = function (p) { return p == null ? 'A consultar' : p + '€'; };
  var licCards = LIC.map(function (l) {
    var excl = l.id === 'exc';
    return '<article class="lic' + (excl ? ' excl' : '') + '">' +
      (excl ? '<span class="script acc" role="img" aria-label="exclusive"><span class="cut" aria-hidden="true">exclusive</span><span class="edge" aria-hidden="true">exclusive</span><span class="face" aria-hidden="true">exclusive</span></span>' : '') +
      '<h3>' + l.n.replace('Lease ', 'Lease<br>') + '</h3><div class="p' + (l.p == null ? ' ask' : '') + '">' + eur(l.p) + '</div>' +
      '<ul><li>' + spark + l.f + '</li><li>' + spark + l.s + '</li><li>' + spark + (excl ? 'El beat se retira de la venta' : 'Documento de licencia incluido') + '</li></ul>' +
      '<a class="btn ' + (excl ? 'btn-neon' : 'btn-chrome') + '" href="#beats">' + (excl ? 'Consultar' : 'Elegir beat') + '</a></article>';
  });
  licCards.push('<article class="lic feat"><div class="in"><span class="sticker flag">100% regalías</span><h3>Beat custom<br>+ exclusiva</h3><div class="p">280€</div>' +
    '<p class="note">Producción desde cero, a medida para tu proyecto.</p><ul><li>' + spark + 'Instrumental 100% personalizado</li><li>' + spark + 'Licencia exclusiva</li><li>' + spark + 'El 100% de las regalías es tuyo</li></ul>' +
    '<a class="btn btn-hot" href="#contacto" data-svc="Beat custom">Encargar beat</a></div></article>');
  $('#lic').innerHTML = licCards.join('');

  /* ── beats: catálogo real ── */
  var STORE = { profile: '', count: 228, price: '40€' };
  var DEFAULT_STORE = 'https://www.beatstars.com/prod7ty';
  var STATIC_BEATS = [
    { id: 'b308-starter', code: '308', t: 'Starter', tags: ['Smooth'], bpm: 115, key: 'F#m', src: 'media/beats/308-starter.mp3', order: 308 },
    { id: 'b311-dancehall', code: '311', t: 'Dancehall', tags: ['Dancehall', 'Prophet'], bpm: 98, key: 'Gm', src: 'media/beats/311-dancehall.mp3', order: 311 },
    { id: 'b313-hopecore', code: '313', t: 'Hopecore', tags: ['Hopecore'], bpm: 144, key: 'C#m', src: 'media/beats/313-hopecore.mp3', order: 313 },
    { id: 'b316-club', code: '316', t: 'Club', tags: ['Club', 'Hyper'], bpm: 134, key: 'Gm', src: 'media/beats/316-club.mp3', order: 316 },
    { id: 'b317-calathea', code: '317', t: 'Calathea', tags: ['Experimental', 'Dark'], bpm: 84, key: 'Cm', src: 'media/beats/317-calathea.mp3', order: 317 },
    { id: 'b318-bellakona', code: '318', t: 'Bellakona', tags: ['Trap 2016'], bpm: 120, key: 'Gm', src: 'media/beats/318-bellakona.mp3', order: 318 },
    { id: 'b319-sugarbaby', code: '319', t: 'Sugarbaby', tags: ['Reggaetón', 'Anmi'], bpm: 93, key: 'A#m', src: 'media/beats/319-sugarbaby.mp3', order: 319 },
    { id: 'b320-glock9', code: '320', t: 'Glock9', tags: ['Trap 2016'], bpm: 120, key: 'Cm', src: 'media/beats/320-glock9.mp3', order: 320 },
    { id: 'b324-lightning', code: '324', t: 'Lightning', tags: ['Experimental', 'Virtual'], bpm: 85, key: 'F#m', src: 'media/beats/324-lightning.mp3', order: 324 },
    { id: 'b327-galla', code: '327', t: 'Gal·la', tags: [], bpm: 143, key: 'Em', src: 'media/beats/327-galla.mp3', order: 327 },
    { id: 'b328-volt', code: '328', t: 'Volt', tags: ['Plug', 'Warner'], bpm: 140, key: 'Gm', src: 'media/beats/328-volt.mp3', order: 328 },
    { id: 'b329-focus', code: '329', t: 'Focus', tags: ['Emotional'], bpm: 147, key: '', src: 'media/beats/329-focus.mp3', order: 329 },
    { id: 'b332-sintigo', code: '332', t: 'Sintigo', tags: ['Reggaetón', 'Dancehall'], bpm: 94, key: 'Fm', src: 'media/beats/332-sintigo.mp3', order: 332 }
  ];
  var ALL = STATIC_BEATS.slice(), BEATS = ALL.slice(), fil = 'Todos', showAll = false, sample10 = [];
  function beatUrl(b) { return blobUrl(b.src); }
  function beatMeta(b) { return [b.bpm ? b.bpm + ' BPM' : '', b.key].filter(Boolean).join(' · '); }
  function normalize(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  var shuffled = [];
  function shuffleSample() {
    var ids = BEATS.map(function (b) { return b.id; });
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    BEATS.filter(function (b) { return isNew(b); }).sort(function (a, b) { return atOf(a) - atOf(b); }).forEach(function (b) { var k = ids.indexOf(b.id); if (k > 0) { ids.splice(k, 1); ids.unshift(b.id); } });
    if (pinnedId && ids.indexOf(pinnedId) > 0) { ids.splice(ids.indexOf(pinnedId), 1); ids.unshift(pinnedId); }
    shuffled = ids; sample10 = ids.slice(0, 10);
  }
  var pinnedId = null, linkedId = null, doneHash = '';
  function rank(id) { var r = shuffled.indexOf(id); return r < 0 ? 1e9 : r; }
  function setCatalog(list) {
    ALL = list.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var prev = BEATS.map(function (b) { return b.id; }).join();
    BEATS = ALL.filter(function (b) { return !b.hidden && (b.audio || b.src) && !isUpcoming(b); });
    var known = BEATS.every(function (b) { return shuffled.indexOf(b.id) >= 0; }); if (!known || BEATS.map(function (b) { return b.id; }).sort().join() !== prev.split(',').sort().join()) shuffleSample();
    renderChips(); renderBeats(); if (panelOpen) renderPanelList();
    renderDrop(); if (typeof renderWall === 'function' && WALL) { renderWall(); applyNight(); } checkHash();
  }
  function renderChips() {
    var count = {};
    BEATS.forEach(function (b) { (b.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
    var top = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || a.localeCompare(b, 'es'); }).slice(0, 7);
    var nf = (FAVS || []).filter(function (id) { return BEATS.some(function (b) { return b.id === id; }); }).length;
    if (fil === '__fav' && !nf) fil = 'Todos'; if (fil === '__shared' && !SHARED) fil = 'Todos';
    if (fil !== 'Todos' && fil !== '__fav' && fil !== '__shared' && top.indexOf(fil) < 0) fil = 'Todos';
    var extra = (nf ? '<button class="tag" type="button" aria-pressed="' + (fil === '__fav') + '" data-s="__fav">♥ Favoritos (' + nf + ')</button>' : '') + (SHARED ? '<button class="tag" type="button" aria-pressed="' + (fil === '__shared') + '" data-s="__shared">✦ Lista compartida (' + SHARED.length + ')</button>' : '');
    $('#chips').innerHTML = ['Todos'].concat(top).map(function (s) { return '<button class="tag" type="button" aria-pressed="' + (s === fil) + '" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + extra;
  }
  function beatQueue(list) {
    return list.map(function (b) { return { kind: 'beat', id: b.id, t: (b.code ? b.code + ' · ' : '') + b.t, sub: [beatMeta(b)].concat(b.tags || []).filter(Boolean).join(' · ') || 'prod.7ty', url: beatUrl(b), sold: b.sold, bs: b.bs }; });
  }
  var shown = [];
  function renderBeats() {
    var q = normalize($('#q').value.trim()), filtering = !!q || fil !== 'Todos';
    var list = BEATS.filter(function (b) {
      var hay = normalize([b.code, b.t, b.bpm, b.key].concat(b.tags || []).join(' '));
      var okf = fil === 'Todos' ? true : fil === '__fav' ? isFav(b.id) : fil === '__shared' ? !!SHARED && SHARED.indexOf(b.id) >= 0 : (b.tags || []).indexOf(fil) >= 0;
      return okf && (!q || hay.indexOf(q) >= 0);
    });
    if (window.syncFavBarReady) syncFavBar();
    list.sort(function (a, b) { return rank(a.id) - rank(b.id); });
    if (!filtering && !showAll && BEATS.length > 10) {
      list = sample10.map(function (id) { return BEATS.find(function (b) { return b.id === id; }); }).filter(Boolean);
    }
    shown = list;
    $('#rows').innerHTML = list.length ? list.map(function (b) {
      var on = isPlaying('beat', b.id), curb = isCurrent('beat', b.id);
      return '<div class="row' + (curb ? ' playing' : '') + (b.sold ? ' sold' : '') + (b.id === linkedId ? ' linked' : '') + '" data-row="' + esc(b.id) + '">' +
        '<button class="knob' + (on ? ' main' : '') + '" type="button" data-play="' + esc(b.id) + '" aria-label="' + (on ? 'Pausar ' : 'Escuchar ') + esc(b.t) + '"><svg><use href="#i-' + (on ? 'pausa' : 'play') + '"/></svg></button>' +
        '<div style="min-width:0"><h3 class="row-t">' + esc(b.t) + '</h3><div class="row-m">' + (on ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' : '') +
        (b.code ? '<span class="row-code">#' + esc(b.code) + '</span>' : '') + '<span class="row-bpm">' + esc(beatMeta(b)) + '</span>' +
        (isNew(b) ? '<span class="tag baby">Nuevo</span>' : '') + (b.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + (b.sold ? '<span class="tag hot">Vendido</span>' : '') + '</div></div>' +
        '<div class="price">' + (b.sold ? '—' : esc(STORE.price)) + '<small>' + (b.sold ? 'Exclusiva vendida' : 'Desde') + '</small></div>' +
        '<div class="buy">' + (b.bs && !b.sold ? '<a class="btn btn-hot btn-sm" href="' + esc(b.bs) + '" target="_blank" rel="noopener" data-track="bs-beat-' + esc(b.id) + '" data-track-t="BeatStars · ' + esc((b.code ? b.code + ' · ' : '') + b.t) + '" aria-label="Comprar ' + esc(b.t) + ' en BeatStars"><svg class="i"><use href="#i-carrito"/></svg>Comprar ↗</a>' :
          '<button class="btn btn-hot btn-sm" type="button" data-buy="' + esc(b.id) + '"' + (b.sold ? ' disabled' : '') + '><svg class="i"><use href="#i-carrito"/></svg>' + (b.sold ? 'No disponible' : 'Licencia') + '</button>') +
        '<button class="share fav" type="button" data-fav="' + esc(b.id) + '" aria-pressed="' + isFav(b.id) + '" aria-label="' + (isFav(b.id) ? 'Quitar de favoritos ' : 'Guardar en favoritos ') + esc(b.t) + '" title="Favorito"><svg><use href="#i-corazon"/></svg></button>' +
        '<button class="share mic" type="button" data-booth="' + esc(b.id) + '" aria-label="Grabar tu voz encima de ' + esc(b.t) + '" title="Grabar encima"><svg><use href="#i-mic"/></svg></button>' +
        '<button class="share" type="button" data-share="' + esc(b.id) + '" aria-label="Compartir ' + esc(b.t) + '" title="Compartir enlace"><svg><use href="#i-compartir"/></svg></button></div></div>';
    }).join('') : '<div class="empty">Ningún beat coincide con esa búsqueda.</div>';
    var partial = !filtering && !showAll && BEATS.length > 10;
    $('#st-l').textContent = partial ? '10 AL AZAR DE ' + BEATS.length : list.length + (list.length === 1 ? ' BEAT' : ' BEATS') + (filtering ? ' ENCONTRADOS' : '');
    var more = $('#st-more'); more.hidden = !(BEATS.length > 10 && !filtering);
    more.textContent = showAll ? 'Ver 10 al azar' : 'Ver los ' + BEATS.length;
    var c = curItem(); $('#st-r').textContent = c && c.kind === 'beat' ? (audio.paused ? '❚❚ ' : '▶ ') + c.t.toUpperCase() : 'PREVIEWS CON TAG';
  }
  $('#q').addEventListener('input', renderBeats);
  $('#st-more').addEventListener('click', function () { showAll = !showAll; if (!showAll) shuffleSample(); renderBeats(); });
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]'); if (!b) return; fil = b.dataset.s;
    Array.prototype.forEach.call(this.children, function (c) { c.setAttribute('aria-pressed', String(c.dataset.s === fil)); }); renderBeats();
  });
  $('#rows').addEventListener('click', function (e) {
    var p = e.target.closest('[data-play]'), b = e.target.closest('[data-buy]'), sh = e.target.closest('[data-share]'), fv = e.target.closest('[data-fav]'), bo = e.target.closest('[data-booth]');
    if (sh) { shareBeat(sh.dataset.share); return; }
    if (fv) { toggleFav(fv.dataset.fav); return; }
    if (bo) { openBooth(bo.dataset.booth); return; }
    if (p) {
      var id = p.dataset.play;
      if (isCurrent('beat', id)) togglePlay();
      else { var q = beatQueue(shown), i = q.findIndex(function (x) { return x.id === id; }); playQueue(q, i, 'beat'); }
    }
    if (b) openLic(b.dataset.buy);
  });
  /* enlace directo a un beat (#beat-308) y compartir */
  function beatLink(b) { return shareBase() + '#beat-' + encodeURIComponent(b.code || b.id); }
  function shareBeat(id) {
    var b = ALL.find(function (x) { return x.id === id; }); if (!b) return;
    var url = beatLink(b), title = (b.code ? b.code + ' · ' : '') + b.t + ' · prod.7ty';
    track('share-beat-' + b.id, 'Compartir · ' + (b.code ? b.code + ' · ' : '') + b.t);
    var fallback = function () { copy(url, null, function (ok) { toast(ok ? 'ENLACE COPIADO ✦ PÉGALO DONDE QUIERAS' : url); }); };
    if (navigator.share) navigator.share({ title: title, text: 'Escucha este beat de 7TY: ' + title, url: url }).catch(function (e) { if (!e || e.name !== 'AbortError') fallback(); });
    else fallback();
  }
  function cueBeat(id) {
    var q = beatQueue(shown), i = q.findIndex(function (x) { return x.id === id; }); if (i < 0) return;
    if (!isCurrent('beat', id) || audio.paused) { Q = { list: q, i: i, kind: 'beat', cued: true }; showPlayer(); if (q[i].url && audio.getAttribute('src') !== q[i].url) audio.src = q[i].url; refreshAll(); syncIpod('LISTO · DALE AL PLAY'); }
  }
  function checkHash() {
    if (typeof checkFavHash === 'function' && FAVS && checkFavHash()) return;
    var h = location.hash || '', m = h.match(/^#beat-([^&]+)$/);
    if (!m || doneHash === h) return;
    var k = normalize(decodeURIComponent(m[1]).trim());
    var b = BEATS.find(function (x) { return normalize(x.code || '') === k; }) || BEATS.find(function (x) { return normalize(x.id) === k; });
    if (!b) return;
    doneHash = h; pinnedId = linkedId = b.id;
    $('#q').value = ''; fil = 'Todos'; showAll = false; shuffleSample(); renderChips(); renderBeats(); cueBeat(b.id);
    setTimeout(function () { var r = Array.prototype.find.call(document.querySelectorAll('[data-row]'), function (el) { return el.dataset.row === b.id; }); if (r) r.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80);
    setTimeout(function () { linkedId = null; }, 4000);
  }
  window.addEventListener('hashchange', checkHash);
  shuffleSample(); renderChips(); renderBeats();
  sel(0); checkHash();
  track('visita', document.title);

  /* diálogo de licencia */
  var modal = $('#modal'), lastFocus = null, beatId = null;
  $('#m-opts').innerHTML = LIC.map(function (l, i) {
    return '<label class="opt" for="o-' + l.id + '"><input type="radio" name="lic" id="o-' + l.id + '" value="' + i + '"' + (i === 1 ? ' checked' : '') + '>' +
      '<span><b>' + l.n + '</b><span>' + l.f + ' · ' + l.s + '</span></span><em>' + eur(l.p) + '</em></label>';
  }).join('');
  function beatById(id) { return ALL.find(function (b) { return b.id === id; }) || BEATS[0]; }
  function order() {
    var l = LIC[+($('input[name=lic]:checked') || { value: 1 }).value], b = beatById(beatId), meta = beatMeta(b);
    return 'Hola 7TY, quiero el beat "' + (b.code ? b.code + ' · ' : '') + b.t + '"' + (meta ? ' (' + meta + ')' : '') + ' con la licencia ' + l.n + ' (' + eur(l.p) + ').';
  }
  function syncOrder() { $('#m-wa').href = WA + encodeURIComponent(order()); }
  function storeUrl() { return STORE.profile || DEFAULT_STORE; }
  function applyStore() {
    var a = $('#bs-all'); a.href = storeUrl();
    $('#bs-count').textContent = STORE.count ? String(STORE.count) : 'todos';
    renderBeats(); syncIpod();
  }
  function syncBuy(b) {
    var url = b.bs || storeUrl(), bs = $('#m-bs'), wa = $('#m-wa');
    bs.hidden = !url; if (url) bs.href = url;
    if (b.bs) { bs.dataset.track = 'bs-beat-' + b.id; bs.dataset.trackT = 'BeatStars · ' + (b.code ? b.code + ' · ' : '') + b.t; } else { bs.dataset.track = 'tienda-beatstars'; bs.dataset.trackT = 'Abrir la tienda de BeatStars'; }
    $('#m-bs-l').textContent = b.bs ? 'Comprar en BeatStars' : 'Ver mi tienda en BeatStars';
    wa.className = 'btn ' + (url ? 'btn-chrome' : 'btn-hot');
    $('#m-copy').hidden = !!url;
    $('#m-note').textContent = url ? (b.bs ? 'El pago se hace en BeatStars: eliges allí la licencia y recibes al momento los archivos y el contrato. Si prefieres otra forma de pago, escríbele por WhatsApp.' : 'Busca este beat en la tienda de 7TY en BeatStars para pagarlo y descargarlo al momento, o pídelo por WhatsApp.') : '7TY te confirma la disponibilidad y la forma de pago, y te envía los archivos con el documento de licencia.';
  }
  $('#m-opts').addEventListener('change', syncOrder);
  function openLic(id) { beatId = id; lastFocus = document.activeElement; var b = beatById(id); $('#m-beat').textContent = (b.code ? b.code + ' · ' : '') + b.t; modal.hidden = false; syncOrder(); syncBuy(b); $('input[name=lic]:checked').focus(); }
  function closeLic() { modal.hidden = true; if (lastFocus) lastFocus.focus(); }
  $('#m-close').onclick = closeLic;
  modal.addEventListener('click', function (e) { if (e.target === modal) closeLic(); });
  document.addEventListener('keydown', function (e) {
    if (!$('#lightbox').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { lbStep(e.key === 'ArrowLeft' ? -1 : 1); return; }
    if (e.key !== 'Escape') return;
    if (!$('#booth').hidden) closeBooth(); else if (!$('#reward').hidden) closeReward(); else if (!$('#trash').hidden) closeTrash(); else if (!$('#lightbox').hidden) closeLb(); else if (!$('#legal').hidden) closeLegal(); else if (!modal.hidden) closeLic(); 
  });

  function copy(text, btn, done) {
    var ok = function () { if (done) done(true); else { var o = btn.textContent; btn.textContent = 'Copiado'; setTimeout(function () { btn.textContent = o; }, 1600); } };
    var fail = function () { if (done) done(false); };
    try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
  }
  $('#m-copy').onclick = function () { var b = this; copy(order(), b, function (ok) { $('#m-note').textContent = ok ? 'Pedido copiado. Pégalo en un email a 7tybooking@gmail.com o en un mensaje a +34 673 72 13 16.' : 'No se pudo copiar. Escribe a 7tybooking@gmail.com indicando el beat y la licencia.'; }); };

  /* estudio */
  var SVC = [
    ['Mix Master Básico', 'Hasta 7 pistas, efectos vocales y 3 revisiones.', '190€'],
    ['Mix Master Avanzado', 'Pistas sin límite, efectos de producción y creativos, y 4 revisiones.', '220€'],
    ['Master Básico', '1 pista y 1 revisión.', '45€'],
    ['Master por stems', 'Hasta 6 pistas por separado y 2 revisiones.', '65€'],
    ['Producción completa', 'Beat a medida + mezcla y master, con licencia exclusiva y el 100% de las regalías.', '400€', 1],
    ['Grabación', 'Sesión de grabación, precio por hora.', '40€/h'],
    ['Revisión extra', 'Cada revisión más allá de las incluidas en el servicio.', '7€']
  ];
  $('#svc').innerHTML = SVC.map(function (s) { return '<div class="svc' + (s[3] ? ' big' : '') + '"><h3>' + s[0] + '</h3><p>' + s[1] + '</p><span class="p">' + s[2] + '</span></div>'; }).join('');

  /* packs */
  var PACKS = [
    { n: 'Basic', p: 250, inc: ['3 h de grabación', '1 mix master básico (hasta 7 pistas)'], real: 310, save: 60, h: 40, mx: 175 },
    { n: 'Standard', p: 560, inc: ['6 h de grabación', '2 mix master básicos', '1 Lease Premium (WAV)'], real: 680, save: 120, h: 38, mx: 165 },
    { n: 'Premium', p: 990, inc: ['10 h de grabación', '3 mix master avanzados', '1 Lease Stems (WAV + stems)', 'Ofertas en beats exclusivos'], real: 1230, save: 240, h: 35, mx: 200 },
    { n: 'VIP', p: 1900, inc: ['20 h de grabación', '5 mix master avanzados', '2 beats custom con licencia exclusiva', 'Prioridad al reservar horarios', 'Ofertas en beats exclusivos'], real: 2400, save: 500, h: 30, mx: 185 }
  ];
  var fmt = function (n) { return n.toLocaleString('es-ES'); };
  function renderPacks() {
    var perm = $('#perm').checked;
    $('#perm-l').textContent = perm ? 'Con permanencia de 3 meses' : 'Sin permanencia (+10%)';
    $('#packs-list').innerHTML = PACKS.map(function (k) {
      var price = perm ? k.p : Math.round(k.p * 1.1);
      return '<article class="pack' + (k.n === 'VIP' ? ' vip' : '') + '"><h3>' + k.n + '</h3><div class="pack-p">' + fmt(price) + '€<small>/mes</small></div>' +
        '<ul>' + k.inc.map(function (x) { return '<li>' + spark + x + '</li>'; }).join('') + '</ul>' +
        (perm ? '<span class="sticker baby save">Ahorras ' + k.save + '€</span>' : '') +
        '<div class="pack-x"><span>Valor real: <b>' + fmt(k.real) + '€</b></span><span>Hora extra: <b>' + k.h + '€</b> · Mix master extra: <b>' + k.mx + '€</b></span></div>' +
        '<a class="btn ' + (k.n === 'VIP' ? 'btn-hot' : 'btn-chrome') + '" href="#contacto" data-svc="Pack mensual" data-pack="' + k.n + '">Quiero el ' + k.n + '</a></article>';
    }).join('');
  }
  $('#perm').addEventListener('change', renderPacks); renderPacks();

  /* guía y condiciones */
  var GUIDE = [
    ['Lease', 'Licencia de uso no exclusiva de un beat: el productor puede seguir vendiéndolo a otros artistas. Cada tipo (Standard, Premium, Stems) fija el formato de archivo y el límite de streams.'],
    ['Exclusiva', 'El beat se retira de la venta y pasas a ser su único licenciatario, según lo pactado en la licencia.'],
    ['Beat custom', 'Instrumental producido desde cero y a medida para tu proyecto.'],
    ['Stems / pistas', 'Archivos de audio separados por grupos (batería, bajos, melodías, voces…) para mezclar, masterizar o preparar directos.'],
    ['Mezcla', 'Equilibrar, procesar y combinar las voces y el beat para que suenen como una sola canción.'],
    ['Master', 'El último pulido del tema: volumen, tono y coherencia, para que suene bien en todas las plataformas y equipos.'],
    ['Revisión', 'Un cambio de ajustes que pides sobre una mezcla o un master ya entregado. Cada servicio incluye un número de revisiones.'],
    ['Regalías', 'Los ingresos que genera la canción. Con el beat custom exclusivo y la producción completa, el 100% de las regalías es tuyo.'],
    ['Pack / suscripción', 'Paquete mensual de horas de grabación, mezclas y beats a precio cerrado, más económico que contratar cada servicio por separado.']
  ];
  var TERMS = [
    ['Forma de pago', '50% de adelanto al empezar y 50% en la entrega, o el 100% antes de la entrega. El plazo máximo de pago es de 7 días.'],
    ['Descuento por compromiso', 'Se aplica solo si te comprometes por escrito a un número concreto de temas y pagas en un máximo de 7 días.'],
    ['Revisiones', 'Cada servicio incluye las revisiones indicadas en su descripción. Cada revisión extra se cobra a 7€.'],
    ['Tus archivos', 'Envía las pistas en WAV, ordenadas y sin limitador ni procesado en el bus master, indicando el tempo y tus referencias.'],
    ['Licencias de beats', 'Los leases se rigen por el documento de licencia de cada tipo (formato, uso no exclusivo y límite de streams). El beat custom con licencia exclusiva y la producción completa incluyen el 100% de las regalías.'],
    ['Créditos', 'El tema se acredita como prod.7ty en el título o en la descripción de todas las plataformas.'],
    ['Suscripciones y bonos', 'Cobro mensual por adelantado. Las horas y mezclas que no uses caducan al final del mes. Permanencia mínima de 3 meses al precio indicado, o un 10% más sin permanencia. Los bonos de horas caducan a los 3 meses.'],
    ['Plazos de entrega', 'Los plazos de mezcla, master, beat custom y producción completa se confirman al contratar cada servicio.']
  ];
  var acc = function (arr) { return arr.map(function (x) { return '<details><summary>' + x[0] + '</summary><p>' + x[1] + '</p></details>'; }).join(''); };
  $('#guide').innerHTML = acc(GUIDE); $('#terms').innerHTML = acc(TERMS);

  /* contacto */
  var form = $('#cform'), psm = $('#ps-msg');
  function msg() { return 'Hola 7TY, soy ' + $('#c-name').value.trim() + '. Te escribo por: ' + $('#c-what').value + '.\n\n' + $('#c-msg').value.trim(); }
  function valid() {
    var miss = !$('#c-name').value.trim() ? $('#c-name') : (!$('#c-msg').value.trim() ? $('#c-msg') : null);
    if (miss) { psm.textContent = miss.id === 'c-name' ? 'FALTA TU NOMBRE' : 'FALTA EL MENSAJE'; miss.focus(); return false; }
    return true;
  }
  function syncWa() { $('#c-wa').href = WA + encodeURIComponent(msg()); }
  form.addEventListener('input', function () { syncWa(); psm.textContent = ''; });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  $('#c-wa').addEventListener('click', function (e) { if (!valid()) { e.preventDefault(); return; } syncWa(); track('contacto-whatsapp', 'Contacto por WhatsApp · ' + $('#c-what').value); psm.textContent = 'ABRIENDO WHATSAPP… SI NO SE ABRE, USA COPIAR'; });
  $('#c-copy').addEventListener('click', function () { if (!valid()) return; copy(msg(), this, function (ok) { psm.textContent = ok ? 'MENSAJE COPIADO ✦ PÉGALO EN UN EMAIL' : 'NO SE PUDO COPIAR'; }); });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.copy'); if (c) copy(c.dataset.copy, c);
    var s = e.target.closest('[data-svc]');
    if (s) { var opt = Array.prototype.find.call($('#c-what').options, function (o) { return o.text === s.dataset.svc; }); if (opt) $('#c-what').value = opt.text;
      if (s.dataset.pack && !$('#c-msg').value) $('#c-msg').value = 'Me interesa el pack ' + s.dataset.pack + '.'; syncWa(); }
  });
  syncWa();

  /* ── audio web compartido (radio, adelanto del drop, antes y después) ── */
  var actx = null, bufCache = {};
  function getCtx() {
    if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { actx = new AC(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume().catch(function () {});
    return actx;
  }
  function decodeBuf(ctx, buf) { return new Promise(function (res, rej) { var p = ctx.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); }); }
  function loadBuffer(url) {
    if (!url) return Promise.reject(new Error('no_url'));
    if (bufCache[url]) return bufCache[url];
    var ctx = getCtx(); if (!ctx) return Promise.reject(new Error('no_audio'));
    bufCache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error('http'); return r.arrayBuffer(); }).then(function (b) {
      return decodeBuf(ctx, b.slice(0)).catch(function () {
        // audios subidos al artefacto: MP4 con frames MP3 dentro
        var u = new Uint8Array(b), p = 0;
        while (p + 8 <= u.length) {
          var size = ((u[p] << 24) >>> 0) + (u[p + 1] << 16) + (u[p + 2] << 8) + u[p + 3], type = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]);
          if (type === 'mdat') return decodeBuf(ctx, u.slice(p + 8, p + size).buffer);
          if (size < 8) break; p += size;
        }
        throw new Error('decode');
      });
    });
    bufCache[url].catch(function () { delete bufCache[url]; });
    return bufCache[url];
  }
  function shuffleArr(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function stopExtras(except) { if (except !== 'ab') abStop(); if (except !== 'teaser') teaserStop(); }

  /* ── Radio 7TY: todo el catálogo y los proyectos en aleatorio, sin parar ── */
  var RADIO = { voices: [], every: 3 }, radioN = 0, radioTuning = false, lastVoice = -1;
  function radioOn() { return Q.kind === 'radio'; }
  function radioPool(avoid) {
    var all = beatQueue(BEATS).concat(projQueue()).filter(function (x) { return x.url; });
    shuffleArr(all);
    if (avoid && all.length > 1 && all[0].id === avoid) all.push(all.shift());
    return all;
  }
  function syncRadioUi() {
    var on = radioOn();
    $('#radio-btn').setAttribute('aria-pressed', String(on)); $('#ip-radio').setAttribute('aria-pressed', String(on));
    ipod.classList.toggle('radio', on); ipod.classList.toggle('tuning', on && radioTuning);
  }
  function radioSweep(cb) {
    var done = false, fin = function () { if (done) return; done = true; radioTuning = false; cb(); };
    radioTuning = true; syncIpod(); setTimeout(fin, 1300);
    var ctx = getCtx(); if (!ctx) return;
    try {
      var len = Math.floor(ctx.sampleRate * 0.9), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900));
      var src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime, vol = audio.volume * 0.22;
      src.buffer = b; bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(280, t); bp.frequency.exponentialRampToValueAtTime(3600, t + 0.75);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.0001, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.88);
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(1320, t + 0.7); og.gain.setValueAtTime(0.0001, t); og.gain.setValueAtTime(vol * 0.35 || 0.0001, t + 0.7); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.86);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination); o.connect(og); og.connect(ctx.destination);
      src.start(t); src.stop(t + 0.9); o.start(t + 0.7); o.stop(t + 0.88);
      src.onended = function () { setTimeout(fin, 60); };
    } catch (e) { fin(); }
  }
  var voiceSrc = null;
  function stopVoice() { if (voiceSrc) { try { voiceSrc.onended = null; voiceSrc.stop(); } catch (e) {} voiceSrc = null; } }
  function playOnce(url, vol, onend) {
    var ctx = getCtx(); if (!ctx) return Promise.reject(new Error('no_audio'));
    return loadBuffer(url).then(function (buf) { var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(ctx.destination); if (onend) s.onended = onend; s.start(); return { src: s, dur: buf.duration }; });
  }
  function radioVoice(cb) {
    var vs = RADIO.voices; if (!vs.length || !getCtx()) return radioSweep(cb);
    var k = vs.length > 1 ? (lastVoice + 1 + Math.floor(Math.random() * (vs.length - 1))) % vs.length : 0; lastVoice = k;
    var done = false, fin = function () { if (done) return; done = true; radioTuning = false; voiceSrc = null; cb(); };
    radioTuning = true; syncIpod();
    playOnce(blobUrl(vs[k].src), audio.volume, fin).then(function (r) { if (done) { try { r.src.stop(); } catch (e) {} return; } voiceSrc = r.src; setTimeout(fin, (r.dur + 1.5) * 1000); },
      function () { if (!done) { done = true; radioTuning = false; radioSweep(cb); } });
  }
  function startRadio() {
    var list = radioPool(curItem() && curItem().id); if (!list.length) { toast('LA RADIO AÚN NO TIENE CANCIONES'); return; }
    track('radio-on', 'Encender Radio 7TY'); stopExtras();
    radioN = 0; audio.pause(); Q = { list: list, i: 0, kind: 'radio' }; showPlayer(); syncRadioUi();
    (RADIO.voices.length ? radioVoice : radioSweep)(function () { if (radioOn()) playQueue(Q.list, 0, 'radio'); });
  }
  function stopRadio() { if (!radioOn()) return; audio.pause(); stopVoice(); radioTuning = false; Q.kind = 'list'; syncRadioUi(); syncIpod(); }
  function radioNext() {
    radioN++;
    var next = function () {
      if (!radioOn()) return;
      if (Q.i + 1 >= Q.list.length) { var c = curItem(); Q.list = radioPool(c && c.id); Q.i = -1; }
      playQueue(Q.list, Q.i + 1, 'radio');
    };
    if (RADIO.voices.length && RADIO.every > 0 && radioN % RADIO.every === 0) radioVoice(next); else radioSweep(next);
  }
  document.addEventListener('click', function (e) { if (e.target.closest('#radio-btn, #ip-radio, [data-radio]')) { if (radioOn()) stopRadio(); else startRadio(); } });

  /* ── drop del viernes: beats con fecha de salida ── */
  var DROP = { hideName: false, teaser: true, channel: '', channelLabel: '', newDays: 7 }, IN_FRAME = window.top !== window;
  function atOf(b) { var t = b && b.at ? Date.parse(b.at) : NaN; return isFinite(t) ? t : 0; }
  function isUpcoming(b, now) { return atOf(b) > (now || Date.now()); }
  function isNew(b, now) { now = now || Date.now(); var t = atOf(b); return !!t && t <= now && now - t < ((DROP && DROP.newDays) || 7) * 864e5; }
  function nextDrop() { var now = Date.now(); return ALL.filter(function (b) { return !b.hidden && (b.audio || b.src) && isUpcoming(b, now); }).sort(function (a, b) { return atOf(a) - atOf(b); })[0] || null; }
  function lastDrop() { var now = Date.now(); return BEATS.filter(function (b) { return isNew(b, now); }).sort(function (a, b) { return atOf(b) - atOf(a); })[0] || null; }
  function dropWhen(t) {
    var d = new Date(t), s = d.toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return s.replace(',', ' ·').toUpperCase();
  }
  function calTimes(t) { var f = function (x) { return new Date(x).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }; return [f(t), f(t + 30 * 60000)]; }
  function dropCalHtml(b) {
    var t = atOf(b), tt = calTimes(t), title = 'Drop de 7TY: ' + (DROP.hideName ? 'nuevo beat' : b.t), link = beatLink(b);
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + tt[0] + '/' + tt[1] + '&details=' + encodeURIComponent('Nuevo beat de prod.7ty. Escúchalo aquí: ' + link);
    var h = '<a class="btn btn-ghost btn-sm" href="' + esc(g) + '" target="_blank" rel="noopener" data-track="drop-cal" data-track-t="Recordatorio del drop">Google Calendar ↗</a>';
    if (!IN_FRAME) {
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//7TY//Drop//ES', 'BEGIN:VEVENT', 'UID:drop-' + b.id + '@7ty', 'DTSTAMP:' + calTimes(Date.now())[0], 'DTSTART:' + tt[0], 'DTEND:' + tt[1],
        'SUMMARY:' + title.replace(/[,;]/g, ' '), 'DESCRIPTION:Escúchalo aquí: ' + link, 'URL:' + link, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + title.replace(/[,;]/g, ' '), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      h += '<a class="btn btn-ghost btn-sm" href="' + URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })) + '" download="drop-7ty.ics" data-track="drop-cal" data-track-t="Recordatorio del drop">iPhone / Outlook (.ics)</a>';
    }
    return h;
  }
  var dropKey = '', dropTarget = 0;
  function pad2(n) { return ('0' + n).slice(-2); }
  function renderDrop() {
    var el = $('#drop'), up = nextDrop(), last = lastDrop(), now = Date.now(), chip = $('#drop-chip');
    if (!up && !last) { el.hidden = true; chip.hidden = true; dropKey = ''; dropTarget = 0; return; }
    el.hidden = false;
    var key = (up ? 'u' + up.id + atOf(up) + up.t : 'l' + last.id + last.t + !!last.bs) + '|' + DROP.hideName + DROP.teaser + DROP.channel + DROP.channelLabel + DROP.newDays + (up && last ? last.id : '');
    if (key !== dropKey) {
      dropKey = key; dropTarget = up ? atOf(up) : 0;
      if (up) {
        var hide = DROP.hideName;
        $('#drop-k').innerHTML = '<span>Próximo drop</span><span class="tag">' + esc(dropWhen(atOf(up))) + '</span>';
        $('#drop-t').textContent = hide ? '???' : up.t; $('#drop-t').classList.toggle('mystery', hide);
        $('#drop-m').textContent = hide ? 'NOMBRE SECRETO HASTA EL DROP' : [up.code ? '#' + up.code : '', beatMeta(up)].concat(up.tags || []).filter(Boolean).join(' · ');
        var acts = '';
        if (DROP.teaser) acts += '<button class="btn btn-hot teaser" type="button" id="drop-teaser" data-id="' + esc(up.id) + '"><svg class="i"><use href="#i-volumen"/></svg><span>Escucha el adelanto</span></button>';
        acts += '<button class="btn btn-ghost" type="button" id="drop-remind"><svg class="i"><use href="#i-calendario"/></svg>Recuérdamelo</button>';
        if (DROP.channel) acts += '<a class="btn btn-ghost" href="' + esc(DROP.channel) + '" target="_blank" rel="noopener" data-track="drop-aviso" data-track-t="Avisos de drops">' + esc(DROP.channelLabel || 'Avísame') + ' ↗</a>';
        if (last) acts += '<button class="btn btn-ghost" type="button" data-play-drop="' + esc(last.id) + '">▶ Último drop: ' + esc(last.t) + '</button>';
        $('#drop-acts').innerHTML = acts; $('#drop-cal').hidden = true; $('#drop-cal').innerHTML = dropCalHtml(up);
        if (teaserWant) { var tb = $('#drop-teaser'); if (tb) { tb.classList.add('on'); tb.lastChild.textContent = teaserOn ? 'Sonando… (para)' : 'Cargando…'; } }
        $('#drop-r').innerHTML = '<div class="cd" role="timer" aria-label="Cuenta atrás"><div><b id="cd-d">00</b><span>Días</span></div><div><b id="cd-h">00</b><span>Horas</span></div><div><b id="cd-m">00</b><span>Min</span></div><div><b id="cd-s">00</b><span>Seg</span></div></div><div class="cd-cap">' + (hide ? 'SALE UN BEAT NUEVO' : 'SALE «' + esc(String(up.t).toUpperCase()) + '»') + '</div>';
      } else {
        $('#drop-k').innerHTML = '<span>Nuevo drop</span><span class="tag">' + esc(dropWhen(atOf(last))) + '</span>';
        $('#drop-t').textContent = last.t; $('#drop-t').classList.remove('mystery');
        $('#drop-m').textContent = [last.code ? '#' + last.code : '', beatMeta(last)].concat(last.tags || []).filter(Boolean).join(' · ');
        var buy = last.bs && !last.sold ? '<a class="btn btn-ghost" href="' + esc(last.bs) + '" target="_blank" rel="noopener" data-track="bs-beat-' + esc(last.id) + '" data-track-t="BeatStars · ' + esc(last.t) + '"><svg class="i"><use href="#i-carrito"/></svg>Comprar ↗</a>' : '<button class="btn btn-ghost" type="button" data-buy-drop="' + esc(last.id) + '"><svg class="i"><use href="#i-carrito"/></svg>Licencia</button>';
        $('#drop-acts').innerHTML = '<button class="btn btn-hot" type="button" data-play-drop="' + esc(last.id) + '"><svg class="i"><use href="#i-play"/></svg>Escúchalo</button>' + buy + '<button class="btn btn-ghost" type="button" data-share-drop="' + esc(last.id) + '"><svg class="i"><use href="#i-compartir"/></svg>Compartir</button>' + (DROP.channel ? '<a class="btn btn-ghost" href="' + esc(DROP.channel) + '" target="_blank" rel="noopener" data-track="drop-aviso" data-track-t="Avisos de drops">' + esc(DROP.channelLabel || 'Avísame del próximo') + ' ↗</a>' : '');
        $('#drop-cal').hidden = true;
        $('#drop-r').innerHTML = '<div class="drop-live">Ya está<br>aquí</div><div class="cd-cap">NUEVO EN LA BEAT STORE ✦</div>';
      }
    }
    if (up) {
      var left = Math.max(0, atOf(up) - now), s = Math.floor(left / 1000), dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
      $('#cd-d').textContent = pad2(dd); $('#cd-h').textContent = pad2(hh); $('#cd-m').textContent = pad2(mm); $('#cd-s').textContent = pad2(ss);
      chip.hidden = false; $('#drop-chip-t').textContent = 'DROP ' + (dd ? dd + 'D ' + pad2(hh) + 'H' : pad2(hh) + ':' + pad2(mm) + ':' + pad2(ss)); chip.href = '#drop';
    } else { chip.hidden = false; $('#drop-chip-t').textContent = 'NUEVO DROP'; }
  }
  setInterval(function () {
    if (dropTarget && Date.now() >= dropTarget) {
      var b = ALL.find(function (x) { return atOf(x) === dropTarget; }); dropTarget = 0; dropKey = '';
      setCatalog(ALL);
      if (b) { toast('✦ YA HA SALIDO «' + String(b.t).toUpperCase() + '»'); var el = $('#drop'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      return;
    }
    if (!$('#drop').hidden) renderDrop();
  }, 1000);
  $('#drop').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.id === 'drop-teaser') { if (teaserOn || teaserWant) teaserStop(); else teaserPlay(t.dataset.id); return; }
    if (t.id === 'drop-remind') { $('#drop-cal').hidden = !$('#drop-cal').hidden; return; }
    if (t.dataset.playDrop) { var q = beatQueue(BEATS), i = q.findIndex(function (x) { return x.id === t.dataset.playDrop; }); if (i >= 0) { if (isCurrent('beat', q[i].id)) togglePlay(); else playQueue(q, i, 'beat'); } return; }
    if (t.dataset.buyDrop) { openLic(t.dataset.buyDrop); return; }
    if (t.dataset.shareDrop) shareBeat(t.dataset.shareDrop);
  });
  /* adelanto: 12 s «a través de la pared» y un segundo final abierto */
  var teaserOn = null, teaserWant = null;
  function teaserStop() {
    if (!teaserOn && !teaserWant) return; var x = teaserOn; teaserOn = null; teaserWant = null;
    if (x) try { x.g.gain.cancelScheduledValues(0); x.src.stop(); } catch (e) {}
    var bt = $('#drop-teaser'); if (bt) { bt.classList.remove('on'); bt.lastChild.textContent = 'Escucha el adelanto'; }
  }
  function teaserPlay(id) {
    var b = ALL.find(function (x) { return x.id === id; }), bt = $('#drop-teaser'); if (!b || !bt) return;
    var ctx = getCtx(); if (!ctx) { toast('ESTE NAVEGADOR NO PUEDE REPRODUCIR EL ADELANTO'); return; }
    track('drop-teaser', 'Adelanto del drop'); audio.pause(); stopRadio(); stopExtras('teaser');
    teaserWant = id; bt.classList.add('on'); bt.lastChild.textContent = 'Cargando…';
    loadBuffer(beatUrl(b)).then(function (buf) {
      if (teaserWant !== id) return;
      var t = ctx.currentTime + 0.05, off = Math.min(Math.max(0, buf.duration * 0.3), Math.max(0, buf.duration - 13));
      var src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), v = Math.max(0.05, audio.volume);
      src.buffer = buf; lp.type = 'lowpass'; lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(330, t); lp.frequency.setValueAtTime(330, t + 10.4); lp.frequency.exponentialRampToValueAtTime(16000, t + 10.9);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.5); g.gain.setValueAtTime(v, t + 11.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 12.2);
      src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start(t, off, 12.4);
      teaserOn = { src: src, g: g }; var nb = $('#drop-teaser'); if (nb) nb.lastChild.textContent = 'Sonando… (para)';
      src.onended = function () { if (teaserOn && teaserOn.src === src) teaserStop(); };
    }, function () { teaserStop(); toast('NO SE PUDO CARGAR EL ADELANTO'); });
  }

  /* ── antes y después: la toma en bruto y la mezcla, sincronizadas ── */
  var AB = [], abI = 0, abSt = { playing: false, after: true, start: 0, off: 0, src: [], g: [], bufs: null, raf: 0, dur: 0, loading: false };
  function abDur() { return abSt.bufs ? Math.min(abSt.bufs[0].duration, abSt.bufs[1].duration) : 0; }
  function abPos() { return abSt.playing ? Math.min(abDur(), abSt.off + (actx.currentTime - abSt.start)) : abSt.off; }
  function abStop(keep) {
    if (!abSt.playing) return;
    abSt.off = keep ? abPos() : abSt.off; abSt.playing = false; cancelAnimationFrame(abSt.raf);
    abSt.src.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) {} }); abSt.src = [];
    abSync();
  }
  function abSync() {
    var p = abDur() ? abPos() / abDur() : 0;
    $('#ab-head').style.left = (p * 100) + '%'; $('#ab-wave').setAttribute('aria-valuenow', String(Math.round(p * 100)));
    $('#ab-time').textContent = fmtT(abPos()) + ' / ' + fmtT(abDur());
    $('#ab-play').innerHTML = '<svg><use href="#i-' + (abSt.playing ? 'pausa' : 'play') + '"/></svg>'; $('#ab-play').setAttribute('aria-label', abSt.playing ? 'Pausar' : 'Escuchar la comparación');
  }
  function abDraw() {
    var c = $('#ab-canvas'), g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H);
    if (!abSt.bufs) return;
    [[abSt.bufs[0], 'rgba(198,198,208,.45)'], [abSt.bufs[1], '#ff0a8a']].forEach(function (pair, k) {
      var d = pair[0].getChannelData(0), n = Math.min(d.length, Math.floor(abDur() * pair[0].sampleRate)), step = Math.max(1, Math.floor(n / W)), peak = 0, cols = [];
      for (var x = 0; x < W; x++) { var m = 0; for (var i = x * step, e = Math.min(n, i + step); i < e; i += 8) { var v = Math.abs(d[i]); if (v > m) m = v; } cols.push(m); if (m > peak) peak = m; }
      g.fillStyle = pair[1];
      cols.forEach(function (m, x) { var h = Math.max(1, m * (H - 8) * (k ? 1 : 0.92)); if (x % 3 !== 2) g.fillRect(x, (H - h) / 2, 1, h); });
    });
  }
  function abLoad(i) {
    abStop(); abI = i; abSt.off = 0; abSt.bufs = null; abDraw();
    var x = AB[i]; if (!x) return Promise.reject(new Error('none'));
    $('#ab-t').textContent = x.t; $('#ab-a').textContent = x.a ? x.a + ' · mezcla y master de 7TY' : 'Mezcla y master de 7TY';
    Array.prototype.forEach.call(document.querySelectorAll('#ab-tabs .tag'), function (b) { b.setAttribute('aria-pressed', String(+b.dataset.ab === i)); });
    $('#ab-time').textContent = 'CARGANDO…'; abSt.loading = true;
    return Promise.all([loadBuffer(blobUrl(x.before)), loadBuffer(blobUrl(x.after))]).then(function (bufs) {
      if (abI !== i) return; abSt.bufs = bufs; abSt.loading = false; abDraw(); abSync();
    }, function (e) { abSt.loading = false; $('#ab-time').textContent = 'NO SE PUDO CARGAR'; throw e; });
  }
  function abStart() {
    var ctx = getCtx(); if (!ctx || !abSt.bufs) return;
    if (abSt.off >= abDur() - 0.05) abSt.off = 0;
    audio.pause(); stopRadio(); stopExtras('ab'); track('ab-play', 'Antes y después');
    var v = Math.max(0.05, audio.volume), t = ctx.currentTime + 0.03;
    abSt.src = []; abSt.g = [];
    abSt.bufs.forEach(function (buf, k) {
      var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = (k === 1) === abSt.after ? v : 0;
      s.connect(g); g.connect(ctx.destination); s.start(t, abSt.off); abSt.src.push(s); abSt.g.push(g);
    });
    abSt.src[1].onended = function () { if (abSt.playing && abPos() >= abDur() - 0.1) { abStop(); abSt.off = 0; abSync(); } };
    abSt.start = t; abSt.playing = true;
    (function loop() { abSync(); if (abSt.playing) abSt.raf = requestAnimationFrame(loop); })();
  }
  function abSet(after) {
    abSt.after = after; var sw = $('#ab-switch'); sw.setAttribute('aria-checked', String(after));
    sw.setAttribute('aria-label', after ? 'Escuchar la toma en bruto' : 'Escuchar la versión mezclada y masterizada');
    $('#ab-win').classList.toggle('is-after', after); $('#ab-win').classList.toggle('is-before', !after);
    if (abSt.playing && actx) { var v = Math.max(0.05, audio.volume), t = actx.currentTime; abSt.g.forEach(function (g, k) { g.gain.setTargetAtTime((k === 1) === after ? v : 0, t, 0.012); }); }
  }
  $('#ab-switch').onclick = function () { abSet(!abSt.after); };
  $('#ab-play').onclick = function () {
    if (abSt.playing) { abStop(true); return; }
    if (abSt.bufs) abStart(); else if (!abSt.loading) abLoad(abI).then(abStart, function () {});
  };
  function abSeek(f) { var was = abSt.playing; abStop(); abSt.off = Math.max(0, Math.min(1, f)) * abDur(); abSync(); if (was) abStart(); }
  $('#ab-wave').addEventListener('click', function (e) { if (!abSt.bufs) return; var r = this.getBoundingClientRect(); abSeek((e.clientX - r.left) / r.width); });
  $('#ab-wave').addEventListener('keydown', function (e) { if (!abSt.bufs) return; var d = abDur(); if (e.key === 'ArrowRight') { abSeek((abPos() + 5) / d); e.preventDefault(); } if (e.key === 'ArrowLeft') { abSeek((abPos() - 5) / d); e.preventDefault(); } });
  $('#ab-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-ab]'); if (b && +b.dataset.ab !== abI) abLoad(+b.dataset.ab).catch(function () {}); });
  function renderAB(list) {
    AB = list; $('#ab-win').hidden = !AB.length;
    $('#ab-tabs').innerHTML = AB.length > 1 ? AB.map(function (x, i) { return '<button class="tag" type="button" data-ab="' + i + '" aria-pressed="' + (i === abI) + '">' + esc(x.t) + '</button>'; }).join('') : '';
    if (!AB.length) { abStop(); return; }
    if (abI >= AB.length) abI = 0;
    var x = AB[abI]; $('#ab-t').textContent = x.t; $('#ab-a').textContent = x.a ? x.a + ' · mezcla y master de 7TY' : 'Mezcla y master de 7TY';
    var key = AB.map(function (y) { return y.before + y.after; }).join();
    if (renderAB.key !== key) { renderAB.key = key; abStop(); abSt.bufs = null; abSt.off = 0; abDraw(); $('#ab-time').textContent = '0:00'; }
  }
  renderDrop();

  /* ── extras de la fase 3 (editables desde el panel) ── */
  var EXTRAS = { sparks: { on: true, reward: '', code: '', link: '' }, trash: [], night: true, saver: true, status: { state: '', slots: null, note: '', until: '', updated: '' } };
  var WALL = [];
  function cleanStr(v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; }
  function httpsOk(v) { return typeof v === 'string' && /^https:\/\//.test(v) ? v.slice(0, 300) : ''; }
  function parseWall(items, okImg) {
    return (Array.isArray(items) ? items : []).filter(function (x) { return x && x.t && x.a; }).slice(0, 60).map(function (x, i) {
      return { id: cleanStr(x.id, 40) || 'w' + i, t: cleanStr(x.t, 60), a: cleanStr(x.a, 40), beat: cleanStr(x.beat, 60), link: httpsOk(x.link), date: cleanStr(x.date, 20), cover: okImg(x.cover) ? x.cover : '' };
    });
  }
  function parseExtras(x, okAudio) {
    x = x || {}; var sp = x.sparks || {}, st = x.status || {};
    return {
      sparks: { on: sp.on !== false, reward: cleanStr(sp.reward, 300), code: cleanStr(sp.code, 30), link: httpsOk(sp.link) },
      trash: (Array.isArray(x.trash) ? x.trash : []).filter(function (t) { return t && okAudio(t.src); }).slice(0, 30).map(function (t) { return { src: t.src, t: cleanStr(t.t, 60), d: cleanStr(t.d, 20) }; }),
      night: x.night !== false, saver: x.saver !== false, booking: { url: bookingUrl((x.booking || {}).url) || '' },
      status: { state: cleanStr(st.state, 12), slots: st.slots > 0 && st.slots < 100 ? Math.round(st.slots) : null, note: cleanStr(st.note, 50), until: /^\d{4}-\d{2}-\d{2}$/.test(st.until || '') ? st.until : '', updated: isFinite(Date.parse(st.updated)) ? st.updated : '' }
    };
  }
  /* reservas: la agenda de citas de Google Calendar */
  function bookingUrl(raw) {
    var v = String(raw || '').trim(), m = v.match(/src\s*=\s*["']([^"']+)["']/i); if (m) v = m[1];
    v = v.replace(/&amp;/g, '&'); if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v.replace(/^http:/i, 'https:')); } catch (e) { return null; }
    if (u.hostname !== 'calendar.google.com' && u.hostname !== 'calendar.app.google') return null;
    return u.href;
  }
  function bookingEmbed(url) {
    try { var u = new URL(url); if (u.hostname === 'calendar.google.com' && /\/calendar\/appointments\//.test(u.pathname)) { u.searchParams.set('gv', 'true'); return u.href; } } catch (e) {}
    return '';
  }
  function renderBooking() {
    var url = (EXTRAS.booking || {}).url || '', emb = url && !IN_FRAME ? bookingEmbed(url) : '';
    $('#reservar').hidden = $('#book-card').hidden = !url;
    if (!url) return;
    $('#book-ext').href = url; $('#book-go').hidden = !emb;
    var fr = $('#book-frame'), ifr = fr.querySelector('iframe'); if (ifr && ifr.dataset.src !== emb) { fr.innerHTML = ''; fr.hidden = true; $('#book-go').hidden = !emb; }
  }
  function openBookingFrame() {
    var url = (EXTRAS.booking || {}).url, emb = url && !IN_FRAME ? bookingEmbed(url) : '', fr = $('#book-frame'); if (!emb) return false;
    if (!fr.querySelector('iframe')) { var f = document.createElement('iframe'); f.src = emb; f.dataset.src = emb; f.title = 'Agenda de reservas de 7TY'; f.loading = 'lazy'; fr.appendChild(f); }
    fr.hidden = false; $('#book-go').hidden = true; track('reserva-abrir', 'Abrir la agenda de reservas'); return true;
  }
  $('#book-go').onclick = openBookingFrame;
  document.addEventListener('click', function (e) { if (e.target.closest('[data-book-open]')) setTimeout(openBookingFrame, 400); });
  function anyModal() { return !!document.querySelector('.modal:not([hidden])'); }
  var saveFile = function (blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return Promise.resolve('saved');
  };

  /* ── favoritos: se guardan en este navegador y se pueden compartir como lista ── */
  var FAVS = [], SHARED = null;
  try { FAVS = (JSON.parse(localStorage.getItem('7ty-favs') || '[]') || []).filter(function (x) { return typeof x === 'string'; }).slice(0, 300); } catch (e) { FAVS = []; }
  function saveFavs() { try { localStorage.setItem('7ty-favs', JSON.stringify(FAVS)); } catch (e) {} }
  function isFav(id) { return !!FAVS && FAVS.indexOf(id) >= 0; }
  function toggleFav(id) {
    var b = ALL.find(function (x) { return x.id === id; }); if (!b) return;
    if (isFav(id)) FAVS.splice(FAVS.indexOf(id), 1); else { FAVS.push(id); track('fav-beat-' + id, '♥ ' + (b.code ? b.code + ' · ' : '') + b.t); toast('♥ GUARDADO EN TUS FAVORITOS'); }
    saveFavs(); renderChips(); renderBeats();
  }
  function favKeys(ids) { return ids.map(function (id) { var b = ALL.find(function (x) { return x.id === id; }); return b ? (b.code || b.id) : ''; }).filter(Boolean); }
  function syncFavBar() {
    var bar = $('#fav-bar'), n;
    if (fil === '__fav') { n = BEATS.filter(function (b) { return isFav(b.id); }).length; bar.hidden = false; bar.innerHTML = '<span>♥ TUS FAVORITOS · ' + n + (n === 1 ? ' BEAT' : ' BEATS') + '</span><span class="acts">' + (n ? '<button class="btn btn-chrome btn-sm" type="button" id="fav-share"><svg class="i"><use href="#i-compartir"/></svg>Compartir mi lista</button>' : '') + '</span>'; }
    else if (fil === '__shared' && SHARED) { n = SHARED.length; bar.hidden = false; bar.innerHTML = '<span>✦ LISTA QUE TE HAN PASADO · ' + n + (n === 1 ? ' BEAT' : ' BEATS') + '</span><span class="acts"><button class="btn btn-chrome btn-sm" type="button" id="fav-save">♥ Guardar en mis favoritos</button></span>'; }
    else bar.hidden = true;
  }
  $('#fav-bar').addEventListener('click', function (e) {
    if (e.target.closest('#fav-share')) {
      var keys = favKeys(FAVS.filter(function (id) { return BEATS.some(function (b) { return b.id === id; }); })); if (!keys.length) return;
      var url = shareBase() + '#favs-' + keys.map(encodeURIComponent).join(','); track('favs-share', 'Compartir lista de favoritos');
      var fb = function () { copy(url, null, function (ok) { toast(ok ? 'ENLACE DE TU LISTA COPIADO ✦' : url); }); };
      if (navigator.share) navigator.share({ title: 'Mis beats favoritos de 7TY', url: url }).catch(function (er) { if (!er || er.name !== 'AbortError') fb(); }); else fb();
    }
    if (e.target.closest('#fav-save') && SHARED) { SHARED.forEach(function (id) { if (!isFav(id)) FAVS.push(id); }); saveFavs(); fil = '__fav'; renderChips(); renderBeats(); toast('♥ LISTA GUARDADA EN TUS FAVORITOS'); }
  });
  function checkFavHash() {
    var m = (location.hash || '').match(/^#favs-(.+)$/); if (!m || doneHash === location.hash) return false;
    var ks = decodeURIComponent(m[1]).split(',').map(function (k) { return normalize(k.trim()); }).filter(Boolean), ids = [];
    ks.forEach(function (k) { var b = BEATS.find(function (x) { return normalize(x.code || '') === k; }) || BEATS.find(function (x) { return normalize(x.id) === k; }); if (b && ids.indexOf(b.id) < 0) ids.push(b.id); });
    if (!ids.length) return false;
    doneHash = location.hash; SHARED = ids; fil = '__shared'; $('#q').value = ''; renderChips(); renderBeats();
    setTimeout(function () { var el = document.getElementById('beats'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 80);
    return true;
  }

  /* ── cabina: graba tu voz encima del beat, todo en tu dispositivo ── */
  var BO = { id: null, buf: null, voice: null, rec: null, stream: null, recStart: 0, beatStart: 0, lat: 0, dur: 0, srcs: [], playing: false, state: 'idle', raf: 0, an: null, lv: [], focus: null, t0: 0 };
  function boLcd(big, small) { $('#bo-lcd').innerHTML = esc(big) + (small ? '<small>' + esc(small) + '</small>' : ''); }
  function boMsg(t) { $('#bo-msg').textContent = t || ''; }
  function boStopPlay() { BO.srcs.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) {} }); BO.srcs = []; BO.playing = false; $('#bo-play').lastChild.textContent = 'Escuchar mi toma'; $('#bo-play').firstChild.innerHTML = '<use href="#i-play"/>'; }
  function boReset() {
    cancelAnimationFrame(BO.raf); boStopPlay();
    if (BO.rec && BO.rec.state !== 'inactive') { BO.rec.onstop = null; try { BO.rec.stop(); } catch (e) {} }
    if (BO.beatSrc) { try { BO.beatSrc.onended = null; BO.beatSrc.stop(); } catch (e) {} BO.beatSrc = null; }
    if (BO.stream) BO.stream.getTracks().forEach(function (t) { t.stop(); });
    BO.rec = BO.stream = BO.voice = null; BO.state = 'idle'; BO.lv = [];
    $('#bo-screen').classList.remove('rec'); $('#bo-mix').hidden = true; $('#bo-out').hidden = true; $('#bo-play').disabled = true;
    $('#bo-rec').disabled = false; $('#bo-rec').lastChild.textContent = 'Grabar'; boMsg('');
  }
  function boDraw(head) {
    var c = $('#bo-canvas'), g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H);
    var dur = BO.state === 'rec' || !BO.voice ? (BO.buf ? BO.buf.duration : 1) : BO.dur;
    function wave(buf, color, off, scale) {
      var d = buf.getChannelData(0), sr = buf.sampleRate; g.fillStyle = color;
      for (var x = 0; x < W; x += 3) { var a = Math.floor((off + x / W * dur) * sr), e = Math.floor((off + (x + 3) / W * dur) * sr), m = 0; for (var i = Math.max(0, a); i < Math.min(d.length, e); i += 16) { var v = Math.abs(d[i]); if (v > m) m = v; } var h = Math.max(1, m * (H - 10) * scale); g.fillRect(x, (H - h) / 2, 2, h); }
    }
    if (BO.buf) wave(BO.buf, 'rgba(198,198,208,.28)', 0, 0.9);
    if (BO.voice) wave(BO.voice, '#ff0a8a', voiceOff(), 1.3);
    if (BO.state === 'rec' && BO.lv.length) { g.fillStyle = '#ff2a3d'; var el = Math.max(0, actx.currentTime - BO.beatStart); BO.lv.forEach(function (p) { var x = p[0] / dur * W, h = Math.max(2, p[1] * (H - 10) * 2.4); g.fillRect(x, (H - h) / 2, 2, h); }); g.fillStyle = '#fff'; g.fillRect(el / dur * W, 0, 2, H); }
    if (head != null) { g.fillStyle = '#fff'; g.fillRect(head * W, 0, 2, H); }
  }
  function openBooth(id) {
    var b = ALL.find(function (x) { return x.id === id; }); if (!b) return;
    audio.pause(); stopRadio(); stopExtras(); boReset(); BO.id = id; BO.buf = null; BO.focus = document.activeElement;
    $('#bo-beat').textContent = (b.code ? b.code + ' · ' : '') + b.t; $('#bo-meta').textContent = beatMeta(b);
    var buy = $('#bo-buy'); if (b.bs && !b.sold) { buy.href = b.bs; buy.target = '_blank'; buy.rel = 'noopener'; buy.dataset.track = 'bs-beat-' + b.id; buy.dataset.trackT = 'BeatStars desde la cabina'; } else { buy.href = '#beats'; buy.removeAttribute('target'); delete buy.dataset.track; }
    buy.hidden = !!b.sold; $('#booth').hidden = false; $('#bo-rec').focus(); track('cabina-abrir', 'Abrir la cabina'); boDraw();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder || !getCtx()) { boLcd('SIN MICRO', 'ESTE NAVEGADOR NO PUEDE GRABAR'); $('#bo-rec').disabled = true; return; }
    boLcd('CARGANDO BEAT…'); $('#bo-rec').disabled = true;
    loadBuffer(beatUrl(b)).then(function (buf) { if (BO.id !== id) return; BO.buf = buf; $('#bo-rec').disabled = false; boLcd('PREPARADO', 'PULSA GRABAR · CUENTA ATRÁS DE 3'); boDraw(); }, function () { boLcd('ERROR', 'NO SE PUDO CARGAR EL BEAT'); });
  }
  function closeBooth() { boReset(); BO.id = null; $('#booth').hidden = true; if (BO.focus && BO.focus.focus) BO.focus.focus(); }
  function boTick(ctx, t, hi) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hi ? 1760 : 1320; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 * audio.volume + 0.01, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.1); }
  function boRecord() {
    if (BO.state === 'rec') return boStopRec();
    if (!BO.buf || BO.state === 'proc') return;
    var ctx = getCtx(); boStopPlay(); BO.voice = null; $('#bo-mix').hidden = true; $('#bo-out').hidden = true; $('#bo-play').disabled = true;
    boLcd('MICRÓFONO…', 'ACEPTA EL PERMISO DEL NAVEGADOR');
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
      if (!BO.id) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var chunks = [], mr; BO.stream = stream;
      try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); boLcd('ERROR', 'NO SE PUEDE GRABAR AQUÍ'); return; }
      var ms = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 1024; ms.connect(an); BO.an = an; BO.lv = [];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); }); BO.stream = null; cancelAnimationFrame(BO.raf); $('#bo-screen').classList.remove('rec');
        boLcd('PROCESANDO…');
        new Blob(chunks, { type: mr.mimeType || 'audio/webm' }).arrayBuffer().then(function (ab) { return decodeBuf(ctx, ab); }).then(function (vb) {
          BO.voice = vb; BO.state = 'take'; BO.dur = Math.max(0.5, Math.min(BO.buf.duration, BO.stopAt - BO.beatStart));
          $('#bo-sync').value = 0; $('#bo-sync-v').textContent = '0 ms'; $('#bo-mix').hidden = false; $('#bo-out').hidden = false; $('#bo-play').disabled = false; $('#bo-rec').disabled = false; $('#bo-rec').lastChild.textContent = 'Repetir toma';
          $('#bo-share').hidden = !(navigator.canShare && window.File && navigator.canShare({ files: [new File([new Blob(['x'])], 'a.wav', { type: 'audio/wav' })] }));
          boLcd('TOMA LISTA', fmtT(BO.dur) + ' · ESCÚCHALA O REPÍTELA'); boDraw(); track('cabina-toma', 'Grabar una toma en la cabina');
        }, function () { BO.state = 'idle'; $('#bo-rec').disabled = false; $('#bo-rec').lastChild.textContent = 'Grabar'; boLcd('ERROR', 'NO SE PUDO LEER LA GRABACIÓN'); });
      };
      mr.onstart = function () {
        BO.recStart = ctx.currentTime; BO.beatStart = BO.recStart + 3.1; BO.lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + 0.015;
        for (var k = 0; k < 3; k++) boTick(ctx, BO.recStart + 0.1 + k, k === 0);
        var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = BO.buf; g.gain.value = Math.max(0.1, audio.volume); s.connect(g); g.connect(ctx.destination); s.start(BO.beatStart); BO.beatSrc = s;
        s.onended = function () { if (BO.state === 'rec') boStopRec(); };
        BO.state = 'rec'; $('#bo-rec').lastChild.textContent = 'Parar'; $('#bo-screen').classList.add('rec');
        var buf = new Float32Array(an.fftSize);
        (function loop() {
          var now = ctx.currentTime;
          if (now < BO.beatStart) boLcd(String(Math.ceil(BO.beatStart - now)), 'PREPÁRATE…');
          else {
            an.getFloatTimeDomainData(buf); var m = 0; for (var i = 0; i < buf.length; i++) { var v = Math.abs(buf[i]); if (v > m) m = v; }
            var el = now - BO.beatStart; BO.lv.push([el, m]); boLcd('● REC ' + fmtT(el), 'DE ' + fmtT(BO.buf.duration) + ' · PULSA PARAR CUANDO ACABES');
          }
          boDraw(); if (BO.state === 'rec') BO.raf = requestAnimationFrame(loop);
        })();
      };
      BO.rec = mr; mr.start();
    }, function () { if (IN_FRAME) boLcd('SIN MICRO AQUÍ', 'EN LA WEB PUBLICADA SÍ SE PUEDE GRABAR'); else boLcd('SIN PERMISO', 'PERMITE EL MICRÓFONO PARA GRABAR'); });
  }
  function boStopRec() {
    if (BO.state !== 'rec') return; BO.state = 'proc'; BO.stopAt = actx.currentTime;
    if (BO.beatSrc) { try { BO.beatSrc.onended = null; BO.beatSrc.stop(); } catch (e) {} BO.beatSrc = null; }
    $('#bo-rec').disabled = true; try { BO.rec.stop(); } catch (e) {}
  }
  function voiceOff() { return (BO.beatStart - BO.recStart) + BO.lat + (+$('#bo-sync').value || 0) / 1000; }
  function boImpulse(ctx) { var n = Math.floor(ctx.sampleRate * 1.6), b = ctx.createBuffer(2, n, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); } return b; }
  function boBuild(ctx, t0) {
    var master = ctx.createDynamicsCompressor(); master.threshold.value = -2; master.knee.value = 0; master.ratio.value = 20; master.attack.value = 0.003; master.release.value = 0.1; master.connect(ctx.destination);
    var off = voiceOff(), len = BO.dur;
    var bs = ctx.createBufferSource(), bg = ctx.createGain(); bs.buffer = BO.buf; bg.gain.value = +$('#bo-vb').value; bs.connect(bg); bg.connect(master);
    var vs = ctx.createBufferSource(), vg = ctx.createGain(); vs.buffer = BO.voice; vg.gain.value = +$('#bo-vv').value;
    if ($('#bo-fx').checked) {
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95;
      var pr = ctx.createBiquadFilter(); pr.type = 'peaking'; pr.frequency.value = 3200; pr.gain.value = 3; pr.Q.value = 0.8;
      var cp = ctx.createDynamicsCompressor(); cp.threshold.value = -24; cp.ratio.value = 3.5; cp.attack.value = 0.005; cp.release.value = 0.12;
      var mk = ctx.createGain(); mk.gain.value = 1.6;
      var cv = ctx.createConvolver(); cv.buffer = boImpulse(ctx); var wet = ctx.createGain(); wet.gain.value = 0.2;
      vs.connect(hp); hp.connect(pr); pr.connect(cp); cp.connect(mk); mk.connect(vg); mk.connect(cv); cv.connect(wet); wet.connect(vg);
    } else vs.connect(vg);
    vg.connect(master);
    bs.start(t0, 0, len);
    if (off >= 0) vs.start(t0, off, len); else vs.start(t0 - off, 0, Math.max(0, len + off));
    return [bs, vs];
  }
  function boPlay() {
    if (BO.playing) return boStopPlay();
    if (!BO.voice) return; var ctx = getCtx(); audio.pause(); stopExtras();
    var t0 = ctx.currentTime + 0.05; BO.srcs = boBuild(ctx, t0); BO.playing = true; BO.t0 = t0;
    BO.srcs[0].onended = function () { boStopPlay(); boDraw(); };
    $('#bo-play').lastChild.textContent = 'Parar'; $('#bo-play').firstChild.innerHTML = '<use href="#i-pausa"/>';
    (function loop() { if (!BO.playing) return; var p = Math.min(1, (ctx.currentTime - BO.t0) / BO.dur); boDraw(p); boLcd('▶ ' + fmtT(ctx.currentTime - BO.t0), 'TU TOMA SOBRE EL BEAT'); BO.raf = requestAnimationFrame(loop); })();
  }
  function wavBlob(buf) {
    var ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, ab = new ArrayBuffer(44 + n * ch * 2), v = new DataView(ab), p = 0;
    function s(t) { for (var i = 0; i < t.length; i++) v.setUint8(p++, t.charCodeAt(i)); } function u32(x) { v.setUint32(p, x, true); p += 4; } function u16(x) { v.setUint16(p, x, true); p += 2; }
    s('RIFF'); u32(36 + n * ch * 2); s('WAVE'); s('fmt '); u32(16); u16(1); u16(ch); u32(sr); u32(sr * ch * 2); u16(ch * 2); u16(16); s('data'); u32(n * ch * 2);
    var data = []; for (var c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    for (var i = 0; i < n; i++) for (c = 0; c < ch; c++) { var x = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(p, x < 0 ? x * 0x8000 : x * 0x7FFF, true); p += 2; }
    return new Blob([ab], { type: 'audio/wav' });
  }
  function boRender() {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = 44100, ctx = new OAC(2, Math.ceil(BO.dur * sr) + sr / 2, sr);
    boBuild(ctx, 0);
    return new Promise(function (res, rej) { var p = ctx.startRendering(); if (p && p.then) p.then(res, rej); else ctx.oncomplete = function (e) { res(e.renderedBuffer); }; }).then(wavBlob);
  }
  function boName() { var b = ALL.find(function (x) { return x.id === BO.id; }) || { t: 'beat' }; return 'mi-toma-sobre-' + (normalize(b.t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'beat') + '-prod7ty.wav'; }
  $('#bo-rec').onclick = boRecord; $('#bo-play').onclick = boPlay; $('#bo-close').onclick = closeBooth;
  $('#booth').addEventListener('click', function (e) { if (e.target === this) closeBooth(); });
  $('#bo-sync').addEventListener('input', function () { $('#bo-sync-v').textContent = (this.value > 0 ? '+' : '') + this.value + ' ms'; if (BO.playing) { boStopPlay(); boPlay(); } else boDraw(); });
  ['#bo-vb', '#bo-vv', '#bo-fx'].forEach(function (k) { $(k).addEventListener('change', function () { if (BO.playing) { boStopPlay(); boPlay(); } }); });
  $('#bo-dl').onclick = function () {
    if (!BO.voice) return; var bt = this; bt.disabled = true; boMsg('PREPARANDO TU ARCHIVO…');
    boRender().then(function (blob) { return saveFile(blob, boName()); }).then(function () { bt.disabled = false; boMsg('LISTO ✦ GUARDADO EN TU DISPOSITIVO'); track('cabina-descarga', 'Descargar una toma'); },
      function (e) { bt.disabled = false; boMsg(e && e.code === 'declined' ? '' : 'NO SE PUDO GUARDAR LA TOMA'); });
  };
  $('#bo-share').onclick = function () {
    if (!BO.voice) return; var bt = this; bt.disabled = true; boMsg('PREPARANDO…');
    boRender().then(function (blob) { var f = new File([blob], boName(), { type: 'audio/wav' }); return navigator.share({ files: [f], title: 'Mi toma sobre un beat de prod.7ty' }); })
      .then(function () { bt.disabled = false; boMsg(''); track('cabina-descarga', 'Compartir una toma'); }, function () { bt.disabled = false; boMsg(''); });
  };
  $('#bo-buy').addEventListener('click', function (e) { if (!this.target) { e.preventDefault(); var id = BO.id; closeBooth(); openLic(id); } });

  /* ── muro: hecho con beats de 7TY ── */
  function linkKind(u) {
    var h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Escuchar'; }
    return /spotify/.test(h) ? 'Spotify' : /youtu/.test(h) ? 'YouTube' : /soundcloud/.test(h) ? 'SoundCloud' : /instagram/.test(h) ? 'Instagram' : /tiktok/.test(h) ? 'TikTok' : /apple/.test(h) ? 'Apple Music' : 'Escuchar';
  }
  var wallKey = null;
  function renderWall() {
    var key = JSON.stringify(WALL) + ALL.map(function (b) { return b.id + b.t; }).join();
    if (key !== wallKey) {
      wallKey = key;
      var cards = WALL.map(function (x) {
        var b = x.beat ? ALL.find(function (y) { return y.id === x.beat; }) : null, cv = blobUrl(x.cover);
        return '<article class="wcard"><div class="cv">' + (cv ? '<img src="' + esc(cv) + '" alt="Portada de «' + esc(x.t) + '»" loading="lazy">' : '<b>' + esc(String(x.t).charAt(0)) + '</b>') + '</div><div class="in"><h3>' + esc(x.t) + '</h3><span class="a">' + esc(x.a) + (x.date ? ' · ' + esc(x.date) : '') + '</span>' +
          (b ? '<a class="bt" href="#beat-' + esc(encodeURIComponent(b.code || b.id)) + '">con el beat «' + esc(b.t) + '» ▶</a>' : '') +
          (x.link ? '<a class="btn btn-chrome btn-sm" href="' + esc(x.link) + '" target="_blank" rel="noopener" data-track="muro-escuchar" data-track-t="Escuchar un tema del muro">' + linkKind(x.link) + ' ↗</a>' : '') + '</div></article>';
      }).join('');
      var cta = '<article class="wcard cta"><div class="in"><h3>' + (WALL.length ? '¿Has sacado un tema con un beat de 7TY?' : 'Sé el primero del muro') + '</h3><p>Mándalo y sale aquí, con tu nombre y el enlace a tu tema.</p>' +
        '<form class="wform" id="wall-form" novalidate><input id="w-a" maxlength="40" placeholder="Tu nombre artístico" aria-label="Tu nombre artístico"><input id="w-t" maxlength="60" placeholder="Nombre del tema" aria-label="Nombre del tema"><select id="w-b" aria-label="Beat que usaste"></select><input id="w-l" type="url" inputmode="url" maxlength="300" placeholder="Enlace (Spotify, YouTube…)" aria-label="Enlace al tema">' +
        '<button class="btn btn-hot btn-sm" type="submit"><svg class="i"><use href="#i-mensaje"/></svg>Mandar por WhatsApp</button><span class="bo-msg" id="w-msg" role="status" aria-live="polite"></span></form></div></article>';
      var keep = {}; ['w-a', 'w-t', 'w-l'].forEach(function (k) { var el = document.getElementById(k); if (el) keep[k] = el.value; });
      $('#wall').innerHTML = cards + cta;
      Object.keys(keep).forEach(function (k) { document.getElementById(k).value = keep[k]; });
    }
    var sel = $('#w-b'); if (sel && document.activeElement !== sel) { var v = sel.value; sel.innerHTML = '<option value="">¿Con qué beat?</option>' + BEATS.slice().sort(function (a, b) { return String(a.code).localeCompare(String(b.code), 'es', { numeric: true }); }).map(function (b) { return '<option value="' + esc(b.id) + '">' + esc((b.code ? b.code + ' · ' : '') + b.t) + '</option>'; }).join('') + '<option value="otro">Otro beat de 7TY</option>'; sel.value = v; }
  }
  $('#wall').addEventListener('submit', function (e) {
    e.preventDefault(); var a = $('#w-a').value.trim(), t = $('#w-t').value.trim(), bid = $('#w-b').value, l = $('#w-l').value.trim(), m = $('#w-msg');
    if (!a || !t) { m.textContent = 'FALTA TU NOMBRE O EL DEL TEMA'; return; }
    var b = ALL.find(function (x) { return x.id === bid; });
    var txt = 'Hola 7TY, he sacado un tema con tu beat' + (b ? ' «' + (b.code ? b.code + ' · ' : '') + b.t + '»' : '') + '.\n\nArtista: ' + a + '\nTema: ' + t + (l ? '\nEnlace: ' + l : '') + '\n\n¿Lo pones en el muro de tu web?';
    track('muro-enviar', 'Mandar un tema al muro'); window.open(WA + encodeURIComponent(txt), '_blank', 'noopener'); m.textContent = 'ABRIENDO WHATSAPP…';
  });

  /* ── destellos escondidos: encuentra los 7 ── */
  var SPK = [];
  try { SPK = (JSON.parse(localStorage.getItem('7ty-spk') || '[]') || []).filter(function (n) { return n >= 1 && n <= 7; }); } catch (e) { SPK = []; }
  function spkSync() {
    var on = EXTRAS.sparks.on !== false;
    Array.prototype.forEach.call(document.querySelectorAll('.spk'), function (b) { b.hidden = !on || SPK.indexOf(+b.dataset.spk) >= 0; });
    $('#spk-count').hidden = !on || !SPK.length; $('#spk-n').textContent = SPK.length + '/7';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.spk'); if (!b) return; e.preventDefault(); e.stopPropagation();
    var n = +b.dataset.spk; if (SPK.indexOf(n) >= 0) return;
    SPK.push(n); try { localStorage.setItem('7ty-spk', JSON.stringify(SPK)); } catch (x) {}
    b.classList.add('got'); setTimeout(function () { b.classList.remove('got'); spkSync(); }, 750); $('#spk-count').hidden = false; $('#spk-n').textContent = SPK.length + '/7';
    if (SPK.length >= 7) { track('destellos-7', 'Encontrar los 7 destellos'); setTimeout(openReward, 700); }
    else toast('✦ DESTELLO ' + SPK.length + '/7 · ' + (SPK.length === 1 ? 'HAY 7 ESCONDIDOS POR LA WEB' : 'TE QUEDAN ' + (7 - SPK.length)));
  }, true);
  $('#spk-count').onclick = function () { if (SPK.length >= 7) openReward(); else toast('✦ ' + SPK.length + '/7 · TE QUEDAN ' + (7 - SPK.length) + ' DESTELLOS POR ENCONTRAR'); };
  var rwFocus = null;
  function openReward() {
    var s = EXTRAS.sparks, code = s.code, txt = s.reward || (code ? 'Has encontrado los 7 destellos. Usa este código o díselo a 7TY:' : 'Has encontrado los 7 destellos. Haz una captura de esta pantalla y mándasela a 7TY: tiene algo para ti.');
    var wa = WA + encodeURIComponent('Hola 7TY, he encontrado los 7 destellos de tu web ✦' + (code ? ' Código: ' + code : ''));
    $('#rw-body').innerHTML = '<p class="label" style="color:var(--hot-text);margin:0 0 6px">7/7 destellos</p><p style="margin:0;font:900 44px/.95 var(--f-display);text-transform:uppercase">Los tienes todos</p><p style="margin:12px 0 0;color:var(--muted)">' + esc(txt) + '</p>' +
      (code ? '<div class="reward-code"><span id="rw-code">' + esc(code) + '</span><button class="copy" type="button" data-copy="' + esc(code) + '">Copiar</button></div>' : '') +
      '<div class="modal-foot">' + (s.link ? '<a class="btn btn-hot" href="' + esc(s.link) + '" target="_blank" rel="noopener" data-track="destellos-regalo" data-track-t="Abrir el regalo de los destellos"><svg class="i"><use href="#i-descarga"/></svg>Abrir tu regalo ↗</a>' : '') + '<a class="btn ' + (s.link ? 'btn-chrome' : 'btn-hot') + '" href="' + esc(wa) + '" target="_blank" rel="noopener"><svg class="i"><use href="#i-mensaje"/></svg>Decírselo a 7TY</a></div>';
    rwFocus = document.activeElement; $('#reward').hidden = false; $('#rw-close').focus();
  }
  function closeReward() { $('#reward').hidden = true; if (rwFocus && rwFocus.focus) rwFocus.focus(); }
  $('#rw-close').onclick = closeReward; $('#reward').addEventListener('click', function (e) { if (e.target === this) closeReward(); });

  /* ── papelera secreta: 7 toques en el logo o escribe 777 ── */
  var trFocus = null, logoHits = [], typed = '';
  function openTrash() {
    var list = EXTRAS.trash || [];
    $('#tr-count').textContent = list.length + (list.length === 1 ? ' elemento' : ' elementos');
    $('#tr-body').innerHTML = (list.length ? '<p style="margin:0 0 12px;color:var(--muted)">Cosas que 7TY tiró a la papelera. No las cuentes por ahí.</p><div class="trash-list">' + list.map(function (x, i) {
      return '<div class="trash-item"><button class="knob" type="button" data-tr="' + i + '" aria-label="Escuchar ' + esc(x.t) + '"><svg><use href="#i-play"/></svg></button><div><b>' + esc(x.t || 'Sin título') + '</b><br><span>INÉDITO · ' + esc(x.d || 'BORRADOR') + '</span></div><span class="tag">snippet</span></div>';
    }).join('') + '</div>' : '<p style="margin:0;font:900 36px/1 var(--f-display);text-transform:uppercase">Vacía… de momento</p><p style="color:var(--muted)">Vuelve otro día: aquí acaban los snippets que 7TY no saca.</p>') +
      '<p class="bo-note">Pista: hay 7 destellos escondidos por la web.</p>';
    trFocus = document.activeElement; $('#trash').hidden = false; $('#tr-close').focus(); track('papelera', 'Abrir la papelera secreta');
  }
  function closeTrash() { $('#trash').hidden = true; if (trFocus && trFocus.focus) trFocus.focus(); }
  $('#tr-close').onclick = closeTrash; $('#trash').addEventListener('click', function (e) { if (e.target === this) closeTrash(); var b = e.target.closest('[data-tr]'); if (!b) return;
    var q = (EXTRAS.trash || []).map(function (x, i) { return { kind: 'snippet', id: 'tr' + i, t: x.t || 'Snippet', sub: 'INÉDITO · PAPELERA DE 7TY', url: blobUrl(x.src) }; }), i = +b.dataset.tr; if (isCurrent('snippet', 'tr' + i)) togglePlay(); else playQueue(q, i, 'snippet'); });
  /* ── menú de inicio en el móvil: el logo abre las secciones ── */
  var smFocus = null;
  function smOpen() { var m = $('#startmenu'); smFocus = document.activeElement; $('#sm-radio').textContent = radioOn() ? 'Apagar Radio 7TY' : 'Encender Radio 7TY'; $('#sm-book').hidden = !(EXTRAS.booking || {}).url; m.hidden = false; $('.start').setAttribute('aria-expanded', 'true'); var f = m.querySelector('a'); if (f) f.focus(); }
  function smClose(back) { var m = $('#startmenu'); if (m.hidden) return; m.hidden = true; $('.start').setAttribute('aria-expanded', 'false'); if (back && smFocus && smFocus.focus) smFocus.focus(); }
  $('.start').addEventListener('click', function (e) { if (!matchMedia('(max-width: 760px)').matches) return; e.preventDefault(); if ($('#startmenu').hidden) smOpen(); else smClose(); });
  $('#startmenu').addEventListener('click', function (e) { if (e.target.closest('a, button')) setTimeout(function () { smClose(); }, 0); });
  document.addEventListener('click', function (e) { if (!$('#startmenu').hidden && !e.target.closest('#startmenu, .start')) smClose(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#startmenu').hidden) { smClose(true); e.stopPropagation(); } }, true);
  $('.start').addEventListener('click', function () { var now = Date.now(); logoHits = logoHits.filter(function (t) { return now - t < 4000; }); logoHits.push(now); if (logoHits.length >= 7) { logoHits = []; openTrash(); } });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return; if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-3); if (typed === '777' || typed === '7ty') { typed = ''; if ($('#trash').hidden) openTrash(); }
  });

  /* ── salvapantallas: tras 90 s sin tocar nada ── */
  var idleAt = Date.now(), saverRaf = 0, saverOn = false;
  function bump() { idleAt = Date.now(); if (saverOn) stopSaver(); }
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) { window.addEventListener(ev, bump, { passive: true }); });
  function stopSaver() { saverOn = false; cancelAnimationFrame(saverRaf); $('#saver').hidden = true; }
  function startSaver() {
    var el = $('#saver'), c = $('#saver-c'), g = c.getContext('2d'); saverOn = true; el.hidden = false; track('salvapantallas', 'Ver el salvapantallas');
    var W = c.width = innerWidth * (devicePixelRatio || 1), H = c.height = innerHeight * (devicePixelRatio || 1), stars = [], k = devicePixelRatio || 1;
    for (var i = 0; i < 140; i++) stars.push({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W });
    var lx = Math.random() * W * 0.6, ly = Math.random() * H * 0.6, vx = 2.2 * k, vy = 1.7 * k, cols = ['#ff0a8a', '#ffc4e1', '#ff6ec2', '#ffffff'], ci = 0;
    function spark(x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }
    (function loop() {
      g.fillStyle = 'rgba(5,2,4,.35)'; g.fillRect(0, 0, W, H);
      stars.forEach(function (s) { s.z -= 6 * k; if (s.z < 1) { s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; s.z = W; } var px = s.x / s.z * W * 0.5 + W / 2, py = s.y / s.z * W * 0.5 + H / 2, r = Math.max(1, (1 - s.z / W) * 9 * k); g.fillStyle = r > 5 * k ? '#ffc4e1' : '#ff6ec2'; spark(px, py, r); });
      g.font = '900 ' + (90 * k) + 'px "Big Shoulders Display", Impact, sans-serif'; var tw = g.measureText('7TY').width, th = 80 * k;
      lx += vx; ly += vy; if (lx < 0 || lx + tw > W) { vx = -vx; ci = (ci + 1) % cols.length; lx = Math.max(0, Math.min(W - tw, lx)); } if (ly < 0 || ly + th > H) { vy = -vy; ci = (ci + 1) % cols.length; ly = Math.max(0, Math.min(H - th, ly)); }
      g.fillStyle = cols[ci]; g.shadowColor = '#ff0a8a'; g.shadowBlur = 24 * k; g.fillText('7TY', lx, ly + th); g.shadowBlur = 0;
      var cI = curItem(); if (cI && !audio.paused) { g.font = (22 * k) + 'px VT323, monospace'; g.fillStyle = '#ff5aae'; g.fillText('♪ ' + cI.t.toUpperCase(), 24 * k, 40 * k); }
      if (saverOn) saverRaf = requestAnimationFrame(loop);
    })();
  }
  setInterval(function () {
    if (saverOn || document.hidden || EXTRAS.saver === false || anyModal() || BO.state === 'rec') return;
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (Date.now() - idleAt > 90000) startSaver();
  }, 3000);

  /* ── modo noche: de 22:00 a 6:00 en la hora de cada visitante ── */
  var NIGHT_TAGS = /dark|emotional|experimental|hopecore|virtual|smooth|plug/i, nightId = null;
  function isNight() { var h = new Date().getHours(); return h >= 22 || h < 6; }
  function applyNight() {
    var on = EXTRAS.night !== false && isNight(), d = new Date(); document.body.classList.toggle('night', on);
    $('.hero .eyebrow').textContent = on ? 'Sesión nocturna · ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) : 'Artista · Productor · Mezcla';
    var pick = $('#night-pick'); pick.hidden = !on;
    if (on && BEATS.length) {
      var pool = BEATS.filter(function (b) { return (b.tags || []).some(function (t) { return NIGHT_TAGS.test(t); }); }); if (!pool.length) pool = BEATS;
      var n = new Date(d.getTime() - 6 * 3600e3), seed = n.getFullYear() * 400 + n.getMonth() * 31 + n.getDate(), b = pool.slice().sort(function (a, c) { return String(a.id).localeCompare(c.id); })[seed % pool.length];
      nightId = b.id; $('#night-t').textContent = b.t;
    }
  }
  $('#night-pick').onclick = function () { if (!nightId) return; var q = beatQueue(BEATS), i = q.findIndex(function (x) { return x.id === nightId; }); if (i < 0) return; track('noche-beat', 'Beat de la noche'); if (isCurrent('beat', nightId)) togglePlay(); else playQueue(q, i, 'beat'); };

  /* ── estado del estudio en vivo ── */
  var LIVE = { libre: 'Huecos libres esta semana', pocas: 'Quedan pocas horas esta semana', lleno: 'Agenda llena', grabando: 'Grabando ahora mismo', vacaciones: 'De vacaciones' };
  function liveHtml() {
    var s = EXTRAS.status || {}, up = Date.parse(s.updated); if (!s.state || !LIVE[s.state] || !isFinite(up)) return '';
    var age = Date.now() - up; if (age > (s.state === 'grabando' ? 12 * 3600e3 : 14 * 864e5) || age < -864e5) return '';
    var txt = LIVE[s.state];
    if (s.state === 'libre' && s.slots > 0) txt = s.slots + (s.slots == 1 ? ' hueco libre' : ' huecos libres') + ' esta semana';
    if ((s.state === 'lleno' || s.state === 'vacaciones') && s.until && isFinite(Date.parse(s.until))) txt += ' hasta el ' + new Date(s.until + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    var h = Math.floor(age / 3600e3), dd = Math.floor(age / 864e5), ago = s.state === 'grabando' ? (h < 1 ? 'ahora' : 'hace ' + h + ' h') : (dd < 1 ? 'actualizado hoy' : dd === 1 ? 'actualizado ayer' : 'actualizado hace ' + dd + ' días');
    return '<span class="live ' + s.state + '"><i aria-hidden="true"></i>' + esc(txt) + (s.note ? ' · ' + esc(s.note) : '') + ' <small>' + ago + '</small></span>';
  }
  function renderLive() {
    var h = liveHtml(), st = (EXTRAS.status || {}).state, bk = (EXTRAS.booking || {}).url && (st === 'libre' || st === 'pocas');
    if (h && bk) h = '<span class="live-row">' + h + '<a class="btn btn-hot btn-sm" href="#reservar" data-book-open="1">Reservar</a></span>';
    $('#live-st').innerHTML = h; $('#live-ct').innerHTML = h; $('#live-st').hidden = $('#live-ct').hidden = !h;
  }
  function renderExtras() { spkSync(); applyNight(); renderLive(); renderBooking(); }
  setInterval(function () { applyNight(); renderLive(); }, 60000);
  window.syncFavBarReady = true; renderWall(); renderExtras(); renderChips(); renderBeats(); checkHash();

  /* ── estudio: fotos y reseñas (editables desde el panel) ── */
  var STUDIO = { photos: [], reviews: [], ab: [] }, galList = [], lbI = 0, lbFocus = null;
  function renderStudio() {
    var ph = (STUDIO.photos || []).filter(function (x) { return x && x.src; }), rv = (STUDIO.reviews || []).filter(function (x) { return x && x.text && x.who; });
    galList = ph;
    var ab = (STUDIO.ab || []).filter(function (x) { return x && x.t && x.before && x.after; });
    renderAB(ab);
    $('#gal-win').hidden = !ph.length; $('#rev-wrap').hidden = !rv.length; $('#studio-extra').hidden = !ph.length && !rv.length && !ab.length;
    $('#gal-count').textContent = ph.length + (ph.length === 1 ? ' foto' : ' fotos');
    $('#gal').innerHTML = ph.map(function (x, i) { return '<button type="button" data-ph="' + i + '" aria-label="Ampliar foto ' + (i + 1) + (x.alt ? ': ' + esc(x.alt) : '') + '"><img src="' + esc(blobUrl(x.src)) + '" alt="' + esc(x.alt || 'Estudio de 7TY') + '" loading="lazy"></button>'; }).join('');
    $('#revs').innerHTML = rv.map(function (x) { return '<figure class="rev"><blockquote>' + esc(x.text) + '</blockquote><figcaption><b>' + esc(x.who) + '</b>' + (x.what ? '<span>' + esc(x.what) + '</span>' : '') + '</figcaption></figure>'; }).join('');
    
  }
  function lbShow(i) {
    if (!galList.length) return; lbI = (i + galList.length) % galList.length; var x = galList[lbI];
    $('#lb-img').src = blobUrl(x.src); $('#lb-img').alt = x.alt || 'Estudio de 7TY';
    $('#lb-cap').textContent = ('0' + (lbI + 1)).slice(-2) + '/' + ('0' + galList.length).slice(-2) + (x.alt ? ' · ' + x.alt.toUpperCase() : '');
    $('#lb-prev').hidden = $('#lb-next').hidden = galList.length < 2;
  }
  function lbStep(d) { lbShow(lbI + d); }
  function closeLb() { $('#lightbox').hidden = true; if (lbFocus) lbFocus.focus(); }
  $('#gal').addEventListener('click', function (e) { var b = e.target.closest('[data-ph]'); if (!b) return; lbFocus = b; $('#lightbox').hidden = false; lbShow(+b.dataset.ph); $('#lb-close').focus(); });
  $('#lb-close').onclick = closeLb; $('#lb-prev').onclick = function () { lbStep(-1); }; $('#lb-next').onclick = function () { lbStep(1); };
  $('#lightbox').addEventListener('click', function (e) { if (e.target === this) closeLb(); });
  renderStudio();

  /* ── legal ── */
  var LEGAL = { owner: '', nif: '', address: '', email: '', updated: 'octubre de 2026' };
  var legalTab = 'aviso', legalFocus = null;
  function lv(v, what) { return v ? esc(v) : '<span class="pend">[pendiente: ' + what + ']</span>'; }
  function legalHtml(w) {
    var mail = esc(LEGAL.email || '7tybooking@gmail.com');
    var who = '<p><b>Titular:</b> ' + lv(LEGAL.owner, 'nombre y apellidos') + ', que actúa con el nombre artístico 7TY.<br><b>NIF:</b> ' + lv(LEGAL.nif, 'NIF') + '<br><b>Domicilio:</b> ' + lv(LEGAL.address, 'domicilio') + '<br><b>Email:</b> ' + mail + ' · <b>Teléfono:</b> +34 673 72 13 16</p>';
    var T = {
      aviso: '<h3>Quién está detrás</h3>' + who +
        '<h3>Para qué sirve esta web</h3><p>Presenta la música y el trabajo de 7TY como productor e informa sobre sus beats, sus servicios de estudio y sus packs. Los beats se compran en BeatStars, una plataforma externa con sus propias condiciones de venta y de pago. Los servicios de estudio se acuerdan directamente con 7TY.</p>' +
        '<h3>Propiedad intelectual</h3><p>Los beats, audios, fotografías, textos, logotipos y el diseño de esta web pertenecen a 7TY o a sus autores. Las previews de los beats sirven solo para escucharlas aquí: no se pueden descargar, copiar ni usar en ninguna canción sin la licencia correspondiente.</p>' +
        '<h3>Enlaces a otras webs</h3><p>Esta web enlaza a Spotify, Instagram, BeatStars y WhatsApp. 7TY no controla esas webs ni responde de su contenido.</p>' +
        '<h3>Ley aplicable</h3><p>Esta web se rige por la legislación española.</p>',
      privacidad: '<h3>Responsable</h3>' + who +
        '<h3>Qué datos se tratan</h3><p>Solo los que tú decidas mandar al escribir a 7TY por WhatsApp, email o Instagram: tu nombre, tu forma de contacto y lo que cuentes en el mensaje. El formulario de contacto de esta web no envía ni guarda nada: prepara el mensaje y lo abre en WhatsApp o te deja copiarlo para que lo envíes tú. La cabina graba tu voz solo en tu dispositivo: no se envía ni se guarda en ningún sitio.</p>' +
        '<h3>Para qué</h3><ul><li>Responder a tu consulta.</li><li>Si contratas algo, preparar el presupuesto, hacer el trabajo, entregarlo y facturarlo.</li></ul>' +
        '<h3>Base legal</h3><p>Tu consentimiento al escribir y, si contratas, la ejecución del contrato. Las facturas se conservan porque lo exige la normativa fiscal.</p>' +
        '<h3>Cuánto tiempo</h3><p>Mientras dure la conversación o el trabajo, y después solo lo que exija la ley.</p>' +
        '<h3>Quién más los ve</h3><p>Nadie, salvo obligación legal. Ten en cuenta que WhatsApp, Gmail, Instagram y BeatStars tratan tus datos según sus propias políticas cuando los usas.' + ((EXTRAS.booking || {}).url ? ' Si reservas una sesión, los datos que escribas en la agenda (nombre y email) los recibe Google Calendar y se los pasa a 7TY para confirmarte la cita.' : '') + '</p>' +
        '<h3>Tus derechos</h3><p>Puedes pedir acceder a tus datos, corregirlos, borrarlos, oponerte a su uso, limitarlo o llevártelos escribiendo a ' + mail + '. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>',
      cookies: '<h3>Esta web no usa cookies</h3><p>No hay cookies propias ni de terceros' + (STATS.on ? ' ni publicidad' : ', ni herramientas de analítica o publicidad') + '. Por eso no verás ningún aviso para aceptarlas.</p>' +
        (STATS.on ? '<h3>Estadísticas anónimas</h3><p>Se cuentan las visitas y qué beats se escuchan, se comparten o se abren en BeatStars' + (STATS.via ? ' con ' + esc(STATS.via) : '') + ', sin cookies y sin guardar tu IP ni nada que te identifique. Sirve solo para saber qué beats gustan más.</p>' : '') +
        '<h3>Lo único que se guarda</h3><p>El volumen del reproductor, tus beats favoritos y los destellos que hayas encontrado se guardan en tu propio navegador (almacenamiento local) para que sigan ahí la próxima vez. No sirve para identificarte ni sale de tu dispositivo, y puedes borrarlo desde los ajustes del navegador.</p>' +
        ((EXTRAS.booking || {}).url ? '<h3>Agenda de reservas</h3><p>La agenda de la sección Estudio es de Google Calendar. No se carga hasta que pulsas «Ver huecos libres»; a partir de ahí Google puede usar sus propias cookies.</p>' : '') +
        '<h3>Al salir de la web</h3><p>Si abres Spotify, Instagram, BeatStars o WhatsApp, esas webs aplican sus propias cookies y políticas.</p>'
    };
    return T[w] + '<p class="upd">ÚLTIMA ACTUALIZACIÓN: ' + esc(String(LEGAL.updated || 'octubre de 2026').toUpperCase()) + '</p>';
  }
  function legalShow(w) {
    legalTab = w; ['aviso', 'privacidad', 'cookies'].forEach(function (k) { $('#lt-' + k).setAttribute('aria-selected', String(k === w)); });
    $('#legal-body').innerHTML = legalHtml(w); $('#legal-body').scrollTop = 0;
  }
  function openLegal(w) { legalFocus = document.activeElement; $('#legal').hidden = false; legalShow(w || 'aviso'); $('#lt-' + legalTab).focus(); }
  function closeLegal() { $('#legal').hidden = true; if (legalFocus && legalFocus.focus) legalFocus.focus(); }
  ['aviso', 'privacidad', 'cookies'].forEach(function (k) { $('#lt-' + k).onclick = function () { legalShow(k); }; });
  $('#lg-close').onclick = closeLegal;
  $('#legal').addEventListener('click', function (e) { if (e.target === this) closeLegal(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#aviso-legal"], a[href="#privacidad"], a[href="#cookies"]'); if (!a) return;
    e.preventDefault(); var h = a.getAttribute('href').slice(1); openLegal(h === 'aviso-legal' ? 'aviso' : h);
  });
  function legalHash() { var h = location.hash.slice(1); if (/^(aviso-legal|privacidad|cookies)$/.test(h) && $('#legal').hidden) openLegal(h === 'aviso-legal' ? 'aviso' : h); }
  window.addEventListener('hashchange', legalHash); legalHash();

  /* nav activa */
  var links = document.querySelectorAll('.nav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); }); }); }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
  }


  /* ── contenido: content/*.json (lo edita el panel /admin) ── */
  var panelOpen = false;
  function renderPanelList() {}
  function renderPanelProjects() {}
  function okMedia(v, ext) { return typeof v === 'string' && v.indexOf('..') < 0 && new RegExp('^media\\/[a-z0-9._\\/-]+\\.(' + ext + ')$', 'i').test(v) ? v : ''; }
  var IMG = 'jpe?g|png|webp';
  /* vista previa desde el panel (?preview=1): lee los cambios sin publicar que el panel dejó en este navegador */
  var PREVIEW = null;
  try {
    if (/[?&]preview=1(&|$)/.test(location.search)) {
      var pv = JSON.parse(localStorage.getItem('7ty-preview') || 'null');
      if (pv && pv.content && Date.now() - pv.ts < 6 * 3600 * 1000) {
        var med = {}; Object.keys(pv.media || {}).forEach(function (k) { var u = String(pv.media[k]); if (u.indexOf('blob:' + location.origin + '/') === 0) med[k] = u; });
        PREVIEW = { content: pv.content, media: med };
      }
    }
  } catch (e) { PREVIEW = null; }
  if (PREVIEW) {
    var bar = document.createElement('div'); bar.className = 'pv-bar';
    bar.innerHTML = '<span>✦ Vista previa: así quedará la web al publicar · solo la ves tú</span><a href="./">Salir</a>';
    document.querySelector('.taskbar').insertAdjacentElement('afterend', bar);
  }
  function getJSON(p) {
    if (PREVIEW) { var k = p.replace(/^content\//, '').replace(/\.json$/, ''); return Promise.resolve(PREVIEW.content[k] || null); }
    return fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }).catch(function () { return null; });
  }
  /* estadísticas con GoatCounter (content/stats.json); sin código no se cuenta nada */
  function goat(code) {
    var me = false; try { me = localStorage.getItem('7ty-notrack') === '1'; } catch (e) {}
    if (PREVIEW || me || navigator.webdriver || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === 'file:') return;
    STATS.on = true; STATS.via = 'GoatCounter';
    addTracker(function (name, title) {
      var ev = name !== 'visita', q = 'p=' + encodeURIComponent(ev ? name : location.pathname) + '&t=' + encodeURIComponent(ev ? title : document.title) +
        (ev ? '&e=true' : '&r=' + encodeURIComponent(document.referrer) + '&s=' + encodeURIComponent(screen.width + ',' + screen.height + ',' + (window.devicePixelRatio || 1))) + '&rnd=' + Math.random().toString(36).slice(2);
      new Image().src = 'https://' + code + '.goatcounter.com/count?' + q;
    });
  }
  function str(v, d, n) { return typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : d; }
  function okUrl(v) { return typeof v === 'string' && /^https:\/\//.test(v) ? v : ''; }
  function okPath(v) { return typeof v === 'string' && /^media\/[a-z0-9._\/-]+\.(mp3|m4a)$/i.test(v) ? v : ''; }
  renderBio();
  Promise.all(['content/store.json', 'content/bio.json', 'content/beats.json', 'content/projects.json', 'content/studio.json', 'content/legal.json', 'content/stats.json', 'content/radio.json', 'content/wall.json', 'content/extras.json'].map(getJSON)).then(function (r) {
    var store = r[0], bio = r[1], beats = r[2], projects = r[3], studio = r[4], legal = r[5], stats = r[6], radio = r[7], wall = r[8], extras = r[9];
    if (extras) { EXTRAS = parseExtras(extras, okPath); renderExtras(); }
    if (radio) {
      var d = radio.drop || {};
      DROP = { hideName: !!d.hideName, teaser: d.teaser !== false, channel: okUrl(d.channel), channelLabel: str(d.channelLabel, '', 30), newDays: Math.min(60, Math.max(1, +d.newDays || 7)) };
      RADIO = { voices: (Array.isArray(radio.voices) ? radio.voices : []).filter(function (v) { return v && okPath(v.src); }).map(function (v) { return { src: v.src, t: str(v.t, '', 60) }; }), every: Math.min(10, Math.max(1, +radio.every || 3)) };
    }
    if (stats && typeof stats.goatcounter === 'string' && /^[a-z0-9][a-z0-9-]{1,49}$/.test(stats.goatcounter.trim())) goat(stats.goatcounter.trim());
    if (store) {
      STORE.profile = okUrl(store.profile); STORE.count = store.count === 0 || store.count ? store.count : 228;
      STORE.price = str(store.price, '40€', 10); applyStore();
    }
    if (bio) {
      BIO.text = str(bio.text, BIO.text, 2400); BIO.streams = str(bio.streams, BIO.streams, 10);
      BIO.listeners = str(bio.listeners, BIO.listeners, 10); BIO.listenersShort = str(bio.listenersShort, BIO.listenersShort, 8);
      BIO.presskit = okMedia(bio.presskit, 'pdf'); renderBio();
    }
    if (beats && Array.isArray(beats.beats)) {
      setCatalog(beats.beats.filter(function (b) { return b && b.id && b.t; }).map(function (b) {
        return { id: String(b.id), code: String(b.code || ''), t: String(b.t), tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 4) : [], bpm: +b.bpm || null, key: String(b.key || ''),
          src: okPath(b.src), bs: okUrl(b.bs), sold: !!b.sold, hidden: !!b.hidden, order: +b.order || 0, at: typeof b.at === 'string' && isFinite(Date.parse(b.at)) ? b.at : '' };
      }));
    }
    if (projects && Array.isArray(projects.projects)) {
      var list = projects.projects.filter(function (x) { return x && x.id && x.t; }).map(function (x) {
        return { id: String(x.id), t: String(x.t), a: String(x.a || ''), n: String(x.n || ''), sp: okUrl(x.sp), audio: okPath(x.audio), hidden: !!x.hidden, order: +x.order || 0,
          cover: okMedia(x.cover, IMG), roles: Array.isArray(x.roles) ? x.roles.map(String).slice(0, 6) : undefined, year: /^\d{4}$/.test(String(x.year || '')) ? String(x.year) : '' };
      });
      if (list.length) setProjects(list);
    }
    if (wall) { WALL = parseWall(wall.items, function (v) { return !!okMedia(v, IMG); }); renderWall(); }
    if (studio) {
      STUDIO = {
        photos: (Array.isArray(studio.photos) ? studio.photos : []).filter(function (x) { return x && okMedia(x.src, IMG); }).map(function (x) { return { src: x.src, alt: str(x.alt, '', 90) }; }),
        reviews: (Array.isArray(studio.reviews) ? studio.reviews : []).filter(function (x) { return x && x.text && x.who; }).map(function (x) { return { text: str(x.text, '', 320), who: str(x.who, '', 40), what: str(x.what, '', 50) }; }),
        ab: (Array.isArray(studio.ab) ? studio.ab : []).filter(function (x) { return x && x.t && okPath(x.before) && okPath(x.after); }).map(function (x) { return { t: str(x.t, '', 50), a: str(x.a, '', 40), before: x.before, after: x.after }; })
      };
      renderStudio();
    }
    if (legal) {
      LEGAL = { owner: str(legal.owner, '', 80), nif: str(legal.nif, '', 12), address: str(legal.address, '', 140), email: str(legal.email, '', 80), updated: str(legal.updated, 'octubre de 2026', 30) };
      if (!$('#legal').hidden) legalShow(legalTab);
    }
  });
})();
