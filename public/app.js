// app.js - Client for Autonomous AI Web Assistant
let conversationHistory = [];

async function handleChatSubmit(event) {
  event.preventDefault();
  const inputEl = document.getElementById('user-input');
  const message = inputEl.value.trim();
  if (!message) return;

  // Add user message to UI
  appendMessage('user', message);
  inputEl.value = '';

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  // Show thinking indicator
  const thinkingId = appendThinkingIndicator();

  const startTime = Date.now();
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory })
    });

    const data = await res.json();
    removeThinkingIndicator(thinkingId);

    if (data.error) {
      appendMessage('assistant', `⚠️ **Error:** ${data.error}`);
    } else {
      appendMessage('assistant', data.reply, data.executionTraces);

      // Update latency pill
      const latencyPill = document.getElementById('latency-pill');
      if (latencyPill) {
        latencyPill.textContent = `Latency: ${data.latencyMs || (Date.now() - startTime)} ms`;
      }

      // Add to conversation memory
      conversationHistory.push({ role: 'user', parts: [{ text: message }] });
      conversationHistory.push({ role: 'model', parts: [{ text: data.reply }] });
    }
  } catch (err) {
    removeThinkingIndicator(thinkingId);
    appendMessage('assistant', `⚠️ **Connection Failure:** Could not reach the autonomous agent server (${err.message}).`);
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

function sendQuickPrompt(promptText) {
  const inputEl = document.getElementById('user-input');
  inputEl.value = promptText;
  document.getElementById('chat-form').dispatchEvent(new Event('submit'));
}

function appendMessage(role, text, executionTraces = []) {
  const container = document.getElementById('messages-container');
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}-message`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '👤' : '🤖';

  const bodyEl = document.createElement('div');
  bodyEl.className = 'message-body';

  // If there are tool execution traces, render them above the final synthesized response
  if (executionTraces && executionTraces.length > 0) {
    executionTraces.forEach((trace, idx) => {
      const traceCard = document.createElement('div');
      traceCard.className = 'trace-card';

      const traceHeader = document.createElement('div');
      traceHeader.className = 'trace-header';
      traceHeader.innerHTML = `
        <div class="trace-title">
          <span class="badge-tool">TOOL INVOKED</span>
          <span>⚡ ${escapeHtml(trace.tool || 'External API')}</span>
        </div>
        <span>Step ${trace.step || (idx + 1)} • Click to toggle</span>
      `;

      const traceBody = document.createElement('div');
      traceBody.className = 'trace-body';
      traceBody.innerHTML = `
        <div style="margin-bottom: 4px; font-weight: 600; color: #a5b4fc;">Arguments:</div>
        <pre>${escapeHtml(JSON.stringify(trace.args, null, 2))}</pre>
        <div style="margin: 8px 0 4px 0; font-weight: 600; color: #34d399;">Execution Output:</div>
        <pre>${escapeHtml(JSON.stringify(trace.result, null, 2))}</pre>
      `;

      traceHeader.addEventListener('click', () => {
        traceBody.style.display = traceBody.style.display === 'none' ? 'block' : 'none';
      });

      traceCard.appendChild(traceHeader);
      traceCard.appendChild(traceBody);
      bodyEl.appendChild(traceCard);
    });
  }

  const textEl = document.createElement('div');
  textEl.className = 'message-text';
  textEl.innerHTML = parseMarkdown(text);
  bodyEl.appendChild(textEl);

  msgEl.appendChild(avatar);
  msgEl.appendChild(bodyEl);
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function appendThinkingIndicator() {
  const container = document.getElementById('messages-container');
  const id = 'thinking-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'message assistant-message';
  el.innerHTML = `
    <div class="avatar">⚡</div>
    <div class="message-body">
      <div class="message-text" style="font-style: italic; color: #94a3b8;">
        Evaluating intent, checking schemas & executing tool calls...
      </div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeThinkingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function parseMarkdown(md) {
  if (!md) return '';
  let html = escapeHtml(md);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Inline code
  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

  // Bullet items
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

  // Line breaks
  html = html.replace(/\n\n/gim, '<p></p>');
  html = html.replace(/\n/gim, '<br>');

  return html;
}

function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
