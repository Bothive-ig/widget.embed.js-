/**
 * ============================================================
 *  BotHive AI — Embeddable Chat Widget
 *  widget.embed.js | Version 1.0.0
 *
 *  Single-file IIFE. Drop one <script> tag anywhere.
 *  Usage:
 *    <script src="widget.embed.js"></script>
 *
 *  To configure, set window.BotHiveConfig BEFORE the script:
 *    <script>
 *      window.BotHiveConfig = {
 *        webhookUrl: 'https://...',
 *        botName:    'My Bot',
 *      };
 *    </script>
 *    <script src="widget.embed.js"></script>
 * ============================================================
 */
(function () {
  'use strict';

  // ── CONFIGURATION ─────────────────────────────────────────
  // Merge window.BotHiveConfig overrides with defaults.
  const cfg = Object.assign({
    webhookUrl: 'https://mii19.app.n8n.cloud/webhook/widgetreply',
    botName: 'BotHive AI',
    botTagline: 'Online · Typically replies instantly',
    welcomeMsg: "👋 Hi! I'm your AI assistant. How can I help you today?",
    placeholder: 'Type your message…',
    storageKey: 'bh_chat_session',
    requestTimeoutMs: 20000,
  }, window.BotHiveConfig || {});

  // ── INLINED CSS ───────────────────────────────────────────
  // Inlined so the widget works from a single <script> tag with
  // zero external dependencies or file hosting requirements.
  const CSS = `
    :root{
      --bh-primary:#2563eb;--bh-primary-dark:#1d4ed8;--bh-primary-light:#eff6ff;
      --bh-surface:#fff;--bh-surface-2:#f8fafc;--bh-border:#e2e8f0;
      --bh-text-primary:#1e293b;--bh-text-secondary:#64748b;
      --bh-error:#ef4444;--bh-error-light:#fef2f2;
      --bh-shadow-sm:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.05);
      --bh-shadow-lg:0 20px 48px rgba(0,0,0,.14),0 8px 20px rgba(0,0,0,.08);
      --bh-radius-sm:8px;--bh-radius-md:14px;--bh-radius-lg:20px;--bh-radius-xl:28px;
      --bh-font:'Segoe UI',system-ui,-apple-system,sans-serif;
      --bh-t:0.22s cubic-bezier(0.4,0,0.2,1);
    }
    #bh-chat-root *,#bh-chat-root *::before,#bh-chat-root *::after{
      box-sizing:border-box;margin:0;padding:0;font-family:var(--bh-font);
    }
    /* Launcher */
    #bh-launcher{
      position:fixed;bottom:24px;right:24px;z-index:9998;
      width:60px;height:60px;border-radius:50%;background:var(--bh-primary);
      border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
      box-shadow:var(--bh-shadow-lg);
      transition:transform var(--bh-t),box-shadow var(--bh-t),background var(--bh-t);
      outline:none;-webkit-tap-highlight-color:transparent;
      animation:bh-pulse 2.8s ease-in-out infinite;
    }
    #bh-launcher:hover{
      background:var(--bh-primary-dark);transform:scale(1.08);
      box-shadow:var(--bh-shadow-lg),0 0 0 6px rgba(37,99,235,.15);animation:none;
    }
    #bh-launcher:active{transform:scale(0.94);}
    #bh-launcher .bh-icon{
      position:absolute;width:28px;height:28px;fill:none;stroke:#fff;
      stroke-width:2;stroke-linecap:round;stroke-linejoin:round;
      transition:opacity var(--bh-t),transform var(--bh-t);
    }
    #bh-launcher .bh-icon-chat{opacity:1;transform:scale(1) rotate(0deg);}
    #bh-launcher .bh-icon-close{opacity:0;transform:scale(0.5) rotate(-90deg);}
    #bh-launcher.bh-open .bh-icon-chat{opacity:0;transform:scale(0.5) rotate(90deg);}
    #bh-launcher.bh-open .bh-icon-close{opacity:1;transform:scale(1) rotate(0deg);}
    #bh-unread-badge{
      position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;
      background:#ef4444;color:#fff;font-size:10px;font-weight:700;
      display:flex;align-items:center;justify-content:center;border:2px solid #fff;
      opacity:0;transform:scale(0);transition:opacity var(--bh-t),transform var(--bh-t);
      pointer-events:none;
    }
    #bh-unread-badge.bh-visible{opacity:1;transform:scale(1);}
    /* Chat window */
    #bh-chat-window{
      position:fixed;bottom:96px;right:24px;z-index:9999;
      width:380px;height:560px;max-height:calc(100vh - 112px);
      background:var(--bh-surface);border-radius:var(--bh-radius-xl);
      box-shadow:var(--bh-shadow-lg);display:flex;flex-direction:column;
      overflow:hidden;border:1px solid var(--bh-border);
      opacity:0;transform:translateY(16px) scale(0.97);transform-origin:bottom right;
      pointer-events:none;transition:opacity var(--bh-t),transform var(--bh-t);
    }
    #bh-chat-window.bh-visible{opacity:1;transform:translateY(0) scale(1);pointer-events:all;}
    /* Header */
    #bh-header{
      flex-shrink:0;background:linear-gradient(135deg,var(--bh-primary) 0%,var(--bh-primary-dark) 100%);
      padding:16px 20px;display:flex;align-items:center;gap:12px;
    }
    #bh-header-avatar{
      width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      border:2px solid rgba(255,255,255,.3);
    }
    #bh-header-avatar svg{
      width:22px;height:22px;fill:none;stroke:#fff;
      stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;
    }
    #bh-header-info{flex:1;}
    #bh-header-name{font-size:.95rem;font-weight:700;color:#fff;line-height:1.2;}
    #bh-header-status{
      font-size:.75rem;color:rgba(255,255,255,.85);
      display:flex;align-items:center;gap:5px;margin-top:2px;
    }
    #bh-header-status::before{
      content:'';width:7px;height:7px;border-radius:50%;background:#4ade80;
      display:block;flex-shrink:0;animation:bh-status-pulse 2s ease-in-out infinite;
    }
    /* Messages */
    #bh-messages{
      flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;
      gap:12px;scroll-behavior:smooth;background:var(--bh-surface-2);
    }
    #bh-messages::-webkit-scrollbar{width:5px;}
    #bh-messages::-webkit-scrollbar-track{background:transparent;}
    #bh-messages::-webkit-scrollbar-thumb{background:var(--bh-border);border-radius:99px;}
    /* Message rows */
    .bh-msg-row{
      display:flex;gap:8px;
      animation:bh-msg-in .25s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .bh-msg-row.bh-user{flex-direction:row-reverse;}
    .bh-msg-avatar{
      width:30px;height:30px;border-radius:50%;background:var(--bh-primary-light);
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;align-self:flex-end;border:1.5px solid var(--bh-border);
    }
    .bh-msg-avatar svg{
      width:15px;height:15px;fill:none;stroke:var(--bh-primary);
      stroke-width:2;stroke-linecap:round;stroke-linejoin:round;
    }
    .bh-msg-row.bh-user .bh-msg-avatar{background:var(--bh-primary);border-color:var(--bh-primary);}
    .bh-msg-row.bh-user .bh-msg-avatar svg{stroke:#fff;}
    .bh-bubble-wrap{display:flex;flex-direction:column;max-width:78%;}
    .bh-msg-row.bh-user .bh-bubble-wrap{align-items:flex-end;}
    .bh-bubble{
      padding:10px 14px;border-radius:var(--bh-radius-lg);font-size:.9rem;line-height:1.55;
      color:var(--bh-text-primary);background:var(--bh-surface);border:1px solid var(--bh-border);
      word-break:break-word;box-shadow:var(--bh-shadow-sm);
    }
    .bh-msg-row.bh-user .bh-bubble{
      background:var(--bh-primary);color:#fff;border-color:var(--bh-primary);
      border-bottom-right-radius:var(--bh-radius-sm);
    }
    .bh-msg-row.bh-bot .bh-bubble{border-bottom-left-radius:var(--bh-radius-sm);}
    .bh-msg-time{font-size:.68rem;color:var(--bh-text-secondary);margin-top:4px;padding:0 2px;}
    /* Typing indicator */
    #bh-typing-row{display:none;align-items:flex-end;gap:8px;animation:bh-msg-in .2s ease both;}
    #bh-typing-row.bh-visible{display:flex;}
    .bh-typing-bubble{
      background:var(--bh-surface);border:1px solid var(--bh-border);
      border-radius:var(--bh-radius-lg);border-bottom-left-radius:var(--bh-radius-sm);
      padding:13px 16px;display:flex;gap:5px;align-items:center;box-shadow:var(--bh-shadow-sm);
    }
    .bh-typing-bubble span{
      width:7px;height:7px;border-radius:50%;background:#94a3b8;display:inline-block;
      animation:bh-bounce 1.2s ease-in-out infinite;
    }
    .bh-typing-bubble span:nth-child(2){animation-delay:.18s;}
    .bh-typing-bubble span:nth-child(3){animation-delay:.36s;}
    /* Error */
    .bh-error-msg{
      font-size:.78rem;color:var(--bh-error);background:var(--bh-error-light);
      border:1px solid #fecaca;border-radius:var(--bh-radius-sm);
      padding:8px 12px;text-align:center;animation:bh-msg-in .2s ease both;
    }
    /* System msg */
    .bh-system-msg{
      text-align:center;font-size:.7rem;color:var(--bh-text-secondary);
      display:flex;align-items:center;gap:8px;
    }
    .bh-system-msg::before,.bh-system-msg::after{content:'';flex:1;height:1px;background:var(--bh-border);}
    /* Footer */
    #bh-footer{
      flex-shrink:0;background:var(--bh-surface);border-top:1px solid var(--bh-border);
      padding:12px 14px;display:flex;align-items:flex-end;gap:8px;
    }
    #bh-input{
      flex:1;resize:none;border:1.5px solid var(--bh-border);border-radius:var(--bh-radius-md);
      padding:10px 14px;font-size:.9rem;line-height:1.5;color:var(--bh-text-primary);
      background:var(--bh-surface-2);outline:none;
      transition:border-color var(--bh-t),background var(--bh-t),box-shadow var(--bh-t);
      min-height:44px;max-height:120px;overflow-y:auto;font-family:var(--bh-font);
    }
    #bh-input::placeholder{color:#94a3b8;}
    #bh-input:focus{
      border-color:var(--bh-primary);background:var(--bh-surface);
      box-shadow:0 0 0 3px rgba(37,99,235,.08);
    }
    #bh-send-btn{
      width:44px;height:44px;border-radius:50%;background:var(--bh-primary);border:none;
      cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:background var(--bh-t),transform var(--bh-t),opacity var(--bh-t);
      outline:none;-webkit-tap-highlight-color:transparent;
    }
    #bh-send-btn:hover:not(:disabled){background:var(--bh-primary-dark);transform:scale(1.06);}
    #bh-send-btn:active:not(:disabled){transform:scale(0.93);}
    #bh-send-btn:disabled{opacity:.5;cursor:not-allowed;}
    #bh-send-btn svg{
      width:20px;height:20px;fill:none;stroke:#fff;
      stroke-width:2;stroke-linecap:round;stroke-linejoin:round;
    }
    #bh-branding{
      text-align:center;font-size:.67rem;color:#94a3b8;
      padding:5px 0 8px;background:var(--bh-surface);letter-spacing:.02em;
    }
    #bh-branding a{color:var(--bh-primary);text-decoration:none;font-weight:600;}
    #bh-branding a:hover{text-decoration:underline;}
    /* Animations */
    @keyframes bh-pulse{
      0%{box-shadow:var(--bh-shadow-lg),0 0 0 0 rgba(37,99,235,.45);}
      70%{box-shadow:var(--bh-shadow-lg),0 0 0 14px rgba(37,99,235,0);}
      100%{box-shadow:var(--bh-shadow-lg),0 0 0 0 rgba(37,99,235,0);}
    }
    @keyframes bh-status-pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
    @keyframes bh-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
    @keyframes bh-msg-in{
      from{opacity:0;transform:translateY(8px) scale(.97);}
      to{opacity:1;transform:translateY(0) scale(1);}
    }
    /* Mobile */
    @media(max-width:480px){
      #bh-chat-window{
        bottom:0;right:0;left:0;width:100%;max-width:100%;
        height:100%;max-height:100%;border-radius:0;border:none;
      }
      #bh-launcher{bottom:16px;right:16px;}
    }
  `;

  // ── UTILS ────────────────────────────────────────────────
  /** Escape HTML to prevent XSS when inserting user content into DOM */
  function escapeHTML(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }

  /** Format a Date to "h:mm AM/PM" */
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /** Sanitize raw user input */
  function sanitizeInput(input) {
    return String(input).trim().replace(/\s+/g, ' ');
  }

  // ── SESSION MANAGER ──────────────────────────────────────
  const SessionManager = (() => {
    function generateUUID() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    }
    function load() {
      try {
        const raw = localStorage.getItem(cfg.storageKey);
        if (raw) {
          const p = JSON.parse(raw);
          if (p && p.sessionId && Array.isArray(p.history)) return p;
        }
      } catch (e) { /* ignore */ }
      return { sessionId: generateUUID(), history: [] };
    }
    function save(s) {
      try { localStorage.setItem(cfg.storageKey, JSON.stringify(s)); } catch (e) { /* ignore */ }
    }
    function clear() {
      try { localStorage.removeItem(cfg.storageKey); } catch (e) { /* ignore */ }
    }
    return { load, save, clear };
  })();

  // ── API CLIENT ───────────────────────────────────────────
  async function sendMessage(message, sessionId) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);

    let response;
    try {
      response = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: sanitizeInput(message),
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      throw new Error('Network error. Please check your connection.');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new Error(`Server error (${response.status}). Please try again.`);

    let data;
    try { data = await response.json(); } catch { throw new Error('Unexpected response format.'); }

    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('No reply received from the assistant.');
    }
    return data.reply;
  }

  // ── DOM BUILDER ──────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('bh-widget-css')) return;
    const style = document.createElement('style');
    style.id = 'bh-widget-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildDOM() {
    if (document.getElementById('bh-chat-root')) return; // prevent double init

    const root = document.createElement('div');
    root.id = 'bh-chat-root';
    root.innerHTML = `
      <button id="bh-launcher" aria-label="Open chat" aria-expanded="false">
        <svg class="bh-icon bh-icon-chat" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg class="bh-icon bh-icon-close" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span id="bh-unread-badge" aria-hidden="true">1</span>
      </button>

      <div id="bh-chat-window" role="dialog" aria-label="Chat with ${escapeHTML(cfg.botName)}" aria-hidden="true">
        <div id="bh-header">
          <div id="bh-header-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div id="bh-header-info">
            <div id="bh-header-name">${escapeHTML(cfg.botName)}</div>
            <div id="bh-header-status">${escapeHTML(cfg.botTagline)}</div>
          </div>
        </div>

        <div id="bh-messages" role="log" aria-live="polite" aria-label="Conversation">
          <div id="bh-typing-row" aria-label="Assistant is typing">
            <div class="bh-msg-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div class="bh-typing-bubble" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div id="bh-footer">
          <textarea
            id="bh-input"
            placeholder="${escapeHTML(cfg.placeholder)}"
            rows="1"
            aria-label="Type a message"
            maxlength="2000"
          ></textarea>
          <button id="bh-send-btn" aria-label="Send message" disabled>
            <svg viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div id="bh-branding">
          Powered by <a href="https://itsbothive.com" target="_blank" rel="noopener noreferrer">BotHive AI</a>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  // ── UI HELPERS ───────────────────────────────────────────
  function appendMessage(role, text, date) {
    date = date || new Date();
    const messages = document.getElementById('bh-messages');
    const typingRow = document.getElementById('bh-typing-row');

    const row = document.createElement('div');
    row.className = `bh-msg-row bh-${role}`;

    const avatarSVG = role === 'bot'
      ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    row.innerHTML = `
      <div class="bh-msg-avatar" aria-hidden="true">${avatarSVG}</div>
      <div class="bh-bubble-wrap">
        <div class="bh-bubble">${escapeHTML(text)}</div>
        <div class="bh-msg-time">${formatTime(date)}</div>
      </div>
    `;

    messages.insertBefore(row, typingRow);
    scrollToBottom();
  }

  function appendSystemMessage(text) {
    const messages = document.getElementById('bh-messages');
    const typingRow = document.getElementById('bh-typing-row');
    const div = document.createElement('div');
    div.className = 'bh-system-msg';
    div.textContent = text;
    messages.insertBefore(div, typingRow);
  }

  function setTyping(visible) {
    const row = document.getElementById('bh-typing-row');
    row.classList.toggle('bh-visible', visible);
    if (visible) scrollToBottom();
  }

  function appendError(msg) {
    const messages = document.getElementById('bh-messages');
    const typingRow = document.getElementById('bh-typing-row');
    const div = document.createElement('div');
    div.className = 'bh-error-msg';
    div.textContent = `⚠️  ${msg}`;
    messages.insertBefore(div, typingRow);
    scrollToBottom();
  }

  function scrollToBottom() {
    const messages = document.getElementById('bh-messages');
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function setLoading(loading) {
    const btn = document.getElementById('bh-send-btn');
    const input = document.getElementById('bh-input');
    btn.disabled = loading;
    input.disabled = loading;
  }

  function autoGrowTextarea(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function validateSendButton() {
    const input = document.getElementById('bh-input');
    const btn = document.getElementById('bh-send-btn');
    if (!input.disabled) btn.disabled = sanitizeInput(input.value).length === 0;
  }

  // ── OPEN / CLOSE ─────────────────────────────────────────
  let isOpen = false;

  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    const win = document.getElementById('bh-chat-window');
    const launcher = document.getElementById('bh-launcher');
    const badge = document.getElementById('bh-unread-badge');
    win.classList.add('bh-visible');
    win.setAttribute('aria-hidden', 'false');
    launcher.classList.add('bh-open');
    launcher.setAttribute('aria-expanded', 'true');
    badge.classList.remove('bh-visible');
    setTimeout(() => document.getElementById('bh-input').focus(), 250);
    scrollToBottom();
  }

  function closeChat() {
    isOpen = false;
    const win = document.getElementById('bh-chat-window');
    const launcher = document.getElementById('bh-launcher');
    win.classList.remove('bh-visible');
    win.setAttribute('aria-hidden', 'true');
    launcher.classList.remove('bh-open');
    launcher.setAttribute('aria-expanded', 'false');
  }

  // ── CORE SEND FLOW ───────────────────────────────────────
  let session;

  async function handleSend() {
    const input = document.getElementById('bh-input');
    const rawText = input.value;
    const text = sanitizeInput(rawText);
    if (!text) return;

    input.value = '';
    autoGrowTextarea(input);
    input.focus();

    const now = new Date();
    appendMessage('user', text, now);
    session.history.push({ role: 'user', text, time: now.toISOString() });
    SessionManager.save(session);

    setLoading(true);
    setTyping(true);

    try {
      const reply = await sendMessage(text, session.sessionId);
      setTyping(false);
      const replyTime = new Date();
      appendMessage('bot', reply, replyTime);
      session.history.push({ role: 'bot', text: reply, time: replyTime.toISOString() });
      SessionManager.save(session);
    } catch (err) {
      setTyping(false);
      appendError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      validateSendButton();
    }
  }

  // ── EVENT BINDING ────────────────────────────────────────
  function bindEvents() {
    document.getElementById('bh-launcher').addEventListener('click', toggleChat);
    document.getElementById('bh-send-btn').addEventListener('click', handleSend);

    const input = document.getElementById('bh-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    input.addEventListener('input', () => {
      autoGrowTextarea(input);
      validateSendButton();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closeChat();
    });
  }

  // ── SESSION RESTORE ──────────────────────────────────────
  function restoreHistory() {
    if (!session.history || session.history.length === 0) return;
    appendSystemMessage('Previous conversation restored');
    session.history.forEach(entry => {
      appendMessage(entry.role, entry.text, new Date(entry.time));
    });
  }

  // ── INIT ─────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildDOM();
    session = SessionManager.load();
    bindEvents();

    if (session.history.length > 0) {
      restoreHistory();
      document.getElementById('bh-unread-badge').classList.add('bh-visible');
    } else {
      appendMessage('bot', cfg.welcomeMsg);
    }

    validateSendButton();
  }

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(); // end IIFE
