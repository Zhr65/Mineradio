/**
 * ZHNR Plugins for Minerradio
 *  - 液态玻璃删除歌单
 *  - 液态玻璃删除歌单内歌曲
 *  - 钢琴 Hero（频谱驱动弹奏）
 */
(function() {
  'use strict';

  // ==================== CSS ====================
  var css = '\
.pl-del-btn{opacity:0;width:22px;height:22px;border:none;border-radius:6px;\
background:rgba(255,86,100,.18);color:rgba(255,255,255,.5);cursor:pointer;\
font-size:13px;line-height:1;flex-shrink:0;\
transition:opacity .18s,background .18s,color .18s,transform .18s}\
.pl-card:hover .pl-del-btn{opacity:1}\
.pl-del-btn:hover{background:rgba(255,86,100,.78);color:#fff;transform:scale(1.1)}\
\
.pl-song-del{opacity:0;width:20px;height:20px;border:none;border-radius:5px;\
background:rgba(255,86,100,.15);color:rgba(255,255,255,.4);cursor:pointer;\
font-size:11px;line-height:1;flex-shrink:0;margin-left:6px;\
transition:opacity .18s,background .18s,color .18s,transform .18s}\
.pl-detail-row:hover .pl-song-del{opacity:1}\
.pl-song-del:hover{background:rgba(255,86,100,.72);color:#fff;transform:scale(1.1)}\
\
.glass-mask{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.78);\
backdrop-filter:blur(14px) saturate(1.1);-webkit-backdrop-filter:blur(14px) saturate(1.1);\
display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .22s}\
.glass-mask.show{opacity:1}\
.glass-box{width:380px;max-width:88vw;\
background:linear-gradient(160deg,rgba(22,24,30,.96),rgba(12,13,18,.98));\
border:1px solid rgba(255,255,255,.10);border-radius:22px;\
padding:28px 24px 22px;text-align:center;\
box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(0,245,212,.06),inset 0 1px 0 rgba(255,255,255,.06);\
transform:scale(.94) translateY(10px);transition:transform .28s cubic-bezier(.16,1,.3,1)}\
.glass-mask.show .glass-box{transform:scale(1) translateY(0)}\
.glass-box .gb-icon{font-size:2rem;margin-bottom:8px}\
.glass-box .gb-title{font-size:1rem;font-weight:700;color:#fff;margin-bottom:6px}\
.glass-box .gb-msg{font-size:.82rem;color:rgba(255,255,255,.65);line-height:1.5}\
.glass-box .gb-msg b{color:rgba(255,255,255,.9)}\
.glass-box .gb-hint{margin-top:8px;font-size:.68rem;color:rgba(255,255,255,.30)}\
.glass-box .gb-btns{display:flex;gap:10px;margin-top:22px}\
.gb-btn{flex:1;height:40px;border-radius:12px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .18s}\
.gb-cancel{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:rgba(255,255,255,.65)}\
.gb-cancel:hover{background:rgba(255,255,255,.08);color:#fff}\
.gb-ok{border:1px solid rgba(0,245,212,.28);background:rgba(0,245,212,.12);color:#eafffb}\
.gb-ok:hover{background:rgba(0,245,212,.22);box-shadow:0 0 24px rgba(0,245,212,.12)}\
.gb-ok.danger{border-color:rgba(255,86,100,.30);background:rgba(255,86,100,.14);color:#ffd1d5}\
.gb-ok.danger:hover{background:rgba(255,86,100,.28);box-shadow:0 0 24px rgba(255,86,100,.14)}\
\
#zhnrPianoCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}\
.home-construction-title,.home-console-chip{display:none!important}\
';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ==================== 玻璃确认弹窗 ====================
  function glassConfirm(opts) {
    return new Promise(function(resolve) {
      var mask = document.createElement('div');
      mask.className = 'glass-mask';
      mask.innerHTML =
        '<div class="glass-box">' +
          '<div class="gb-icon">' + (opts.okDanger ? '⚠' : '?') + '</div>' +
          '<div class="gb-title">' + (opts.title || 'Confirm') + '</div>' +
          '<div class="gb-msg">' + (opts.message || '') + '</div>' +
          (opts.hint ? '<div class="gb-hint">' + opts.hint + '</div>' : '') +
          '<div class="gb-btns">' +
            '<button class="gb-btn gb-cancel">' + (opts.cancelText || 'Cancel') + '</button>' +
            '<button class="gb-btn gb-ok' + (opts.okDanger ? ' danger' : '') + '">' + (opts.okText || 'OK') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(mask);
      requestAnimationFrame(function() { mask.classList.add('show'); });
      mask.addEventListener('click', function(e) { if (e.target === mask) done(null); });
      mask.querySelector('.gb-cancel').onclick = function() { done(null); };
      mask.querySelector('.gb-ok').onclick = function() { done(true); };
      function done(val) {
        mask.classList.remove('show');
        setTimeout(function() { mask.remove(); resolve(val); }, 280);
      }
      document.addEventListener('keydown', function escH(e) {
        if (e.key === 'Escape') { done(null); document.removeEventListener('keydown', escH); }
      });
    });
  }

  // ==================== 删除歌单 ====================
  window.delPlaylist = async function(provider, id, name) {
    var ok = await glassConfirm({
      title: '取消收藏歌单',
      message: '确定要取消收藏 <b>' + (name || '') + '</b> 吗？',
      hint: '取消后可从网易云音乐重新收藏',
      okText: '确定取消', okDanger: true, cancelText: '保留'
    });
    if (!ok) return;
    try {
      var res = await apiJson('/api/playlist/unsubscribe?id=' + encodeURIComponent(id));
      if (res.unsubscribed) {
        showToast('已取消收藏');
        userPlaylists = userPlaylists.filter(function(pl) { return String(pl.id) !== String(id); });
        renderUserPlaylistsList({ animate: true, reset: true });
        if (typeof scheduleShelfRebuild === 'function') scheduleShelfRebuild('del-playlist', true);
      } else { showToast('操作失败: ' + (res.error || 'unknown')); }
    } catch(e) { showToast('网络错误: ' + e.message); }
  };

  // ==================== 删除歌单内歌曲 ====================
  window.delPlaylistSong = async function(pid, tid, name) {
    var ok = await glassConfirm({
      title: '从歌单移除',
      message: '确定要从歌单中移除 <b>' + (name || '这首歌') + '</b> 吗？',
      hint: '歌曲文件不会被删除，仅从歌单中移除',
      okText: '移除', okDanger: true, cancelText: '保留'
    });
    if (!ok) return;
    try {
      var res = await apiJson('/api/playlist/remove-song?pid=' + encodeURIComponent(pid) + '&id=' + encodeURIComponent(tid));
      if (res.removed) {
        showToast('已移除');
        // 刷新当前展开的歌单详情
        if (typeof openPlaylistPanelDetail === 'function' && playlistPanelDetailState.key) {
          openPlaylistPanelDetail(playlistPanelDetailState.provider, playlistPanelDetailState.id, playlistPanelDetailState.title);
        }
      } else { showToast('移除失败: ' + (res.error || 'unknown')); }
    } catch(e) { showToast('网络错误: ' + e.message); }
  };

  // ==================== 动态注入歌单删除按钮 ====================
  function injectDeleteButtons() {
    var panel = document.getElementById('pl-list');
    if (!panel) return;
    panel.querySelectorAll('.pl-card').forEach(function(card) {
      if (card.querySelector('.pl-del-btn')) return;
      var btn = document.createElement('button');
      btn.className = 'pl-del-btn'; btn.textContent = '×'; btn.title = '取消收藏';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var provider = card.getAttribute('data-playlist-provider') || 'netease';
        var pid = card.getAttribute('data-playlist-id') || '';
        var title = card.getAttribute('data-playlist-title') || '';
        window.delPlaylist(provider, pid, title);
      });
      card.appendChild(btn);
    });
  }

  // ==================== 动态注入歌曲删除按钮 ====================
  function injectSongDeleteButtons() {
    document.querySelectorAll('.pl-detail-row').forEach(function(row) {
      if (row.querySelector('.pl-song-del')) return;
      var btn = document.createElement('button');
      btn.className = 'pl-song-del'; btn.textContent = '×'; btn.title = '从歌单移除';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var trackId = row.getAttribute('data-track-id') || row.dataset.trackId || '';
        var songName = (row.querySelector('.pl-detail-row-title') || {}).textContent || '';
        var pid = (playlistPanelDetailState || {}).id || '';
        if (trackId && pid) window.delPlaylistSong(pid, trackId, songName);
      });
      row.appendChild(btn);
    });
  }

  // ==================== 监听 DOM 变化 ====================
  var mainObserver = new MutationObserver(function() {
    injectDeleteButtons();
    injectSongDeleteButtons();
  });

  function startObserving() {
    var panel = document.getElementById('playlist-panel');
    if (panel) {
      mainObserver.observe(panel, { childList: true, subtree: true, attributes: false });
      injectDeleteButtons();
      injectSongDeleteButtons();
      return true;
    }
    return false;
  }

  var retries = 0;
  var retryTimer = setInterval(function() {
    if (startObserving() || ++retries > 40) clearInterval(retryTimer);
  }, 400);

  // 面板打开时也注入
  document.addEventListener('click', function(e) {
    setTimeout(function() {
      injectDeleteButtons();
      injectSongDeleteButtons();
    }, 300);
  });

  // ==================== 钢琴引擎 ====================
  function initPiano() {
    var hero = document.querySelector('.home-hero');
    if (!hero) { setTimeout(initPiano, 500); return; }
    if (hero.querySelector('#zhnrPianoCanvas')) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'zhnrPianoCanvas';
    hero.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var W, H;
    var spec = new Uint8Array(128);
    var keys = [];
    var keyPress = []; // per-key press intensity
    var time = 0;

    // Build piano: 3 octaves (36 white keys)
    var whiteNotes = ['C','D','E','F','G','A','B'];
    var blackNotes = ['C#','D#','F#','G#','A#'];
    var totalOctaves = 3;
    var whiteIdx = 0, blackIdx = 0;

    for (var oct = 0; oct < totalOctaves; oct++) {
      for (var wi = 0; wi < 7; wi++) {
        keys.push({ type: 'white', note: whiteNotes[wi], octave: oct + 3, idx: whiteIdx++, freqBase: 0 });
      }
      for (var bi = 0; bi < 5; bi++) {
        keys.push({ type: 'black', note: blackNotes[bi], octave: oct + 3, idx: blackIdx++, freqBase: 0 });
      }
    }

    var totalWhite = whiteIdx;
    var totalBlack = blackIdx;
    keyPress = new Array(keys.length).fill(0);

    // Map frequencies to keys (C3 ~130Hz to B5 ~988Hz)
    var freqMin = 130, freqMax = 988;
    var keyFreqs = [];
    var baseFreq = 130;
    var semitoneCount = totalOctaves * 12;
    for (var s = 0; s < semitoneCount; s++) {
      keyFreqs.push(baseFreq * Math.pow(2, s / 12));
    }
    // Assign frequencies to keys (only white keys get assigned, black keys share)
    var freqIdx = 0;
    keys.forEach(function(k) {
      if (freqIdx < keyFreqs.length) k.freqBase = keyFreqs[freqIdx++];
    });

    function resize() {
      var r = hero.getBoundingClientRect();
      W = Math.max(r.width, 300); H = Math.max(r.height, 200);
      canvas.width = W * (window.devicePixelRatio || 1);
      canvas.height = H * (window.devicePixelRatio || 1);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener('resize', resize);
    new ResizeObserver(resize).observe(hero);

    function getBand(lo, hi) {
      var s = 0; for (var i = lo; i < hi && i < spec.length; i++) s += spec[i];
      return s / (hi - lo) / 255;
    }

    function freqToKeyIdx(freq) {
      if (freq < freqMin || freq > freqMax) return -1;
      var semitone = Math.round(12 * Math.log2(freq / baseFreq));
      if (semitone < 0 || semitone >= keyFreqs.length) return -1;
      // Find matching key
      for (var i = 0; i < keys.length; i++) {
        if (Math.abs(keys[i].freqBase - keyFreqs[semitone]) < 1) return i;
      }
      return semitone % keys.length;
    }

    function draw() {
      requestAnimationFrame(draw);
      time += 0.016;
      if (typeof analyser !== 'undefined' && analyser) analyser.getByteFrequencyData(spec);

      ctx.clearRect(0, 0, W, H);

      // Update key press from spectrum peaks
      var decay = 0.85;
      for (var i = 0; i < keyPress.length; i++) keyPress[i] *= decay;

      // Find spectrum peaks and map to keys
      var peaks = [];
      for (var bi = 0; bi < Math.min(110, spec.length); bi++) {
        var val = spec[bi] / 255;
        if (val > 0.25 && (!peaks.length || bi - peaks[peaks.length-1].idx > 2 || val > peaks[peaks.length-1].val * 1.5)) {
          peaks.push({ idx: bi, val: val });
        }
      }
      // Keep top 8 peaks
      peaks.sort(function(a,b){ return b.val - a.val; });
      peaks = peaks.slice(0, 8);

      peaks.forEach(function(p) {
        var freq = (p.idx / (Math.min(110, spec.length) - 1)) * (freqMax - freqMin) + freqMin;
        var ki = freqToKeyIdx(freq);
        if (ki >= 0 && ki < keyPress.length) keyPress[ki] = Math.min(1, p.val * 1.5);
      });

      // --- Draw piano ---
      var marginX = W * 0.04;
      var pianoW = W - marginX * 2;
      var pianoH = H * 0.55;
      var pianoY = H * 0.38;
      var whiteW = pianoW / totalWhite;
      var whiteH = pianoH;

      // Glass background for piano area
      ctx.save();
      var bgGrad = ctx.createLinearGradient(0, pianoY - 20, 0, pianoY + pianoH + 20);
      bgGrad.addColorStop(0, 'rgba(5,5,12,0)');
      bgGrad.addColorStop(0.5, 'rgba(15,15,30,0.25)');
      bgGrad.addColorStop(1, 'rgba(5,5,12,0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(marginX - 10, pianoY - 30, pianoW + 20, pianoH + 60);
      ctx.restore();

      // Glow effect behind pressed keys
      ctx.save();
      ctx.filter = 'blur(12px)';
      keys.forEach(function(k, i) {
        if (keyPress[i] < 0.05) return;
        var kx, ky, kw, kh;
        if (k.type === 'white') {
          var wi = 0;
          for (var j = 0; j < i; j++) if (keys[j].type === 'white') wi++;
          kx = marginX + wi * whiteW;
          ky = pianoY; kw = whiteW; kh = whiteH;
        } else return; // only glow white keys
        var alpha = keyPress[i] * 0.5;
        ctx.fillStyle = 'rgba(0,245,212,' + alpha + ')';
        ctx.fillRect(kx - 2, ky - 2, kw + 4, kh + 4);
      });
      ctx.filter = 'none';
      ctx.restore();

      // Draw white keys
      keys.forEach(function(k, i) {
        if (k.type !== 'white') return;
        var wi = 0;
        for (var j = 0; j < i; j++) if (keys[j].type === 'white') wi++;
        var kx = marginX + wi * whiteW;
        var ky = pianoY;
        var kw = Math.max(whiteW - 1, 4);
        var kh = whiteH;

        // Key gradient (glass look)
        var grad = ctx.createLinearGradient(kx, ky, kx, ky + kh);
        var press = Math.min(1, keyPress[i]);
        grad.addColorStop(0, press > 0.1
          ? 'rgba(0,245,212,' + (0.2 + press * 0.5) + ')'
          : 'rgba(255,255,255,0.08)');
        grad.addColorStop(0.3, press > 0.1
          ? 'rgba(0,200,180,' + (0.15 + press * 0.3) + ')'
          : 'rgba(255,255,255,0.04)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.02)');
        grad.addColorStop(1, 'rgba(0,0,0,0.05)');

        // Key body
        ctx.fillStyle = grad;
        roundRect(ctx, kx + 0.5, ky, kw - 1, kh, 4);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Top highlight
        if (press < 0.1) {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(kx + 2, ky + 2, kw - 4, 1);
        }

        // Pressed shadow
        if (press > 0.05) {
          ctx.fillStyle = 'rgba(0,245,212,' + (press * 0.15) + ')';
          ctx.fillRect(kx + 1, ky + kh - 3, kw - 2, 2);
        }
      });

      // Draw black keys
      var blackH = whiteH * 0.58;
      var blackW = whiteW * 0.58;
      var blackPositions = [
        { whiteAfter: 0, offset: 0.62 },  // C#
        { whiteAfter: 1, offset: 0.65 },  // D#
        { whiteAfter: 3, offset: 0.63 },  // F#
        { whiteAfter: 4, offset: 0.64 },  // G#
        { whiteAfter: 5, offset: 0.62 }   // A#
      ];

      var whiteCount = 0;
      keys.forEach(function(k) { if (k.type === 'white') whiteCount++; });

      var octaveWhiteW = whiteW * 7;
      for (var oct = 0; oct < totalOctaves; oct++) {
        blackPositions.forEach(function(bp) {
          var baseX = marginX + oct * octaveWhiteW;
          var kx = baseX + (bp.whiteAfter + bp.offset) * whiteW - blackW / 2;
          var ky = pianoY;

          // Find which black key index this is
          var bi = oct * 5 + blackPositions.indexOf(bp);
          var ki = -1;
          var bCount = 0;
          for (var j = 0; j < keys.length; j++) {
            if (keys[j].type === 'black') {
              if (bCount === bi) { ki = j; break; }
              bCount++;
            }
          }

          var press = ki >= 0 ? Math.min(1, keyPress[ki]) : 0;

          // Black key gradient
          var grad = ctx.createLinearGradient(kx, ky, kx, ky + blackH);
          grad.addColorStop(0, press > 0.1
            ? 'rgba(0,230,195,' + (0.3 + press * 0.5) + ')'
            : 'rgba(0,0,0,0.65)');
          grad.addColorStop(0.5, press > 0.1
            ? 'rgba(0,180,160,' + (0.2 + press * 0.3) + ')'
            : 'rgba(5,5,12,0.7)');
          grad.addColorStop(1, 'rgba(2,2,6,0.8)');

          ctx.fillStyle = grad;
          roundRect(ctx, kx, ky, blackW, blackH, 3);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Glow on press
          if (press > 0.15) {
            ctx.save(); ctx.filter = 'blur(4px)';
            ctx.fillStyle = 'rgba(0,245,212,' + (press * 0.3) + ')';
            ctx.fillRect(kx - 1, ky, blackW + 2, blackH);
            ctx.restore();
          }
        });
      }

      // Particle sparkles near pressed keys
      keys.forEach(function(k, i) {
        if (keyPress[i] < 0.2) return;
        var wi = 0;
        for (var j = 0; j < i; j++) if (keys[j].type === 'white') wi++;
        if (k.type !== 'white') return;
        var kx = marginX + wi * whiteW + whiteW / 2;
        var ky = pianoY;

        var sparkleCount = Math.floor(keyPress[i] * 5);
        for (var s = 0; s < sparkleCount; s++) {
          var sx = kx + (Math.random() - 0.5) * whiteW;
          var sy = ky - Math.random() * 20 * keyPress[i];
          var sa = keyPress[i] * (0.3 + Math.random() * 0.4);
          var sr = 1 + Math.random() * 2;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,245,212,' + sa + ')';
          ctx.fill();
        }
      });

      // Title
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = (W * 0.016) + 'px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText('♫ PIANO RESONANCE', W / 2, pianoY - 16);
    }

    draw();
    console.log('[ZHNR] Piano initialized');
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Start piano
  setTimeout(initPiano, 1000);
  new MutationObserver(function() {
    if (document.body.classList.contains('empty-home-active') && !document.querySelector('#zhnrPianoCanvas')) {
      initPiano();
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  console.log('[ZHNR] All plugins loaded');
})();
