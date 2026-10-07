(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const setText = (selector, text) => { const el = $(selector); if (el) el.textContent = text; };
  const setStatus = (selector, ok, text) => { const el = $(selector); if (!el) return; el.textContent = text; el.classList.toggle('online', Boolean(ok)); };

  window.OPTIVIEW_LIVE_MAIL = { connected: false, provider: null, providerLabel: '', email: '' };

  async function refreshStatus() {
    try {
      const [healthResponse, mailResponse] = await Promise.all([fetch('/api/health'), fetch('/api/mail/status')]);
      const health = await healthResponse.json();
      const mail = await mailResponse.json();
      setStatus('#twilio-connection-status', health.smsConfigured, health.smsConfigured ? `Ready · ${health.twilioCallMode || 'configured'}` : 'Not configured');
      window.OPTIVIEW_LIVE_MAIL = { connected: Boolean(mail.connected), provider: mail.provider, providerLabel: mail.providerLabel || '', email: mail.email || '' };
      setStatus('#mail-connection-status', mail.connected, mail.connected ? 'Connected' : 'Not connected');
      setText('#mail-connection-account', mail.connected ? `${mail.providerLabel} · ${mail.email}` : 'No live mailbox connected.');
      setText('#mail-live-label', mail.connected ? `${mail.providerLabel} connected` : 'Demo mailbox');
      setText('#mail-live-detail', mail.connected ? `${mail.email} · sync messages or compose a reply from this screen.` : 'Connect Microsoft 365 or Gmail to handle real practice email.');
      $('#mail-live-dot')?.classList.toggle('online', Boolean(mail.connected));
      const note = $('#mailbox-mode-note');
      if (note) note.innerHTML = mail.connected ? `<strong>Live mailbox</strong><p>${mail.providerLabel} is connected as ${mail.email}. Sending will use this mailbox.</p>` : '<strong>Demo mailbox</strong><p>Connect a mailbox from Connections to sync and send real email. Until then, messages remain local demo data.</p>';
      ['#mail-sync-btn','#connection-sync-mail','#disconnect-mail'].forEach(selector => { const el=$(selector); if(el) el.disabled=!mail.connected; });
      const google = $('#connect-google-mail'), microsoft = $('#connect-microsoft-mail');
      if (google) google.classList.toggle('disabled-provider', !mail.configuredProviders?.google);
      if (microsoft) microsoft.classList.toggle('disabled-provider', !mail.configuredProviders?.microsoft);
      return mail;
    } catch {
      setStatus('#twilio-connection-status', false, 'Server offline');
      setStatus('#mail-connection-status', false, 'Server offline');
      return null;
    }
  }

  async function syncMailbox() {
    const buttons = [$('#mail-sync-btn'), $('#connection-sync-mail')].filter(Boolean);
    buttons.forEach(button => { button.disabled = true; button.textContent = 'Syncing…'; });
    try {
      const response = await fetch('/api/mail/messages');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Mailbox sync failed.');
      window.OPTIVIEW_MAIL?.importMessages(data.messages || []);
      window.OPTIVIEW_MAIL?.toast?.(`Synced ${(data.messages || []).length} messages from ${data.providerLabel}.`);
      document.querySelector('[data-view="mailbox"]')?.click();
    } catch (error) {
      window.OPTIVIEW_MAIL?.toast?.(error.message || 'Mailbox sync failed.');
    } finally {
      buttons.forEach(button => { button.textContent = 'Sync mailbox'; button.disabled = !window.OPTIVIEW_LIVE_MAIL.connected; });
    }
  }

  async function disconnectMailbox() {
    if (!window.confirm('Disconnect the live mailbox from this demo?')) return;
    await fetch('/api/mail/disconnect', { method: 'POST' }).catch(() => null);
    window.OPTIVIEW_LIVE_MAIL = { connected: false, provider: null, providerLabel: '', email: '' };
    await refreshStatus();
    window.OPTIVIEW_MAIL?.toast?.('Live mailbox disconnected.');
  }

  $('#mail-sync-btn')?.addEventListener('click', syncMailbox);
  $('#connection-sync-mail')?.addEventListener('click', syncMailbox);
  $('#disconnect-mail')?.addEventListener('click', disconnectMailbox);

  const params = new URLSearchParams(window.location.search);
  refreshStatus().then(mail => {
    if (params.get('mail') === 'connected' && mail?.connected) {
      document.querySelector('[data-view="mailbox"]')?.click();
      window.OPTIVIEW_MAIL?.toast?.(`${mail.providerLabel} connected successfully.`);
      history.replaceState({}, '', window.location.pathname);
    }
  });
})();
