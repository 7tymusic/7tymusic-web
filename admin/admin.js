/* Panel 7TY: edita content/*.json y media/ y lo publica en GitHub con un solo commit. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var normalize = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var slug = function (s, d) { return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || d; };
  var MAX = 25 * 1024 * 1024;
  var FILES = { beats: 'content/beats.json', projects: 'content/projects.json', bio: 'content/bio.json', store: 'content/store.json', studio: 'content/studio.json', legal: 'content/legal.json', stats: 'content/stats.json', radio: 'content/radio.json', wall: 'content/wall.json', extras: 'content/extras.json' };
  var DEFAULTS = {
    beats: { beats: [] }, projects: { projects: [] },
    bio: { text: '', streams: '13M', listeners: '20.000', listenersShort: '20K', presskit: 'media/presskit/7ty-presskit.pdf' },
    store: { profile: 'https://www.beatstars.com/prod7ty', count: 228, price: '40€' },
    studio: { photos: [], reviews: [] },
    legal: { owner: '', nif: '', address: '', email: '7tybooking@gmail.com', updated: 'octubre de 2026' },
    stats: { goatcounter: '' },
    radio: { drop: { hideName: false, teaser: true, channel: '', channelLabel: '', newDays: 7 }, voices: [], every: 3 },
    wall: { items: [] },
    extras: { sparks: { on: true, reward: '', code: '', link: '' }, trash: [], night: true, saver: true, booking: { url: '' }, status: { state: '', slots: null, note: '', until: '', updated: '' } }
  };

  /* ── estado ── */
  var hasCname = false, cfg = null, S = null, ORIG = {}, EXIST = {}, ADD = {}, DEL = {}, busy = false;
  // ADD: path -> { b64, url(objectURL) }   DEL: path -> true (solo archivos que existían en el repo)
  function snapshot() { var o = {}; Object.keys(FILES).forEach(function (k) { o[k] = JSON.stringify(S[k]); }); return o; }
  function changedKeys() { return Object.keys(FILES).filter(function (k) { return JSON.stringify(S[k]) !== ORIG[k]; }); }
  function pendingCount() { return changedKeys().length + Object.keys(ADD).length + Object.keys(DEL).length; }
  function refreshBar(msg) {
    var n = pendingCount(), st = $('#pub-st');
    st.textContent = msg || (n ? n + (n === 1 ? ' CAMBIO SIN PUBLICAR' : ' CAMBIOS SIN PUBLICAR') : 'TODO PUBLICADO ✦');
    $('#publish').disabled = !n || busy; $('#discard').disabled = !n || busy; $('#preview').disabled = busy;
  }
  window.addEventListener('beforeunload', function (e) { if (S && pendingCount()) { e.preventDefault(); e.returnValue = ''; } });

  /* ── GitHub ── */
  function gh(path, method, body) {
    return fetch('https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + path, {
      method: method || 'GET', cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.message || r.statusText); e.status = r.status; throw e; } return j; });
    });
  }
  function b64ToText(b64) { var bin = atob(String(b64).replace(/\s/g, '')), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(u); }
  function readFile(path) {
    return gh('/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(cfg.branch)).then(function (j) { return j && j.content != null ? b64ToText(j.content) : null; }, function (e) { if (e.status === 404) return null; throw e; });
  }
  function errText(e) {
    if (!e) return 'ERROR DESCONOCIDO';
    if (e.status === 401) return 'TOKEN NO VÁLIDO O CADUCADO';
    if (e.status === 403) return 'EL TOKEN NO TIENE PERMISO DE ESCRITURA (CONTENTS: READ AND WRITE)';
    if (e.status === 404) return 'NO ENCUENTRO ESE REPOSITORIO O RAMA';
    if (e.status === 409 || e.status === 422) return 'EL REPOSITORIO CAMBIÓ MIENTRAS EDITABAS: RECARGA EL PANEL';
    return String(e.message || 'ERROR').toUpperCase();
  }

  /* ── conexión ── */
  try { var saved = JSON.parse(localStorage.getItem('7ty-admin') || 'null'); if (saved) { $('#lg-owner').value = saved.owner || ''; $('#lg-repo').value = saved.repo || ''; $('#lg-branch').value = saved.branch || ''; $('#lg-token').value = saved.token || ''; $('#lg-remember').checked = !!saved.token; } } catch (e) {}
  if (!$('#lg-owner').value && /\.github\.io$/.test(location.hostname)) { $('#lg-owner').value = location.hostname.split('.')[0]; var seg = location.pathname.split('/').filter(Boolean); if (seg.length > 1) $('#lg-repo').value = seg[0]; }
  $('#lg-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('#lg-msg');
    cfg = { owner: $('#lg-owner').value.trim(), repo: $('#lg-repo').value.trim(), branch: $('#lg-branch').value.trim() || 'main', token: $('#lg-token').value.trim() };
    if (!cfg.owner || !cfg.repo || !cfg.token) { m.classList.add('err'); m.textContent = 'RELLENA USUARIO, REPOSITORIO Y TOKEN'; return; }
    m.classList.remove('err'); m.textContent = 'CONECTANDO…'; $('#lg-go').disabled = true;
    try { localStorage.setItem('7ty-admin', JSON.stringify($('#lg-remember').checked ? cfg : { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch })); } catch (x) {}
    gh('/git/ref/heads/' + encodeURIComponent(cfg.branch)).then(function () {
      return Promise.all(Object.keys(FILES).map(function (k) { return readFile(FILES[k]); }));
    }).then(function (texts) {
      S = {}; var keys = Object.keys(FILES);
      keys.forEach(function (k, i) { var v = null; try { v = texts[i] ? JSON.parse(texts[i]) : null; } catch (x) {} S[k] = v || JSON.parse(JSON.stringify(DEFAULTS[k])); });
      if (!Array.isArray(S.beats.beats)) S.beats = { beats: [] };
      if (!Array.isArray(S.projects.projects)) S.projects = { projects: [] };
      if (!Array.isArray(S.studio.photos)) S.studio.photos = [];
      if (!Array.isArray(S.studio.reviews)) S.studio.reviews = [];
      if (!Array.isArray(S.studio.ab)) S.studio.ab = [];
      if (!S.radio.drop || typeof S.radio.drop !== 'object') S.radio.drop = JSON.parse(JSON.stringify(DEFAULTS.radio.drop));
      if (!Array.isArray(S.radio.voices)) S.radio.voices = [];
      if (!Array.isArray(S.wall.items)) S.wall = { items: [] };
      ['sparks', 'status', 'booking'].forEach(function (k) { if (!S.extras[k] || typeof S.extras[k] !== 'object') S.extras[k] = JSON.parse(JSON.stringify(DEFAULTS.extras[k])); });
      if (!Array.isArray(S.extras.trash)) S.extras.trash = [];
      ORIG = snapshot(); EXIST = {}; usedPaths().forEach(function (p) { EXIST[p] = 1; });
      return readFile('CNAME').catch(function () { return null; });
    }).then(function (cname) {
      hasCname = !!(cname && cname.trim());
      var site = cname && cname.trim() ? 'https://' + cname.trim().split(/\s/)[0] + '/' : (/\.github\.io$/.test(location.hostname) ? '../' : 'https://' + cfg.owner + '.github.io/' + cfg.repo + '/');
      $('#site-link').href = site;
      $('#login').hidden = true; $('#app').hidden = false; $('#pubbar').hidden = false; $('#lg-go').disabled = false;
      try { if (localStorage.getItem('7ty-notrack') === null) localStorage.setItem('7ty-notrack', '1'); } catch (x) {}
      fillForms(); renderAll(); refreshBar();
    }).catch(function (err) { m.classList.add('err'); m.textContent = errText(err); $('#lg-go').disabled = false; });
  });
  $('#logout').onclick = function () {
    if (pendingCount() && !$('#logout').classList.contains('confirm')) { $('#logout').classList.add('confirm'); $('#logout').textContent = '¿Salir sin publicar?'; return; }
    try { var s = JSON.parse(localStorage.getItem('7ty-admin') || '{}'); delete s.token; localStorage.setItem('7ty-admin', JSON.stringify(s)); } catch (x) {}
    location.reload();
  };

  /* ── pestañas ── */
  var TABS = [['in', 'pn-home'], ['b', 'pn-beats'], ['p', 'pn-projects'], ['bio', 'pn-bio'], ['s', 'pn-store'], ['st', 'pn-studio'], ['lg', 'pn-legal'], ['dr', 'pn-drops'], ['mu', 'pn-wall'], ['se', 'pn-secret'], ['sx', 'pn-stats']];
  function tab(w) {
    TABS.forEach(function (t) { $('#tab-' + t[0]).setAttribute('aria-selected', String(t[0] === w)); $('#' + t[1]).hidden = t[0] !== w; });
    if (w === 'in') renderChecklist();
  }
  TABS.forEach(function (t) { $('#tab-' + t[0]).onclick = function () { tab(t[0]); }; });

  /* ── utilidades ── */
  function cleanUrl(v) {
    v = String(v || '').trim(); if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    v = v.replace(/^http:\/\//i, 'https://');
    try { var u = new URL(v); return u.protocol === 'https:' && u.hostname.indexOf('.') > 0 ? u.href : null; } catch (e) { return null; }
  }
  function readAudio(file) {
    if (file.size > MAX) return Promise.reject(new Error('EL ARCHIVO PASA DE 25 MB'));
    return file.arrayBuffer().then(function (buf) {
      var u = new Uint8Array(buf), ext = null;
      if (u.length > 12 && String.fromCharCode(u[4], u[5], u[6], u[7]) === 'ftyp') ext = 'm4a';
      else if (u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33) ext = 'mp3';
      else { for (var i = 0; i < Math.min(u.length - 1, 4096); i++) if (u[i] === 0xFF && (u[i + 1] & 0xE0) === 0xE0) { ext = 'mp3'; break; } }
      if (!ext) throw new Error('NO ES UN MP3 O M4A VÁLIDO');
      return { ext: ext, b64: toB64(u), url: URL.createObjectURL(new Blob([u], { type: ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4' })) };
    });
  }
  function toB64(u) { var bin = '', CH = 0x8000; for (var j = 0; j < u.length; j += CH) bin += String.fromCharCode.apply(null, u.subarray(j, j + CH)); return btoa(bin); }
  /* imágenes: se reducen y se pasan a JPEG en el navegador antes de subirlas */
  function prepImage(file, max, square) {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error('SUBE UNA IMAGEN JPG, PNG O WEBP'));
    if (file.size > 30 * 1024 * 1024) return Promise.reject(new Error('LA IMAGEN PASA DE 30 MB'));
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, sx = 0, sy = 0, sw = w, sh = h;
        if (square) { var m = Math.min(w, h); sx = (w - m) / 2; sy = (h - m) / 2; sw = sh = m; }
        var k = Math.min(1, max / Math.max(sw, sh)), cw = Math.max(1, Math.round(sw * k)), ch = Math.max(1, Math.round(sh * k));
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        var g = c.getContext('2d'); g.fillStyle = '#0a0509'; g.fillRect(0, 0, cw, ch); g.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) res(b); else rej(new Error('NO SE PUDO PREPARAR LA IMAGEN')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('NO SE PUDO ABRIR LA IMAGEN')); };
      img.src = url;
    });
  }
  function readImage(file, max, square) {
    return prepImage(file, max, square).then(function (blob) { return blob.arrayBuffer().then(function (buf) { return { ext: 'jpg', b64: toB64(new Uint8Array(buf)), url: URL.createObjectURL(blob) }; }); });
  }
  function readPdf(file) {
    if (file.size > MAX) return Promise.reject(new Error('EL PDF PASA DE 25 MB: EXPÓRTALO MÁS LIGERO'));
    return file.arrayBuffer().then(function (buf) {
      var u = new Uint8Array(buf); if (String.fromCharCode(u[0], u[1], u[2], u[3], u[4]) !== '%PDF-') throw new Error('TIENE QUE SER UN PDF');
      return { ext: 'pdf', b64: toB64(u), url: URL.createObjectURL(new Blob([u], { type: 'application/pdf' })) };
    });
  }
  function addMedia(dir, name, a) { var path = 'media/' + dir + '/' + name + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e3) + '.' + a.ext; ADD[path] = { b64: a.b64, url: a.url }; return path; }
  function usedPaths() {
    var out = [];
    S.beats.beats.forEach(function (b) { if (b.src) out.push(b.src); });
    S.projects.projects.forEach(function (p) { if (p.audio) out.push(p.audio); if (p.cover) out.push(p.cover); });
    S.studio.photos.forEach(function (x) { if (x.src) out.push(x.src); });
    S.studio.ab.forEach(function (x) { if (x.before) out.push(x.before); if (x.after) out.push(x.after); });
    S.radio.voices.forEach(function (x) { if (x.src) out.push(x.src); });
    S.wall.items.forEach(function (x) { if (x.cover) out.push(x.cover); });
    S.extras.trash.forEach(function (x) { if (x.src) out.push(x.src); });
    if (S.bio.presskit) out.push(S.bio.presskit);
    return out;
  }
  function dropMedia(path) {
    if (!path || usedPaths().indexOf(path) >= 0) return;
    if (ADD[path]) { URL.revokeObjectURL(ADD[path].url); delete ADD[path]; } else if (EXIST[path]) DEL[path] = true;
  }
  function siteBase() { return $('#site-link').href.replace(/\/?$/, '/'); }
  function mediaUrl(path) { return !path ? '' : ADD[path] ? ADD[path].url : siteBase() + path; }
  var player = new Audio(), playing = null;
  function playPath(path, btn) {
    if (playing === path) { player.pause(); playing = null; renderAll(); return; }
    player.src = mediaUrl(path);
    playing = path; player.play().catch(function () { playing = null; msg('#f-msg', 'NO SE PUDO REPRODUCIR (¿AÚN NO PUBLICADO?)', 1); renderAll(); });
    renderAll();
  }
  player.addEventListener('ended', function () { playing = null; renderAll(); });
  function msg(sel, t, err) { var m = $(sel); m.classList.toggle('err', !!err); m.textContent = t; }
  function confirmBtn(b, fn) {
    if (b.classList.contains('confirm')) { fn(); return; }
    var o = b.textContent; b.classList.add('confirm'); b.textContent = '¿Seguro?';
    setTimeout(function () { if (b.isConnected) { b.classList.remove('confirm'); b.textContent = o; } }, 3500);
  }
  function renderAll() { renderBeats(); renderProjects(); renderStudio(); renderPresskit(); renderDrops(); renderAB(); renderWallAdm(); renderTrash(); renderChecklist(); refreshBar(); }

  /* ── beats ── */
  var editBeat = null;
  function sortedBeats() { return S.beats.beats.slice().sort(function (a, b) { return (b.order || 0) - (a.order || 0); }); }
  function renderBeats() {
    var all = S.beats.beats, vis = all.filter(function (b) { return !b.hidden; }).length;
    $('#pn-count').textContent = '(' + vis + ' visibles / ' + all.length + ')';
    $('#pn-items').innerHTML = sortedBeats().map(function (b) {
      var meta = [b.bpm ? b.bpm + ' BPM' : '', b.key].concat(b.tags || []).filter(Boolean).join(' · ');
      return '<div class="pn-item' + (b.hidden ? ' off' : '') + '" data-id="' + esc(b.id) + '"><div style="min-width:0"><b>' + esc((b.code ? b.code + ' · ' : '') + b.t) + (ADD[b.src] ? '<span class="new-tag">nuevo</span>' : '') + '</b><span>' + esc(meta || 'Sin datos') + (b.bs ? ' · BeatStars ✓' : '') + (b.hidden ? ' · oculto' : '') + (dropState(b) === 'up' ? ' · sale ' + whenTxt(b.at) : '') + '</span></div>' +
        '<div class="pn-acts"><button class="mini play" type="button" data-act="play" aria-label="Escuchar ' + esc(b.t) + '">' + (playing === b.src ? '❚❚' : '▶') + '</button><button class="mini" type="button" data-act="edit">Editar</button><button class="mini' + (b.sold ? ' on' : '') + '" type="button" data-act="sold">Vendido</button><button class="mini' + (b.hidden ? ' on' : '') + '" type="button" data-act="hide">' + (b.hidden ? 'Oculto' : 'Ocultar') + '</button><button class="mini danger" type="button" data-act="del">Borrar</button></div>' +
        '<div class="pn-bs"><input type="url" inputmode="url" maxlength="300" placeholder="Enlace en BeatStars" aria-label="Enlace de ' + esc(b.t) + ' en BeatStars" value="' + esc(b.bs || '') + '"' + (b.bs ? ' class="has"' : '') + '><button class="mini" type="button" data-act="bs">Guardar enlace</button></div></div>';
    }).join('') || '<div class="empty">Aún no hay beats.</div>';
  }
  $('#pn-items').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]'); if (!btn) return;
    var id = btn.closest('[data-id]').dataset.id, b = S.beats.beats.find(function (x) { return x.id === id; }); if (!b) return;
    var act = btn.dataset.act;
    if (act === 'play') return playPath(b.src, btn);
    if (act === 'edit') return startEdit(b);
    if (act === 'sold') b.sold = !b.sold;
    if (act === 'hide') b.hidden = !b.hidden;
    if (act === 'bs') { var u = cleanUrl(btn.previousElementSibling.value); if (u === null) return msg('#f-msg', 'ESE ENLACE NO ES VÁLIDO', 1); b.bs = u; msg('#f-msg', u ? 'ENLACE LISTO ✦ FALTA PUBLICAR' : 'ENLACE QUITADO'); }
    if (act === 'del') return confirmBtn(btn, function () { S.beats.beats = S.beats.beats.filter(function (x) { return x.id !== id; }); dropMedia(b.src); if (editBeat === id) endEdit(); msg('#f-msg', 'BEAT QUITADO ✦ FALTA PUBLICAR'); renderAll(); });
    renderAll();
  });
  function startEdit(b) {
    editBeat = b.id;
    $('#f-title').value = b.t; $('#f-code').value = b.code || ''; $('#f-bpm').value = b.bpm || ''; $('#f-key').value = b.key || '';
    $('#f-tags').value = (b.tags || []).join(', '); $('#f-bs').value = b.bs || ''; $('#f-file').value = ''; $('#f-at').value = b.at ? toLocalInput(new Date(b.at)) : '';
    $('#f-head').textContent = 'Editar beat'; $('#f-editbar').hidden = false; $('#f-editing').textContent = 'EDITANDO: ' + ((b.code ? b.code + ' · ' : '') + b.t).toUpperCase();
    $('#f-file-l').textContent = 'Cambiar preview (opcional)'; $('#f-go').lastChild.textContent = 'Aplicar cambios'; msg('#f-msg', ''); $('#f-title').focus();
  }
  function endEdit() { editBeat = null; $('#pn-form').reset(); $('#f-head').textContent = 'Subir beat'; $('#f-editbar').hidden = true; $('#f-file-l').textContent = 'Preview de audio * (MP3 o M4A)'; $('#f-go').lastChild.textContent = 'Añadir al catálogo'; }
  $('#f-cancel').onclick = function () { endEdit(); msg('#f-msg', ''); };
  $('#pn-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = $('#f-title').value.trim(), file = $('#f-file').files[0], bpmRaw = $('#f-bpm').value.trim(), bpm = parseInt(bpmRaw, 10), bs = cleanUrl($('#f-bs').value);
    if (!title) { msg('#f-msg', 'FALTA EL NOMBRE', 1); return $('#f-title').focus(); }
    if (!file && !editBeat) { msg('#f-msg', 'FALTA EL AUDIO', 1); return $('#f-file').focus(); }
    if (bpmRaw && !(bpm >= 30 && bpm <= 300)) { msg('#f-msg', 'EL BPM VA DE 30 A 300', 1); return $('#f-bpm').focus(); }
    if (bs === null) { msg('#f-msg', 'EL ENLACE DE BEATSTARS NO ES VÁLIDO', 1); return $('#f-bs').focus(); }
    var atIso = fromLocalInput($('#f-at').value);
    if (atIso === null) { msg('#f-msg', 'LA FECHA DE SALIDA NO ES VÁLIDA', 1); return $('#f-at').focus(); }
    var fields = { at: atIso, code: $('#f-code').value.trim().replace(/[^0-9a-z]/gi, '').slice(0, 6), t: title.slice(0, 60), tags: $('#f-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 4), bpm: bpm || null, key: $('#f-key').value.trim().replace('♯', '#').slice(0, 8), bs: bs };
    msg('#f-msg', file ? 'PREPARANDO AUDIO…' : 'APLICANDO…');
    (file ? readAudio(file) : Promise.resolve(null)).then(function (a) {
      if (editBeat) {
        var b = S.beats.beats.find(function (x) { return x.id === editBeat; }); if (!b) return;
        Object.assign(b, fields);
        if (a) { var old = b.src; b.src = addMedia('beats', (b.code ? b.code + '-' : '') + slug(title, 'beat'), a); dropMedia(old); }
        endEdit(); msg('#f-msg', 'CAMBIOS APLICADOS ✦ FALTA PUBLICAR');
      } else {
        var path = addMedia('beats', (fields.code ? fields.code + '-' : '') + slug(title, 'beat'), a);
        S.beats.beats.push(Object.assign({ id: 'b' + Date.now().toString(36) + '-' + slug(title, 'beat') }, fields, { src: path, sold: false, hidden: false, order: Date.now() }));
        $('#pn-form').reset(); msg('#f-msg', atIso && Date.parse(atIso) > Date.now() ? 'AÑADIDO ✦ SALDRÁ ' + whenTxt(atIso).toUpperCase() + ' · FALTA PUBLICAR' : 'AÑADIDO ✦ FALTA PUBLICAR');
      }
      renderAll();
    }).catch(function (err) { msg('#f-msg', String(err && err.message || 'NO SE PUDO LEER EL AUDIO').toUpperCase(), 1); });
  });

  /* ── proyectos ── */
  var editProj = null;
  function sortedProjects() { return S.projects.projects.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function renderProjects() {
    var list = sortedProjects();
    $('#pn-proj').innerHTML = list.map(function (x, i) {
      var roles = Array.isArray(x.roles) ? x.roles : ['Producción'];
      return '<div class="pn-proj' + (x.hidden ? ' off' : '') + '" data-id="' + esc(x.id) + '"><div class="head">' + (x.cover ? '<img class="pn-thumb" src="' + esc(mediaUrl(x.cover)) + '" alt="">' : '<span class="pn-thumb" aria-hidden="true"></span>') + '<div style="min-width:0"><b>' + esc(x.t) + (ADD[x.audio] ? '<span class="new-tag">audio nuevo</span>' : '') + (ADD[x.cover] ? '<span class="new-tag">portada nueva</span>' : '') + '</b><span class="st' + (x.audio ? ' ok' : '') + '">' + esc(x.a) + (x.n ? ' · ' + esc(x.n) + ' streams' : '') + ' · ' + (x.audio ? 'con audio' : 'sin audio («próximamente»)') + ' · ' + esc(roles.join(', ') || 'sin créditos') + (x.year ? ' · ' + esc(x.year) : '') + (x.sp ? ' · Spotify ✓' : '') + (x.hidden ? ' · oculto' : '') + '</span></div></div>' +
        '<div class="acts"><button class="mini" type="button" data-pa="up" aria-label="Subir ' + esc(x.t) + '"' + (i === 0 ? ' disabled' : '') + '>▲</button><button class="mini" type="button" data-pa="down" aria-label="Bajar ' + esc(x.t) + '"' + (i === list.length - 1 ? ' disabled' : '') + '>▼</button>' +
        (x.audio ? '<button class="mini play" type="button" data-pa="play" aria-label="Escuchar ' + esc(x.t) + '">' + (playing === x.audio ? '❚❚' : '▶') + '</button>' : '') +
        '<button class="mini" type="button" data-pa="edit">Editar</button>' +
        '<label class="mini filebtn">' + (x.audio ? 'Cambiar audio' : 'Subir audio') + '<input type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a" aria-label="Audio de ' + esc(x.t) + '"></label>' +
        (x.audio ? '<button class="mini" type="button" data-pa="rmaudio">Quitar audio</button>' : '') +
        (x.cover ? '<button class="mini" type="button" data-pa="rmcover">Quitar portada</button>' : '') +
        '<button class="mini' + (x.hidden ? ' on' : '') + '" type="button" data-pa="hide">' + (x.hidden ? 'Oculto' : 'Ocultar') + '</button>' +
        '<button class="mini danger" type="button" data-pa="del">Borrar</button></div></div>';
    }).join('') || '<div class="empty">Aún no hay proyectos.</div>';
  }
  function setRoles(list) { Array.prototype.forEach.call(document.querySelectorAll('#pj-roles input'), function (c) { c.checked = list.indexOf(c.value) >= 0; }); }
  function getRoles() { return Array.prototype.filter.call(document.querySelectorAll('#pj-roles input'), function (c) { return c.checked; }).map(function (c) { return c.value; }); }
  function pEnd() { editProj = null; $('#pj-form').reset(); setRoles(['Producción']); $('#pj-cv-l').textContent = 'Portada (JPG, PNG o WEBP)'; $('#pj-head').textContent = 'Añadir proyecto'; $('#pj-go').lastChild.textContent = 'Añadir a destacados'; $('#pj-cancel').hidden = true; $('#pj-file-l').textContent = 'Audio (opcional, MP3 o M4A)'; }
  $('#pj-cancel').onclick = function () { pEnd(); msg('#pj-msg', ''); };
  $('#pj-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#pj-t').value.trim(), a = $('#pj-a').value.trim(), sp = cleanUrl($('#pj-sp').value), file = $('#pj-file').files[0];
    if (!t) { msg('#pj-msg', 'FALTA EL TÍTULO', 1); return $('#pj-t').focus(); }
    if (!a) { msg('#pj-msg', 'FALTA EL ARTISTA', 1); return $('#pj-a').focus(); }
    if (sp === null) { msg('#pj-msg', 'EL ENLACE DE SPOTIFY NO ES VÁLIDO', 1); return $('#pj-sp').focus(); }
    var year = $('#pj-y').value.trim(), cvFile = $('#pj-cv').files[0];
    if (year && !/^(19|20)\d\d$/.test(year)) { msg('#pj-msg', 'EL AÑO DEBE SER COMO 2025', 1); return $('#pj-y').focus(); }
    var fields = { t: t.slice(0, 60), a: a.slice(0, 60), n: $('#pj-n').value.trim().slice(0, 12), sp: sp, roles: getRoles(), year: year }, cv = null;
    msg('#pj-msg', cvFile ? 'PREPARANDO PORTADA…' : file ? 'PREPARANDO AUDIO…' : 'APLICANDO…');
    (cvFile ? readImage(cvFile, 800, true) : Promise.resolve(null)).then(function (c) { cv = c; return file ? readAudio(file) : null; }).then(function (au) {
      if (editProj) {
        var x = S.projects.projects.find(function (p) { return p.id === editProj; }); if (!x) return;
        Object.assign(x, fields);
        if (au) { var old = x.audio; x.audio = addMedia('projects', slug(t, 'tema'), au); dropMedia(old); }
        if (cv) { var oldc = x.cover; x.cover = addMedia('covers', slug(t, 'tema'), cv); dropMedia(oldc); }
        pEnd(); msg('#pj-msg', 'CAMBIOS APLICADOS ✦ FALTA PUBLICAR');
      } else {
        var minOrder = S.projects.projects.reduce(function (mn, p) { return Math.min(mn, p.order || 0); }, 1);
        S.projects.projects.push(Object.assign({ id: 'p' + Date.now().toString(36) + '-' + slug(t, 'tema') }, fields, { audio: au ? addMedia('projects', slug(t, 'tema'), au) : '', cover: cv ? addMedia('covers', slug(t, 'tema'), cv) : '', hidden: false, order: minOrder - 1 }));
        pEnd(); msg('#pj-msg', 'AÑADIDO ✦ FALTA PUBLICAR');
      }
      renderAll();
    }).catch(function (err) { msg('#pj-msg', String(err && err.message || 'NO SE PUDO LEER EL AUDIO').toUpperCase(), 1); });
  });
  $('#pn-proj').addEventListener('change', function (e) {
    var inp = e.target; if (!inp.files || !inp.files[0]) return;
    var x = S.projects.projects.find(function (p) { return p.id === inp.closest('[data-id]').dataset.id; }); if (!x) return;
    msg('#pj-msg', 'PREPARANDO AUDIO…');
    readAudio(inp.files[0]).then(function (au) { var old = x.audio; x.audio = addMedia('projects', slug(x.t, 'tema'), au); dropMedia(old); msg('#pj-msg', 'AUDIO LISTO ✦ FALTA PUBLICAR'); renderAll(); })
      .catch(function (err) { msg('#pj-msg', String(err && err.message || 'NO SE PUDO LEER EL AUDIO').toUpperCase(), 1); });
  });
  $('#pn-proj').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pa]'); if (!b) return;
    var list = sortedProjects(), id = b.closest('[data-id]').dataset.id, i = list.findIndex(function (p) { return p.id === id; }), x = list[i], act = b.dataset.pa;
    if (!x) return;
    if (act === 'play') return playPath(x.audio, b);
    if (act === 'edit') {
      editProj = id; $('#pj-t').value = x.t; $('#pj-a').value = x.a; $('#pj-n').value = x.n || ''; $('#pj-sp').value = x.sp || ''; $('#pj-file').value = '';
      $('#pj-cv').value = ''; $('#pj-y').value = x.year || ''; setRoles(Array.isArray(x.roles) ? x.roles : ['Producción']); $('#pj-cv-l').textContent = x.cover ? 'Cambiar portada (opcional)' : 'Portada (JPG, PNG o WEBP)';
      $('#pj-head').textContent = 'Editar: ' + x.t; $('#pj-go').lastChild.textContent = 'Aplicar cambios'; $('#pj-cancel').hidden = false; $('#pj-file-l').textContent = 'Cambiar audio (opcional)'; msg('#pj-msg', ''); return $('#pj-t').focus();
    }
    if (act === 'hide') x.hidden = !x.hidden;
    if (act === 'up' || act === 'down') {
      var j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= list.length) return;
      list.splice(j, 0, list.splice(i, 1)[0]); list.forEach(function (p, k) { p.order = k + 1; });
    }
    if (act === 'rmaudio') return confirmBtn(b, function () { var old = x.audio; x.audio = ''; dropMedia(old); renderAll(); });
    if (act === 'rmcover') return confirmBtn(b, function () { var old = x.cover; x.cover = ''; dropMedia(old); renderAll(); });
    if (act === 'del') return confirmBtn(b, function () { S.projects.projects = S.projects.projects.filter(function (p) { return p.id !== id; }); dropMedia(x.audio); dropMedia(x.cover); if (editProj === id) pEnd(); msg('#pj-msg', 'PROYECTO QUITADO ✦ FALTA PUBLICAR'); renderAll(); });
    renderAll();
  });

  /* ── bio y tienda ── */
  function fillForms() {
    $('#bio-in').value = S.bio.text || ''; $('#bio-streams').value = S.bio.streams || ''; $('#bio-listeners').value = S.bio.listeners || ''; $('#bio-listeners-s').value = S.bio.listenersShort || '';
    fillLegal(); fillStats(); fillDropForm(); fillSecret(); fillLive();
    $('#st-profile').value = S.store.profile || ''; $('#st-count').value = S.store.count == null ? '' : S.store.count; $('#st-price').value = S.store.price || '';
  }
  $('#bio-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#bio-in').value.trim(); if (!t) return msg('#bio-msg', 'LA BIO NO PUEDE ESTAR VACÍA', 1);
    S.bio = { presskit: S.bio.presskit || '', text: t.slice(0, 2400), streams: $('#bio-streams').value.trim().slice(0, 10) || '13M', listeners: $('#bio-listeners').value.trim().slice(0, 10) || '20.000', listenersShort: $('#bio-listeners-s').value.trim().slice(0, 8) || $('#bio-listeners').value.trim().slice(0, 8) || '20K' };
    msg('#bio-msg', 'BIO LISTA ✦ FALTA PUBLICAR'); refreshBar();
  });
  $('#st-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = cleanUrl($('#st-profile').value), c = $('#st-count').value.trim(), n = parseInt(c, 10);
    if (u === null) return msg('#st-msg', 'ESE ENLACE NO ES VÁLIDO', 1);
    if (c && !(n >= 0)) return msg('#st-msg', 'EL Nº DE BEATS DEBE SER UN NÚMERO', 1);
    S.store = { profile: u, count: c ? n : null, price: $('#st-price').value.trim().slice(0, 10) || '40€' };
    msg('#st-msg', 'TIENDA LISTA ✦ FALTA PUBLICAR'); refreshBar();
  });

  /* ── presskit ── */
  function renderPresskit() {
    var p = S.bio.presskit || '';
    $('#pk-st').textContent = p ? 'Presskit actual: ' + p.split('/').pop() + (ADD[p] ? ' (nuevo, falta publicar)' : '') : 'No hay presskit: el botón de descarga no funcionará.';
    $('#pk-view').href = mediaUrl(p) || '#';
  }
  $('#pk-file').addEventListener('change', function () {
    var f = this.files[0], inp = this; if (!f) return;
    msg('#pk-msg', 'PREPARANDO PDF…');
    readPdf(f).then(function (a) {
      // Siempre en la misma ruta, para que los enlaces que ya hayas enviado sigan funcionando
      var path = 'media/presskit/7ty-presskit.pdf', old = S.bio.presskit;
      if (ADD[path]) URL.revokeObjectURL(ADD[path].url);
      ADD[path] = { b64: a.b64, url: a.url }; delete DEL[path]; S.bio.presskit = path; if (old !== path) dropMedia(old);
      inp.value = ''; msg('#pk-msg', 'PRESSKIT LISTO ✦ FALTA PUBLICAR'); renderAll();
    })
      .catch(function (e) { inp.value = ''; msg('#pk-msg', String(e && e.message || 'NO SE PUDO LEER EL PDF').toUpperCase(), 1); });
  });

  /* ── estudio: fotos y reseñas ── */
  function renderStudio() {
    var ph = S.studio.photos;
    $('#pn-photos').innerHTML = ph.length ? ph.map(function (x, i) {
      return '<div class="pn-photo" data-i="' + i + '"><img src="' + esc(mediaUrl(x.src)) + '" alt=""><span>' + (ADD[x.src] ? '<span class="new-tag" style="margin:0 4px 0 0">nueva</span>' : '') + esc(x.alt || 'Sin descripción') + '</span><div class="acts"><button class="mini" type="button" data-ph="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Mover antes">◀</button><button class="mini" type="button" data-ph="down"' + (i === ph.length - 1 ? ' disabled' : '') + ' aria-label="Mover después">▶</button><button class="mini danger" type="button" data-ph="del">Borrar</button></div></div>';
    }).join('') : '<div class="empty" style="grid-column:1/-1;padding:16px">Aún no hay fotos.</div>';
    var rv = S.studio.reviews;
    $('#pn-revs').innerHTML = rv.length ? rv.map(function (x, i) {
      return '<div class="pn-item" data-i="' + i + '"><div style="min-width:0"><b>' + esc(x.who) + '</b><span>' + esc(String(x.text).slice(0, 90)) + (String(x.text).length > 90 ? '…' : '') + (x.what ? ' · ' + esc(x.what) : '') + '</span></div><div class="pn-acts"><button class="mini" type="button" data-rv="up"' + (i === 0 ? ' disabled' : '') + '>▲</button><button class="mini" type="button" data-rv="down"' + (i === rv.length - 1 ? ' disabled' : '') + '>▼</button><button class="mini" type="button" data-rv="edit">Editar</button><button class="mini danger" type="button" data-rv="del">Borrar</button></div></div>';
    }).join('') : '<div class="empty" style="padding:16px">Aún no hay reseñas.</div>';
  }
  $('#ph-go').onclick = function () {
    var files = Array.prototype.slice.call($('#ph-file').files || []), alt = $('#ph-alt').value.trim().slice(0, 90), k = 0, added = 0;
    if (!files.length) return msg('#ph-msg', 'ELIGE UNA O VARIAS FOTOS', 1);
    if (S.studio.photos.length + files.length > 24) return msg('#ph-msg', 'COMO MÁXIMO 24 FOTOS', 1);
    files.reduce(function (p, f) { return p.then(function () { msg('#ph-msg', 'PREPARANDO FOTO ' + (++k) + '/' + files.length + '…'); return readImage(f, 1600, false).then(function (a) { S.studio.photos.push({ src: addMedia('studio', 'estudio', a), alt: alt }); added++; }); }); }, Promise.resolve())
      .then(function () { $('#ph-file').value = ''; $('#ph-alt').value = ''; msg('#ph-msg', added + (added === 1 ? ' FOTO LISTA' : ' FOTOS LISTAS') + ' ✦ FALTA PUBLICAR'); renderAll(); })
      .catch(function (e) { msg('#ph-msg', String(e && e.message || 'NO SE PUDO LEER LA FOTO').toUpperCase(), 1); renderAll(); });
  };
  $('#pn-photos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ph]'); if (!b) return;
    var list = S.studio.photos, i = +b.closest('[data-i]').dataset.i, x = list[i], act = b.dataset.ph; if (!x) return;
    if (act === 'del') return confirmBtn(b, function () { list.splice(i, 1); dropMedia(x.src); msg('#ph-msg', 'FOTO QUITADA ✦ FALTA PUBLICAR'); renderAll(); });
    var j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]); renderAll();
  });
  var rvEdit = -1;
  function rvEnd() { rvEdit = -1; $('#rv-form').reset(); $('#rv-head').textContent = 'Añadir reseña'; $('#rv-go').lastChild.textContent = 'Añadir reseña'; $('#rv-cancel').hidden = true; }
  $('#rv-cancel').onclick = function () { rvEnd(); msg('#rv-msg', ''); };
  $('#rv-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#rv-text').value.trim(), w = $('#rv-who').value.trim(), q = $('#rv-what').value.trim();
    if (!t) { msg('#rv-msg', 'FALTA LO QUE DICE', 1); return $('#rv-text').focus(); }
    if (!w) { msg('#rv-msg', 'FALTA EL ARTISTA', 1); return $('#rv-who').focus(); }
    var r = { text: t.slice(0, 320), who: w.slice(0, 40), what: q.slice(0, 50) }, editing = rvEdit;
    if (editing >= 0 && S.studio.reviews[editing]) S.studio.reviews[editing] = r; else S.studio.reviews.unshift(r);
    rvEnd(); msg('#rv-msg', (editing >= 0 ? 'CAMBIOS APLICADOS' : 'RESEÑA AÑADIDA') + ' ✦ FALTA PUBLICAR'); renderAll();
  });
  $('#pn-revs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rv]'); if (!b) return;
    var list = S.studio.reviews, i = +b.closest('[data-i]').dataset.i, x = list[i], act = b.dataset.rv; if (!x) return;
    if (act === 'edit') { rvEdit = i; $('#rv-text').value = x.text; $('#rv-who').value = x.who; $('#rv-what').value = x.what || ''; $('#rv-head').textContent = 'Editar reseña'; $('#rv-go').lastChild.textContent = 'Aplicar cambios'; $('#rv-cancel').hidden = false; msg('#rv-msg', ''); return $('#rv-text').focus(); }
    if (act === 'del') return confirmBtn(b, function () { list.splice(i, 1); if (rvEdit === i) rvEnd(); msg('#rv-msg', 'RESEÑA QUITADA ✦ FALTA PUBLICAR'); renderAll(); });
    var j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]); renderAll();
  });

  /* ── legal ── */
  function fillLegal() { var L = S.legal || {}; $('#le-owner').value = L.owner || ''; $('#le-nif').value = L.nif || ''; $('#le-addr').value = L.address || ''; $('#le-mail').value = L.email || ''; $('#le-upd').value = L.updated || ''; }
  $('#le-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var mail = $('#le-mail').value.trim();
    if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { msg('#le-msg', 'ESE EMAIL NO ES VÁLIDO', 1); return $('#le-mail').focus(); }
    S.legal = { owner: $('#le-owner').value.trim().slice(0, 80), nif: $('#le-nif').value.trim().toUpperCase().slice(0, 12), address: $('#le-addr').value.trim().slice(0, 140), email: mail.slice(0, 80), updated: $('#le-upd').value.trim().slice(0, 30) || 'octubre de 2026' };
    msg('#le-msg', 'DATOS LISTOS ✦ FALTA PUBLICAR'); refreshBar();
  });

  /* ── análisis de audio en el navegador: BPM y tonalidad aproximados ── */
  var Analyze = (function () {
    function fft(re, im) { // radix-2 in place
      var n = re.length, i, j, k, l, m;
      for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (l = 2; l <= n; l <<= 1) {
        var ang = -2 * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang), h = l >> 1;
        for (i = 0; i < n; i += l) {
          var cr = 1, ci = 0;
          for (k = 0; k < h; k++) {
            var a = i + k, b = a + h, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
            re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
            m = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = m;
          }
        }
      }
    }
    function hann(n) { var w = new Float32Array(n); for (var i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); return w; }
    function spectra(x, n, hop, each) {
      var w = hann(n), re = new Float32Array(n), im = new Float32Array(n), mag = new Float32Array(n / 2);
      for (var s = 0; s + n <= x.length; s += hop) {
        for (var i = 0; i < n; i++) { re[i] = x[s + i] * w[i]; im[i] = 0; }
        fft(re, im);
        for (i = 0; i < n / 2; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        each(mag);
      }
    }
    function tempo(x, sr) {
      var n = 1024, hop = 256, fps = sr / hop, prev = null, env = [];
      var maxBin = Math.min(n / 2, Math.round(8000 / sr * n));
      spectra(x, n, hop, function (mag) {
        var cur = new Float32Array(maxBin), f = 0;
        for (var i = 1; i < maxBin; i++) { cur[i] = Math.log(1 + 100 * mag[i]); if (prev) { var d = cur[i] - prev[i]; if (d > 0) f += d; } }
        prev = cur; env.push(f);
      });
      // quitar la tendencia (media móvil de ~0,5 s)
      var L = env.length, o = new Float32Array(L), win = Math.round(fps * 0.5), acc = 0, q = [];
      for (var i = 0; i < L; i++) { q.push(env[i]); acc += env[i]; if (q.length > win) acc -= q.shift(); o[i] = Math.max(0, env[i] - acc / q.length); }
      var minLag = Math.floor(fps * 60 / 200), maxLag = Math.ceil(fps * 60 / 55), ac = new Float32Array(maxLag + 2);
      for (var lag = minLag - 1; lag <= maxLag + 1; lag++) { var s = 0; for (i = 0; i + lag < L; i++) s += o[i] * o[i + lag]; ac[lag] = s / (L - lag); }
      function acAt(l) { var a = Math.floor(l), f = l - a; if (a < 1 || a + 1 >= ac.length) return 0; return ac[a] * (1 - f) + ac[a + 1] * f; }
      var best = 0, bestScore = -1, scores = [];
      for (var b = 70; b <= 180; b += 0.5) {
        var l = fps * 60 / b;
        // peine: el pulso y sus múltiplos
        var sc = acAt(l) + 0.5 * acAt(2 * l) + 0.33 * acAt(3 * l) + 0.25 * acAt(4 * l);
        var prior = Math.exp(-0.5 * Math.pow(Math.log2(b / 115) / 0.6, 2));
        sc *= 0.6 + 0.4 * prior;
        scores.push([b, sc]); if (sc > bestScore) { bestScore = sc; best = b; }
      }
      var alt = best * 2 <= 200 ? best * 2 : best / 2;
      return { bpm: Math.round(best), alt: Math.round(alt) };
    }
    var NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // perfiles de Albrecht y Shanahan (mayor / menor)
    var MAJ = [0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081];
    var MIN = [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052];
    function corr(a, b) {
      var ma = 0, mb = 0, i; for (i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; } ma /= 12; mb /= 12;
      var num = 0, da = 0, db = 0; for (i = 0; i < 12; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) * (a[i] - ma); db += (b[i] - mb) * (b[i] - mb); }
      return num / Math.sqrt(da * db || 1);
    }
    function tuning(x, sr) { // desafinación global en semitonos (-0,5..0,5)
      var n = 8192, hist = new Float64Array(100);
      spectra(x, n, n, function (mag) {
        for (var i = 3; i < n / 2 - 1; i++) {
          var f = i * sr / n; if (f < 60 || f > 1500 || !(mag[i] > mag[i - 1] && mag[i] > mag[i + 1])) continue;
          var a = mag[i - 1], b = mag[i], c = mag[i + 1], p = 0.5 * (a - c) / (a - 2 * b + c), m = 69 + 12 * Math.log2((i + p) * sr / n / 440), dev = m - Math.round(m);
          hist[(Math.round(dev * 100) + 100) % 100] += b;
        }
      });
      var best = 0, bi = 0; for (var i = 0; i < 100; i++) { var s = 0; for (var k = -5; k <= 5; k++) s += hist[(i + k + 100) % 100]; if (s > best) { best = s; bi = i; } }
      return (bi >= 50 ? bi - 100 : bi) / 100;
    }
    function key(x, sr) {
      var n = 8192, chroma = new Float64Array(12), ref = 440 * Math.pow(2, tuning(x, sr) / 12), bins = [];
      for (var m = 36; m <= 84; m++) { var f0 = ref * Math.pow(2, (m - 69) / 12), hb = []; for (var h = 1; h <= 3; h++) { var b = Math.round(h * f0 * n / sr); if (b + 1 < n / 2) hb.push([b, Math.pow(0.85, h - 1)]); } bins.push([m % 12, hb]); }
      spectra(x, n, 4096, function (mag) {
        var fr = new Float64Array(12), tot = 0;
        for (var i = 0; i < bins.length; i++) { var s = 0, hb = bins[i][1]; for (var j = 0; j < hb.length; j++) { var b = hb[j][0]; s += Math.max(mag[b - 1], mag[b], mag[b + 1]) * hb[j][1]; } fr[bins[i][0]] += s; tot += s; }
        if (tot > 0) for (var k = 0; k < 12; k++) chroma[k] += Math.sqrt(fr[k] / tot);
      });
      var all = [];
      for (var t = 0; t < 12; t++) {
        var maj = [], min = [];
        for (var k = 0; k < 12; k++) { maj.push(MAJ[(k - t + 12) % 12]); min.push(MIN[(k - t + 12) % 12]); }
        all.push([NAMES[t], corr(chroma, maj)], [NAMES[t] + 'm', corr(chroma, min) + 0.08]); // en música urbana manda el menor
      }
      all.sort(function (a, b) { return b[1] - a[1]; });
      return { key: all[0][0], conf: all[0][1] - all[1][1], second: all[1][0] };
    }
    function run(x, sr) {
      // como mucho 90 s desde el centro para no tardar
      var max = Math.min(x.length, sr * 90), st = Math.max(0, Math.floor((x.length - max) / 2)), seg = x.subarray(st, st + max);
      var t = tempo(seg, sr), k = key(seg, sr);
      return { bpm: t.bpm, bpmAlt: t.alt, key: k.key, keyAlt: k.second, keyConf: k.conf };
    }
    function file(f) {
      return f.arrayBuffer().then(function (buf) {
        var AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) throw new Error('no_audio');
        var ctx = new AC(1, 22050 * 2, 22050);
        return new Promise(function (res, rej) { var p = ctx.decodeAudioData(buf.slice(0), res, rej); if (p && p.then) p.then(res, rej); });
      }).then(function (ab) {
        var sr = ab.sampleRate, ch = ab.numberOfChannels, len = ab.length, x = new Float32Array(len);
        for (var c = 0; c < ch; c++) { var d = ab.getChannelData(c); for (var i = 0; i < len; i++) x[i] += d[i] / ch; }
        // a ~22 kHz para que sea rápido
        var step = Math.max(1, Math.round(sr / 22050)), y = step > 1 ? new Float32Array(Math.floor(len / step)) : x;
        if (step > 1) for (var j = 0; j < y.length; j++) { var s = 0; for (var q = 0; q < step; q++) s += x[j * step + q]; y[j] = s / step; }
        return run(y, sr / step);
      });
    }
    return { run: run, file: file };
  })();

  /* ── subida múltiple: arrastra varios beats a la vez ── */
  function sharpKey(k) {
    var F = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' };
    var m = String(k || '').trim().replace('♯', '#').replace('♭', 'b').match(/^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major)?$/); if (!m) return String(k || '').trim().slice(0, 8);
    var n = m[1].toUpperCase() + m[2], minor = m[3] && !/^maj/i.test(m[3]); return (F[n] || n) + (minor ? 'm' : '');
  }
  function parseName(name) {
    var s = String(name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/_+/g, ' '), out = { code: '', t: '', bpm: null, key: '' }, m;
    if ((m = s.match(/(\d{2,3})\s*bpm/i))) { out.bpm = +m[1]; s = s.replace(m[0], ' '); }
    if ((m = s.match(/(^|[\s(\[\-,·])([A-G](?:#|b|♯|♭)?)\s?(minor|major|min|maj|m)(?=$|[\s)\],\-·])/))) { out.key = sharpKey(m[2] + m[3]); s = s.replace(m[0], m[1] + ' '); }
    if ((m = s.match(/^\s*#?(\d{1,6})(?=\s*[-–.·)]|\s+\D|$)/))) { out.code = m[1]; s = s.slice(m[0].length); }
    s = s.replace(/\(?\s*prod\.?\s*(by)?\s*7ty\s*\)?/ig, ' ').replace(/\b(type\s*beat|free|instrumental|tagged|tag|preview|master)\b/ig, ' ')
      .replace(/[\[\](){}]/g, ' ').replace(/\s*[-–·|.]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (s === s.toLowerCase() || s === s.toUpperCase()) s = s.toLowerCase().replace(/(^|\s)(\S)/g, function (a, sp, c) { return sp + c.toUpperCase(); });
    out.t = s.slice(0, 60); return out;
  }
  var QUEUE = [], qSeq = 0, qAnalyzing = false, qBusy = false;
  function qMsg(t, err) { var m = $('#q-msg'); m.classList.toggle('err', !!err); m.textContent = t; }
  function qItem(it) { return document.querySelector('#q-items [data-q="' + it.n + '"]'); }
  function qStatus(it, t, cls) {
    it.st = cls || it.st; var el = qItem(it); if (!el) return;
    el.className = 'qi' + (it.st === 'ok' ? ' ok' : it.st === 'err' ? ' err' : ''); el.querySelector('.st').textContent = t;
  }
  function qCount() {
    var pend = QUEUE.filter(function (x) { return x.st !== 'ok'; }).length;
    $('#pn-queue').hidden = !QUEUE.length; $('#q-count').textContent = '(' + pend + ')';
    $('#q-go-l').textContent = (QUEUE_VERB || 'Subir') + (pend === 1 ? ' 1 beat' : ' ' + pend + ' beats'); $('#q-go').disabled = !pend || qBusy;
  }
  function qAdd(files) {
    var codes = {}; existingBeats().forEach(function (b) { if (b.code) codes[b.code] = 1; });
    var ok = Array.prototype.filter.call(files, function (f) { return /\.(mp3|m4a)$/i.test(f.name) || /^audio\/(mpeg|mp3|mp4|x-m4a)$/.test(f.type); });
    if (!ok.length) { qMsg('SOLO MP3 O M4A', 1); $('#pn-queue').hidden = !QUEUE.length; return; }
    if (QUEUE.length + ok.length > 40) { qMsg('COMO MÁXIMO 40 BEATS A LA VEZ', 1); ok = ok.slice(0, Math.max(0, 40 - QUEUE.length)); }
    ok.forEach(function (f) {
      var p = parseName(f.name), it = { n: ++qSeq, file: f, code: p.code, t: p.t, bpm: p.bpm || '', key: p.key, tags: '', bs: '', fromName: { bpm: !!p.bpm, key: !!p.key }, st: 'wait', bpmAlt: null, keyAlt: '' };
      QUEUE.push(it);
      var d = document.createElement('div'); d.className = 'qi'; d.dataset.q = it.n;
      d.innerHTML = '<label class="fld">Nº<input data-k="code" maxlength="6" inputmode="numeric" value="' + esc(it.code) + '"></label>' +
        '<label class="fld wide">Nombre *<input data-k="t" maxlength="60" value="' + esc(it.t) + '"></label>' +
        '<div class="cell"><label class="fld">BPM<input data-k="bpm" maxlength="3" inputmode="numeric" value="' + esc(it.bpm) + '"></label><button class="alt" type="button" data-alt="bpm" hidden></button></div>' +
        '<div class="cell"><label class="fld">Tono<input data-k="key" maxlength="8" value="' + esc(it.key) + '"></label><button class="alt" type="button" data-alt="key" hidden></button></div>' +
        '<label class="fld">Estilos<input data-k="tags" maxlength="80" placeholder="Reggaetón, Club"></label>' +
        '<label class="fld wide">Enlace en BeatStars<input data-k="bs" type="url" inputmode="url" maxlength="300" placeholder="https://www.beatstars.com/beat/…"></label>' +
        '<button class="mini danger x" type="button" data-qx="1" aria-label="Quitar ' + esc(f.name) + '">✕</button>' +
        '<div class="fn"><b class="st">EN COLA</b><span>' + esc(f.name) + (it.code && codes[it.code] ? ' · ojo: ya hay un beat con el nº ' + esc(it.code) : '') + '</span></div>';
      $('#q-items').appendChild(d);
    });
    qMsg(''); qCount(); qAnalyze();
  }
  function qAnalyze() {
    if (qAnalyzing) return;
    var it = QUEUE.find(function (x) { return x.st === 'wait'; }); if (!it) return;
    if (it.fromName.bpm && it.fromName.key) { qStatus(it, 'LISTO · BPM Y TONO DEL NOMBRE', 'ready'); return qAnalyze(); }
    qAnalyzing = true; qStatus(it, 'ANALIZANDO BPM Y TONO…', 'busy');
    Analyze.file(it.file).then(function (r) {
      var el = qItem(it); it.bpmAlt = r.bpmAlt; it.keyAlt = r.keyAlt;
      if (el) {
        var ib = el.querySelector('[data-k="bpm"]'), ik = el.querySelector('[data-k="key"]');
        if (!it.fromName.bpm && !ib.value) { ib.value = it.bpm = r.bpm; }
        if (!it.fromName.key && !ik.value) { ik.value = it.key = r.key; }
        var ab = el.querySelector('[data-alt="bpm"]'), ak = el.querySelector('[data-alt="key"]');
        if (!it.fromName.bpm) { ab.hidden = false; ab.textContent = '¿' + r.bpmAlt + '?'; ab.dataset.v = r.bpmAlt; }
        if (!it.fromName.key) { ak.hidden = false; ak.textContent = '¿' + r.keyAlt + '?'; ak.dataset.v = r.keyAlt; }
      }
      qStatus(it, 'LISTO · ' + (it.fromName.bpm ? 'BPM DEL NOMBRE' : 'BPM DETECTADO') + ' · ' + (it.fromName.key ? 'TONO DEL NOMBRE' : 'TONO DETECTADO'), 'ready');
    }, function () { qStatus(it, 'LISTO · NO SE PUDO ANALIZAR: ESCRIBE EL BPM Y EL TONO', 'ready'); })
      .then(function () { qAnalyzing = false; qCount(); qAnalyze(); });
  }
  (function () {
    var dz = $('#dz');
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) qAdd(e.dataTransfer.files); });
    $('#dz-file').addEventListener('change', function () { qAdd(this.files); this.value = ''; });
    $('#q-items').addEventListener('input', function (e) { var k = e.target.dataset.k; if (!k) return; var n = +e.target.closest('[data-q]').dataset.q, it = QUEUE.find(function (x) { return x.n === n; }); if (it) it[k] = e.target.value; });
    $('#q-items').addEventListener('click', function (e) {
      var row = e.target.closest('[data-q]'); if (!row) return; var n = +row.dataset.q, it = QUEUE.find(function (x) { return x.n === n; }); if (!it) return;
      var a = e.target.closest('[data-alt]');
      if (a) { var inp = row.querySelector('[data-k="' + a.dataset.alt + '"]'), old = inp.value; inp.value = it[a.dataset.alt] = a.dataset.v; a.dataset.v = old; a.textContent = '¿' + old + '?'; return; }
      if (e.target.closest('[data-qx]') && !qBusy) { QUEUE = QUEUE.filter(function (x) { return x !== it; }); row.remove(); qCount(); }
    });
    $('#q-clear').onclick = function () { if (qBusy) return; QUEUE = []; $('#q-items').innerHTML = ''; qMsg(''); qCount(); };
    $('#q-go').onclick = function () {
      if (qBusy) return;
      var todo = QUEUE.filter(function (x) { return x.st !== 'ok'; });
      for (var i = 0; i < todo.length; i++) {
        var x = todo[i], bpm = parseInt(x.bpm, 10);
        if (!String(x.t).trim()) { qMsg('A UN BEAT LE FALTA EL NOMBRE', 1); return qItem(x).querySelector('[data-k="t"]').focus(); }
        if (String(x.bpm).trim() && !(bpm >= 30 && bpm <= 300)) { qMsg('EL BPM VA DE 30 A 300', 1); return qItem(x).querySelector('[data-k="bpm"]').focus(); }
        if (cleanUrl(x.bs) === null) { qMsg('HAY UN ENLACE DE BEATSTARS QUE NO ES VÁLIDO', 1); return qItem(x).querySelector('[data-k="bs"]').focus(); }
        if (x.st === 'wait' || x.st === 'busy') { qMsg('ESPERA A QUE TERMINE EL ANÁLISIS', 1); return; }
      }
      qBusy = true; qCount(); var done = 0, fails = 0;
      todo.reduce(function (p, x, i) {
        return p.then(function () {
          qStatus(x, 'SUBIENDO…'); qMsg('SUBIENDO ' + (i + 1) + '/' + todo.length + '…');
          var fields = { code: String(x.code || '').replace(/[^0-9a-z]/gi, '').slice(0, 6), t: String(x.t).trim().slice(0, 60), bpm: parseInt(x.bpm, 10) || null, key: sharpKey(x.key),
            tags: String(x.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 4), bs: cleanUrl(x.bs) || '' };
          return queueUpload(x, fields, i).then(function () { done++; qStatus(x, 'SUBIDO ✦', 'ok'); }, function (err) { fails++; qStatus(x, 'ERROR: ' + String(err && err.message || 'NO SE PUDO SUBIR').toUpperCase(), 'err'); });
        });
      }, Promise.resolve()).then(function () {
        qBusy = false; qCount();
        qMsg(done + (done === 1 ? ' BEAT ' : ' BEATS ') + QUEUE_DONE + (fails ? ' · ' + fails + ' CON ERROR' : ''), !!fails);
      });
    };
  })();
  /* análisis del archivo del formulario de un solo beat */
  $('#f-file').addEventListener('change', function () {
    var f = this.files[0], det = $('#f-det'); if (!f) { det.hidden = true; return; }
    var p = parseName(f.name);
    if (!$('#f-title').value.trim() && p.t) $('#f-title').value = p.t;
    if (!$('#f-code').value.trim() && p.code) $('#f-code').value = p.code;
    if (!$('#f-bpm').value.trim() && p.bpm) $('#f-bpm').value = p.bpm;
    if (!$('#f-key').value.trim() && p.key) $('#f-key').value = p.key;
    if ($('#f-bpm').value.trim() && $('#f-key').value.trim()) { det.hidden = true; return; }
    det.hidden = false; det.textContent = 'ANALIZANDO EL AUDIO…';
    Analyze.file(f).then(function (r) {
      if (!$('#f-bpm').value.trim()) $('#f-bpm').value = r.bpm;
      if (!$('#f-key').value.trim()) $('#f-key').value = r.key;
      det.textContent = 'DETECTADO: ' + r.bpm + ' BPM (¿O ' + r.bpmAlt + '?) · ' + r.key + ' (¿O ' + r.keyAlt + '?) · REVÍSALO';
    }, function () { det.textContent = 'NO SE PUDO ANALIZAR: ESCRIBE EL BPM Y EL TONO'; });
  });
  $('#pn-form').addEventListener('reset', function () { $('#f-det').hidden = true; });

  /* ── estadísticas: tabla y pistas ── */
  function statsRender(get, beats, projects, note) {
    var rows = beats.map(function (b) { return { b: b, p: get('play-beat-' + b.id), s: get('bs-beat-' + b.id), sh: get('share-beat-' + b.id), f: get('fav-beat-' + b.id) }; });
    rows.sort(function (a, c) { return c.p - a.p || c.s - a.s || String(a.b.t).localeCompare(c.b.t, 'es'); });
    var sum = function (k) { return rows.reduce(function (n, r) { return n + r[k]; }, 0); }, P = sum('p'), S = sum('s'), SH = sum('sh'), maxP = Math.max(1, rows.length ? rows[0].p : 1);
    var PJ = projects.reduce(function (n, x) { return n + get('play-proj-' + x.id); }, 0);
    var cards = [['Visitas', get('visita')], ['Escuchas de beats', P], ['Abiertos en BeatStars', S + get('tienda-beatstars')], ['Compartidos', SH], ['Escuchas de proyectos', PJ], ['Presskit', get('presskit')], ['WhatsApp', get('contacto-whatsapp') + get('licencia-whatsapp')], ['Radio encendida', get('radio-on')], ['Adelantos del drop', get('drop-teaser')], ['Recordatorios del drop', get('drop-cal') + get('drop-aviso')], ['Antes y después', get('ab-play')], ['Favoritos', sum('f')], ['Tomas en la cabina', get('cabina-toma')], ['Temas mandados al muro', get('muro-enviar')], ['Destellos completados', get('destellos-7')], ['Papelera abierta', get('papelera')]];
    $('#sx-cards').innerHTML = cards.map(function (c) { return '<div><b>' + c[1].toLocaleString('es-ES') + '</b><span>' + c[0] + '</span></div>'; }).join('');
    var tips = [], name = function (b) { return '«' + esc((b.code ? b.code + ' · ' : '') + b.t) + '»'; };
    if (!P && !get('visita')) tips.push('Aún no hay datos. ' + esc(note || 'En cuanto alguien visite la web empezarán a salir aquí.'));
    else {
      if (rows[0] && rows[0].p) tips.push('El más escuchado es ' + name(rows[0].b) + ' con ' + rows[0].p + (rows[0].p === 1 ? ' escucha' : ' escuchas') + ': buen candidato para destacar en redes o hacer uno parecido.');
      var cold = rows.filter(function (r) { return r.p >= 5 && !r.s; }).slice(0, 3);
      if (cold.length) tips.push(cold.map(function (r) { return name(r.b); }).join(', ') + ' se escucha' + (cold.length > 1 ? 'n' : '') + ' bastante pero nadie lo abre en BeatStars: revisa el precio, el enlace o súbelo al principio de tu tienda.');
      var nolink = rows.filter(function (r) { return r.p > 0 && !r.b.bs; }).slice(0, 3);
      if (nolink.length) tips.push(nolink.map(function (r) { return name(r.b); }).join(', ') + ' tiene' + (nolink.length > 1 ? 'n' : '') + ' escuchas pero no tiene' + (nolink.length > 1 ? 'n' : '') + ' enlace de BeatStars: pégalo en Beats para que puedan comprarlo directo.');
      var zero = rows.filter(function (r) { return !r.p && !r.b.hidden; }).length;
      if (zero && P) tips.push(zero + (zero === 1 ? ' beat visible no tiene' : ' beats visibles no tienen') + ' ninguna escucha todavía.');
    }
    $('#sx-tips').innerHTML = tips.map(function (t) { return '<li><svg><use href="#s-spark"/></svg><span>' + t + '</span></li>'; }).join('');
    $('#sx-tbl').innerHTML = '<div class="sx-row h"><span>Beat</span><span>Escuchas</span><span class="n">BeatStars</span><span class="n cv">Conversión</span></div>' + (rows.length ? rows.map(function (r) {
      return '<div class="sx-row"><b>' + esc((r.b.code ? r.b.code + ' · ' : '') + r.b.t) + '</b><span class="sx-bar"><i style="width:' + Math.round(r.p / maxP * 100) + '%"></i><span class="n">' + r.p + '</span></span><span class="n">' + r.s + '</span><span class="n cv">' + (r.p ? (r.s / r.p < 0.1 ? (r.s / r.p * 100).toFixed(1).replace('.', ',') : Math.round(r.s / r.p * 100)) + '%' : '—') + '</span></div>';
    }).join('') : '<div class="empty">Aún no hay beats.</div>');
  }

  var QUEUE_VERB = 'Añadir', QUEUE_DONE = 'AÑADIDOS ✦ FALTA PUBLICAR';
  function existingBeats() { return S ? S.beats.beats : []; }
  function queueUpload(x, f, i) {
    return readAudio(x.file).then(function (a) {
      var path = addMedia('beats', (f.code ? f.code + '-' : '') + slug(f.t, 'beat'), a);
      S.beats.beats.push(Object.assign({ id: 'b' + Date.now().toString(36) + i + '-' + slug(f.t, 'beat') }, f, { src: path, sold: false, hidden: false, order: Date.now() + i }));
      renderAll();
    });
  }

  /* ── estadísticas: GoatCounter ── */
  function gcCode() { var c = String((S.stats || {}).goatcounter || '').trim().toLowerCase(); return /^[a-z0-9][a-z0-9-]{1,49}$/.test(c) ? c : ''; }
  function fillStats() {
    $('#sx-code').value = (S.stats || {}).goatcounter || '';
    try { $('#sx-me').checked = localStorage.getItem('7ty-notrack') === '1'; } catch (x) {}
    var c = gcCode(); $('#sx-gc').href = c ? 'https://' + c + '.goatcounter.com' : 'https://www.goatcounter.com';
  }
  $('#sx-me').addEventListener('change', function () { try { if (this.checked) localStorage.setItem('7ty-notrack', '1'); else localStorage.setItem('7ty-notrack', '0'); } catch (x) {} });
  $('#sx-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#sx-code').value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\.goatcounter\.com.*$/, '');
    if (v && !/^[a-z0-9][a-z0-9-]{1,49}$/.test(v)) return msg('#sx-cmsg', 'EL CÓDIGO SOLO LLEVA LETRAS, NÚMEROS Y GUIONES', 1);
    S.stats = { goatcounter: v }; $('#sx-code').value = v; fillStats();
    msg('#sx-cmsg', v ? 'CÓDIGO LISTO ✦ FALTA PUBLICAR' : 'ESTADÍSTICAS DESACTIVADAS ✦ FALTA PUBLICAR'); refreshBar();
  });
  var gcData = null;
  function gcFetch(code, path, start) {
    var u = 'https://' + code + '.goatcounter.com/counter/' + encodeURIComponent(path) + '.json' + (start ? '?start=' + start : '');
    return fetch(u, { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return 0; if (!r.ok) throw new Error('http');
      return r.json().then(function (j) { return parseInt(String(j.count || '0').replace(/\D/g, ''), 10) || 0; });
    });
  }
  $('#sx-go').onclick = function () {
    var code = gcCode(), go = this;
    if (!code) return msg('#sx-msg', 'PRIMERO CONECTA GOATCOUNTER (ABAJO) Y PUBLICA', 1);
    var r = $('#sx-range').value, start = '';
    if (r !== 'all') { var d = new Date(Date.now() - (+r) * 864e5); start = d.toISOString().slice(0, 10); }
    var beats = S.beats.beats.filter(function (b) { return !b.hidden; }), projs = S.projects.projects;
    var site = new URL(siteBase()).pathname || '/';
    var names = ['visita', 'presskit', 'contacto-whatsapp', 'licencia-whatsapp', 'tienda-beatstars', 'radio-on', 'drop-teaser', 'drop-cal', 'drop-aviso', 'ab-play', 'cabina-toma', 'muro-enviar', 'destellos-7', 'papelera'];
    beats.forEach(function (b) { names.push('play-beat-' + b.id, 'bs-beat-' + b.id, 'share-beat-' + b.id, 'fav-beat-' + b.id); });
    projs.forEach(function (x) { names.push('play-proj-' + x.id); });
    var out = {}, i = 0, done = 0, failed = 0; go.disabled = true; msg('#sx-msg', 'CARGANDO 0/' + names.length + '…');
    function worker() {
      if (i >= names.length) return Promise.resolve();
      var n = names[i++];
      return gcFetch(code, n === 'visita' ? site : n, start).then(function (v) { out[n] = v; }, function () { failed++; out[n] = 0; })
        .then(function () { done++; if (done % 6 === 0) msg('#sx-msg', 'CARGANDO ' + done + '/' + names.length + '…'); return worker(); });
    }
    Promise.all([worker(), worker(), worker(), worker()]).then(function () {
      go.disabled = false; gcData = out;
      if (failed === names.length) { msg('#sx-msg', 'NO SE PUDIERON LEER: EN GOATCOUNTER, SETTINGS, ACTIVA «ALLOW ADDING VISITOR COUNTS ON YOUR WEBSITE», O MÍRALAS ALLÍ', 1); return; }
      msg('#sx-msg', (r === 'all' ? 'DESDE SIEMPRE' : 'ÚLTIMOS ' + r + ' DÍAS') + (failed ? ' · ' + failed + ' CIFRAS NO SE PUDIERON LEER' : ' ✦'));
      statsRender(function (k) { return +out[k] || 0; }, beats, projs, 'Las cifras tardan unos minutos en aparecer en GoatCounter.');
    });
  };

  /* ── vista previa: la web con los cambios sin publicar, solo en este navegador ── */
  $('#preview').onclick = function () {
    var media = {}; Object.keys(ADD).forEach(function (p) { media[p] = ADD[p].url; });
    var data = { ts: Date.now(), content: {}, media: media };
    Object.keys(FILES).forEach(function (k) { data.content[k] = S[k]; });
    try { localStorage.setItem('7ty-preview', JSON.stringify(data)); } catch (x) { return refreshBar('NO SE PUDO PREPARAR LA VISTA PREVIA'); }
    var w = window.open('../?preview=1', '7ty-preview'); if (!w) refreshBar('EL NAVEGADOR HA BLOQUEADO LA VENTANA: PERMITE LAS VENTANAS EMERGENTES');
  };

  /* ── drops: fechas ── */
  function p2d(n) { return ('0' + n).slice(-2); }
  function nextFriday() { var d = new Date(); d.setSeconds(0, 0); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); d.setHours(18, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 7); return d; }
  function toLocalInput(d) { return d.getFullYear() + '-' + p2d(d.getMonth() + 1) + '-' + p2d(d.getDate()) + 'T' + p2d(d.getHours()) + ':' + p2d(d.getMinutes()); }
  function fromLocalInput(v) { if (!v) return ''; var t = new Date(v); return isFinite(t.getTime()) ? t.toISOString() : null; }
  function whenTxt(iso) { var d = new Date(iso); return isFinite(d.getTime()) ? d.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function dropState(b) { var t = b.at ? Date.parse(b.at) : NaN; if (!isFinite(t)) return ''; var now = Date.now(); return t > now ? 'up' : now - t < 30 * 864e5 ? 'out' : ''; }

  /* ── drops y radio ── */
  function renderDrops() {
    var sel = $('#dr-beat'), cur = sel.value, all = S.beats.beats;
    sel.innerHTML = all.slice().sort(function (a, b) { return (b.order || 0) - (a.order || 0); }).map(function (b) { return '<option value="' + esc(b.id) + '">' + esc((b.code ? b.code + ' · ' : '') + b.t) + (b.hidden ? ' (oculto)' : '') + '</option>'; }).join('');
    if (cur) sel.value = cur; if (!$('#dr-at').value) $('#dr-at').value = toLocalInput(nextFriday());
    var list = all.filter(function (b) { return dropState(b); }).sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
    $('#dr-list').innerHTML = list.length ? list.map(function (b) {
      var up = dropState(b) === 'up';
      return '<div class="pn-item" data-id="' + esc(b.id) + '"><div style="min-width:0"><b>' + esc((b.code ? b.code + ' · ' : '') + b.t) + '</b><span>' + (up ? 'Sale ' : 'Salió ') + esc(whenTxt(b.at)) + (b.hidden ? ' · oculto' : '') + '</span></div><div class="pn-acts">' +
        (up ? '<button class="mini" type="button" data-dr="now">Lanzar ya</button><button class="mini" type="button" data-dr="edit">Cambiar fecha</button>' : '') + '<button class="mini danger" type="button" data-dr="clear">Quitar fecha</button></div></div>';
    }).join('') : '<div class="empty" style="padding:16px">No hay drops programados.</div>';
    var vs = S.radio.voices;
    $('#rd-list').innerHTML = vs.length ? vs.map(function (v, i) {
      return '<div class="pn-item" data-i="' + i + '"><div style="min-width:0"><b>' + esc(v.t || 'Cuña ' + (i + 1)) + (ADD[v.src] ? '<span class="new-tag">nueva</span>' : '') + '</b></div><div class="pn-acts"><button class="mini play" type="button" data-rv2="play">' + (playing === v.src ? '❚❚' : '▶') + '</button><button class="mini danger" type="button" data-rv2="del">Borrar</button></div></div>';
    }).join('') : '<div class="empty" style="padding:16px">Sin cuñas: entre canciones suena la sintonía.</div>';
  }
  function fillDropForm() {
    var d = S.radio.drop || {};
    $('#dr-hide').checked = !!d.hideName; $('#dr-teaser').checked = d.teaser !== false; $('#dr-ch').value = d.channel || ''; $('#dr-chl').value = d.channelLabel || '';
    $('#dr-days').value = d.newDays || 7; $('#rd-every').value = String(Math.min(5, Math.max(2, S.radio.every || 3)));
  }
  $('#dr-fri').onclick = function () { $('#dr-at').value = toLocalInput(nextFriday()); };
  $('#dr-go').onclick = function () {
    var id = $('#dr-beat').value, iso = fromLocalInput($('#dr-at').value), b = S.beats.beats.find(function (x) { return x.id === id; });
    if (!b) return msg('#dr-msg', 'ELIGE UN BEAT', 1);
    if (!iso) return msg('#dr-msg', 'ELIGE LA FECHA Y LA HORA', 1);
    if (Date.parse(iso) <= Date.now()) return msg('#dr-msg', 'LA FECHA TIENE QUE SER FUTURA', 1);
    b.at = iso; b.hidden = false; msg('#dr-msg', 'PROGRAMADO ✦ SALE ' + whenTxt(iso).toUpperCase() + ' · FALTA PUBLICAR'); renderAll();
  };
  $('#dr-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-dr]'); if (!b) return;
    var id = b.closest('[data-id]').dataset.id, x = S.beats.beats.find(function (y) { return y.id === id; }), act = b.dataset.dr; if (!x) return;
    if (act === 'edit') { $('#dr-beat').value = id; $('#dr-at').value = toLocalInput(new Date(x.at)); $('#dr-at').focus(); return msg('#dr-msg', 'CAMBIA LA FECHA Y PULSA PROGRAMAR'); }
    confirmBtn(b, function () {
      x.at = act === 'now' ? new Date().toISOString() : '';
      msg('#dr-msg', (act === 'now' ? 'LANZADO: SALE EN CUANTO PUBLIQUES' : 'FECHA QUITADA: SE VERÁ COMO UN BEAT NORMAL') + ' · FALTA PUBLICAR'); renderAll();
    });
  });
  $('#dr-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var ch = cleanUrl($('#dr-ch').value), days = parseInt($('#dr-days').value, 10);
    if (ch === null) return msg('#dr-smsg', 'EL ENLACE DE AVISOS NO ES VÁLIDO', 1);
    S.radio.drop = { hideName: $('#dr-hide').checked, teaser: $('#dr-teaser').checked, channel: ch, channelLabel: $('#dr-chl').value.trim().slice(0, 30), newDays: days >= 1 && days <= 60 ? days : 7 };
    S.radio.every = +$('#rd-every').value || 3;
    msg('#dr-smsg', 'AJUSTES LISTOS ✦ FALTA PUBLICAR'); refreshBar();
  });
  $('#rd-file').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files || []), inp = this, k = 0, n = 0; if (!files.length) return;
    if (S.radio.voices.length + files.length > 12) { inp.value = ''; return msg('#rd-msg', 'COMO MÁXIMO 12 CUÑAS', 1); }
    files.reduce(function (p, f) { return p.then(function () { msg('#rd-msg', 'PREPARANDO CUÑA ' + (++k) + '/' + files.length + '…'); return readAudio(f).then(function (a) { S.radio.voices.push({ src: addMedia('radio', 'cuna', a), t: f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) }); n++; }); }); }, Promise.resolve())
      .then(function () { inp.value = ''; msg('#rd-msg', n + (n === 1 ? ' CUÑA LISTA' : ' CUÑAS LISTAS') + ' ✦ FALTA PUBLICAR'); renderAll(); })
      .catch(function (e) { inp.value = ''; msg('#rd-msg', String(e && e.message || 'NO SE PUDO LEER EL AUDIO').toUpperCase(), 1); renderAll(); });
  });
  $('#rd-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rv2]'); if (!b) return; var i = +b.closest('[data-i]').dataset.i, v = S.radio.voices[i]; if (!v) return;
    if (b.dataset.rv2 === 'play') return playPath(v.src, b);
    confirmBtn(b, function () { S.radio.voices.splice(i, 1); dropMedia(v.src); msg('#rd-msg', 'CUÑA QUITADA ✦ FALTA PUBLICAR'); renderAll(); });
  });

  /* ── antes y después ── */
  function renderAB() {
    var ab = S.studio.ab;
    $('#ab-list').innerHTML = ab.length ? ab.map(function (x, i) {
      return '<div class="pn-item" data-i="' + i + '"><div style="min-width:0"><b>' + esc(x.t) + (ADD[x.after] ? '<span class="new-tag">nueva</span>' : '') + '</b><span>' + esc(x.a || 'Sin artista') + '</span></div><div class="pn-acts"><button class="mini play" type="button" data-abx="pb">' + (playing === x.before ? '❚❚' : '▶') + ' antes</button><button class="mini play" type="button" data-abx="pa">' + (playing === x.after ? '❚❚' : '▶') + ' después</button><button class="mini" type="button" data-abx="up"' + (i === 0 ? ' disabled' : '') + '>▲</button><button class="mini" type="button" data-abx="down"' + (i === ab.length - 1 ? ' disabled' : '') + '>▼</button><button class="mini danger" type="button" data-abx="del">Borrar</button></div></div>';
    }).join('') : '<div class="empty" style="padding:16px">Aún no hay comparaciones.</div>';
  }
  $('#ab-go').onclick = function () {
    var t = $('#ab-tt').value.trim(), a = $('#ab-aa').value.trim(), fb = $('#ab-fb').files[0], fa = $('#ab-fa').files[0], A = null;
    if (!t) { msg('#ab-msg', 'FALTA EL TEMA', 1); return $('#ab-tt').focus(); }
    if (!fb || !fa) return msg('#ab-msg', 'FALTAN LOS DOS AUDIOS: ANTES Y DESPUÉS', 1);
    msg('#ab-msg', 'PREPARANDO AUDIOS…');
    readAudio(fb).then(function (x) { A = x; return readAudio(fa); }).then(function (B) {
      var base = slug(t, 'tema');
      S.studio.ab.push({ t: t.slice(0, 50), a: a.slice(0, 40), before: addMedia('studio', base + '-antes', A), after: addMedia('studio', base + '-despues', B) });
      ['#ab-tt', '#ab-aa', '#ab-fb', '#ab-fa'].forEach(function (k) { $(k).value = ''; });
      msg('#ab-msg', 'COMPARACIÓN LISTA ✦ FALTA PUBLICAR'); renderAll();
    }).catch(function (e) { msg('#ab-msg', String(e && e.message || 'NO SE PUDO LEER EL AUDIO').toUpperCase(), 1); });
  };
  $('#ab-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-abx]'); if (!b) return;
    var list = S.studio.ab, i = +b.closest('[data-i]').dataset.i, x = list[i], act = b.dataset.abx; if (!x) return;
    if (act === 'pb') return playPath(x.before, b);
    if (act === 'pa') return playPath(x.after, b);
    if (act === 'del') return confirmBtn(b, function () { list.splice(i, 1); dropMedia(x.before); dropMedia(x.after); msg('#ab-msg', 'COMPARACIÓN QUITADA ✦ FALTA PUBLICAR'); renderAll(); });
    var j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]); renderAll();
  });


  /* ── muro ── */
  var wlEdit = null;
  function renderWallAdm() {
    var sel = $('#wl-beat'), v = sel.value, items = S.wall.items;
    sel.innerHTML = '<option value="">Otro / no lo sé</option>' + S.beats.beats.slice().sort(function (a, b) { return (b.order || 0) - (a.order || 0); }).map(function (b) { return '<option value="' + esc(b.id) + '">' + esc((b.code ? b.code + ' · ' : '') + b.t) + '</option>'; }).join(''); sel.value = v;
    $('#wl-list').innerHTML = items.length ? items.map(function (x, i) {
      var b = S.beats.beats.find(function (y) { return y.id === x.beat; });
      return '<div class="pn-proj" data-i="' + i + '"><div class="head">' + (x.cover ? '<img class="pn-thumb" src="' + esc(mediaUrl(x.cover)) + '" alt="">' : '<span class="pn-thumb" aria-hidden="true"></span>') + '<div style="min-width:0"><b>' + esc(x.t) + (ADD[x.cover] ? '<span class="new-tag">portada nueva</span>' : '') + '</b><span class="st">' + esc(x.a) + (b ? ' · beat «' + esc(b.t) + '»' : '') + (x.date ? ' · ' + esc(x.date) : '') + (x.link ? ' · enlace ✓' : '') + '</span></div></div>' +
        '<div class="acts"><button class="mini" type="button" data-wl="up"' + (i === 0 ? ' disabled' : '') + '>▲</button><button class="mini" type="button" data-wl="down"' + (i === items.length - 1 ? ' disabled' : '') + '>▼</button><button class="mini" type="button" data-wl="edit">Editar</button><button class="mini danger" type="button" data-wl="del">Borrar</button></div></div>';
    }).join('') : '<div class="empty" style="padding:16px">El muro está vacío: en la web sale solo la invitación a mandar temas.</div>';
  }
  function wlEnd() { wlEdit = null; $('#wl-form').reset(); $('#wl-head').textContent = 'Añadir al muro'; $('#wl-go').lastChild.textContent = 'Añadir al muro'; $('#wl-cancel').hidden = true; $('#wl-cv-l').textContent = 'Portada (opcional)'; }
  $('#wl-cancel').onclick = function () { wlEnd(); msg('#wl-msg', ''); };
  $('#wl-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#wl-t').value.trim(), a = $('#wl-a').value.trim(), l = cleanUrl($('#wl-l').value), f = $('#wl-cv').files[0];
    if (!t) { msg('#wl-msg', 'FALTA EL TEMA', 1); return $('#wl-t').focus(); }
    if (!a) { msg('#wl-msg', 'FALTA EL ARTISTA', 1); return $('#wl-a').focus(); }
    if (l === null) { msg('#wl-msg', 'EL ENLACE NO ES VÁLIDO', 1); return $('#wl-l').focus(); }
    var editing = wlEdit, old = editing != null ? S.wall.items[editing] : null;
    msg('#wl-msg', f ? 'PREPARANDO PORTADA…' : 'APLICANDO…');
    (f ? readImage(f, 800, true) : Promise.resolve(null)).then(function (img) {
      var x = { id: old ? old.id : 'w' + Date.now().toString(36), t: t.slice(0, 60), a: a.slice(0, 40), beat: $('#wl-beat').value, link: l, date: $('#wl-d').value.trim().slice(0, 20), cover: old ? old.cover : '' };
      if (img) { x.cover = addMedia('wall', slug(t, 'tema'), img); }
      if (old) { S.wall.items[editing] = x; if (img && old.cover) dropMedia(old.cover); } else S.wall.items.unshift(x);
      msg('#wl-msg', (old ? 'CAMBIOS APLICADOS' : 'AÑADIDO AL MURO') + ' ✦ FALTA PUBLICAR'); wlEnd(); renderAll();
    }).catch(function (er) { msg('#wl-msg', String(er && er.message || 'NO SE PUDO LEER LA PORTADA').toUpperCase(), 1); });
  });
  $('#wl-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-wl]'); if (!b) return;
    var items = S.wall.items, i = +b.closest('[data-i]').dataset.i, act = b.dataset.wl, x = items[i]; if (!x) return;
    if (act === 'edit') { wlEdit = i; $('#wl-t').value = x.t; $('#wl-a').value = x.a; $('#wl-beat').value = x.beat || ''; $('#wl-l').value = x.link || ''; $('#wl-d').value = x.date || ''; $('#wl-cv').value = ''; $('#wl-head').textContent = 'Editar: ' + x.t; $('#wl-go').lastChild.textContent = 'Aplicar cambios'; $('#wl-cancel').hidden = false; $('#wl-cv-l').textContent = x.cover ? 'Cambiar portada (opcional)' : 'Portada (opcional)'; msg('#wl-msg', ''); return $('#wl-t').focus(); }
    if (act === 'del') return confirmBtn(b, function () { items.splice(i, 1); dropMedia(x.cover); if (wlEdit === i) wlEnd(); msg('#wl-msg', 'QUITADO DEL MURO ✦ FALTA PUBLICAR'); renderAll(); });
    var j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= items.length) return;
    items.splice(j, 0, items.splice(i, 1)[0]); renderAll();
  });

  /* ── secretos y estado del estudio ── */
  var LIVE_T = { libre: 'Huecos libres', pocas: 'Quedan pocas horas', lleno: 'Agenda llena', grabando: 'Grabando ahora', vacaciones: 'De vacaciones' };
  function fillSecret() { var sp = S.extras.sparks || {}; $('#se-spk').checked = sp.on !== false; $('#se-rw').value = sp.reward || ''; $('#se-code').value = sp.code || ''; $('#se-link').value = sp.link || ''; $('#se-night').checked = S.extras.night !== false; $('#se-saver').checked = S.extras.saver !== false; }
  function bookingUrl(raw) {
    var v = String(raw || '').trim(), m = v.match(/src\s*=\s*["']([^"']+)["']/i); if (m) v = m[1];
    v = v.replace(/&amp;/g, '&'); if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v.replace(/^http:/i, 'https:')); } catch (e) { return null; }
    if (u.hostname !== 'calendar.google.com' && u.hostname !== 'calendar.app.google') return null;
    return u.href;
  }
  $('#bk-form').addEventListener('submit', function (e) {
    e.preventDefault(); var u = bookingUrl($('#bk-url').value);
    if (u === null) return msg('#bk-msg', 'ESO NO ES UNA AGENDA DE GOOGLE CALENDAR', 1);
    if (!u) return msg('#bk-msg', 'PEGA EL CÓDIGO O EL ENLACE DE TU AGENDA', 1);
    S.extras.booking = { url: u }; $('#bk-url').value = u;
    msg('#bk-msg', (/calendar\.google\.com\/calendar\/appointments\//.test(u) ? 'AGENDA LISTA: SE VERÁ DENTRO DE LA WEB' : 'AGENDA LISTA: SE ABRIRÁ EN OTRA PESTAÑA') + ' ✦ FALTA PUBLICAR'); refreshBar();
  });
  $('#bk-off').onclick = function () { S.extras.booking = { url: '' }; $('#bk-url').value = ''; msg('#bk-msg', 'AGENDA QUITADA ✦ FALTA PUBLICAR'); refreshBar(); };
  function fillLive() {
    $('#bk-url').value = (S.extras.booking || {}).url || '';
    var st = S.extras.status || {}; $('#ls-state').value = st.state || ''; $('#ls-slots').value = st.slots || ''; $('#ls-until').value = st.until || ''; $('#ls-note').value = st.note || '';
    $('#ls-prev').innerHTML = st.state ? '<span class="pn-help">Ahora: ' + esc(LIVE_T[st.state] || st.state) + (st.updated ? ' · actualizado ' + esc(whenTxt(st.updated)) : '') + '</span>' : '<span class="pn-help">Ahora no se muestra nada.</span>';
  }
  $('#se-form').addEventListener('submit', function (e) {
    e.preventDefault(); var link = cleanUrl($('#se-link').value);
    if (link === null) return msg('#se-msg', 'EL ENLACE DEL REGALO NO ES VÁLIDO', 1);
    S.extras.sparks = { on: $('#se-spk').checked, reward: $('#se-rw').value.trim().slice(0, 300), code: $('#se-code').value.trim().slice(0, 30), link: link };
    S.extras.night = $('#se-night').checked; S.extras.saver = $('#se-saver').checked;
    msg('#se-msg', 'AJUSTES LISTOS ✦ FALTA PUBLICAR'); refreshBar();
  });
  $('#ls-form').addEventListener('submit', function (e) {
    e.preventDefault(); var n = parseInt($('#ls-slots').value, 10);
    S.extras.status = { state: $('#ls-state').value, slots: n > 0 && n < 100 ? n : null, note: $('#ls-note').value.trim().slice(0, 50), until: $('#ls-until').value || '', updated: new Date().toISOString() };
    fillLive(); msg('#ls-msg', 'ESTADO LISTO ✦ FALTA PUBLICAR'); refreshBar();
  });
  function renderTrash() {
    var tr = S.extras.trash;
    $('#se-trlist').innerHTML = tr.length ? tr.map(function (x, i) { return '<div class="pn-item" data-i="' + i + '"><div style="min-width:0"><b>' + esc(x.t || 'Snippet ' + (i + 1)) + (ADD[x.src] ? '<span class="new-tag">nuevo</span>' : '') + '</b></div><div class="pn-acts"><button class="mini play" type="button" data-se="play">' + (playing === x.src ? '❚❚' : '▶') + '</button><button class="mini danger" type="button" data-se="del">Borrar</button></div></div>'; }).join('') : '<div class="empty" style="padding:16px">Papelera vacía.</div>';
  }
  $('#se-tr').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files || []), inp = this, k = 0, n = 0, add = []; if (!files.length) return;
    if (S.extras.trash.length + files.length > 30) { inp.value = ''; return msg('#se-trmsg', 'COMO MÁXIMO 30 SNIPPETS', 1); }
    files.reduce(function (p, f) { return p.then(function () { msg('#se-trmsg', 'PREPARANDO ' + (++k) + '/' + files.length + '…'); return readAudio(f).then(function (a) { add.push({ src: addMedia('papelera', slug(f.name.replace(/\.[a-z0-9]+$/i, ''), 'snippet'), a), t: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 60), d: new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase() }); n++; }); }); }, Promise.resolve())
      .then(function () { S.extras.trash = add.concat(S.extras.trash); inp.value = ''; msg('#se-trmsg', n + ' A LA PAPELERA ✦ FALTA PUBLICAR'); renderAll(); })
      .catch(function (er) { S.extras.trash = add.concat(S.extras.trash); inp.value = ''; msg('#se-trmsg', String(er && er.message || 'NO SE PUDO LEER EL AUDIO').toUpperCase(), 1); renderAll(); });
  });
  $('#se-trlist').addEventListener('click', function (e) {
    var b = e.target.closest('[data-se]'); if (!b) return; var i = +b.closest('[data-i]').dataset.i, x = S.extras.trash[i]; if (!x) return;
    if (b.dataset.se === 'play') return playPath(x.src, b);
    confirmBtn(b, function () { S.extras.trash.splice(i, 1); dropMedia(x.src); msg('#se-trmsg', 'BORRADO ✦ FALTA PUBLICAR'); renderAll(); });
  });


  /* ── lista de lanzamiento ── */
  function ckRender(items) {
    var must = items.filter(function (x) { return x.g === 'must'; }), done = must.filter(function (x) { return x.ok; }).length;
    $('#ck-score').textContent = done + '/' + must.length + ' IMPRESCINDIBLES';
    $('#ck-fill').style.width = (must.length ? done / must.length * 100 : 100) + '%';
    var G = { must: 'Imprescindible antes de lanzar', rec: 'Muy recomendable', opt: 'Cuando quieras' };
    $('#ck-list').innerHTML = ['must', 'rec', 'opt'].map(function (g) {
      var xs = items.filter(function (x) { return x.g === g; }); if (!xs.length) return '';
      return '<p class="ck-group">' + G[g] + '</p>' + xs.map(function (x) {
        return '<div class="ck ' + (x.ok ? 'ok' : g === 'must' ? 'no' : '') + '"><span class="ck-i" aria-hidden="true">' + (x.ok ? '✓' : g === 'must' ? '!' : '○') + '</span><div><b>' + esc(x.t) + '</b><span class="d">' + esc(x.d) + '</span></div>' +
          (x.tab && !x.ok ? '<button class="mini" type="button" data-ck="' + x.tab + '">Ir</button>' : '<span class="sr">' + (x.ok ? 'Hecho' : 'Pendiente') + '</span>') + '</div>';
      }).join('');
    }).join('');
  }
  $('#ck-list').addEventListener('click', function (e) { var b = e.target.closest('[data-ck]'); if (b) tab(b.dataset.ck); });
  function ckFrac(n, m) { return m ? n + ' de ' + m : 'ninguno todavía'; }
  function renderChecklist() {
    if (!S) return;
    var vis = S.beats.beats.filter(function (b) { return !b.hidden; }), withBs = vis.filter(function (b) { return b.bs; }).length;
    var pj = S.projects.projects.filter(function (x) { return !x.hidden; }), pa = pj.filter(function (x) { return x.audio; }).length, pc = pj.filter(function (x) { return x.cover; }).length;
    var L = S.legal || {}, sp = S.extras.sparks || {}, st = S.extras.status || {}, fresh = st.state && Date.now() - Date.parse(st.updated) < 14 * 864e5;
    ckRender([
      { g: 'must', ok: !!(L.owner && L.nif && L.address), t: 'Datos legales', d: 'Nombre, NIF y domicilio para el aviso legal y la privacidad.', tab: 'lg' },
      { g: 'must', ok: vis.length > 0 && withBs === vis.length, t: 'Enlaces de BeatStars', d: ckFrac(withBs, vis.length) + ' beats tienen su enlace. Sin él, «Comprar» lleva a la tienda general.', tab: 'b' },
      { g: 'must', ok: pj.length > 0 && pa === pj.length, t: 'Audio de los proyectos', d: ckFrac(pa, pj.length) + ' proyectos suenan en la web. Los demás dicen «audio próximamente».', tab: 'p' },
      { g: 'must', ok: !!gcCode(), t: 'Estadísticas (GoatCounter)', d: 'Sin el código la web no cuenta nada.', tab: 'sx' },
      { g: 'rec', ok: hasCname, t: 'Dominio propio', d: hasCname ? 'Conectado.' : 'Tipo 7tymusic.com: se configura en GitHub, Settings → Pages (mira el README). Luego pon la dirección completa en og:image de index.html.', tab: '' },
      { g: 'rec', ok: pj.length > 0 && pc === pj.length, t: 'Portadas de los proyectos', d: ckFrac(pc, pj.length) + ' tienen portada.', tab: 'p' },
      { g: 'rec', ok: !!(S.extras.booking || {}).url, t: 'Agenda de reservas', d: 'Conecta tu agenda de citas de Google Calendar.', tab: 'st' },
      { g: 'rec', ok: S.studio.photos.length > 0, t: 'Fotos del estudio', d: 'Sin fotos no se ve la galería.', tab: 'st' },
      { g: 'rec', ok: S.studio.reviews.length > 0, t: 'Reseñas de artistas', d: 'Una o dos reales ya dan confianza.', tab: 'st' },
      { g: 'rec', ok: sp.on === false || !!(sp.code || sp.link || sp.reward), t: 'Premio de los destellos', d: 'Qué se lleva quien encuentra los 7 (código, regalo o mensaje).', tab: 'se' },
      { g: 'opt', ok: S.studio.ab.length > 0, t: 'Antes y después', d: 'Una toma en bruto y su mezcla para el comparador.', tab: 'st' },
      { g: 'opt', ok: !!fresh, t: 'Estado del estudio', d: '«Huecos libres», «Grabando ahora»…', tab: 'st' },
      { g: 'opt', ok: S.beats.beats.some(function (b) { return dropState(b) === 'up'; }), t: 'Próximo drop', d: 'Programa un beat para el viernes.', tab: 'dr' },
      { g: 'opt', ok: S.radio.voices.length > 0, t: 'Cuñas de la radio', d: 'Una voz corta tuya entre canciones.', tab: 'dr' },
      { g: 'opt', ok: S.wall.items.length > 0, t: 'Primer tema en el muro', d: 'Un tema de un artista con tu beat.', tab: 'mu' },
      { g: 'opt', ok: S.extras.trash.length > 0, t: 'Snippets en la papelera', d: 'Algo inédito para quien la encuentre.', tab: 'se' }
    ]);
  }

  /* ── publicar: un commit con todo ── */
  $('#discard').onclick = function () {
    var b = $('#discard');
    confirmBtn(b, function () { Object.keys(ADD).forEach(function (p) { URL.revokeObjectURL(ADD[p].url); }); location.reload(); });
  };
  $('#publish').onclick = function () {
    if (busy || !pendingCount()) return;
    busy = true; refreshBar('PUBLICANDO…');
    var headSha, baseTree, entries = [];
    changedKeys().forEach(function (k) { entries.push({ path: FILES[k], mode: '100644', type: 'blob', content: JSON.stringify(S[k], null, 2) + '\n' }); });
    Object.keys(DEL).forEach(function (p) { entries.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
    var adds = Object.keys(ADD), done = 0;
    gh('/git/ref/heads/' + encodeURIComponent(cfg.branch)).then(function (ref) {
      headSha = ref.object.sha; return gh('/git/commits/' + headSha);
    }).then(function (c) {
      baseTree = c.tree.sha;
      return adds.reduce(function (p, path) {
        return p.then(function () {
          refreshBar('SUBIENDO ARCHIVO ' + (++done) + '/' + adds.length + '…');
          return gh('/git/blobs', 'POST', { content: ADD[path].b64, encoding: 'base64' }).then(function (bl) { entries.push({ path: path, mode: '100644', type: 'blob', sha: bl.sha }); });
        });
      }, Promise.resolve());
    }).then(function () {
      refreshBar('GUARDANDO…');
      return gh('/git/trees', 'POST', { base_tree: baseTree, tree: entries });
    }).then(function (tree) {
      var n = pendingCount();
      return gh('/git/commits', 'POST', { message: 'Panel: ' + n + (n === 1 ? ' cambio' : ' cambios') + ' en la web', tree: tree.sha, parents: [headSha] });
    }).then(function (c) {
      return gh('/git/refs/heads/' + encodeURIComponent(cfg.branch), 'PATCH', { sha: c.sha });
    }).then(function () {
      Object.keys(ADD).forEach(function (p) { EXIST[p] = 1; }); Object.keys(DEL).forEach(function (p) { delete EXIST[p]; });
      ADD = {}; DEL = {}; ORIG = snapshot(); busy = false; try { localStorage.removeItem('7ty-preview'); } catch (x) {}
      renderAll(); refreshBar('PUBLICADO ✦ LA WEB SE ACTUALIZA EN 1-2 MIN');
    }).catch(function (err) { busy = false; refreshBar('NO SE PUDO PUBLICAR: ' + errText(err)); $('#publish').disabled = false; $('#discard').disabled = false; });
  };
})();
