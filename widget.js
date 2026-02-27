/**
 * ============================================================
 *  BotHive AI — Chat Widget
 *  widget.js | Version 1.0.0
 *
 *  Standalone modular JS (non-IIFE).
 *  Load via: <script src="widget.js"></script>
 *  For embeddable single-file IIFE, see widget.embed.js
 * ============================================================
 */

// ── CONFIGURATION ────────────────────────────────────────────
// Change WEBHOOK_URL to your n8n webhook endpoint.
const WIDGET_CONFIG = {
  WEBHOOK_URL: 'https://mii19.app.n8n.cloud/webhook/widgetreply',
  BOT_NAME: 'BotHive AI',
  BOT_TAGLINE: 'Online · Typically replies instantly',
  WELCOME_MSG: "👋 Hi! I'm your AI assistant. How can I help you today?",
  PLACEHOLDER: 'Type your message…',
  STORAGE_KEY: 'bh_chat_session',
  REQUEST_TIMEOUT_MS: 20000,   // 20 seconds before declaring network failure
};

// ── SESSION MANAGER ──────────────────────────────────────────
/**
 * Handles generating, storing, and retrieving the session ID
 * and conversation history via localStorage.
 */
const SessionManager = (() => {
  /**
   * Generate a RFC-4122 v4 UUID without external libs.
   * Falls back to Math.random() if crypto API is unavailable.
   * @returns {string} UUID string
   */
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Load session from localStorage. Creates a new one if missing.
   * @returns {{ sessionId: string, history: Array }}
   */
  function load() {
    try {
      const raw = localStorage.getItem(WIDGET_CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.sessionId && Array.isArray(parsed.history)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[BotHive] Could not read session from localStorage.', e);
    }
    // Fresh session
    return { sessionId: generateUUID(), history: [] };
  }

  /**
   * Save the session to localStorage.
   * @param {{ sessionId: string, history: Array }} session
   */
  function save(session) {
    try {
      localStorage.setItem(WIDGET_CONFIG.STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('[BotHive] Could not save session to localStorage.', e);
    }
  }

  /**
   * Clear the session entirely (e.g. for a fresh start).
   */
  function clear() {
    try {
      localStorage.removeItem(WIDGET_CONFIG.STORAGE_KEY);
    } catch (e) {
      // Silently fail
    }
  }

  return { load, save, clear, generateUUID };
})();

// ── UTILS ────────────────────────────────────────────────────
/**
 * Security: Escape HTML special characters to prevent XSS.
 * Always call this before inserting user-supplied text into the DOM.
 * @param {string} str
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format a Date object as a short human-readable time string.
 * @param {Date} date
 * @returns {string} e.g. "2:34 PM"
 */
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Lightweight input sanitization — strips leading/trailing whitespace
 * and collapses internal whitespace.  XSS protection is via escapeHTML().
 * @param {string} input
 * @returns {string}
 */
function sanitizeInput(input) {
  return String(input).trim().replace(/\s+/g, ' ');
}

// ── API CLIENT ───────────────────────────────────────────────
/**
 * Sends a message to the n8n webhook and returns the bot reply.
 * Throws on network error or non-OK HTTP response.
 *
 * @param {string} message - The user's message text
 * @param {string} sessionId - The current session ID
 * @returns {Promise<string>} The bot reply string
 */
async function sendMessage(message, sessionId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WIDGET_CONFIG.REQUEST_TIMEOUT_MS);

  const payload = {
    message: sanitizeInput(message),
    sessionId: sessionId,
    timestamp: new Date().toISOString(),
  };

  let response;
  try {
    response = await fetch(WIDGET_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw new Error('Network error. Please check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Server error (${response.status}). Please try again.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Received an unexpected response format.');
  }

  // Expect { "reply": "<bot_response>" }
  if (typeof data.reply !== 'string' || data.reply.trim() === '') {
    throw new Error('No reply received from the assistant.');
  }

  return data.reply;
}

// ── DOM BUILDER ──────────────────────────────────────────────
/**
 * Injects the widget HTML structure into the document body.
 * All IDs are prefixed with "bh-" to avoid collisions.
 */
function buildDOM() {
  // Inject stylesheet if not already present (for script-only embed)
  if (!document.getElementById('bh-styles')) {
    const link = document.createElement('link');
    link.id = 'bh-styles';
    link.rel = 'stylesheet';
    link.href = 'widget.css';  // overridden in embed version
    document.head.appendChild(link);
  }

  const root = document.createElement('div');
  root.id = 'bh-chat-root';
  root.innerHTML = `
    <!-- ── Launcher Bubble ── -->
    <button id="bh-launcher" aria-label="Open chat" aria-expanded="false">
      <!-- Chat icon -->
      <svg class="bh-icon bh-icon-chat" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <!-- Close icon -->
      <svg class="bh-icon bh-icon-close" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <span id="bh-unread-badge" aria-hidden="true">1</span>
    </button>

    <!-- ── Chat Window ── -->
    <div id="bh-chat-window" role="dialog" aria-label="Chat with ${escapeHTML(WIDGET_CONFIG.BOT_NAME)}" aria-hidden="true">

      <!-- Header -->
      <div id="bh-header">
        <div id="bh-header-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <div id="bh-header-info">
          <div id="bh-header-name">${escapeHTML(WIDGET_CONFIG.BOT_NAME)}</div>
          <div id="bh-header-status">${escapeHTML(WIDGET_CONFIG.BOT_TAGLINE)}</div>
        </div>
      </div>

      <!-- Messages -->
      <div id="bh-messages" role="log" aria-live="polite" aria-label="Conversation">

        <!-- Typing indicator (hidden by default) -->
        <div id="bh-typing-row" aria-label="Assistant is typing">
          <div class="bh-msg-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </div>
          <div class="bh-typing-bubble" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- Input Footer -->
      <div id="bh-footer">
        <textarea
          id="bh-input"
          placeholder="${escapeHTML(WIDGET_CONFIG.PLACEHOLDER)}"
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

      <!-- Branding -->
      <div id="bh-branding">
        Powered by <a href="https://itsbothive.com" target="_blank" rel="noopener noreferrer">BotHive AI</a>
      </div>
    </div>
  `;

  document.body.appendChild(root);
}

// ── UI HELPERS ───────────────────────────────────────────────
/**
 * Append a message bubble row to #bh-messages.
 *
 * @param {'bot'|'user'} role
 * @param {string}        text  - Raw text (will be HTML-escaped)
 * @param {Date}          [date]
 */
function appendMessage(role, text, date = new Date()) {
  const messages = document.getElementById('bh-messages');
  const typingRow = document.getElementById('bh-typing-row');

  const row = document.createElement('div');
  row.className = `bh-msg-row bh-${role}`;

  // Avatar SVG (bot vs user)
  const avatarSVG = role === 'bot'
    ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  row.innerHTML = `
    <div class="bh-msg-avatar" aria-hidden="true">${avatarSVG}</div>
    <div class="bh-bubble-wrap">
      <div class="bh-bubble">${escapeHTML(text)}</div>
      <div class="bh-msg-time" aria-label="Sent at ${formatTime(date)}">${formatTime(date)}</div>
    </div>
  `;

  // Insert before the typing indicator so it stays at the bottom
  messages.insertBefore(row, typingRow);
  scrollToBottom();
}

/**
 * Append a system divider message (e.g. "Session restored").
 * @param {string} text
 */
function appendSystemMessage(text) {
  const messages = document.getElementById('bh-messages');
  const typingRow = document.getElementById('bh-typing-row');

  const div = document.createElement('div');
  div.className = 'bh-system-msg';
  div.textContent = text;

  messages.insertBefore(div, typingRow);
}

/**
 * Show or hide the animated typing indicator.
 * @param {boolean} visible
 */
function setTyping(visible) {
  const row = document.getElementById('bh-typing-row');
  row.classList.toggle('bh-visible', visible);
  if (visible) scrollToBottom();
}

/**
 * Display an error message in the chat flow.
 * @param {string} msg
 */
function appendError(msg) {
  const messages = document.getElementById('bh-messages');
  const typingRow = document.getElementById('bh-typing-row');

  const div = document.createElement('div');
  div.className = 'bh-error-msg';
  div.textContent = `⚠️  ${msg}`;

  messages.insertBefore(div, typingRow);
  scrollToBottom();
}

/**
 * Scroll the message list to the very bottom.
 */
function scrollToBottom() {
  const messages = document.getElementById('bh-messages');
  // Use requestAnimationFrame to ensure DOM has updated before scrolling
  requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
  });
}

/**
 * Toggle the send button and textarea enabled state.
 * @param {boolean} loading
 */
function setLoading(loading) {
  const btn = document.getElementById('bh-send-btn');
  const input = document.getElementById('bh-input');
  btn.disabled = loading;
  input.disabled = loading;
}

/**
 * Auto-grow textarea height with content, up to CSS max-height.
 * @param {HTMLTextAreaElement} el
 */
function autoGrowTextarea(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

// ── OPEN / CLOSE ─────────────────────────────────────────────
let isOpen = false;

/**
 * Toggle the chat window open / closed.
 */
function toggleChat() {
  isOpen ? closeChat() : openChat();
}

function openChat() {
  isOpen = true;
  const win = document.getElementById('bh-chat-window');
  const launcher = document.getElementById('bh-launcher');
  const badge = document.getElementById('bh-unread-badge');

  win.classList.add('bh-visible');
  win.setAttribute('aria-hidden', 'false');
  launcher.classList.add('bh-open');
  launcher.setAttribute('aria-expanded', 'true');

  // Hide unread badge
  badge.classList.remove('bh-visible');

  // Focus the input for accessibility
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

// ── CORE SEND FLOW ───────────────────────────────────────────
/**
 * Main send handler:
 *  1. Validate & sanitize input
 *  2. Append user bubble
 *  3. Persist to session history
 *  4. Show typing indicator
 *  5. POST to webhook
 *  6. Display bot reply / error
 *  7. Save updated history
 */
async function handleSend() {
  const input = document.getElementById('bh-input');
  const rawText = input.value;
  const text = sanitizeInput(rawText);

  // Guard: don't send empty messages
  if (!text) return;

  // Clear input immediately
  input.value = '';
  autoGrowTextarea(input);
  input.focus();

  // Append user message to UI
  const now = new Date();
  appendMessage('user', text, now);

  // Persist user message to session history
  session.history.push({ role: 'user', text, time: now.toISOString() });
  SessionManager.save(session);

  // Disable input & show typing
  setLoading(true);
  setTyping(true);

  try {
    const reply = await sendMessage(text, session.sessionId);

    setTyping(false);

    const replyTime = new Date();
    appendMessage('bot', reply, replyTime);

    // Persist bot reply
    session.history.push({ role: 'bot', text: reply, time: replyTime.toISOString() });
    SessionManager.save(session);

  } catch (err) {
    setTyping(false);
    appendError(err.message || 'Something went wrong. Please try again.');
    console.error('[BotHive] Send error:', err);
  } finally {
    setLoading(false);
    // Re-validate send button after loading state clears
    validateSendButton();
  }
}

/**
 * Enable/disable send button based on input content.
 */
function validateSendButton() {
  const input = document.getElementById('bh-input');
  const btn = document.getElementById('bh-send-btn');
  // Don't override disabled state while loading
  if (!input.disabled) {
    btn.disabled = sanitizeInput(input.value).length === 0;
  }
}

// ── EVENT BINDING ────────────────────────────────────────────
function bindEvents() {
  const launcher = document.getElementById('bh-launcher');
  const sendBtn = document.getElementById('bh-send-btn');
  const input = document.getElementById('bh-input');

  // Toggle chat on launcher click
  launcher.addEventListener('click', toggleChat);

  // Send on button click
  sendBtn.addEventListener('click', handleSend);

  // Send on Enter (but Shift+Enter = new line)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-grow + validate send button on input
  input.addEventListener('input', () => {
    autoGrowTextarea(input);
    validateSendButton();
  });

  // Close chat on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });
}

// ── SESSION RESTORATION ──────────────────────────────────────
/**
 * Restore previous conversation from saved session history.
 * Called once on init if history exists.
 */
function restoreHistory() {
  if (!session.history || session.history.length === 0) return;

  appendSystemMessage('Previous conversation restored');

  session.history.forEach(entry => {
    appendMessage(entry.role, entry.text, new Date(entry.time));
  });
}

// ── INIT ─────────────────────────────────────────────────────
/** Loaded session — persists across all function calls */
let session;

/**
 * Main initialization function.
 * Builds the DOM, restores session, binds events, shows welcome.
 */
function initWidget() {
  // Build the widget HTML into the page
  buildDOM();

  // Load or create session
  session = SessionManager.load();

  // Bind all event listeners
  bindEvents();

  if (session.history.length > 0) {
    // Restore prior messages
    restoreHistory();
    // Show unread badge to signal there's history
    const badge = document.getElementById('bh-unread-badge');
    badge.classList.add('bh-visible');
  } else {
    // New session — show welcome message
    appendMessage('bot', WIDGET_CONFIG.WELCOME_MSG);
  }

  // Validate send button initial state
  validateSendButton();
}

// ── BOOTSTRAP ────────────────────────────────────────────────
// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
