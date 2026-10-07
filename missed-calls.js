(() => {
  'use strict';

  const STORE = 'pingstar-demo-missed-calls-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = new Date();
  let filter = 'all';
  let health = { server: false, smsConfigured: false, provider: 'Local simulator', publicBaseUrl: window.location.origin };
  let records = load();

  function uid() {
    return `MC-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  function relativeISO(days, hour, minute) {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  function seed() {
    const samples = [
      ['Amelia Grant', '07123 440 182', 0, 8, 42, 'Booked', 'delivered'],
      ['Daniel Clarke', '07700 900 214', 0, 9, 18, 'Opened', 'delivered'],
      ['Sophie Bennett', '07911 320 881', 0, 10, 6, 'Delivered', 'delivered'],
      ['Marcus Hill', '07455 817 034', 0, 10, 54, 'Needs review', 'failed'],
      ['Chloe Evans', '07824 506 117', 1, 16, 12, 'Booked', 'delivered'],
      ['Noah Williams', '07518 732 409', 1, 14, 47, 'Opened', 'delivered'],
      ['Grace Foster', '07390 281 665', 2, 11, 28, 'Booked', 'delivered'],
      ['Lucas Green', '07654 912 328', 2, 9, 52, 'Delivered', 'delivered'],
      ['Ruby Collins', '07741 660 835', 3, 15, 33, 'Booked', 'delivered'],
      ['Ethan Ward', '07980 144 706', 4, 12, 9, 'Opened', 'delivered'],
      ['Maya Turner', '07222 419 503', 5, 17, 2, 'Booked', 'delivered'],
      ['Oscar Hughes', '07888 303 921', 6, 10, 24, 'Delivered', 'sent'],
    ];
    return samples.map((sample, index) => {
      const [name, phone, days, hour, minute, outcome, smsStatus] = sample;
      const id = `MC-DEMO-${String(index + 1).padStart(3, '0')}`;
      return {
        id,
        callerName: name,
        phone,
        reason: index % 3 === 0 ? 'Book an eye test' : index % 3 === 1 ? 'Change an appointment' : 'General enquiry',
        callAt: relativeISO(days, hour, minute),
        callStatus: 'no-answer',
        smsStatus,
        smsSentAt: relativeISO(days, hour, minute + 1),
        openedAt: ['Opened', 'Booked'].includes(outcome) ? relativeISO(days, hour, minute + 5) : null,
        bookedAt: outcome === 'Booked' ? relativeISO(days, hour, minute + 9) : null,
        outcome,
        bookingUrl: bookingUrl(id),
        provider: 'Demo phone system',
        mode: 'simulated',
      };
    });
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE) || 'null');
      return Array.isArray(stored) && stored.length ? stored : seed();
    } catch {
      return seed();
    }
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(records)); } catch { /* browser storage unavailable */ }
  }

  function bookingUrl(id) {
    const base = health.publicBaseUrl && /^https?:/i.test(health.publicBaseUrl) ? health.publicBaseUrl.replace(/\/$/, '') : window.location.origin;
    return `${base}/website.html?chat=open&action=book&source=missed-call&ref=${encodeURIComponent(id)}`;
  }

  function formatDateTime(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  function isToday(value) {
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function badge(status) {
    const value = String(status || 'Pending');
    const cls = /booked|delivered|opened/i.test(value) ? 'green' : /failed|review/i.test(value) ? 'red' : 'amber';
    return `<span class="badge ${cls}">${esc(value)}</span>`;
  }

  function currentOutcome(record) {
    if (record.bookedAt || record.outcome === 'Booked') return 'Booked';
    if (record.openedAt || record.outcome === 'Opened') return 'Opened';
    if (/delivered/i.test(record.smsStatus || '')) return 'Delivered';
    if (/failed|undelivered/i.test(record.smsStatus || '')) return 'Needs review';
    return record.outcome || 'SMS sent';
  }


  function syncPublicBookingEvents() {
    try {
      const events = JSON.parse(localStorage.getItem('pingstar-public-booking-events-v1') || '[]');
      if (!Array.isArray(events)) return;
      events.forEach(event => {
        if (!event?.sourceRef || !event.booking) return;
        let record = records.find(item => item.id === event.sourceRef);
        if (!record) {
          record = {
            id: event.sourceRef,
            callerName: event.booking.name || 'Website caller',
            phone: event.booking.phone || '',
            reason: 'Self-service appointment booking',
            callAt: event.createdAt || new Date().toISOString(),
            callStatus: 'no-answer',
            smsStatus: 'delivered',
            smsSentAt: event.createdAt || new Date().toISOString(),
            bookingUrl: bookingUrl(event.sourceRef),
            provider: 'Public booking chatbot',
            mode: 'simulated',
          };
          records.unshift(record);
        }
        record.booking = event.booking;
        record.openedAt ||= event.createdAt || new Date().toISOString();
        record.bookedAt ||= event.createdAt || new Date().toISOString();
        record.outcome = 'Booked';
      });
    } catch { /* No public booking events yet. */ }
  }

  function syncBookingsToPractice() {
    if (!window.PingstarApp?.addPublicBooking) return;
    records.filter(record => record.booking && !record.practiceAppointmentId).forEach(record => {
      const result = window.PingstarApp.addPublicBooking(record.booking, record.id);
      if (result) {
        record.practiceCustomerId = result.customerId;
        record.practiceAppointmentId = result.appointmentId;
      }
    });
  }

  function render() {
    syncPublicBookingEvents();
    syncBookingsToPractice();
    records.forEach(record => {
      record.bookingUrl = record.bookingUrl || bookingUrl(record.id);
      record.outcome = currentOutcome(record);
    });
    save();

    const delivered = records.filter(record => /delivered/i.test(record.smsStatus || '')).length;
    const opened = records.filter(record => record.openedAt).length;
    const booked = records.filter(record => record.bookedAt || record.outcome === 'Booked').length;
    setText('#missed-stat-total', records.length);
    setText('#missed-stat-delivered', delivered);
    setText('#missed-stat-opened', opened);
    setText('#missed-stat-booked', booked);
    setText('#stat-missed-calls', records.filter(record => isToday(record.callAt)).length);
    setText('#stat-missed-recovered', `${records.filter(record => isToday(record.bookedAt)).length} bookings recovered`);

    const visible = [...records]
      .filter(record => filter === 'all' || currentOutcome(record) === filter)
      .sort((a, b) => String(b.callAt).localeCompare(String(a.callAt)));

    const body = $('#missed-calls-body');
    if (body) {
      body.innerHTML = visible.length ? visible.map(record => `
        <tr>
          <td><strong>${esc(record.callerName || 'Unknown caller')}</strong><small>${esc(record.phone)}</small><small>${esc(record.reason || 'General enquiry')}</small></td>
          <td>${formatDateTime(record.callAt)}<small>${esc(record.provider || 'Phone system')}</small></td>
          <td>${badge(record.smsStatus || 'queued')}<small>${record.smsSentAt ? formatDateTime(record.smsSentAt) : 'Not sent'}</small></td>
          <td>${record.openedAt ? badge('Opened') : '<span class="badge blue">Not opened</span>'}<small>${record.openedAt ? formatDateTime(record.openedAt) : 'Waiting for click'}</small></td>
          <td>${badge(currentOutcome(record))}${record.booking ? `<small>${esc(record.booking.appointmentType || 'Appointment')} · ${esc(record.booking.date || '')} ${esc(record.booking.time || '')}</small>` : record.bookedAt ? `<small>${formatDateTime(record.bookedAt)}</small>` : '<small>—</small>'}</td>
          <td><div class="missed-actions"><button class="text-btn" data-missed-action="open" data-id="${esc(record.id)}">Open link</button><button class="text-btn" data-missed-action="opened" data-id="${esc(record.id)}">Mark opened</button><button class="text-btn" data-missed-action="booked" data-id="${esc(record.id)}">Mark booked</button><button class="text-btn" data-missed-action="resend" data-id="${esc(record.id)}">Resend</button></div></td>
        </tr>`).join('') : '<tr><td colspan="6"><div class="empty">No missed calls match this filter.</div></td></tr>';
    }

    const mini = $('#dashboard-missed-calls');
    if (mini) {
      mini.innerHTML = [...records].sort((a, b) => String(b.callAt).localeCompare(String(a.callAt))).slice(0, 5).map(record => `
        <button class="missed-mini-row" data-open-missed-centre>
          <span class="missed-call-icon">☎</span>
          <span><strong>${esc(record.callerName || record.phone)}</strong><small>${formatDateTime(record.callAt)} · ${esc(record.reason || 'General enquiry')}</small></span>
          ${badge(currentOutcome(record))}
        </button>`).join('');
    }

    renderConnection();
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function renderConnection() {
    const badgeEl = $('#sms-connection-badge');
    if (badgeEl) {
      badgeEl.textContent = health.smsConfigured ? 'Twilio connected' : health.server ? 'Simulation mode' : 'Local simulator';
      badgeEl.className = `badge ${health.smsConfigured ? 'green' : 'blue'}`;
    }
    const details = $('#missed-call-connection-details');
    if (details) details.innerHTML = `
      <div><span class="connection-dot ${health.server ? 'on' : ''}"></span><p><strong>Pingstar API server</strong><small>${health.server ? 'Available' : 'Not running — local demo still works'}</small></p></div>
      <div><span class="connection-dot ${health.smsConfigured ? 'on' : ''}"></span><p><strong>SMS provider</strong><small>${esc(health.provider || 'Twilio')} · ${health.smsConfigured ? 'Ready to send' : 'Credentials not configured'}</small></p></div>
      <div><span class="connection-dot ${health.publicBaseUrl && !/localhost/i.test(health.publicBaseUrl) ? 'on' : ''}"></span><p><strong>Public booking URL</strong><small>${esc(health.publicBaseUrl || window.location.origin)}</small></p></div>`;
  }

  function mergeServerRecords(serverRecords) {
    if (!Array.isArray(serverRecords)) return;
    const byId = new Map(records.map(item => [item.id, item]));
    serverRecords.forEach(item => byId.set(item.id, { ...byId.get(item.id), ...item }));
    records = [...byId.values()];
    save();
  }

  async function checkHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Server unavailable');
      const data = await response.json();
      health = {
        server: true,
        smsConfigured: Boolean(data.smsConfigured),
        provider: data.smsProvider || 'Twilio',
        publicBaseUrl: data.publicBaseUrl || window.location.origin,
      };
      const callsResponse = await fetch('/api/missed-calls');
      if (callsResponse.ok) mergeServerRecords((await callsResponse.json()).records);
    } catch {
      health = { server: false, smsConfigured: false, provider: 'Local simulator', publicBaseUrl: window.location.origin };
    }
    render();
  }

  async function simulate(event) {
    event.preventDefault();
    const callerName = $('#missed-caller-name').value.trim();
    const phone = $('#missed-caller-phone').value.trim();
    const reason = $('#missed-call-reason').value;
    const sendReal = Boolean($('#missed-send-real')?.checked);
    const result = $('#missed-call-result');
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    if (result) result.innerHTML = '<span class="badge blue">Processing missed call…</span>';

    let record;
    try {
      if (!health.server) throw new Error('Local mode');
      const response = await fetch('/api/missed-calls/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerName, phone, reason, sendReal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Simulation failed');
      record = data.record;
    } catch (error) {
      const id = uid();
      record = {
        id,
        callerName,
        phone,
        reason,
        callAt: new Date().toISOString(),
        callStatus: 'no-answer',
        smsStatus: 'delivered',
        smsSentAt: new Date().toISOString(),
        openedAt: null,
        bookedAt: null,
        outcome: 'Delivered',
        bookingUrl: bookingUrl(id),
        provider: 'Local simulator',
        mode: 'simulated',
      };
    }

    records = [record, ...records.filter(item => item.id !== record.id)];
    save();
    render();
    window.dispatchEvent(new CustomEvent('pingstar:missed-call', { detail: record }));
    if (result) result.innerHTML = `<span class="badge green">${esc(record.smsStatus === 'sent' ? 'SMS sent' : 'Demo SMS created')}</span><p>${esc(record.phone)} received a link to the AI booking assistant.</p><a href="${esc(record.bookingUrl)}" target="_blank">Open the customer link →</a>`;
    if (submit) submit.disabled = false;
  }

  async function updateRecord(id, stage) {
    const record = records.find(item => item.id === id);
    if (!record) return;
    const timestamp = new Date().toISOString();
    if (stage === 'opened') { record.openedAt = timestamp; record.outcome = 'Opened'; }
    if (stage === 'booked') { record.openedAt ||= timestamp; record.bookedAt = timestamp; record.outcome = 'Booked'; }
    try {
      if (health.server) {
        const response = await fetch(`/api/missed-calls/${encodeURIComponent(id)}/engagement`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }),
        });
        if (response.ok) Object.assign(record, (await response.json()).record || {});
      }
    } catch { /* local state is sufficient for the demo */ }
    save();
    render();
  }

  async function resend(id) {
    const record = records.find(item => item.id === id);
    if (!record) return;
    try {
      if (health.server) {
        const response = await fetch(`/api/missed-calls/${encodeURIComponent(id)}/resend`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Resend failed');
        Object.assign(record, data.record || {});
      } else {
        record.smsStatus = 'delivered';
        record.smsSentAt = new Date().toISOString();
      }
    } catch (error) {
      alert(error.message);
    }
    save();
    render();
  }

  function bind() {
    $('#missed-call-form')?.addEventListener('submit', simulate);
    $('#missed-call-filter')?.addEventListener('change', event => { filter = event.target.value; render(); });
    $('#refresh-missed-calls')?.addEventListener('click', checkHealth);
    $('#missed-calls-body')?.addEventListener('click', event => {
      const button = event.target.closest('[data-missed-action]');
      if (!button) return;
      const record = records.find(item => item.id === button.dataset.id);
      if (!record) return;
      if (button.dataset.missedAction === 'open') window.open(record.bookingUrl || bookingUrl(record.id), '_blank', 'noopener');
      if (button.dataset.missedAction === 'opened') updateRecord(record.id, 'opened');
      if (button.dataset.missedAction === 'booked') updateRecord(record.id, 'booked');
      if (button.dataset.missedAction === 'resend') resend(record.id);
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-open-missed-centre]')) document.querySelector('[data-view="missedcalls"]')?.click();
    });
    document.querySelector('[data-view="missedcalls"]')?.addEventListener('click', () => window.setTimeout(render, 0));
    window.addEventListener('storage', event => { if (event.key === 'pingstar-public-booking-events-v1') render(); });
  }

  bind();
  render();
  checkHealth();
  window.PingstarMissedCalls = { render, getRecords: () => clone(records), refresh: checkHealth };
})();
