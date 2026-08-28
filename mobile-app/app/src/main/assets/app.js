(function () {
  'use strict';

  // ====================== 状态 ======================
  var state = {
    tab: 'chat',
    config: null,
    conversations: [],
    activeConv: null,
    notes: [],
    editingNote: null,
    abort: null
  };

  var SUGGESTIONS = [
    '帮我写一段周报',
    '用通俗的话解释量子计算',
    '推荐三本自我提升的书',
    '把这段文字翻译成英文'
  ];

  // ====================== 工具 ======================
  function $(id) { return document.getElementById(id); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nowISO() { return new Date().toISOString(); }
  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(s);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  function defaultConfig() {
    return {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      dark: false
    };
  }

  function loadConfig() {
    try {
      if (window.Android && window.Android.getConfig) {
        var s = window.Android.getConfig();
        if (s) { state.config = JSON.parse(s); return; }
      }
    } catch (e) {}
    try {
      var l = localStorage.getItem('ph_cfg');
      state.config = l ? JSON.parse(l) : defaultConfig();
    } catch (e) { state.config = defaultConfig(); }
  }
  function saveConfig(c) {
    state.config = c;
    try { if (window.Android && window.Android.setConfig) window.Android.setConfig(JSON.stringify(c)); } catch (e) {}
    try { localStorage.setItem('ph_cfg', JSON.stringify(c)); } catch (e) {}
  }

  function storeGet(key, fallback) {
    try {
      if (window.Android && window.Android.loadData) { var s = window.Android.loadData(key); if (s) return JSON.parse(s); }
    } catch (e) {}
    try { var l = localStorage.getItem('ph_' + key); if (l) return JSON.parse(l); } catch (e) {}
    return fallback;
  }
  function storeSet(key, val) {
    var s = JSON.stringify(val);
    try { if (window.Android && window.Android.saveData) { window.Android.saveData(key, s); return; } } catch (e) {}
    try { localStorage.setItem('ph_' + key, s); } catch (e) {}
  }

  function loadData() {
    state.conversations = storeGet('conv', []);
    state.notes = storeGet('notes', []);
  }
  function saveConv() { storeSet('conv', state.conversations); }
  function saveNotes() { storeSet('notes', state.notes); }

  // ====================== Markdown ======================
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inlineMd(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, function (m, c) { return '<code>' + c + '</code>'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
  function mdToHtml(text) {
    if (!text) return '';
    var lines = text.split('\n');
    var html = '';
    var i = 0;
    var inCode = false, codeBuf = [], listType = null, listBuf = [];
    function flushList() {
      if (listBuf.length) { html += '<' + listType + '>' + listBuf.join('') + '</' + listType + '>'; listBuf = []; listType = null; }
    }
    while (i < lines.length) {
      var line = lines[i];
      var fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        if (inCode) { html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>'; codeBuf = []; inCode = false; }
        else { flushList(); inCode = true; }
        i++; continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }
      if (!line.trim()) { flushList(); i++; continue; }
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushList(); var lv = h[1].length; html += '<p><strong>' + inlineMd(h[2]) + '</strong></p>'; i++; continue; }
      var ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ol) { if (listType !== 'ol') { flushList(); listType = 'ol'; } listBuf.push('<li>' + inlineMd(ol[1]) + '</li>'); i++; continue; }
      var ul = line.match(/^\s*[-*]\s+(.*)$/);
      if (ul) { if (listType !== 'ul') { flushList(); listType = 'ul'; } listBuf.push('<li>' + inlineMd(ul[1]) + '</li>'); i++; continue; }
      var q = line.match(/^>\s?(.*)$/);
      if (q) { flushList(); html += '<p><em>' + inlineMd(q[1]) + '</em></p>'; i++; continue; }
      flushList();
      html += '<p>' + inlineMd(line) + '</p>';
      i++;
    }
    if (inCode) html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
    flushList();
    return html;
  }

  // ====================== 标签切换 ======================
  function switchTab(tab) {
    state.tab = tab;
    var tabs = document.querySelectorAll('.tabbar .tab');
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
    $('chatTop').style.display = tab === 'chat' ? 'flex' : 'none';
    $('chatView').style.display = tab === 'chat' ? 'block' : 'none';
    $('composer').style.display = tab === 'chat' ? 'flex' : 'none';
    $('noteTop').style.display = tab === 'note' ? 'flex' : 'none';
    $('noteView').style.display = tab === 'note' ? 'block' : 'none';
    $('meTop').style.display = tab === 'me' ? 'flex' : 'none';
    $('meView').style.display = tab === 'me' ? 'block' : 'none';
    if (tab === 'note') renderNotes();
    if (tab === 'me') renderSettings();
  }

  // ====================== 对话 ======================
  function newConversation() {
    state.activeConv = { id: uid(), title: '新对话', messages: [], createdAt: nowISO() };
    state.conversations.unshift(state.activeConv);
    saveConv();
    renderConversation();
    renderConvList();
  }
  function getActive() {
    if (!state.activeConv && state.conversations.length) state.activeConv = state.conversations[0];
    return state.activeConv;
  }
  function renderConvList() {
    var box = $('convList');
    box.innerHTML = '';
    state.conversations.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'conv' + (state.activeConv && state.activeConv.id === c.id ? ' active' : '');
      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = c.title || '新对话';
      var del = document.createElement('span');
      del.className = 'del';
      del.textContent = '🗑';
      del.onclick = function (e) {
        e.stopPropagation();
        state.conversations = state.conversations.filter(function (x) { return x.id !== c.id; });
        if (state.activeConv && state.activeConv.id === c.id) state.activeConv = state.conversations[0] || null;
        saveConv(); renderConvList(); renderConversation();
      };
      d.appendChild(title); d.appendChild(del);
      d.onclick = function () { state.activeConv = c; saveConv(); renderConversation(); renderConvList(); closeDrawer(); };
      box.appendChild(d);
    });
  }
  function renderSuggestions() {
    var box = $('suggestions');
    box.innerHTML = '';
    SUGGESTIONS.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'sugg';
      el.textContent = s;
      el.onclick = function () { $('input').value = s; sendMessage(); };
      box.appendChild(el);
    });
  }
  function renderConversation() {
    var c = getActive();
    var empty = $('chatEmpty'), msg = $('messages');
    if (!c || c.messages.length === 0) {
      empty.style.display = 'flex'; msg.style.display = 'none';
      $('chatTitle').textContent = '对话';
      return;
    }
    empty.style.display = 'none'; msg.style.display = 'block';
    msg.innerHTML = '';
    c.messages.forEach(function (m) { msg.appendChild(buildMsg(m.role, m.content, false)); });
    $('chatTitle').textContent = c.title || '对话';
    scrollBottom();
  }
  function buildMsg(role, content, streaming) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
    var av = document.createElement('div');
    av.className = 'avatar ' + (role === 'user' ? 'me' : 'ai');
    av.textContent = role === 'user' ? '我' : '🤖';
    var b = document.createElement('div');
    b.className = 'bubble';
    if (streaming) { b.innerHTML = mdToHtml(content) + '<span class="typing"><span>.</span><span>.</span><span>.</span></span>'; }
    else { b.innerHTML = mdToHtml(content); }
    wrap.appendChild(av); wrap.appendChild(b);
    return wrap;
  }
  function scrollBottom() {
    var v = $('chatView');
    setTimeout(function () { v.scrollTop = v.scrollHeight; }, 30);
  }

  function setSending(sending) {
    var btn = $('sendBtn');
    btn.textContent = sending ? '■' : '↑';
    btn.classList.toggle('stop', sending);
    btn.disabled = false;
    $('input').disabled = sending;
  }

  function sendMessage() {
    var input = $('input');
    var text = input.value.trim();
    if (!text) return;
    var c = getActive();
    if (!c) { newConversation(); c = state.activeConv; }
    input.value = ''; input.style.height = 'auto';
    c.messages.push({ role: 'user', content: text });
    if (c.title === '新对话' || !c.title) c.title = text.slice(0, 18);
    var msgBox = $('messages');
    $('chatEmpty').style.display = 'none'; msgBox.style.display = 'block';
    msgBox.appendChild(buildMsg('user', text, false));
    var aiMsg = { role: 'assistant', content: '' };
    c.messages.push(aiMsg);
    var aiEl = buildMsg('assistant', '', true);
    msgBox.appendChild(aiEl);
    scrollBottom();
    saveConv(); renderConvList();
    streamReply(c, aiMsg, aiEl);
  }

  function streamReply(conv, aiMsg, aiEl) {
    var cfg = state.config;
    if (!cfg.apiKey) { toast('请先在「我的」填写 API Key'); aiMsg.content = '⚠️ 未配置 API Key，请到「我的」填写。'; aiEl.querySelector('.bubble').innerHTML = mdToHtml(aiMsg.content); setSending(false); return; }
    var base = (cfg.baseUrl || '').replace(/\/+$/, '');
    var controller = new AbortController();
    state.abort = controller;
    setSending(true);
    var bubble = aiEl.querySelector('.bubble');
    fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model || 'gpt-3.5-turbo', messages: conv.messages.map(function (m) { return { role: m.role, content: m.content }; }), stream: true }),
      signal: controller.signal
    }).then(function (resp) {
      if (!resp.ok) { return resp.text().then(function (t) { throw new Error('API ' + resp.status + ': ' + t.slice(0, 240)); }); }
      var reader = resp.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            aiMsg.content = aiMsg.content.replace(/\s*$/, '');
            bubble.innerHTML = mdToHtml(aiMsg.content);
            finish();
            return;
          }
          buf += dec.decode(r.value, { stream: true });
          var idx;
          while ((idx = buf.indexOf('\n')) >= 0) {
            var line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
            if (line.indexOf('data:') === 0) {
              line = line.slice(5).trim();
              if (line === '[DONE]') continue;
              try {
                var j = JSON.parse(line);
                var d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
                if (d) { aiMsg.content += d; bubble.innerHTML = mdToHtml(aiMsg.content) + '<span class="typing"><span>.</span><span>.</span><span>.</span></span>'; scrollBottom(); }
              } catch (e) {}
            }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      if (err.name === 'AbortError') { toast('已停止'); }
      else { aiMsg.content = '⚠️ 请求失败：' + err.message; bubble.innerHTML = mdToHtml(aiMsg.content); toast('请求失败'); }
      finish();
    });
    function finish() {
      setSending(false);
      state.abort = null;
      saveConv();
    }
  }

  // ====================== 笔记 ======================
  function renderNotes() {
    var q = ($('noteSearch').value || '').toLowerCase();
    var list = $('noteList');
    list.innerHTML = '';
    var arr = state.notes.filter(function (n) {
      if (!q) return true;
      return (n.title + ' ' + n.content).toLowerCase().indexOf(q) >= 0;
    });
    if (!arr.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:40px">还没有笔记</div>';
      return;
    }
    arr.forEach(function (n) {
      var el = document.createElement('div');
      el.className = 'note-item';
      var plain = (n.content || '').replace(/[#*`>]/g, '').replace(/\n+/g, ' ');
      el.innerHTML = '<div class="nt"></div><div class="nc"></div><div class="nm"><span>' + (n.source === 'desktop' ? '📥 来自电脑' : '📱 本地') + '</span><span>' + fmtDate(n.updatedAt) + '</span></div>';
      el.querySelector('.nt').textContent = n.title || '无标题';
      el.querySelector('.nc').textContent = plain || '（空）';
      el.onclick = function () { openEditor(n); };
      list.appendChild(el);
    });
  }
  function openEditor(note) {
    state.editingNote = note || { id: uid(), title: '', content: '', createdAt: nowISO(), updatedAt: nowISO(), source: 'local' };
    $('noteTitle').value = state.editingNote.title || '';
    $('noteBody').value = state.editingNote.content || '';
    $('noteEditor').classList.add('show');
  }
  function saveEditor() {
    var n = state.editingNote;
    n.title = $('noteTitle').value.trim() || '无标题';
    n.content = $('noteBody').value;
    n.updatedAt = nowISO();
    var idx = state.notes.findIndex(function (x) { return x.id === n.id; });
    if (idx >= 0) state.notes[idx] = n; else state.notes.unshift(n);
    saveNotes();
    $('noteEditor').classList.remove('show');
    toast('已保存');
  }

  // ====================== 设置 ======================
  function renderSettings() {
    var c = state.config;
    var box = $('settings');
    box.innerHTML = '';
    box.appendChild(group([
      row('API 地址', 'baseUrl', c.baseUrl, '如 https://api.openai.com/v1'),
      row('API Key', 'apiKey', c.apiKey, '仅存于本机'),
      row('模型名称', 'model', c.model, '如 gpt-3.5-turbo')
    ]));
    var g2 = document.createElement('div');
    g2.className = 'set-group';
    var r = document.createElement('div');
    r.className = 'set-row';
    r.innerHTML = '<label>深色模式</label>';
    var sw = document.createElement('div');
    sw.className = 'switch' + (c.dark ? ' on' : '');
    sw.onclick = function () {
      c.dark = !c.dark;
      sw.classList.toggle('on', c.dark);
      applyTheme(); saveConfig(c);
    };
    r.appendChild(sw); g2.appendChild(r);
    box.appendChild(g2);

    var g3 = document.createElement('div');
    g3.className = 'set-group';
    var dr = document.createElement('div');
    dr.className = 'set-row';
    dr.innerHTML = '<label>清空所有对话</label>';
    var b1 = document.createElement('span');
    b1.className = 'act';
    b1.style.color = 'var(--danger)'; b1.textContent = '清除';
    b1.onclick = function () {
      if (confirm('确定清空所有本地对话？')) { state.conversations = []; state.activeConv = null; saveConv(); renderConvList(); renderConversation(); toast('已清空'); }
    };
    dr.appendChild(b1); g3.appendChild(dr);
    var dr2 = document.createElement('div');
    dr2.className = 'set-row';
    dr2.innerHTML = '<label>清空所有笔记</label>';
    var b2 = document.createElement('span');
    b2.className = 'act'; b2.style.color = 'var(--danger)'; b2.textContent = '清除';
    b2.onclick = function () {
      if (confirm('确定清空所有本地笔记？')) { state.notes = []; saveNotes(); renderNotes(); toast('已清空'); }
    };
    dr2.appendChild(b2); g3.appendChild(dr2);
    box.appendChild(g3);
  }
  function group(rows) {
    var g = document.createElement('div');
    g.className = 'set-group';
    rows.forEach(function (r) { g.appendChild(r); });
    return g;
  }
  function row(label, key, val, desc) {
    var r = document.createElement('div');
    r.className = 'set-row';
    var left = document.createElement('div');
    left.style.flex = '0 0 90px';
    left.innerHTML = '<label>' + label + '</label>' + (desc ? '<div class="desc">' + desc + '</div>' : '');
    var inp = document.createElement('input');
    inp.value = val || '';
    inp.placeholder = desc || '';
    inp.onchange = function () { state.config[key] = inp.value; saveConfig(state.config); toast('已保存'); };
    r.appendChild(left); r.appendChild(inp);
    return r;
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.config.dark ? 'dark' : 'light');
  }

  // ====================== 原生桥接 ======================
  function scanQR() {
    if (window.Android && window.Android.scanQR) window.Android.scanQR();
    else toast('当前环境不支持扫码');
  }
  function onQRResult(text) {
    if (!text) return;
    var base = text.split('/#/')[0].split('?')[0];
    if (!/^https?:\/\//.test(base)) { toast('二维码内容无效'); return; }
    toast('正在从电脑导入笔记…');
    fetch(base + '/api/mobile/notes')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success || !data.notes) { toast('电脑端未返回笔记'); return; }
        var added = 0;
        data.notes.forEach(function (n) {
          if (state.notes.some(function (x) { return x.id === 'd_' + n.id; })) return;
          state.notes.unshift({ id: 'd_' + n.id, title: n.title, content: n.content || n.contentText || '', createdAt: n.createdAt, updatedAt: n.updatedAt, source: 'desktop' });
          added++;
        });
        saveNotes();
        toast('已导入 ' + added + ' 条笔记');
        if (state.tab === 'note') renderNotes();
      })
      .catch(function (e) { toast('导入失败：' + e.message); });
  }
  function startVoice() {
    if (window.Android && window.Android.startVoice) window.Android.startVoice();
    else toast('当前环境不支持语音');
  }
  function onVoiceResult(text) {
    if (!text) return;
    var inp = $('input');
    inp.value = (inp.value ? inp.value + ' ' : '') + text;
    inp.focus();
  }
  window.onQRResult = onQRResult;
  window.onVoiceResult = onVoiceResult;

  // ====================== 事件绑定 ======================
  function bind() {
    document.querySelectorAll('.tabbar .tab').forEach(function (t) {
      t.onclick = function () { switchTab(t.dataset.tab); };
    });
    $('newChat').onclick = function () { newConversation(); };
    $('openDrawer').onclick = function () { $('drawer').classList.add('show'); $('drawerMask').classList.add('show'); };
    $('closeDrawer').onclick = closeDrawer;
    $('drawerMask').onclick = closeDrawer;
    $('sendBtn').onclick = function () {
      if (state.abort) { state.abort.abort(); return; }
      sendMessage();
    };
    var input = $('input');
    input.addEventListener('input', function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    $('voiceBtn').onclick = startVoice;

    $('noteScan').onclick = scanQR;
    $('newNote').onclick = function () { openEditor(null); };
    $('noteCancel').onclick = function () { $('noteEditor').classList.remove('show'); };
    $('noteSave').onclick = saveEditor;
    $('noteSearch').addEventListener('input', renderNotes);

    renderSuggestions();
    renderConvList();
    renderConversation();
  }
  function closeDrawer() { $('drawer').classList.remove('show'); $('drawerMask').classList.remove('show'); }

  // ====================== 启动 ======================
  loadConfig();
  loadData();
  applyTheme();
  bind();
  switchTab('chat');
  // 通知原生已就绪
  try { if (window.Android && window.Android.onReady) window.Android.onReady(); } catch (e) {}
})();
