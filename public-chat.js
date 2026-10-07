(() => {
  'use strict';

  const PRACTICE = {
    name: 'ClearView Opticians',
    address: '18 High Street, London',
    phone: '020 7946 0284',
    hours: 'Monday to Friday 9:00am–6:00pm, Saturday 9:00am–4:00pm, closed Sunday',
    parking: 'Two-hour customer parking is available behind the practice. The nearest station is a five-minute walk away.',
    prices: {
      routine: '£35 for a private routine eye examination',
      contact: '£45 for a contact-lens check',
      children: 'Children may qualify for an NHS-funded sight test; eligibility is checked by reception',
    },
  };

  const APPOINTMENT_TYPES = {
    routine: { label: 'Routine eye test', duration: 40, people: ['Dr Amelia Reed', 'Alex Morgan', 'Helen Brooks'] },
    contact: { label: 'Contact lens check', duration: 45, people: ['Alex Morgan'] },
    children: { label: "Children's eye test", duration: 35, people: ['Helen Brooks', 'Dr Amelia Reed'] },
    urgent: { label: 'Urgent eye concern', duration: 30, people: ['Dr Amelia Reed'] },
    collection: { label: 'Glasses collection or adjustment', duration: 20, people: ['Alex Morgan', 'Helen Brooks'] },
  };

  const panel = document.getElementById('public-chat-panel');
  const launcher = document.getElementById('public-chat-launcher');
  const messages = document.getElementById('public-chat-messages');
  const quick = document.getElementById('public-chat-quick');
  const form = document.getElementById('public-chat-form');
  const input = document.getElementById('public-chat-input');
  const typing = document.getElementById('public-chat-typing');
  const status = document.getElementById('public-chat-status');

  if (!panel || !launcher || !messages || !quick || !form || !input) return;

  let liveAI = false;
  let state = freshState();
  let history = [];
  let memoryBookings = [];
  let memoryEnquiries = [];
  const entryParams = new URLSearchParams(window.location.search);
  const entrySource = entryParams.get('source') || '';
  const missedCallRef = entryParams.get('ref') || '';

  async function reportMissedCallStage(stage, details = {}) {
    if (entrySource !== 'missed-call' || !missedCallRef) return;
    try {
      await fetch(`/api/missed-calls/${encodeURIComponent(missedCallRef)}/engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, ...details }),
      });
    } catch { /* The public booking demo also works without the API server. */ }
  }

  function freshState() {
    return {
      flow: 'idle',
      type: null,
      date: null,
      slot: null,
      name: '',
      email: '',
      phone: '',
      enquiry: '',
      manageRef: '',
      rescheduleRef: '',
    };
  }

  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const iso = date => date.toISOString().slice(0, 10);
  const parseLocalDate = value => new Date(`${value}T12:00:00`);
  const formatDate = value => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseLocalDate(value));
  const formatLongDate = value => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseLocalDate(value));

  function openChat(action = '') {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    launcher.classList.add('hidden');
    launcher.setAttribute('aria-expanded', 'true');
    input.focus();
    if (!messages.children.length) {
      if (entrySource === 'missed-call') {
        state = freshState();
        append('assistant', 'Sorry we missed your call to ClearView Opticians. I can help you book an appointment now or answer a general enquiry.');
        setMainMenu();
        reportMissedCallStage('opened');
      } else {
        welcome();
      }
    }
    if (action === 'book') startBooking();
    if (action === 'agent') startAgentHandoff();
  }

  function closeChat() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.classList.remove('hidden');
    launcher.setAttribute('aria-expanded', 'false');
  }

  function append(role, content, { html = false } = {}) {
    const row = document.createElement('div');
    row.className = `public-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (html) bubble.innerHTML = content;
    else bubble.textContent = content;
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    history.push({ role: role === 'assistant' ? 'assistant' : 'user', content: bubble.textContent.slice(0, 1500) });
    history = history.slice(-12);
    return bubble;
  }

  function setQuick(items = []) {
    quick.innerHTML = '';
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.action = item.action || 'say';
      if (item.value !== undefined) button.dataset.value = String(item.value);
      quick.appendChild(button);
    });
  }

  async function assistant(content, options = {}) {
    typing.hidden = false;
    messages.scrollTop = messages.scrollHeight;
    await wait(options.fast ? 120 : 380);
    typing.hidden = true;
    append('assistant', content, { html: Boolean(options.html) });
    if (options.quick) setQuick(options.quick);
  }

  function welcome() {
    state = freshState();
    append('assistant', 'Hello! I’m the ClearView Optical Assistant. I can help you book an appointment, check availability or answer questions about visiting the practice.');
    setMainMenu();
  }

  function setMainMenu() {
    state.flow = 'idle';
    setQuick([
      { label: 'Book an appointment', action: 'start-booking' },
      { label: 'Check availability', action: 'check-availability' },
      { label: 'Change or cancel', action: 'manage-booking' },
      { label: 'Ask a question', action: 'ask-question' },
      { label: 'Speak to an optician', action: 'agent-handoff' },
    ]);
  }

  function typeOptions(action = 'select-type') {
    return Object.entries(APPOINTMENT_TYPES).map(([value, item]) => ({ label: item.label, action, value }));
  }

  async function startBooking() {
    state = freshState();
    state.flow = 'book_type';
    await assistant('What type of appointment would you like to book?', { quick: typeOptions('select-type') });
  }

  async function startAvailability() {
    state = freshState();
    state.flow = 'availability_type';
    await assistant('Which appointment would you like me to check availability for?', { quick: typeOptions('availability-select-type') });
  }

  function nextOpenDates(count = 6) {
    const dates = [];
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    while (dates.length < count) {
      if (date.getDay() !== 0) dates.push(iso(date));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }

  function dateOptions(action) {
    return nextOpenDates().map(value => ({ label: formatDate(value), action, value }));
  }

  function stringHash(value) {
    return Array.from(value).reduce((total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0, 0);
  }

  function availableSlots(type, date) {
    const config = APPOINTMENT_TYPES[type];
    const baseTimes = ['09:20', '10:30', '11:40', '13:20', '14:30', '15:40', '16:30'];
    const day = parseLocalDate(date).getDay();
    const people = config.people.filter(person => !(person === 'Helen Brooks' && day === 3));
    const slots = [];
    baseTimes.forEach((time, index) => {
      const person = people[Math.abs(stringHash(`${date}-${time}-${type}`)) % people.length];
      const unavailable = Math.abs(stringHash(`${date}-${time}-${person}`)) % 5 === 0;
      if (!unavailable && slots.length < 5) slots.push({ time, person });
    });
    return slots.length ? slots : [{ time: '10:30', person: people[0] }, { time: '14:30', person: people[0] }];
  }

  async function chooseType(value, availabilityOnly = false) {
    state.type = value;
    state.flow = availabilityOnly ? 'availability_date' : 'book_date';
    const item = APPOINTMENT_TYPES[value];
    await assistant(`${item.label} appointments are matched with ${item.people.join(item.people.length > 1 ? ', ' : '')}. Which day suits you?`, {
      quick: dateOptions(availabilityOnly ? 'availability-select-date' : 'select-date'),
    });
  }

  async function chooseDate(value, availabilityOnly = false) {
    state.date = value;
    state.flow = availabilityOnly ? 'availability_slots' : 'book_slot';
    const slots = availableSlots(state.type, value);
    const content = `I found ${slots.length} suitable times on <strong>${escapeHTML(formatLongDate(value))}</strong>. Choose a time below.`;
    await assistant(content, {
      html: true,
      quick: slots.map(slot => ({ label: `${slot.time} · ${slot.person}`, action: availabilityOnly ? 'availability-slot' : 'select-slot', value: `${slot.time}|${slot.person}` })),
    });
  }

  async function chooseSlot(value, availabilityOnly = false) {
    const [time, person] = value.split('|');
    state.slot = { time, person };
    if (availabilityOnly) {
      state.flow = 'availability_result';
      await assistant(`<strong>${escapeHTML(time)}</strong> with <strong>${escapeHTML(person)}</strong> is available on ${escapeHTML(formatLongDate(state.date))}. Would you like to book it?`, {
        html: true,
        quick: [
          { label: 'Book this time', action: 'continue-from-availability' },
          { label: 'Choose another day', action: 'availability-another-day' },
          { label: 'Main menu', action: 'main-menu' },
        ],
      });
      return;
    }
    state.flow = 'book_name';
    setQuick([]);
    await assistant(`Great — I’ve provisionally selected ${time} with ${person} on ${formatLongDate(state.date)}. What is your full name?`);
  }

  async function continueFromAvailability() {
    state.flow = 'book_name';
    setQuick([]);
    await assistant('Please enter your full name to continue with the booking.');
  }

  async function bookingDetails(text) {
    if (state.flow === 'book_name') {
      if (text.trim().length < 2) return assistant('Please enter the full name for the appointment.');
      state.name = text.trim();
      state.flow = 'book_email';
      return assistant(`Thanks, ${escapeHTML(state.name.split(' ')[0])}. What email address should receive the confirmation?`, { html: true });
    }
    if (state.flow === 'book_email') {
      if (!/^\S+@\S+\.\S+$/.test(text.trim())) return assistant('Please enter a valid email address, such as name@example.com.');
      state.email = text.trim();
      state.flow = 'book_phone';
      return assistant('And what mobile number should the practice use for appointment updates?');
    }
    if (state.flow === 'book_phone') {
      const digits = text.replace(/\D/g, '');
      if (digits.length < 10) return assistant('Please enter a valid UK mobile or contact number.');
      state.phone = text.trim();
      state.flow = 'book_confirm';
      const item = APPOINTMENT_TYPES[state.type];
      return assistant(`Please check the booking details:
        <div class="public-msg-card">
          <b>${escapeHTML(item.label)}</b>
          <span>${escapeHTML(formatLongDate(state.date))} at ${escapeHTML(state.slot.time)}</span>
          <span>${escapeHTML(state.slot.person)} · ${item.duration} minutes</span>
          <span>${escapeHTML(state.name)} · ${escapeHTML(state.email)}</span>
        </div>`, {
        html: true,
        quick: [
          { label: 'Confirm booking', action: 'confirm-booking' },
          { label: 'Change time', action: 'change-time' },
          { label: 'Start again', action: 'start-booking' },
        ],
      });
    }
  }

  function storedBookings() {
    try {
      const stored = JSON.parse(localStorage.getItem('pingstarPublicBookings') || '[]');
      memoryBookings = Array.isArray(stored) ? stored : [];
    } catch { /* Browser storage may be disabled; use memory for this session. */ }
    return memoryBookings;
  }

  function saveBookings(items) {
    memoryBookings = items;
    try { localStorage.setItem('pingstarPublicBookings', JSON.stringify(items)); }
    catch { /* Keep the demo booking in memory when storage is unavailable. */ }
  }

  function bookingReference() {
    return `OV-${String(Date.now()).slice(-6)}`;
  }

  async function confirmBooking() {
    const item = APPOINTMENT_TYPES[state.type];
    const booking = {
      reference: bookingReference(),
      status: 'Confirmed',
      appointmentType: item.label,
      type: state.type,
      date: state.date,
      time: state.slot.time,
      practitioner: state.slot.person,
      duration: item.duration,
      name: state.name,
      email: state.email,
      phone: state.phone,
      createdAt: new Date().toISOString(),
    };
    const bookings = storedBookings();
    if (state.rescheduleRef) {
      const old = bookings.find(entry => entry.reference.toUpperCase() === state.rescheduleRef.toUpperCase());
      if (old) old.status = 'Rescheduled';
    }
    bookings.push(booking);
    saveBookings(bookings);
    if (entrySource === 'missed-call' && missedCallRef) {
      try {
        const events = JSON.parse(localStorage.getItem('pingstar-public-booking-events-v1') || '[]');
        const nextEvents = Array.isArray(events) ? events.filter(item => item.sourceRef !== missedCallRef) : [];
        nextEvents.unshift({ sourceRef: missedCallRef, booking, createdAt: new Date().toISOString() });
        localStorage.setItem('pingstar-public-booking-events-v1', JSON.stringify(nextEvents.slice(0, 100)));
      } catch { /* Keep the booking in the normal public demo store. */ }
    }
    reportMissedCallStage('booked', { booking });
    state.flow = 'complete';
    state.manageRef = booking.reference;
    await assistant(`<strong>Appointment confirmed</strong>
      <div class="public-msg-card public-booking-confirmation">
        <b>${escapeHTML(booking.reference)}</b>
        <span>${escapeHTML(booking.appointmentType)}</span>
        <span>${escapeHTML(formatLongDate(booking.date))} at ${escapeHTML(booking.time)}</span>
        <span>${escapeHTML(booking.practitioner)}</span>
      </div>
      A production version would now send an email or WhatsApp confirmation and trigger reminder automations.`, {
      html: true,
      quick: [
        { label: 'Add to calendar', action: 'add-calendar', value: booking.reference },
        { label: 'Email confirmation demo', action: 'email-confirmation' },
        { label: 'Book another', action: 'start-booking' },
        { label: 'Main menu', action: 'main-menu' },
      ],
    });
  }

  function downloadCalendar(reference) {
    const booking = storedBookings().find(entry => entry.reference === reference);
    if (!booking) return;
    const start = new Date(`${booking.date}T${booking.time}:00`);
    const end = new Date(start.getTime() + booking.duration * 60000);
    const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pingstar AI//Booking Demo//EN', 'BEGIN:VEVENT',
      `UID:${booking.reference}@pingstar-demo`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${booking.appointmentType} - ${PRACTICE.name}`, `LOCATION:${PRACTICE.address}`,
      `DESCRIPTION:Demo appointment with ${booking.practitioner}. Reference ${booking.reference}.`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    link.download = `${booking.reference}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function startManage() {
    state = freshState();
    state.flow = 'manage_ref';
    setQuick([{ label: 'Use sample reference OV-DEMO-1042', action: 'sample-reference' }, { label: 'Main menu', action: 'main-menu' }]);
    await assistant('Enter your booking reference to view, change or cancel an appointment. You can use the sample reference for this demonstration.');
  }

  function sampleBooking() {
    const date = nextOpenDates(4)[2];
    return { reference: 'OV-DEMO-1042', status: 'Confirmed', appointmentType: 'Routine eye test', type: 'routine', date, time: '10:30', practitioner: 'Dr Amelia Reed', duration: 40, name: 'Demo Customer', email: 'demo@example.com', phone: '07123 000000' };
  }

  async function findBooking(reference) {
    const clean = reference.trim().toUpperCase();
    const booking = clean === 'OV-DEMO-1042' ? sampleBooking() : storedBookings().find(entry => entry.reference.toUpperCase() === clean);
    if (!booking) {
      return assistant('I could not find that reference in this browser. Try a booking created in this demo or use OV-DEMO-1042.', {
        quick: [{ label: 'Use sample reference', action: 'sample-reference' }, { label: 'Main menu', action: 'main-menu' }],
      });
    }
    state.manageRef = booking.reference;
    state.flow = 'manage_result';
    await assistant(`<strong>${escapeHTML(booking.status)} appointment</strong>
      <div class="public-msg-card">
        <b>${escapeHTML(booking.reference)}</b>
        <span>${escapeHTML(booking.appointmentType)}</span>
        <span>${escapeHTML(formatLongDate(booking.date))} at ${escapeHTML(booking.time)}</span>
        <span>${escapeHTML(booking.practitioner)}</span>
      </div>`, {
      html: true,
      quick: booking.status === 'Confirmed' ? [
        { label: 'Reschedule', action: 'reschedule-booking' },
        { label: 'Cancel appointment', action: 'cancel-booking' },
        { label: 'Main menu', action: 'main-menu' },
      ] : [{ label: 'Book a new appointment', action: 'start-booking' }, { label: 'Main menu', action: 'main-menu' }],
    });
  }

  async function cancelBooking() {
    if (state.manageRef !== 'OV-DEMO-1042') {
      const bookings = storedBookings();
      const booking = bookings.find(entry => entry.reference === state.manageRef);
      if (booking) booking.status = 'Cancelled';
      saveBookings(bookings);
    }
    state.flow = 'idle';
    await assistant(`The appointment ${escapeHTML(state.manageRef)} has been marked as cancelled in this demo. A production workflow could notify the practice and release the diary slot.`, {
      html: true,
      quick: [{ label: 'Book a new appointment', action: 'start-booking' }, { label: 'Main menu', action: 'main-menu' }],
    });
  }

  async function rescheduleBooking() {
    const ref = state.manageRef;
    state = freshState();
    state.rescheduleRef = ref;
    state.flow = 'book_type';
    await assistant(`Let’s find a replacement for ${escapeHTML(ref)}. What type of appointment do you need?`, { html: true, quick: typeOptions('select-type') });
  }

  async function startAgentHandoff() {
    state = freshState();
    state.flow = 'agent_question';
    setQuick([]);
    await assistant('Tell me what you would like to ask an optician. I can answer general appointment questions or create a demo handoff for anything that needs a qualified person.');
  }

  async function agentDetails(text) {
    if (state.flow === 'agent_question') {
      state.enquiry = text.trim();
      if (!state.enquiry) return assistant('Please type your question or enquiry.');
      if (isClinical(text)) {
        await assistant('I cannot assess symptoms or diagnose conditions. For sudden or severe eye symptoms, please seek urgent medical care. I can create a request for a qualified optometrist to contact you. What is your name?');
      } else {
        await assistant('I can pass that to the practice team. What is your name?');
      }
      state.flow = 'agent_name';
      return;
    }
    if (state.flow === 'agent_name') {
      state.name = text.trim();
      if (state.name.length < 2) return assistant('Please enter your name.');
      state.flow = 'agent_contact';
      return assistant('What email address or phone number should the team use to respond?');
    }
    if (state.flow === 'agent_contact') {
      state.email = text.trim();
      if (state.email.length < 5) return assistant('Please enter a valid contact method.');
      const reference = `ENQ-${String(Date.now()).slice(-6)}`;
      try {
        const stored = JSON.parse(localStorage.getItem('pingstarPublicEnquiries') || '[]');
        memoryEnquiries = Array.isArray(stored) ? stored : [];
      } catch { /* Use session memory. */ }
      memoryEnquiries.push({ reference, name: state.name, contact: state.email, enquiry: state.enquiry, createdAt: new Date().toISOString(), status: 'Queued' });
      try { localStorage.setItem('pingstarPublicEnquiries', JSON.stringify(memoryEnquiries)); }
      catch { /* Keep the demo enquiry in memory when storage is unavailable. */ }
      state.flow = 'complete';
      return assistant(`<strong>Optician handoff created</strong>
        <div class="public-msg-card">
          <b>${escapeHTML(reference)}</b>
          <span>Enquiry queued for the practice team</span>
          <span>Contact: ${escapeHTML(state.email)}</span>
        </div>
        This is a local demonstration. No real person has been contacted.`, {
        html: true,
        quick: [{ label: 'Book an appointment', action: 'start-booking' }, { label: 'Main menu', action: 'main-menu' }],
      });
    }
  }

  function isClinical(text) {
    return /pain|blur|vision loss|flashes|floaters|red eye|injury|chemical|infection|swelling|headache|diagnos|treat|condition/i.test(text);
  }

  function localAnswer(question) {
    const q = question.toLowerCase();
    if (/open|hours|close|saturday|sunday/.test(q)) return `ClearView is open ${PRACTICE.hours}.`;
    if (/where|address|location|parking|station/.test(q)) return `${PRACTICE.address}. ${PRACTICE.parking}`;
    if (/cost|price|how much|fee/.test(q)) return `Example demo prices are ${PRACTICE.prices.routine}, ${PRACTICE.prices.contact}. ${PRACTICE.prices.children}.`;
    if (/bring|prepare|before.*appointment/.test(q)) return 'Please bring your current glasses or contact lenses, a list of medicines, and details of any eye symptoms or previous treatment. Contact-lens wearers may be asked to bring their lens packaging.';
    if (/how long|duration/.test(q)) return 'A routine eye test usually takes about 40 minutes. Contact-lens checks take around 45 minutes and collections or adjustments around 20 minutes.';
    if (/contact lens/.test(q)) return 'Contact-lens checks are handled by Alex Morgan in this demo. I can show the next available appointments.';
    if (/child|children|kid/.test(q)) return "Children's appointments are available with Helen Brooks or Dr Amelia Reed. Eligibility for NHS-funded testing would be checked by the practice.";
    if (isClinical(question)) return 'I cannot diagnose or assess symptoms in chat. I can help arrange an urgent appointment or create a handoff to a qualified optometrist. For sudden or severe symptoms, seek urgent medical care.';
    return 'I can help with appointment availability, booking, opening hours, visit preparation, location, prices and requests for an optometrist. Could you give me a little more detail?';
  }

  async function askLiveAI(question) {
    if (!liveAI) return localAnswer(question);
    try {
      const response = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: history.slice(0, -1).slice(-8),
          context: {
            practice: PRACTICE,
            appointmentTypes: Object.values(APPOINTMENT_TYPES).map(item => ({ label: item.label, duration: item.duration, practitioners: item.people })),
          },
        }),
      });
      if (!response.ok) throw new Error('Live AI unavailable');
      const data = await response.json();
      return data.reply || localAnswer(question);
    } catch {
      return localAnswer(question);
    }
  }

  async function generalQuestion(question) {
    const answer = await askLiveAI(question);
    await assistant(answer, {
      quick: isClinical(question)
        ? [{ label: 'Request an optician handoff', action: 'agent-handoff' }, { label: 'Check urgent availability', action: 'urgent-booking' }]
        : [{ label: 'Book an appointment', action: 'start-booking' }, { label: 'Ask another question', action: 'ask-question' }, { label: 'Main menu', action: 'main-menu' }],
    });
    state.flow = 'idle';
  }

  async function handleText(text) {
    append('user', text);
    setQuick([]);
    if (['book_name', 'book_email', 'book_phone'].includes(state.flow)) return bookingDetails(text);
    if (state.flow === 'manage_ref') return findBooking(text);
    if (['agent_question', 'agent_name', 'agent_contact'].includes(state.flow)) return agentDetails(text);

    if (/book|appointment|eye test|contact lens check/i.test(text) && !/cancel|change|reschedul/i.test(text)) return startBooking();
    if (/available|availability|free slot|time slot/i.test(text)) return startAvailability();
    if (/cancel|change|reschedul|reference/i.test(text)) return startManage();
    if (/speak|agent|optician|human|person/i.test(text) && !isClinical(text)) return startAgentHandoff();
    return generalQuestion(text);
  }

  async function handleAction(action, value) {
    switch (action) {
      case 'start-booking': return startBooking();
      case 'check-availability': return startAvailability();
      case 'select-type': return chooseType(value, false);
      case 'availability-select-type': return chooseType(value, true);
      case 'select-date': return chooseDate(value, false);
      case 'availability-select-date': return chooseDate(value, true);
      case 'select-slot': return chooseSlot(value, false);
      case 'availability-slot': return chooseSlot(value, true);
      case 'continue-from-availability': return continueFromAvailability();
      case 'availability-another-day': state.flow = 'availability_date'; return assistant('Choose another day.', { quick: dateOptions('availability-select-date'), fast: true });
      case 'confirm-booking': return confirmBooking();
      case 'change-time': state.flow = 'book_date'; return assistant('Choose another day for this appointment.', { quick: dateOptions('select-date'), fast: true });
      case 'manage-booking': return startManage();
      case 'sample-reference': append('user', 'OV-DEMO-1042'); setQuick([]); return findBooking('OV-DEMO-1042');
      case 'cancel-booking': return cancelBooking();
      case 'reschedule-booking': return rescheduleBooking();
      case 'agent-handoff': return startAgentHandoff();
      case 'ask-question': state.flow = 'question'; setQuick([]); return assistant('What would you like to know? You can ask about opening hours, prices, visit preparation, location or appointment types.');
      case 'urgent-booking': state = freshState(); state.type = 'urgent'; state.flow = 'book_date'; return assistant('Choose a day for an urgent eye concern appointment. If symptoms are sudden or severe, seek urgent medical care rather than waiting for an online booking.', { quick: dateOptions('select-date') });
      case 'main-menu': state = freshState(); await assistant('How else can I help?', { fast: true }); return setMainMenu();
      case 'add-calendar': downloadCalendar(value); return assistant('A calendar file has been created for the demo appointment.', { quick: [{ label: 'Main menu', action: 'main-menu' }], fast: true });
      case 'email-confirmation': return assistant('Demo confirmation prepared. In production, this would be sent through the practice email or messaging integration.', { quick: [{ label: 'Main menu', action: 'main-menu' }], fast: true });
      default: return undefined;
    }
  }

  quick.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const label = button.textContent;
    const action = button.dataset.action;
    const value = button.dataset.value || '';
    if (!['main-menu', 'add-calendar', 'email-confirmation'].includes(action)) append('user', label);
    setQuick([]);
    handleAction(action, value);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    handleText(text);
  });

  launcher.addEventListener('click', () => openChat());
  document.getElementById('public-chat-close').addEventListener('click', closeChat);
  document.getElementById('public-chat-reset').addEventListener('click', () => {
    messages.innerHTML = '';
    history = [];
    state = freshState();
    welcome();
  });
  document.querySelectorAll('[data-public-chat-open]').forEach(button => {
    button.addEventListener('click', () => openChat(button.dataset.publicAction || ''));
  });

  if (entryParams.get('chat') === 'open') {
    window.setTimeout(() => openChat(entryParams.get('action') || ''), 250);
  }

  fetch('/api/health')
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => {
      liveAI = Boolean(data.aiConfigured);
      status.textContent = liveAI ? `Live AI · ${data.model || 'connected'}` : 'Demo AI · online';
    })
    .catch(() => { liveAI = false; status.textContent = 'Demo AI · online'; });
})();
