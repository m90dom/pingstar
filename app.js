(() => {
  'use strict';

  const TODAY = '2026-07-22';
  const STORAGE_CUSTOMERS = 'pingstar-demo-customers-v2';
  const STORAGE_APPOINTMENTS = 'pingstar-demo-appointments-v3';
  const STORAGE_PRODUCTS = 'pingstar-demo-products-v1';
  const STORAGE_SALES = 'pingstar-demo-sales-v1';
  const STORAGE_EMAILS = 'pingstar-demo-emails-v1';
  const STORAGE_CHAT = 'pingstar-demo-ai-chat-v1';
  const clone = obj => JSON.parse(JSON.stringify(obj));

  let customers = load(STORAGE_CUSTOMERS, window.DEMO_CUSTOMERS || []).map(c=>({...c,photos:Array.isArray(c.photos)?c.photos:[]}));
  let appointments = load(STORAGE_APPOINTMENTS, window.DEMO_APPOINTMENTS || []);
  let products = load(STORAGE_PRODUCTS, window.DEMO_PRODUCTS || []);
  let sales = load(STORAGE_SALES, window.DEMO_SALES || []);
  let emails = load(STORAGE_EMAILS, window.DEMO_EMAILS || []);
  const CHAT_GREETING = '<p>Hello — I’m your Pingstar AI practice copilot. I can search customers and clinical flags, check availability, prepare bookings, review appointment history and summarise the practice mailbox.</p><p>Try asking for <strong>today’s practice briefing</strong>.</p>';
  let chatHistory = load(STORAGE_CHAT, [{role:'assistant',html:CHAT_GREETING,at:new Date().toISOString()}]);
  let chatTyping = false;
  const optometrists = clone(window.DEMO_OPTOMETRISTS || []);
  let customerPage = 1;
  const pageSize = 10;
  let activeFilter = 'all';
  let searchTerm = '';
  let productCategoryFilter = 'all';
  let productSearchTerm = '';
  let calendarWeekStart = '2026-07-20';
  let calendarProviderFilter = 'all';
  let activeMailFolder = 'inbox';
  let activeEmailId = '';
  let emailSearchTerm = '';
  let emailCustomerFilter = '';
  let historySearchTerm = '';
  let historyStatusFilter = 'all';
  let historyProviderFilter = 'all';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const esc = str => String(str ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const dateObj = iso => new Date(`${iso}T12:00:00`);
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (iso, days) => { const d=dateObj(iso); d.setDate(d.getDate()+days); return isoDate(d); };
  const startOfWeek = iso => { const d=dateObj(iso); const day=d.getDay()||7; d.setDate(d.getDate()-day+1); return isoDate(d); };
  const daysFromToday = iso => Math.round((dateObj(iso) - dateObj(TODAY)) / 86400000);
  const formatDate = iso => dateObj(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const formatShort = iso => dateObj(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  const fullName = c => `${c.firstName} ${c.lastName}`;
  const initials = c => `${c.firstName[0]}${c.lastName[0]}`;
  const providerClass = name => name.includes('Amelia') ? 'amelia' : name.includes('Alex') ? 'alex' : 'helen';
  const timeToMinutes = time => { const [h,m]=time.split(':').map(Number); return h*60+m; };
  const minutesToTime = mins => `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2}).format(Number(value)||0);
  const productById = id => products.find(p=>p.id===id);
  const emailById = id => emails.find(e=>e.id===id);
  const customerSales = id => sales.filter(sale=>sale.customerId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const avatarHtml = (c, cls='avatar') => c.photos&&c.photos.length ? `<div class="${cls} photo-avatar"><img src="${c.photos[0].dataUrl}" alt="${esc(fullName(c))}" /></div>` : `<div class="${cls}">${esc(initials(c))}</div>`;

  function load(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)) || clone(fallback); }
    catch { return clone(fallback); }
  }

  function save(){
    try{
      localStorage.setItem(STORAGE_CUSTOMERS, JSON.stringify(customers));
      localStorage.setItem(STORAGE_APPOINTMENTS, JSON.stringify(appointments));
      localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_SALES, JSON.stringify(sales));
      localStorage.setItem(STORAGE_EMAILS, JSON.stringify(emails));
    }catch(error){
      console.warn('Browser storage is unavailable; changes will remain for this session only.',error);
    }
  }

  function toast(message){
    const el=$('#toast'); el.textContent=message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function recallState(c){
    const d=daysFromToday(c.nextRecall);
    if(d<0) return {key:'overdue',label:`${Math.abs(d)} days overdue`,cls:'red'};
    if(d<=30) return {key:'due30',label:`Due in ${d} days`,cls:'amber'};
    return {key:'later',label:formatDate(c.nextRecall),cls:'green'};
  }

  function getCustomer(id){ return customers.find(c=>c.id===id); }
  function getProvider(name){ return optometrists.find(p=>p.name===name); }
  function upcomingAppointments(){
    return appointments.filter(a=>daysFromToday(a.date)>=0&&!['Completed','Cancelled','No-show'].includes(a.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  }

  function historicalAppointments(){
    return appointments.filter(a=>daysFromToday(a.date)<0||['Completed','Cancelled','No-show'].includes(a.status)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  }

  function appointmentStatusClass(status){
    if(status==='Completed'||status==='Confirmed')return 'green';
    if(status==='Cancelled')return 'red';
    return 'amber';
  }

  function isProviderWorking(provider, date, time){
    if(!provider) return false;
    const day=dateObj(date).getDay();
    const mins=timeToMinutes(time);
    return provider.workingDays.includes(day) && mins>=timeToMinutes(provider.start) && mins<timeToMinutes(provider.end);
  }

  function providerIsSuitable(provider, type){
    return Boolean(provider && provider.specialties.includes(type));
  }

  function providerIsBooked(providerName, date, time){
    return appointments.some(a=>a.optometrist===providerName && a.date===date && a.time===time && a.status!=='Cancelled');
  }

  function customerIsBooked(customerId, date, time){
    return appointments.some(a=>a.customerId===customerId && a.date===date && a.time===time && a.status!=='Cancelled');
  }

  function providerStatus(provider, date, time, type){
    if(!providerIsSuitable(provider,type)) return {available:false,reason:'Not qualified for this appointment type'};
    if(!isProviderWorking(provider,date,time)) return {available:false,reason:'Not working at this date and time'};
    if(providerIsBooked(provider.name,date,time)) return {available:false,reason:'Already booked'};
    return {available:true,reason:'Available and suitable'};
  }

  function suitableAvailableProviders(date,time,type){
    return optometrists.filter(p=>providerStatus(p,date,time,type).available);
  }

  function navigate(view){
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));
    const titles={dashboard:'Practice overview',customers:'Customer records',appointments:'Optometrist calendar',products:'Products & sales',mailbox:'Practice mailbox',missedcalls:'Missed-call recovery',automations:'Workflow automations',assistant:'AI Chatbot',connections:'Connections',settings:'Demo settings'};
    $('#page-title').textContent=titles[view]||'Pingstar AI';
    if(view==='customers') renderCustomers();
    if(view==='appointments') renderAppointments();
    if(view==='products') renderProducts();
    if(view==='mailbox') renderMailbox();
    if(view==='assistant') setTimeout(()=>$('#chat-input').focus(),50);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderDashboard(){
    const overdue=customers.filter(c=>daysFromToday(c.nextRecall)<0 && c.status==='Active');
    const due=customers.filter(c=>daysFromToday(c.nextRecall)>=0 && daysFromToday(c.nextRecall)<=30 && c.status==='Active');
    const bookings=upcomingAppointments().filter(a=>daysFromToday(a.date)<=30);
    const revenue=sales.reduce((sum,sale)=>sum+(Number(sale.unitPrice)||0)*(Number(sale.quantity)||0),0);
    const profit=sales.reduce((sum,sale)=>{const product=productById(sale.productId);return sum+(((Number(sale.unitPrice)||0)-(product?Number(product.costPrice)||0:0))*(Number(sale.quantity)||0));},0);
    $('#stat-total').textContent=customers.length;
    $('#stat-overdue').textContent=overdue.length;
    $('#stat-due').textContent=due.length;
    $('#stat-bookings').textContent=bookings.length;
    $('#stat-retail-revenue').textContent=money(revenue);
    $('#stat-retail-profit').textContent=money(profit);

    const recall=[...overdue,...due].sort((a,b)=>a.nextRecall.localeCompare(b.nextRecall)).slice(0,8);
    $('#recall-list').innerHTML=recall.length?recall.map(c=>{
      const state=recallState(c);
      return `<div class="recall-row">${avatarHtml(c)}<div><div class="row-title">${esc(fullName(c))}</div><div class="row-sub">Last exam ${formatDate(c.lastEyeExam)} · ${esc(c.preferredContact)} preferred</div></div><span class="badge ${state.cls}">${esc(state.label)}</span></div>`;
    }).join(''):'<div class="empty">No recall actions.</div>';

    const todayCalls=customers.filter(c=>c.lastContact.date===TODAY).slice(0,6);
    $('#today-calls').innerHTML=todayCalls.length?todayCalls.map(c=>`<div class="activity-row">${avatarHtml(c)}<div><div class="row-title">${esc(fullName(c))}</div><div class="row-sub">${esc(c.lastContact.reason)}</div></div><span class="badge blue">${esc(c.lastContact.type)}</span></div>`).join(''):'<div class="empty">No calls logged today.</div>';

    const next=upcomingAppointments().slice(0,5);
    $('#next-appointments').innerHTML=next.map(a=>{const c=getCustomer(a.customerId);return `<div class="appointment-row"><div class="date-tile"><strong>${dateObj(a.date).getDate()}</strong><span>${dateObj(a.date).toLocaleString('en-GB',{month:'short'})}</span></div><div><div class="row-title">${esc(c?fullName(c):'Blocked time')}</div><div class="row-sub">${esc(a.time)} · ${esc(a.type)} · ${esc(a.optometrist)}</div></div><span class="badge ${a.status==='Confirmed'?'green':'amber'}">${esc(a.status)}</span></div>`}).join('')||'<div class="empty">No upcoming appointments.</div>';

    const recent=[...sales].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
    $('#dashboard-sales').innerHTML=recent.length?recent.map(sale=>{const c=getCustomer(sale.customerId),product=productById(sale.productId);return `<button class="sale-mini" data-dashboard-sale-customer="${esc(sale.customerId)}"><span><strong>${esc(product?product.name:'Unknown product')}</strong><small>${esc(c?fullName(c):'Unknown customer')} · ${formatShort(sale.date)}</small></span><b>${money((sale.unitPrice||0)*(sale.quantity||0))}</b></button>`}).join(''):'<div class="empty">No product sales recorded.</div>';
  }

  function filteredCustomers(){
    let list=[...customers];
    if(activeFilter==='overdue') list=list.filter(c=>daysFromToday(c.nextRecall)<0);
    if(activeFilter==='due30') list=list.filter(c=>daysFromToday(c.nextRecall)>=0&&daysFromToday(c.nextRecall)<=30);
    if(activeFilter==='recall') list=list.filter(c=>daysFromToday(c.nextRecall)<=30);
    if(activeFilter==='calledToday') list=list.filter(c=>c.lastContact.date===TODAY);
    if(activeFilter==='upcoming') { const ids=new Set(upcomingAppointments().map(a=>a.customerId)); list=list.filter(c=>ids.has(c.id)); }
    if(searchTerm){
      const q=searchTerm.toLowerCase();
      list=list.filter(c=>[fullName(c),c.phone,c.email,c.id,c.address,c.notes,...(c.clinicalFlags||[])].some(v=>String(v).toLowerCase().includes(q)));
    }
    return list.sort((a,b)=>a.lastName.localeCompare(b.lastName));
  }

  function renderCustomers(){
    const list=filteredCustomers();
    const pages=Math.max(1,Math.ceil(list.length/pageSize));
    customerPage=Math.min(customerPage,pages);
    const page=list.slice((customerPage-1)*pageSize,customerPage*pageSize);
    $('#customers-body').innerHTML=page.map(c=>{
      const state=recallState(c);
      return `<tr><td><div class="customer-cell">${avatarHtml(c)}<div><strong>${esc(fullName(c))}</strong><span>${esc(c.id)}</span></div></div></td><td>${esc(c.phone)}<br><span class="muted">${esc(c.email)}</span></td><td>${formatDate(c.lastEyeExam)}</td><td><span class="badge ${state.cls}">${esc(state.label)}</span></td><td>${formatDate(c.lastContact.date)}<br><span class="muted">${esc(c.lastContact.type)}</span></td><td><span class="badge ${c.status==='Active'?'green':'red'}">${esc(c.status)}</span></td><td><div class="table-actions"><button class="quick-action call" data-contact="call" data-contact-customer="${esc(c.id)}" title="Call ${esc(fullName(c))}">Call</button><button class="quick-action email" data-contact="email" data-contact-customer="${esc(c.id)}" title="Email ${esc(fullName(c))}">Email</button><button class="quick-action whatsapp" data-contact="whatsapp" data-contact-customer="${esc(c.id)}" title="WhatsApp ${esc(fullName(c))}">WhatsApp</button><button class="table-action" data-view-customer="${esc(c.id)}">View</button></div></td></tr>`;
    }).join('') || '<tr><td colspan="7"><div class="empty">No customers match this search.</div></td></tr>';
    $('#customer-count').textContent=`Showing ${page.length} of ${list.length} customers`;
    $('#pagination').innerHTML=Array.from({length:pages},(_,i)=>`<button class="${i+1===customerPage?'active':''}" data-page="${i+1}">${i+1}</button>`).join('');
  }

  function showCustomer(id){
    const c=getCustomer(id); if(!c)return;
    const customerAppointments=appointments.filter(a=>a.customerId===id);
    const aps=customerAppointments.filter(a=>daysFromToday(a.date)>=0&&!['Completed','Cancelled','No-show'].includes(a.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const history=customerAppointments.filter(a=>daysFromToday(a.date)<0||['Completed','Cancelled','No-show'].includes(a.status)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    const purchases=customerSales(id);
    const spend=purchases.reduce((sum,sale)=>sum+(Number(sale.unitPrice)||0)*(Number(sale.quantity)||0),0);
    const photos=Array.isArray(c.photos)?c.photos:[];
    $('#customer-dialog-title').textContent=fullName(c);
    $('#customer-dialog-body').innerHTML=`
      <div class="customer-profile-strip">
        <div class="customer-primary-photo">${photos.length?`<img src="${photos[0].dataUrl}" alt="${esc(fullName(c))}" />`:`<span>${esc(initials(c))}</span>`}</div>
        <div><strong>${esc(fullName(c))}</strong><small>${esc(c.id)} · ${esc(c.status)}</small><p>${esc(c.phone)} · ${esc(c.email)}</p></div>
        <label class="secondary-btn upload-photo-btn">+ Upload photo<input type="file" accept="image/*" data-photo-input data-photo-customer="${esc(c.id)}" /></label>
      </div>
      <div class="contact-action-bar">
        <button class="contact-btn call" data-contact="call" data-contact-customer="${esc(c.id)}">☎ Call</button>
        <button class="contact-btn email" data-contact="email" data-contact-customer="${esc(c.id)}">✉ Email app</button>
        <button class="contact-btn whatsapp" data-contact="whatsapp" data-contact-customer="${esc(c.id)}">◉ WhatsApp</button>
        <button class="contact-btn mailbox" data-mailbox-customer="${esc(c.id)}">▤ View mailbox</button>
        <button class="contact-btn edit" data-edit-customer="${esc(c.id)}">✎ Edit record</button>
      </div>
      <p class="contact-note">These contact actions open the device’s phone, email or WhatsApp application. The mailbox button opens fictional messages stored in this demo. ${c.communicationConsent?'Communication consent is recorded.':'No email or messaging consent is recorded for this customer.'}</p>
      <div class="record-grid">
        <div class="record-card"><h3>Contact details</h3><dl><dt>Customer ID</dt><dd>${esc(c.id)}</dd><dt>Date of birth</dt><dd>${formatDate(c.dob)}</dd><dt>Phone</dt><dd>${esc(c.phone)}</dd><dt>Email</dt><dd>${esc(c.email)}</dd><dt>Address</dt><dd>${esc(c.address)}</dd><dt>Preference</dt><dd>${esc(c.preferredContact)}</dd></dl></div>
        <div class="record-card"><h3>Recall & contact</h3><dl><dt>Last exam</dt><dd>${formatDate(c.lastEyeExam)}</dd><dt>Next recall</dt><dd>${formatDate(c.nextRecall)}</dd><dt>Last contact</dt><dd>${formatDate(c.lastContact.date)} · ${esc(c.lastContact.type)}</dd><dt>Reason</dt><dd>${esc(c.lastContact.reason)}</dd><dt>Outcome</dt><dd>${esc(c.lastContact.outcome)}</dd><dt>Consent</dt><dd>${c.communicationConsent?'Yes':'No'}</dd></dl></div>
        <div class="record-card full"><h3>Optical prescription</h3><table class="prescription-table"><thead><tr><th>Eye</th><th>Sphere</th><th>Cylinder</th><th>Axis</th><th>Add</th></tr></thead><tbody><tr><td>Right</td><td>${c.prescription.right.sphere}</td><td>${c.prescription.right.cylinder}</td><td>${c.prescription.right.axis||'-'}</td><td>${c.prescription.right.add||'-'}</td></tr><tr><td>Left</td><td>${c.prescription.left.sphere}</td><td>${c.prescription.left.cylinder}</td><td>${c.prescription.left.axis||'-'}</td><td>${c.prescription.left.add||'-'}</td></tr></tbody></table></div>
        <div class="record-card"><h3>Clinical conditions and flags</h3><p>${c.clinicalFlags&&c.clinicalFlags.length?c.clinicalFlags.map(x=>`<span class="badge amber">${esc(x)}</span>`).join(' '):'None recorded'}</p><button class="text-btn record-edit-link" data-edit-customer="${esc(c.id)}">Edit conditions</button></div>
        <div class="record-card"><h3>Clinical and customer notes</h3><p class="preserve-lines">${esc(c.notes||'No notes recorded.')}</p><button class="text-btn record-edit-link" data-edit-customer="${esc(c.id)}">Edit notes</button></div>
        <div class="record-card full"><div class="record-heading-row"><h3>Customer photos</h3><span>${photos.length} of 4 uploaded</span></div>${photos.length?`<div class="photo-gallery">${photos.map(photo=>`<figure><img src="${photo.dataUrl}" alt="Uploaded customer photo" /><figcaption>${esc(photo.name||'Customer photo')}<button data-remove-photo="${esc(photo.id)}" data-photo-customer="${esc(c.id)}" aria-label="Remove photo">×</button></figcaption></figure>`).join('')}</div>`:'<p>No customer photos uploaded. Use “Upload photo” above to add a picture to this contact card.</p>'}</div>
        <div class="record-card full"><div class="record-heading-row"><h3>Upcoming appointments</h3><strong>${aps.length} booked</strong></div>${aps.length?aps.map(a=>`<div class="upcoming-record-row"><span><strong>${formatDate(a.date)} at ${esc(a.time)}</strong><small>${esc(a.type)} with ${esc(a.optometrist)}</small></span><span class="badge ${appointmentStatusClass(a.status)}">${esc(a.status)}</span></div>`).join(''):'<p>No upcoming appointments recorded.</p>'}<button class="primary-btn" data-book-customer="${esc(c.id)}">Book appointment</button></div>
        <div class="record-card full"><div class="record-heading-row"><h3>Appointment history</h3><strong>${history.length} past visits</strong></div>${history.length?`<div class="customer-history-list">${history.map(a=>`<article class="customer-history-row"><div class="history-date-tile"><strong>${dateObj(a.date).getDate()}</strong><span>${dateObj(a.date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</span></div><div class="history-main"><div class="history-title-row"><strong>${esc(a.type)}</strong><span class="badge ${appointmentStatusClass(a.status)}">${esc(a.status)}</span></div><small>${esc(a.time)} · ${esc(a.optometrist)}</small>${a.outcome?`<p><b>Outcome:</b> ${esc(a.outcome)}</p>`:''}${a.notes?`<p class="preserve-lines"><b>Notes:</b> ${esc(a.notes)}</p>`:''}${a.nextRecall?`<small>Next recall: ${formatDate(a.nextRecall)}</small>`:''}<div class="history-actions"><button class="text-btn" data-edit-appointment="${esc(a.id)}">Edit history</button><button class="text-btn" data-rebook-appointment="${esc(a.id)}">Rebook</button></div></div></article>`).join('')}</div>`:'<p>No past appointment history recorded.</p>'}</div>
      </div>`;
    if(!$('#customer-dialog').open)$('#customer-dialog').showModal();
  }

  function openEditCustomer(id){
    const c=getCustomer(id); if(!c)return;
    $('#edit-customer-id').value=c.id;
    $('#edit-first-name').value=c.firstName;
    $('#edit-last-name').value=c.lastName;
    $('#edit-phone').value=c.phone;
    $('#edit-email').value=c.email;
    $('#edit-address').value=c.address;
    $('#edit-preferred-contact').value=c.preferredContact;
    $('#edit-status').value=c.status;
    $('#edit-clinical-flags').value=(c.clinicalFlags||[]).join(', ');
    $('#edit-notes').value=c.notes||'';
    $('#edit-consent').checked=Boolean(c.communicationConsent);
    if($('#customer-dialog').open)$('#customer-dialog').close();
    $('#edit-customer-dialog').showModal();
  }

  function saveCustomerEdit(){
    const id=$('#edit-customer-id').value;
    const c=getCustomer(id); if(!c)return;
    c.firstName=$('#edit-first-name').value.trim();
    c.lastName=$('#edit-last-name').value.trim();
    c.phone=$('#edit-phone').value.trim();
    c.email=$('#edit-email').value.trim();
    c.address=$('#edit-address').value.trim();
    c.preferredContact=$('#edit-preferred-contact').value;
    c.status=$('#edit-status').value;
    c.clinicalFlags=$('#edit-clinical-flags').value.split(',').map(v=>v.trim()).filter(Boolean);
    c.notes=$('#edit-notes').value.trim();
    c.communicationConsent=$('#edit-consent').checked;
    save(); renderAll();
    $('#edit-customer-dialog').close();
    toast('Customer record, conditions and notes updated.');
    showCustomer(id);
  }

  function compressPhoto(file,maxSize=720,quality=.76){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Unable to read image'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Unable to load image'));
        img.onload=()=>{
          const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          const context=canvas.getContext('2d');
          context.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',quality));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadCustomerPhoto(customerId,file){
    const c=getCustomer(customerId); if(!c||!file)return;
    c.photos=Array.isArray(c.photos)?c.photos:[];
    if(c.photos.length>=4){toast('This demo allows up to four photos per customer.');return;}
    if(!file.type.startsWith('image/')){toast('Choose an image file.');return;}
    if(file.size>10*1024*1024){toast('Choose an image smaller than 10 MB.');return;}
    try{
      const dataUrl=await compressPhoto(file);
      c.photos.push({id:`PHOTO-${Date.now()}`,name:file.name,uploadedAt:new Date().toISOString(),dataUrl});
      save();renderCustomers();showCustomer(customerId);toast('Customer photo uploaded.');
    }catch(error){toast(error.message||'Unable to upload photo.');}
  }

  function removeCustomerPhoto(customerId,photoId){
    const c=getCustomer(customerId); if(!c)return;
    c.photos=(c.photos||[]).filter(photo=>photo.id!==photoId);
    save();renderCustomers();showCustomer(customerId);toast('Photo removed.');
  }

  function whatsAppNumber(phone){
    let digits=String(phone||'').replace(/\D/g,'');
    if(digits.startsWith('00'))digits=digits.slice(2);
    else if(digits.startsWith('0'))digits=`44${digits.slice(1)}`;
    return digits;
  }

  function contactCustomer(id,channel){
    const c=getCustomer(id); if(!c)return;
    if((channel==='email'||channel==='whatsapp')&&!c.communicationConsent){
      const proceed=confirm(`${fullName(c)} does not have email or messaging consent recorded. Open the contact app anyway?`);
      if(!proceed)return;
    }
    const subject=encodeURIComponent('Your eye care appointment');
    const message=encodeURIComponent(`Hello ${c.firstName}, this is Pingstar Opticians. We are getting in touch regarding your eye care and appointments. Please reply when convenient.`);
    if(channel==='email'){
      window.location.href=`mailto:${c.email}?subject=${subject}&body=${message}`;
      toast('Opening your email application.');
      return;
    }
    if(channel==='whatsapp'){
      const number=whatsAppNumber(c.phone);
      window.open(`https://wa.me/${number}?text=${message}`,'_blank','noopener');
      toast('Opening WhatsApp.');
      return;
    }
    window.location.href=`tel:${c.phone.replace(/\s/g,'')}`;
    toast('Opening the phone dialler.');
  }

  function calendarTimes(){
    const result=[];
    for(let mins=9*60;mins<=17*60;mins+=30)result.push(minutesToTime(mins));
    return result;
  }

  function nextAvailableForProvider(provider, type='Routine eye examination', fromDate=TODAY){
    for(let dayOffset=0;dayOffset<21;dayOffset++){
      const d=addDays(fromDate,dayOffset);
      for(const time of calendarTimes()){
        if(providerStatus(provider,d,time,type).available && (d>TODAY || time>='09:00')) return {date:d,time};
      }
    }
    return null;
  }

  function renderTeam(){
    $('#optometrist-team').innerHTML=optometrists.map(p=>{
      const next=nextAvailableForProvider(p);
      const active=calendarProviderFilter===p.name;
      return `<button class="optometrist-card ${providerClass(p.name)} ${active?'active':''}" data-provider-filter="${esc(p.name)}"><span class="provider-avatar">${esc(p.initials)}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.role)}</small><em>${next?`Next: ${formatShort(next.date)} ${next.time}`:'No availability'}</em></span></button>`;
    }).join('');
  }

  function renderCalendar(){
    const days=Array.from({length:6},(_,i)=>addDays(calendarWeekStart,i));
    const times=calendarTimes();
    const end=days[5];
    $('#calendar-week-label').textContent=`${formatShort(calendarWeekStart)} – ${formatDate(end)}`;
    const headers=`<div class="calendar-corner">Time</div>${days.map(d=>`<div class="calendar-day ${d===TODAY?'today':''}"><strong>${dateObj(d).toLocaleDateString('en-GB',{weekday:'short'})}</strong><span>${formatShort(d)}</span></div>`).join('')}`;
    const rows=times.map(time=>{
      const cells=days.map(date=>renderCalendarCell(date,time)).join('');
      return `<div class="calendar-time">${time}</div>${cells}`;
    }).join('');
    $('#calendar-grid').innerHTML=headers+rows;
  }

  function renderCalendarCell(date,time){
    const visibleProviders=calendarProviderFilter==='all'?optometrists:optometrists.filter(p=>p.name===calendarProviderFilter);
    const working=visibleProviders.filter(p=>isProviderWorking(p,date,time));
    const bookings=appointments.filter(a=>a.date===date&&a.time===time&&visibleProviders.some(p=>p.name===a.optometrist));
    const free=working.filter(p=>!providerIsBooked(p.name,date,time));
    const classes=['calendar-cell'];
    if(date===TODAY)classes.push('today-column');
    if(!working.length)classes.push('closed');
    let html=bookings.map(a=>{
      const c=getCustomer(a.customerId);
      return `<button class="calendar-booking ${providerClass(a.optometrist)}" data-calendar-customer="${esc(a.customerId)}" title="${esc(a.type)} with ${esc(a.optometrist)}"><strong>${esc(c?fullName(c):a.type)}</strong><span>${esc(a.optometrist.replace('Dr ',''))} · ${esc(a.type)}</span></button>`;
    }).join('');
    if(free.length){
      const provider=calendarProviderFilter==='all'?'':free[0].name;
      html+=`<button class="calendar-available" data-calendar-slot="1" data-slot-date="${date}" data-slot-time="${time}" data-slot-provider="${esc(provider)}" title="Book an available slot">+ ${calendarProviderFilter==='all'?`${free.length} free`:'Available'}</button>`;
    } else if(!bookings.length && working.length){
      html='<span class="slot-unavailable">Booked</span>';
    }
    return `<div class="${classes.join(' ')}">${html}</div>`;
  }

  function nextAvailableSlots(limit=8){
    const results=[];
    for(let dayOffset=0;dayOffset<14 && results.length<limit;dayOffset++){
      const date=addDays(TODAY,dayOffset);
      for(const time of calendarTimes()){
        for(const p of optometrists){
          if(calendarProviderFilter!=='all'&&p.name!==calendarProviderFilter)continue;
          if(providerStatus(p,date,time,'Routine eye examination').available){
            results.push({date,time,provider:p});
            if(results.length>=limit)break;
          }
        }
        if(results.length>=limit)break;
      }
    }
    return results;
  }

  function renderAvailability(){
    const slots=nextAvailableSlots();
    $('#available-slots').innerHTML=slots.length?slots.map(s=>`<button class="slot ${providerClass(s.provider.name)}" data-slot-date="${s.date}" data-slot-time="${s.time}" data-slot-provider="${esc(s.provider.name)}"><span><strong>${formatShort(s.date)} · ${s.time}</strong><small>${esc(s.provider.name)} · ${esc(s.provider.room)}</small></span><b>Book</b></button>`).join(''):'<div class="empty">No available slots found.</div>';
  }

  function renderAppointmentList(){
    const list=upcomingAppointments().filter(a=>calendarProviderFilter==='all'||a.optometrist===calendarProviderFilter).slice(0,10);
    $('#appointments-list').innerHTML=list.length?list.map(a=>{const c=getCustomer(a.customerId);return `<button class="diary-card" data-calendar-customer="${esc(a.customerId)}"><div class="diary-time">${esc(a.time)}</div><div><h3>${esc(c?fullName(c):a.type)}</h3><p>${formatShort(a.date)} · ${esc(a.type)}<br>${esc(a.optometrist)}</p></div><span class="badge ${a.status==='Confirmed'?'green':'amber'}">${esc(a.status)}</span></button>`}).join(''):'<div class="empty">No upcoming appointments.</div>';
  }

  function renderAppointments(){
    const select=$('#calendar-provider-filter');
    if(!select.dataset.ready){
      select.innerHTML='<option value="all">All practitioners</option>'+optometrists.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
      select.dataset.ready='1';
    }
    select.value=calendarProviderFilter;
    renderTeam();
    renderCalendar();
    renderAvailability();
    renderAppointmentList();
    renderAppointmentHistory();
  }

  function filteredAppointmentHistory(){
    const q=historySearchTerm.toLowerCase();
    return historicalAppointments().filter(a=>{
      const customer=getCustomer(a.customerId);
      const matchesStatus=historyStatusFilter==='all'||a.status===historyStatusFilter;
      const matchesProvider=historyProviderFilter==='all'||a.optometrist===historyProviderFilter;
      const haystack=[customer?fullName(customer):'',a.customerId,a.type,a.optometrist,a.status,a.outcome||'',a.notes||''].join(' ').toLowerCase();
      return matchesStatus&&matchesProvider&&(!q||haystack.includes(q));
    });
  }

  function renderAppointmentHistory(){
    const providerSelect=$('#history-provider-filter');
    if(!providerSelect.dataset.ready){
      providerSelect.innerHTML='<option value="all">All practitioners</option>'+optometrists.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
      providerSelect.dataset.ready='1';
    }
    providerSelect.value=historyProviderFilter;
    $('#history-status-filter').value=historyStatusFilter;
    const list=filteredAppointmentHistory();
    const completed=list.filter(a=>a.status==='Completed').length;
    const cancelled=list.filter(a=>a.status==='Cancelled').length;
    const missed=list.filter(a=>a.status==='No-show').length;
    $('#appointment-history-summary').innerHTML=`<span><strong>${list.length}</strong> matching visits</span><span><strong>${completed}</strong> completed</span><span><strong>${cancelled}</strong> cancelled</span><span><strong>${missed}</strong> no-shows</span>`;
    $('#appointment-history-list').innerHTML=list.length?list.slice(0,100).map(a=>{
      const customer=getCustomer(a.customerId);
      return `<article class="practice-history-row"><div class="history-date-tile"><strong>${dateObj(a.date).getDate()}</strong><span>${dateObj(a.date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</span></div><div class="practice-history-customer"><button data-history-customer="${esc(a.customerId)}">${esc(customer?fullName(customer):a.customerId)}</button><small>${esc(a.type)} · ${esc(a.time)}</small></div><div class="practice-history-provider"><strong>${esc(a.optometrist)}</strong><small>${esc(a.outcome||'No outcome recorded')}</small></div><span class="badge ${appointmentStatusClass(a.status)}">${esc(a.status)}</span><div class="history-actions"><button class="text-btn" data-edit-appointment="${esc(a.id)}">Edit</button><button class="text-btn" data-rebook-appointment="${esc(a.id)}">Rebook</button></div></article>`;
    }).join(''):'<div class="empty">No appointment-history records match these filters.</div>';
  }

  function openEditAppointmentHistory(id){
    const appointment=appointments.find(a=>a.id===id); if(!appointment)return;
    const customer=getCustomer(appointment.customerId);
    $('#history-appointment-id').value=appointment.id;
    $('#history-appointment-context').innerHTML=`<strong>${esc(customer?fullName(customer):appointment.customerId)}</strong><span>${formatDate(appointment.date)} at ${esc(appointment.time)} · ${esc(appointment.type)} with ${esc(appointment.optometrist)}</span>`;
    $('#history-edit-status').value=['Completed','Cancelled','No-show'].includes(appointment.status)?appointment.status:'Completed';
    $('#history-edit-outcome').value=appointment.outcome||'';
    $('#history-edit-notes').value=appointment.notes||'';
    $('#history-edit-recall').value=appointment.nextRecall||'';
    if($('#customer-dialog').open)$('#customer-dialog').close();
    if(!$('#appointment-history-dialog').open)$('#appointment-history-dialog').showModal();
  }

  function saveAppointmentHistory(){
    const appointment=appointments.find(a=>a.id===$('#history-appointment-id').value); if(!appointment)return;
    appointment.status=$('#history-edit-status').value;
    appointment.outcome=$('#history-edit-outcome').value.trim();
    appointment.notes=$('#history-edit-notes').value.trim();
    appointment.nextRecall=$('#history-edit-recall').value;
    const customer=getCustomer(appointment.customerId);
    if(customer&&appointment.status==='Completed'){
      if(!customer.lastEyeExam||appointment.date>customer.lastEyeExam)customer.lastEyeExam=appointment.date;
      if(appointment.nextRecall)customer.nextRecall=appointment.nextRecall;
    }
    save();renderAll();$('#appointment-history-dialog').close();toast('Appointment history updated.');
  }

  function nextSlotForAppointment(appointment){
    const preferred=getProvider(appointment.optometrist);
    const ordered=preferred?[preferred,...optometrists.filter(p=>p.name!==preferred.name)]:optometrists;
    for(let offset=1;offset<=45;offset++){
      const date=addDays(TODAY,offset);
      for(const time of calendarTimes()){
        for(const provider of ordered){
          if(providerStatus(provider,date,time,appointment.type).available)return {date,time,provider:provider.name};
        }
      }
    }
    return null;
  }

  function rebookHistoricalAppointment(id){
    const appointment=appointments.find(a=>a.id===id); if(!appointment)return;
    const slot=nextSlotForAppointment(appointment);
    if(slot)openBooking(appointment.customerId,slot.date,slot.time,slot.provider,appointment.type);
    else openBooking(appointment.customerId,'',appointment.time,'',appointment.type);
  }

  function populateCustomerSelect(selected=''){
    $('#appointment-customer').innerHTML=customers.filter(c=>c.status==='Active').sort((a,b)=>fullName(a).localeCompare(fullName(b))).map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(fullName(c))} (${esc(c.id)})</option>`).join('');
  }

  function updateProviderOptions(preferred=''){
    const date=$('#appointment-date').value;
    const time=$('#appointment-time').value;
    const type=$('#appointment-type').value;
    const select=$('#appointment-optometrist');
    const statuses=optometrists.map(p=>({provider:p,...providerStatus(p,date,time,type)}));
    const available=statuses.filter(s=>s.available);
    select.innerHTML=available.length?available.map((s,i)=>`<option value="${esc(s.provider.name)}" ${(preferred===s.provider.name||(!preferred&&i===0))?'selected':''}>${esc(s.provider.name)} — ${esc(s.provider.role)}${i===0?' (recommended)':''}</option>`).join(''):'<option value="">No suitable practitioner available</option>';
    select.disabled=!available.length;
    $('#confirm-booking').disabled=!available.length;
    $('#provider-recommendation').innerHTML=`<strong>${available.length?`${available.length} suitable practitioner${available.length===1?'':'s'} available`:'No suitable practitioner is available'}</strong>${statuses.map(s=>`<div class="provider-status ${s.available?'available':'unavailable'}"><span class="provider-mini ${providerClass(s.provider.name)}">${esc(s.provider.initials)}</span><span><b>${esc(s.provider.name)}</b><small>${esc(s.reason)}</small></span></div>`).join('')}`;
  }

  function openBooking(customerId='',date='',time='',optometrist='',type='Routine eye examination'){
    populateCustomerSelect(customerId);
    $('#appointment-type').value=type;
    $('#appointment-date').value=date||addDays(TODAY,1);
    $('#appointment-time').value=time||'09:00';
    updateProviderOptions(optometrist);
    if(!$('#appointment-dialog').open)$('#appointment-dialog').showModal();
  }

  function createAppointment(customerId,date,time,type,optometrist){
    const provider=getProvider(optometrist);
    if(!provider){toast('Choose an available practitioner.');return false;}
    const status=providerStatus(provider,date,time,type);
    if(!status.available){toast(status.reason+'.');return false;}
    if(customerIsBooked(customerId,date,time)){toast('This customer already has an appointment at that time.');return false;}
    appointments.push({id:`APT-${Date.now()}`,customerId,date,time,type,optometrist,status:'Confirmed',duration:30,outcome:'',notes:'',nextRecall:''});
    const c=getCustomer(customerId); if(c){c.lastContact={date:TODAY,type:'AI Assistant',reason:'Appointment booking',outcome:'Appointment booked'};}
    save(); renderAll(); toast(`Appointment booked with ${optometrist}.`); return true;
  }

  function saleValue(sale){return (Number(sale.unitPrice)||0)*(Number(sale.quantity)||0);}

  function saleProfit(sale){
    const product=productById(sale.productId);
    return ((Number(sale.unitPrice)||0)-(product?Number(product.costPrice)||0:0))*(Number(sale.quantity)||0);
  }

  function renderProducts(){
    const revenue=sales.reduce((sum,sale)=>sum+saleValue(sale),0);
    const profit=sales.reduce((sum,sale)=>sum+saleProfit(sale),0);
    const month=sales.filter(sale=>String(sale.date).startsWith(TODAY.slice(0,7))).reduce((sum,sale)=>sum+saleValue(sale),0);
    const lowStock=products.filter(product=>Number(product.stock)<=Number(product.reorderLevel));
    $('#product-stat-revenue').textContent=money(revenue);
    $('#product-stat-profit').textContent=money(profit);
    $('#product-stat-month').textContent=money(month);
    $('#product-stat-low-stock').textContent=lowStock.length;

    const categorySelect=$('#product-category-filter');
    if(!categorySelect.dataset.ready){
      const categories=[...new Set(products.map(product=>product.category))].sort();
      categorySelect.innerHTML='<option value="all">All categories</option>'+categories.map(category=>`<option value="${esc(category)}">${esc(category)}</option>`).join('');
      categorySelect.dataset.ready='1';
    }
    categorySelect.value=productCategoryFilter;
    const q=productSearchTerm.toLowerCase();
    const filtered=products.filter(product=>(productCategoryFilter==='all'||product.category===productCategoryFilter)&&(!q||[product.name,product.sku,product.category].some(value=>String(value).toLowerCase().includes(q))));
    $('#products-body').innerHTML=filtered.length?filtered.map(product=>{
      const margin=Number(product.sellPrice)-Number(product.costPrice);
      const marginPct=product.sellPrice?Math.round(margin/Number(product.sellPrice)*100):0;
      const low=Number(product.stock)<=Number(product.reorderLevel);
      return `<tr><td><strong>${esc(product.name)}</strong><br><span class="muted">${esc(product.sku)}</span></td><td>${esc(product.category)}</td><td>${money(product.sellPrice)}</td><td>${money(product.costPrice)}</td><td><strong>${money(margin)}</strong><br><span class="muted">${marginPct}%</span></td><td><span class="badge ${low?'red':'green'}">${product.stock} in stock</span>${low?`<br><span class="stock-warning">Reorder at ${product.reorderLevel}</span>`:''}</td><td><button class="table-action" data-sale-product="${esc(product.id)}" ${Number(product.stock)<=0?'disabled':''}>Record sale</button></td></tr>`;
    }).join(''):'<tr><td colspan="7"><div class="empty">No products match this filter.</div></td></tr>';

    const aggregates=products.map(product=>{
      const productSales=sales.filter(sale=>sale.productId===product.id);
      return {product,revenue:productSales.reduce((sum,sale)=>sum+saleValue(sale),0),units:productSales.reduce((sum,sale)=>sum+Number(sale.quantity||0),0)};
    }).sort((a,b)=>b.revenue-a.revenue).slice(0,6);
    const maxRevenue=Math.max(1,...aggregates.map(item=>item.revenue));
    $('#top-products').innerHTML=aggregates.map((item,index)=>`<div class="top-product-row"><span class="top-rank">${index+1}</span><div><strong>${esc(item.product.name)}</strong><small>${item.units} units sold</small><i><em style="width:${Math.round(item.revenue/maxRevenue*100)}%"></em></i></div><b>${money(item.revenue)}</b></div>`).join('');

    const recent=[...sales].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
    $('#recent-sales').innerHTML=recent.length?recent.map(sale=>{const customer=getCustomer(sale.customerId),product=productById(sale.productId);return `<button class="recent-sale-row" data-sale-customer-view="${esc(sale.customerId)}"><span><strong>${esc(product?product.name:'Unknown product')}</strong><small>${esc(customer?fullName(customer):'Unknown customer')} · ${formatShort(sale.date)} · Qty ${sale.quantity}</small></span><b>${money(saleValue(sale))}</b></button>`}).join(''):'<div class="empty">No sales recorded.</div>';
  }

  function populateSaleForm(customerId='',productId=''){
    $('#sale-customer').innerHTML=customers.filter(c=>c.status==='Active').sort((a,b)=>fullName(a).localeCompare(fullName(b))).map(c=>`<option value="${esc(c.id)}" ${c.id===customerId?'selected':''}>${esc(fullName(c))} (${esc(c.id)})</option>`).join('');
    $('#sale-product').innerHTML=products.map(product=>`<option value="${esc(product.id)}" ${product.id===productId?'selected':''} ${Number(product.stock)<=0?'disabled':''}>${esc(product.name)} — ${money(product.sellPrice)} (${product.stock} available)</option>`).join('');
    $('#sale-quantity').value='1';
    $('#sale-date').value=TODAY;
    $('#sale-payment').value='Card';
    $('#sale-notes').value='';
    updateSaleSummary();
  }

  function openSale(customerId='',productId=''){
    populateSaleForm(customerId,productId);
    if(!$('#sale-dialog').open)$('#sale-dialog').showModal();
  }

  function updateSaleSummary(){
    const product=productById($('#sale-product').value);
    const quantity=Math.max(1,Number($('#sale-quantity').value)||1);
    if(!product){$('#sale-summary').innerHTML='Choose a product.';return;}
    const revenue=Number(product.sellPrice)*quantity;
    const profit=(Number(product.sellPrice)-Number(product.costPrice))*quantity;
    const enough=quantity<=Number(product.stock);
    $('#sale-summary').innerHTML=`<div><span>Sale total</span><strong>${money(revenue)}</strong></div><div><span>Estimated gross profit</span><strong>${money(profit)}</strong></div><div><span>Stock after sale</span><strong class="${enough?'':'text-danger'}">${enough?Number(product.stock)-quantity:'Not enough stock'}</strong></div>`;
    $('#confirm-sale').disabled=!enough;
  }

  function recordSale(){
    const customerId=$('#sale-customer').value;
    const productId=$('#sale-product').value;
    const quantity=Math.max(1,Number($('#sale-quantity').value)||1);
    const product=productById(productId);
    const customer=getCustomer(customerId);
    if(!product||!customer){toast('Choose a customer and product.');return false;}
    if(quantity>Number(product.stock)){toast('There is not enough stock for this sale.');return false;}
    product.stock=Number(product.stock)-quantity;
    sales.push({id:`SALE-${Date.now()}`,customerId,productId,date:$('#sale-date').value||TODAY,quantity,unitPrice:Number(product.sellPrice),paymentMethod:$('#sale-payment').value,status:'Paid',notes:$('#sale-notes').value.trim()});
    customer.lastContact={date:TODAY,type:'In practice',reason:'Product purchase',outcome:`Purchased ${quantity} × ${product.name}`};
    save();renderAll();$('#sale-dialog').close();toast(`${money(Number(product.sellPrice)*quantity)} product sale recorded.`);return true;
  }

  function exportSalesCsv(){
    const headers=['Sale ID','Date','Customer ID','Customer','Product ID','Product','Quantity','Unit price','Revenue','Payment method','Status','Notes'];
    const rows=sales.map(sale=>{const customer=getCustomer(sale.customerId),product=productById(sale.productId);return [sale.id,sale.date,sale.customerId,customer?fullName(customer):'',sale.productId,product?product.name:'',sale.quantity,sale.unitPrice,saleValue(sale),sale.paymentMethod,sale.status,sale.notes||''];});
    const csv=[headers,...rows].map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    download('pingstar-retail-sales.csv',csv,'text/csv');
  }

  function formatEmailDate(datetime){
    const date=new Date(datetime);
    if(Number.isNaN(date.getTime()))return String(datetime||'');
    return date.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  function mailboxMessages(){
    let list=[...emails];
    if(emailCustomerFilter) list=list.filter(email=>email.customerId===emailCustomerFilter);
    else if(activeMailFolder==='starred') list=list.filter(email=>email.starred);
    else list=list.filter(email=>email.folder===activeMailFolder);
    const q=emailSearchTerm.toLowerCase();
    if(q) list=list.filter(email=>[email.from,email.to,email.subject,email.body].some(value=>String(value).toLowerCase().includes(q)));
    return list.sort((a,b)=>String(b.datetime).localeCompare(String(a.datetime)));
  }

  function renderMailbox(){
    const unread=emails.filter(email=>email.folder==='inbox'&&email.unread).length;
    const inbox=emails.filter(email=>email.folder==='inbox').length;
    const today=emails.filter(email=>email.folder==='inbox'&&String(email.datetime).startsWith(TODAY)).length;
    const drafts=emails.filter(email=>email.folder==='drafts').length;
    $('#mail-stat-unread').textContent=unread;
    $('#mail-stat-inbox').textContent=inbox;
    $('#mail-stat-today').textContent=today;
    $('#mail-stat-drafts').textContent=drafts;
    $('#folder-count-inbox').textContent=inbox;
    $('#folder-count-sent').textContent=emails.filter(email=>email.folder==='sent').length;
    $('#folder-count-drafts').textContent=drafts;
    $('#folder-count-starred').textContent=emails.filter(email=>email.starred).length;
    $$('.mail-folder').forEach(button=>button.classList.toggle('active',!emailCustomerFilter&&button.dataset.mailFolder===activeMailFolder));

    const filteredCustomer=getCustomer(emailCustomerFilter);
    const labels={inbox:'Inbox',sent:'Sent',drafts:'Drafts',starred:'Starred'};
    $('#mail-list-title').textContent=filteredCustomer?`${fullName(filteredCustomer)} correspondence`:labels[activeMailFolder];
    $('#mail-list-subtitle').textContent=filteredCustomer?'All fictional email linked to this customer':'Customer correspondence linked to contact records';
    $('#clear-mail-customer-filter').classList.toggle('hidden',!filteredCustomer);

    const list=mailboxMessages();
    if(activeEmailId&&!list.some(email=>email.id===activeEmailId))activeEmailId=list[0]?.id||'';
    if(!activeEmailId&&list.length)activeEmailId=list[0].id;
    $('#mail-list').innerHTML=list.length?list.map(email=>{
      const customer=getCustomer(email.customerId);
      const person=customer?fullName(customer):(email.folder==='inbox'?email.from:email.to);
      return `<button class="mail-list-item ${email.unread?'unread':''} ${activeEmailId===email.id?'active':''}" data-email-id="${esc(email.id)}"><span class="mail-star ${email.starred?'on':''}">★</span><div><strong>${esc(person)}</strong><b>${esc(email.subject)}</b><p>${esc(email.body)}</p></div><time>${formatShort(String(email.datetime).slice(0,10))}</time></button>`;
    }).join(''):'<div class="empty">No messages match this view.</div>';
    renderMailReader();
  }

  function renderMailReader(){
    const email=emailById(activeEmailId);
    if(!email){$('#mail-reader').innerHTML='<div class="mail-empty-state"><span>✉</span><h3>Select an email</h3><p>Choose a message from the list to read it here.</p></div>';return;}
    const customer=getCustomer(email.customerId);
    $('#mail-reader').innerHTML=`<div class="mail-reader-header"><div><span class="badge ${email.folder==='inbox'?'blue':email.folder==='sent'?'green':'amber'}">${esc(email.folder)}</span><h2>${esc(email.subject)}</h2><p><strong>From:</strong> ${esc(email.from)}<br><strong>To:</strong> ${esc(email.to)}<br>${formatEmailDate(email.datetime)}</p></div><button class="star-toggle ${email.starred?'on':''}" data-mail-toggle-star="${esc(email.id)}" title="Star message">★</button></div><div class="mail-body preserve-lines">${esc(email.body)}</div><div class="mail-reader-actions">${email.folder==='drafts'?`<button class="primary-btn" data-mail-edit-draft="${esc(email.id)}">Edit draft</button>`:`<button class="primary-btn" data-mail-reply="${esc(email.id)}">Reply</button>`}${customer?`<button class="secondary-btn" data-mail-customer="${esc(customer.id)}">Open ${esc(customer.firstName)}’s record</button>`:''}${email.folder==='inbox'?`<button class="secondary-btn" data-mail-toggle-unread="${esc(email.id)}">Mark ${email.unread?'read':'unread'}</button>`:''}</div>`;
  }

  function openEmail(id){
    const email=emailById(id); if(!email)return;
    activeEmailId=id;
    if(email.folder==='inbox'&&email.unread){email.unread=false;save();}
    renderMailbox();
  }

  function openMailboxForCustomer(customerId){
    emailCustomerFilter=customerId;
    emailSearchTerm='';
    $('#mail-search').value='';
    activeEmailId='';
    if($('#customer-dialog').open)$('#customer-dialog').close();
    navigate('mailbox');
  }

  function populateComposeCustomers(selected=''){
    $('#compose-customer').innerHTML='<option value="">No linked customer</option>'+customers.slice().sort((a,b)=>fullName(a).localeCompare(fullName(b))).map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(fullName(c))} (${esc(c.id)})</option>`).join('');
  }

  function openCompose(customerId='',replyId='',draftId=''){
    const reply=replyId?emailById(replyId):null;
    const draft=draftId?emailById(draftId):null;
    const source=draft||reply;
    const linkedId=customerId||source?.customerId||'';
    const customer=getCustomer(linkedId);
    populateComposeCustomers(linkedId);
    $('#compose-reply-to').value=replyId;
    $('#compose-message-id').value=draftId;
    $('#email-compose-title').textContent=draft?'Edit draft':reply?'Reply to email':'Compose email';
    $('#compose-to').value=draft?draft.to:(customer?customer.email:(reply?(reply.folder==='inbox'?reply.from:reply.to):''));
    $('#compose-subject').value=draft?draft.subject:(reply?`${/^re:/i.test(reply.subject)?'':'Re: '}${reply.subject}`:'');
    $('#compose-body').value=draft?draft.body:(reply?`\n\n--- Previous message ---\n${reply.body}`:'');
    if(!$('#email-compose-dialog').open)$('#email-compose-dialog').showModal();
    setTimeout(()=>$('#compose-body').focus(),50);
  }

  function composePayload(folder){
    const selected=$('#compose-customer').value;
    const to=$('#compose-to').value.trim();
    const linked=selected||customers.find(c=>c.email.toLowerCase()===to.toLowerCase())?.id||'';
    return {id:$('#compose-message-id').value||`EMAIL-${Date.now()}`,folder,customerId:linked,from:'care@pingstar-demo.example',to,subject:$('#compose-subject').value.trim(),datetime:new Date().toISOString(),body:$('#compose-body').value.trim(),unread:false,starred:false,replyTo:$('#compose-reply-to').value};
  }

  function saveEmailDraft(){
    const payload=composePayload('drafts');
    if(!payload.to||!payload.subject||!payload.body){toast('Complete the recipient, subject and message first.');return;}
    const existing=emails.findIndex(email=>email.id===payload.id);
    if(existing>=0)emails[existing]=payload;else emails.push(payload);
    save();renderMailbox();$('#email-compose-dialog').close();toast('Draft saved in the demo mailbox.');
  }

  async function sendDemoEmail(){
    const payload=composePayload('sent');
    if(!payload.to||!payload.subject||!payload.body){toast('Complete the recipient, subject and message first.');return false;}
    if(window.OPTIVIEW_LIVE_MAIL?.connected){
      try{
        const response=await fetch('/api/mail/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:payload.to,subject:payload.subject,body:payload.body})});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||'Live mailbox send failed.');
        emails=emails.filter(email=>email.id!==payload.id);
        payload.id=result.id||`LIVE-${Date.now()}`;payload.from=result.from||window.OPTIVIEW_LIVE_MAIL.email||payload.from;payload.datetime=result.datetime||new Date().toISOString();
        emails.push(payload);
        const customer=getCustomer(payload.customerId);
        if(customer)customer.lastContact={date:TODAY,type:'Email',reason:payload.subject,outcome:`Sent via ${window.OPTIVIEW_LIVE_MAIL.providerLabel||'connected mailbox'}`};
        save();renderAll();$('#email-compose-dialog').close();activeMailFolder='sent';emailCustomerFilter='';activeEmailId=payload.id;renderMailbox();toast(`Email sent via ${window.OPTIVIEW_LIVE_MAIL.providerLabel||'connected mailbox'}.`);return true;
      }catch(error){toast(error.message||'Could not send through the connected mailbox.');return false;}
    }
    emails=emails.filter(email=>email.id!==payload.id);
    payload.id=`EMAIL-${Date.now()}`;
    emails.push(payload);
    const customer=getCustomer(payload.customerId);
    if(customer)customer.lastContact={date:TODAY,type:'Email',reason:payload.subject,outcome:'Demo email saved to Sent'};
    save();renderAll();$('#email-compose-dialog').close();activeMailFolder='sent';emailCustomerFilter='';activeEmailId=payload.id;renderMailbox();toast('Demo email saved to Sent. No real email was sent.');return true;
  }

  function chatTime(value){
    const date=value?new Date(value):new Date();
    return Number.isNaN(date.getTime())?'':date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }

  function saveChat(){
    try{localStorage.setItem(STORAGE_CHAT,JSON.stringify(chatHistory.slice(-60)));}
    catch(error){console.warn('Chat history could not be stored.',error);}
  }

  function renderChatHistory(){
    const html=chatHistory.map(item=>`<div class="message ${item.role}">${item.html}<span class="message-meta">${chatTime(item.at)}</span></div>`).join('');
    ['#chat-messages','#floating-chat-messages'].forEach(selector=>{
      const container=$(selector);if(!container)return;
      container.innerHTML=html+(chatTyping?'<div class="message assistant typing" aria-label="AI is typing"><i></i><i></i><i></i></div>':'');
      container.scrollTop=container.scrollHeight;
    });
  }

  function addMessage(role,html){
    chatHistory.push({role,html,at:new Date().toISOString()});
    chatHistory=chatHistory.slice(-60);
    saveChat();renderChatHistory();
    if(role==='assistant'&&!$('#ai-floating-chat')?.classList.contains('open')&&!$('#view-assistant')?.classList.contains('active')){
      const unread=$('#ai-chat-unread');if(unread)unread.hidden=false;
    }
  }

  let liveAiAvailable = false;

  function htmlToText(value){
    const holder=document.createElement('div');
    holder.innerHTML=String(value||'');
    return holder.textContent||holder.innerText||'';
  }

  function formatLiveAiReply(value){
    const safe=esc(String(value||'No response returned.'));
    return `<p>${safe.replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')}</p>`;
  }

  function customerForAi(customer){
    if(!customer)return null;
    const {photos,...safe}=customer;
    return {...safe,name:fullName(customer)};
  }

  function buildLiveAiContext(message){
    const q=String(message||'').toLowerCase();
    const named=findNamedCustomer(message);
    const includeAppointments=/appoint|book|calendar|available|free|visit|history|briefing|today|tomorrow|recall|check-?up/.test(q);
    const includeRetail=false;
    const includeMailbox=/email|mailbox|inbox|unread|message|reply/.test(q);
    const includeAutomation=false;

    let relevantCustomers=[];
    if(named) relevantCustomers=[named];
    else if(/overdue|late.*recall/.test(q)) relevantCustomers=customers.filter(c=>daysFromToday(c.nextRecall)<0&&c.status==='Active').slice(0,30);
    else if(/next 30 days|due soon|due this month|upcoming recall/.test(q)) relevantCustomers=customers.filter(c=>daysFromToday(c.nextRecall)>=0&&daysFromToday(c.nextRecall)<=30&&c.status==='Active').slice(0,30);
    else if(/contact lens/.test(q)) relevantCustomers=customers.filter(c=>(c.clinicalFlags||[]).some(flag=>/contact lens/i.test(flag))||/contact lens/i.test(c.notes||'')).slice(0,30);

    const customerIndex=customers.map(c=>({
      id:c.id,name:fullName(c),status:c.status,nextRecall:c.nextRecall,
      preferredContact:c.preferredContact,clinicalFlags:c.clinicalFlags||[],
      lastContactDate:c.lastContact?.date||'',lastContactReason:c.lastContact?.reason||''
    }));

    const context={
      generatedAt:new Date().toISOString(),
      demoPracticeDate:TODAY,
      notice:'All records in this demo are fictional. Do not make diagnoses or clinical treatment decisions.',
      summary:{
        customers:customers.length,
        activeCustomers:customers.filter(c=>c.status==='Active').length,
        appointments:appointments.length,
        unreadEmails:emails.filter(e=>e.folder==='inbox'&&e.unread).length
      },
      optometrists:optometrists.map(o=>({name:o.name,role:o.role,room:o.room,specialisms:o.specialisms,schedule:o.schedule})),
      customerIndex,
      relevantCustomers:relevantCustomers.map(customerForAi)
    };

    if(includeAppointments){
      context.appointments=appointments.slice().sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).map(a=>({
        id:a.id,customerId:a.customerId,customerName:fullName(getCustomer(a.customerId)||{firstName:'Unknown',lastName:'customer'}),
        date:a.date,time:a.time,type:a.type,optometrist:a.optometrist,status:a.status,outcome:a.outcome||'',notes:a.notes||'',nextRecall:a.nextRecall||''
      }));
    }
    if(includeRetail){
      context.products=products.map(p=>({id:p.id,name:p.name,category:p.category,price:p.price,cost:p.cost,stock:p.stock,reorderLevel:p.reorderLevel}));
      context.sales=sales.map(sale=>({
        id:sale.id,date:sale.date,customerId:sale.customerId,customerName:fullName(getCustomer(sale.customerId)||{firstName:'Unknown',lastName:'customer'}),
        productId:sale.productId,productName:productById(sale.productId)?.name||'Unknown product',quantity:sale.quantity,total:saleValue(sale),profit:saleProfit(sale)
      }));
    }
    if(includeMailbox){
      context.emails=emails.map(email=>({
        id:email.id,folder:email.folder,customerId:email.customerId,customerName:email.customerId?fullName(getCustomer(email.customerId)||{firstName:'Unknown',lastName:'customer'}):'',
        from:email.from,to:email.to,subject:email.subject,datetime:email.datetime,unread:email.unread,starred:email.starred,
        body:String(email.body||'').slice(0,1200)
      }));
    }
    if(includeAutomation){
      const auto=automationSnapshot();
      context.automations={
        workflows:auto.workflows.map(w=>({id:w.id,name:w.name,active:w.active,category:w.category,trigger:w.trigger,description:w.description})),
        runs:auto.runs.slice(-80),
        tasks:auto.tasks
      };
    }
    return context;
  }

  async function checkLiveAiStatus(){
    const status=$('#ai-mode-status');
    const description=$('#ai-mode-description');
    try{
      const response=await fetch('/api/health',{headers:{Accept:'application/json'}});
      const data=await response.json();
      liveAiAvailable=Boolean(response.ok&&data.aiConfigured);
      if(status){status.textContent=liveAiAvailable?`Live AI · ${data.model}`:'Local AI fallback';status.classList.toggle('online',liveAiAvailable);}
      if(description)description.textContent=liveAiAvailable
        ?'Secure live AI is connected through the local server. The API key remains server-side. All bundled records are fictional.'
        :'The secure AI server is running without an API key, or is unavailable. The chatbot will use the local rule-based fallback.';
    }catch(error){
      liveAiAvailable=false;
      if(status){status.textContent='Local AI fallback';status.classList.remove('online');}
      if(description)description.textContent='No secure AI server was detected. The chatbot is using the local rule-based fallback.';
    }
  }

  async function askAssistant(text){
    const clean=String(text||'').trim();if(!clean)return;
    const recentHistory=chatHistory.slice(-10).map(item=>({
      role:item.role==='assistant'?'assistant':'user',
      content:htmlToText(item.html).slice(0,2500)
    }));
    addMessage('user',`<p>${esc(clean)}</p>`);
    chatTyping=true;renderChatHistory();

    if(!liveAiAvailable){
      window.setTimeout(()=>{chatTyping=false;addMessage('assistant',assistantReply(clean));},360);
      return;
    }

    try{
      const response=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:clean,history:recentHistory,context:buildLiveAiContext(clean)})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'The live AI request failed.');
      chatTyping=false;
      addMessage('assistant',formatLiveAiReply(data.reply));
    }catch(error){
      console.warn('Live AI request failed; using local fallback.',error);
      liveAiAvailable=false;
      chatTyping=false;
      const local=assistantReply(clean);
      addMessage('assistant',`${local}<p><small>Live AI was unavailable, so this answer used the local demo logic.</small></p>`);
      checkLiveAiStatus();
    }
  }

  function clearChat(){
    chatHistory=[{role:'assistant',html:CHAT_GREETING,at:new Date().toISOString()}];
    saveChat();renderChatHistory();toast('AI chat cleared.');
  }

  function openFloatingChat(){
    const panel=$('#ai-floating-chat'),launcher=$('#ai-chat-launcher');
    panel.classList.add('open');panel.setAttribute('aria-hidden','false');launcher.setAttribute('aria-expanded','true');
    const unread=$('#ai-chat-unread');if(unread)unread.hidden=true;
    renderChatHistory();window.setTimeout(()=>$('#floating-chat-input')?.focus(),120);
  }

  function closeFloatingChat(){
    const panel=$('#ai-floating-chat'),launcher=$('#ai-chat-launcher');
    panel.classList.remove('open');panel.setAttribute('aria-hidden','true');launcher.setAttribute('aria-expanded','false');
  }

  function customerMiniList(list,limit=8){
    if(!list.length)return '<p>No matching customers found.</p>';
    const rows=list.slice(0,limit).map(c=>`<tr><td>${esc(fullName(c))}</td><td>${esc(c.id)}</td><td>${formatDate(c.nextRecall)}</td></tr>`).join('');
    return `<p>I found <strong>${list.length}</strong> customer${list.length===1?'':'s'}.</p><table><thead><tr><th>Name</th><th>ID</th><th>Recall</th></tr></thead><tbody>${rows}</tbody></table>${list.length>limit?`<p>Showing the first ${limit} results.</p>`:''}<div class="message-actions">${list.slice(0,4).map(c=>`<button data-chat-customer="${esc(c.id)}">Open ${esc(c.firstName)}</button>`).join('')}</div>`;
  }

  function normaliseDate(text){
    const lower=text.toLowerCase();
    if(lower.includes('today'))return TODAY;
    if(lower.includes('tomorrow'))return addDays(TODAY,1);
    const iso=text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/); if(iso)return iso[0];
    const dm=text.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](20\d{2}))?\b/); if(dm){return `${dm[3]||'2026'}-${String(dm[2]).padStart(2,'0')}-${String(dm[1]).padStart(2,'0')}`;}
    const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
    const m=lower.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(?:\s+(20\d{2}))?/);
    if(m)return `${m[3]||'2026'}-${String(months[m[2]]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return '';
  }

  function appointmentTypeFromText(q){
    if(/contact lens/.test(q))return 'Contact lens check';
    if(/urgent|pain|red eye/.test(q))return 'Urgent eye concern';
    if(/child|children|paediatric/.test(q))return "Children's eye examination";
    if(/glaucoma/.test(q))return 'Glaucoma monitoring';
    if(/low vision/.test(q))return 'Low vision review';
    if(/frame|fitting/.test(q))return 'Frame fitting';
    if(/prescription/.test(q))return 'Prescription review';
    return 'Routine eye examination';
  }

  function findNamedCustomer(text){
    const q=text.toLowerCase();
    return customers.find(c=>q.includes(fullName(c).toLowerCase())) || customers.find(c=>q.includes(c.id.toLowerCase())) || customers.find(c=>q.includes(c.phone));
  }

  function automationSnapshot(){
    const read=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):clone(fallback||[])}catch{return clone(fallback||[])}};
    const workflows=read('pingstar-demo-workflows-v1',window.DEMO_WORKFLOWS);
    const runs=read('pingstar-demo-automation-runs-v1',window.DEMO_AUTOMATION_RUNS);
    const tasks=read('pingstar-demo-automation-tasks-v1',window.DEMO_AUTOMATION_TASKS);
    return {workflows,runs,tasks};
  }

  function assistantReply(text){
    const q=text.toLowerCase().trim();
    const named=findNamedCustomer(text);
    const date=normaliseDate(text);
    const time=(text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/)||[]).slice(1).join(':');
    const type=appointmentTypeFromText(q);

    if(/what can you do|help me|chatbot help|how can you help/.test(q)){
      return `<p>I can work across the fictional practice dataset:</p><p><strong>Customers:</strong> find records, recalls, contact details and clinical flags.<br><strong>Appointments:</strong> check availability, prepare bookings and review previous visits.<br><strong>Mailbox:</strong> count unread messages and open customer correspondence.<br><strong>Missed calls:</strong> help staff review customers who entered the SMS booking journey.</p><div class="message-actions"><button data-chat-briefing="1">Create today’s briefing</button><button data-chat-calendar="1">Open calendar</button><button data-chat-mailbox="all">Open mailbox</button></div>`;
    }
    if(/practice briefing|daily briefing|morning briefing|today.?s overview|what needs attention|practice summary/.test(q)){
      const overdue=customers.filter(c=>daysFromToday(c.nextRecall)<0&&c.status==='Active').length;
      const todayAppointments=appointments.filter(a=>a.date===TODAY&&!['Cancelled','Completed','No-show'].includes(a.status));
      const tomorrowAppointments=appointments.filter(a=>a.date===addDays(TODAY,1)&&!['Cancelled','Completed','No-show'].includes(a.status));
      const unread=emails.filter(email=>email.folder==='inbox'&&email.unread).length;
      return `<p><strong>Practice briefing for ${formatDate(TODAY)}</strong></p><div class="ai-briefing-grid"><p><strong>${todayAppointments.length}</strong><br>appointments today</p><p><strong>${tomorrowAppointments.length}</strong><br>appointments tomorrow</p><p><strong>${overdue}</strong><br>overdue recalls</p><p><strong>${unread}</strong><br>unread emails</p></div><p>Use the calendar for availability and the mailbox for customer follow-up.</p><div class="message-actions"><button data-chat-calendar="1">Open calendar</button><button data-chat-mailbox="all">Open mailbox</button></div>`;
    }
    if(/automation|workflow|retail|product sales|stock/.test(q)){
      return `<p>This client-ready version focuses on customers, appointments, missed-call recovery, mailbox and AI self-service. Products & Sales and generic Automations are not part of the visible offer.</p>`;
    }
    if(/active automations?|active workflows?|how many.*workflows?|how many.*automations?/.test(q)){
      const auto=automationSnapshot(),active=auto.workflows.filter(workflow=>workflow.active);
      return `<p>There are <strong>${active.length}</strong> active automation${active.length===1?'':'s'} out of ${auto.workflows.length} configured workflows.</p>${active.slice(0,6).map(workflow=>`<p><strong>${esc(workflow.name)}</strong> — ${esc(workflow.trigger?.label||'Manual trigger')}</p>`).join('')}<div class="message-actions"><button data-chat-automations="workflows">Open workflow library</button><button data-chat-ai-workflow="1">Create with AI</button></div>`;
    }
    if(/failed workflow|failed automation|workflow errors?|automation errors?|failed runs?/.test(q)){
      const auto=automationSnapshot(),failed=auto.runs.filter(run=>run.status==='Failed');
      return failed.length?`<p><strong>${failed.length}</strong> workflow run${failed.length===1?' has':'s have'} failed in the demo history.</p>${failed.slice(0,6).map(run=>{const workflow=auto.workflows.find(item=>item.id===run.workflowId);const customer=getCustomer(run.customerId);return `<p><strong>${esc(workflow?.name||'Workflow')}</strong> — ${esc(customer?fullName(customer):run.customerId||'Practice event')}<br>${esc(run.error||run.summary||'Open the run for details')}</p>`}).join('')}<div class="message-actions"><button data-chat-automations="runs">Open failed runs</button></div>`:'<p>No failed workflow runs are recorded.</p>';
    }
    if(/tasks? needing approval|approvals?|open tasks?|urgent tasks?|task queue/.test(q)){
      const auto=automationSnapshot(),open=auto.tasks.filter(task=>task.status==='Open'),filtered=/approval/.test(q)?open.filter(task=>task.type==='approval'||/approval/i.test(task.title||'')):open;
      return filtered.length?`<p>There are <strong>${filtered.length}</strong> matching open task${filtered.length===1?'':'s'}.</p>${filtered.slice(0,8).map(task=>{const customer=getCustomer(task.customerId);return `<p><strong>${esc(task.title)}</strong> — ${esc(task.owner)} · ${esc(task.priority)}${customer?`<br>${esc(fullName(customer))}`:''}</p>`}).join('')}<div class="message-actions"><button data-chat-automations="tasks">Open task queue</button></div>`:'<p>No matching open tasks are recorded.</p>';
    }
    if(/automation revenue|workflow revenue|time saved|automation value/.test(q)){
      const auto=automationSnapshot(),revenue=auto.runs.reduce((sum,run)=>sum+(Number(run.revenue)||0),0),minutes=auto.runs.reduce((sum,run)=>sum+(Number(run.timeSavedMinutes)||0),0),recovered=auto.runs.filter(run=>run.appointmentRecovered).length;
      return `<p>The demo attributes <strong>${money(revenue)}</strong> in revenue, approximately <strong>${Math.round(minutes/60)} staff hours saved</strong>, and <strong>${recovered} recovered appointment${recovered===1?'':'s'}</strong> to automation runs.</p><div class="message-actions"><button data-chat-automations="overview">Open automation value</button></div>`;
    }

    if(/retail revenue|product revenue|sales revenue|gross profit|extra income|how much.*sales/.test(q)){
      const revenue=sales.reduce((sum,sale)=>sum+saleValue(sale),0);
      const profit=sales.reduce((sum,sale)=>sum+saleProfit(sale),0);
      const month=sales.filter(sale=>String(sale.date).startsWith(TODAY.slice(0,7))).reduce((sum,sale)=>sum+saleValue(sale),0);
      return `<p>Recorded product sales have generated <strong>${money(revenue)}</strong> in revenue and approximately <strong>${money(profit)}</strong> in gross profit.</p><p>Sales during ${dateObj(TODAY).toLocaleString('en-GB',{month:'long',year:'numeric'})}: <strong>${money(month)}</strong>.</p><div class="message-actions"><button data-chat-products="1">Open products and sales</button></div>`;
    }
    if(/low stock|reorder|running out/.test(q)){
      const list=products.filter(product=>Number(product.stock)<=Number(product.reorderLevel)).sort((a,b)=>a.stock-b.stock);
      return list.length?`<p><strong>${list.length}</strong> products are at or below their reorder level:</p>${list.map(product=>`<p><strong>${esc(product.name)}</strong> — ${product.stock} in stock, reorder level ${product.reorderLevel}</p>`).join('')}<div class="message-actions"><button data-chat-products="1">Open product catalogue</button></div>`:'<p>No products are currently at or below their reorder level.</p>';
    }
    if(named&&/bought|buy|purchases?|purchase history|spent|products?/.test(q)){
      const list=customerSales(named.id);
      const spend=list.reduce((sum,sale)=>sum+saleValue(sale),0);
      return list.length?`<p><strong>${esc(fullName(named))}</strong> has ${list.length} recorded purchase${list.length===1?'':'s'} totalling <strong>${money(spend)}</strong>.</p>${list.slice(0,8).map(sale=>{const product=productById(sale.productId);return `<p>${formatShort(sale.date)} — <strong>${esc(product?product.name:'Unknown product')}</strong>, qty ${sale.quantity}, ${money(saleValue(sale))}</p>`}).join('')}<div class="message-actions"><button data-chat-customer="${esc(named.id)}">Open customer record</button><button data-chat-sale="${esc(named.id)}">Record another sale</button></div>`:`<p>${esc(fullName(named))} has no product purchases recorded.</p><div class="message-actions"><button data-chat-sale="${esc(named.id)}">Record a sale</button></div>`;
    }
    if(/unread emails?|mailbox|inbox|customer emails?/.test(q)){
      const unread=emails.filter(email=>email.folder==='inbox'&&email.unread).length;
      const inbox=emails.filter(email=>email.folder==='inbox').length;
      if(named){const count=emails.filter(email=>email.customerId===named.id).length;return `<p>There are <strong>${count}</strong> mailbox messages linked to ${esc(fullName(named))}.</p><div class="message-actions"><button data-chat-mailbox="${esc(named.id)}">Open their correspondence</button></div>`;}
      return `<p>The practice mailbox contains <strong>${inbox}</strong> inbox messages, including <strong>${unread}</strong> unread message${unread===1?'':'s'}.</p><div class="message-actions"><button data-chat-mailbox="all">Open mailbox</button></div>`;
    }
    if(/available|availability|free/.test(q)&&date&&time){
      const available=suitableAvailableProviders(date,time,type);
      if(!available.length)return `<p>No suitable practitioner is free on <strong>${formatDate(date)} at ${esc(time)}</strong> for a ${esc(type.toLowerCase())}.</p><p>Try another time or open the team calendar.</p><div class="message-actions"><button data-chat-calendar="1">Open team calendar</button></div>`;
      return `<p>${available.length} suitable practitioner${available.length===1?' is':'s are'} available on <strong>${formatDate(date)} at ${esc(time)}</strong>:</p>${available.map(provider=>`<p><strong>${esc(provider.name)}</strong> — ${esc(provider.role)}, ${esc(provider.room)}</p>`).join('')}<div class="message-actions"><button data-chat-book-slot="1" data-slot-date="${date}" data-slot-time="${time}" data-slot-type="${esc(type)}">Book this slot</button><button data-chat-calendar="1">Open calendar</button></div>`;
    }
    if(/book|make.*appointment|schedule/.test(q)&&date&&time){
      if(!named)return '<p>I found the date and time, but I need a customer name or ID. For example: <strong>“Book Amelia Smith on 25 July at 10:30.”</strong></p>';
      const available=suitableAvailableProviders(date,time,type);
      if(!available.length)return `<p>No suitable practitioner is available on ${formatDate(date)} at ${esc(time)} for that appointment type.</p><div class="message-actions"><button data-chat-calendar="1">Open calendar</button></div>`;
      return `<p>I can book <strong>${esc(fullName(named))}</strong> for a <strong>${esc(type.toLowerCase())}</strong> on <strong>${formatDate(date)} at ${esc(time)}</strong>.</p><p>Recommended practitioner: <strong>${esc(available[0].name)}</strong>.</p><div class="message-actions"><button data-chat-book-slot="1" data-chat-customer-id="${esc(named.id)}" data-slot-date="${date}" data-slot-time="${time}" data-slot-provider="${esc(available[0].name)}" data-slot-type="${esc(type)}">Open booking form</button></div>`;
    }
    if(/overdue|late.*recall|missed.*check/.test(q)){
      const list=customers.filter(c=>daysFromToday(c.nextRecall)<0&&c.status==='Active').sort((a,b)=>a.nextRecall.localeCompare(b.nextRecall));
      return `<p>These active customers are overdue for their recall:</p>${customerMiniList(list)}`;
    }
    if(/next 30 days|due this month|due soon|upcoming recall|check-?up this month/.test(q)){
      const list=customers.filter(c=>daysFromToday(c.nextRecall)>=0&&daysFromToday(c.nextRecall)<=30&&c.status==='Active').sort((a,b)=>a.nextRecall.localeCompare(b.nextRecall));
      return `<p>These customers are due within the next 30 days:</p>${customerMiniList(list)}`;
    }
    if(/called today|contacted today|phone.*today/.test(q)){
      const list=customers.filter(c=>c.lastContact.date===TODAY);
      if(!list.length)return '<p>No customer calls are recorded today.</p>';
      return `<p><strong>${list.length}</strong> customers have a contact record dated today.</p>${list.map(c=>`<p><strong>${esc(fullName(c))}</strong> — ${esc(c.lastContact.reason)} (${esc(c.lastContact.outcome)})</p>`).join('')}<div class="message-actions">${list.map(c=>`<button data-chat-customer="${esc(c.id)}">Open ${esc(c.firstName)}</button>`).join('')}</div>`;
    }
    if(/appointment history|past appointments?|previous appointments?|visit history|last appointment/.test(q)){
      const list=historicalAppointments().filter(appointment=>!named||appointment.customerId===named.id);
      if(!list.length)return `<p>No past appointment history is recorded${named?` for ${esc(fullName(named))}`:''}.</p>`;
      return `<p>${named?`<strong>${esc(fullName(named))}</strong> has`:'The practice has'} <strong>${list.length}</strong> historical appointment record${list.length===1?'':'s'}.</p>${list.slice(0,8).map(appointment=>`<p><strong>${formatDate(appointment.date)}</strong> — ${esc(appointment.type)} with ${esc(appointment.optometrist)} <span class="badge ${appointmentStatusClass(appointment.status)}">${esc(appointment.status)}</span>${appointment.outcome?`<br>${esc(appointment.outcome)}`:''}</p>`).join('')}<div class="message-actions">${named?`<button data-chat-customer="${esc(named.id)}">Open full history</button>`:''}<button data-chat-calendar="1">Open appointment history</button></div>`;
    }
    if(/appointments?|bookings?|diary|schedule/.test(q)){
      const list=upcomingAppointments().filter(appointment=>!date||appointment.date===date);
      if(!list.length)return `<p>There are no upcoming appointments${date?` on ${formatDate(date)}`:''}.</p>`;
      return `<p>${date?`Appointments on <strong>${formatDate(date)}</strong>`:'The next appointments are'}:</p>${list.slice(0,10).map(appointment=>{const customer=getCustomer(appointment.customerId);return `<p><strong>${formatShort(appointment.date)} ${esc(appointment.time)}</strong> — ${esc(customer?fullName(customer):appointment.type)}, ${esc(appointment.type)} with ${esc(appointment.optometrist)}</p>`}).join('')}<div class="message-actions"><button data-chat-calendar="1">Open team calendar</button></div>`;
    }
    if(/contact lens/.test(q)){
      const list=customers.filter(c=>(c.clinicalFlags||[]).some(flag=>flag.toLowerCase().includes('contact lens')));
      return `<p>Customers marked as contact lens wearers:</p>${customerMiniList(list)}`;
    }
    if(/glaucoma/.test(q)){
      const list=customers.filter(c=>(c.clinicalFlags||[]).some(flag=>flag.toLowerCase().includes('glaucoma')));
      return `<p>Customers with a glaucoma-related flag:</p>${customerMiniList(list)}`;
    }
    if(named||/find|search|show customer|customer id/.test(q)){
      const matches=named?[named]:customers.filter(c=>[fullName(c),c.phone,c.email,c.id].some(value=>String(value).toLowerCase().includes(q.replace(/find|search|show|customer|record|for/g,'').trim())));
      if(matches.length===1){
        const customer=matches[0],state=recallState(customer);
        return `<p><strong>${esc(fullName(customer))}</strong> (${esc(customer.id)})</p><p>Phone: ${esc(customer.phone)}<br>Last eye exam: ${formatDate(customer.lastEyeExam)}<br>Recall: <span class="badge ${state.cls}">${esc(state.label)}</span><br>Last contact: ${formatDate(customer.lastContact.date)} — ${esc(customer.lastContact.reason)}</p><div class="message-actions"><button data-chat-customer="${esc(customer.id)}">Open full record</button><button data-chat-book="${esc(customer.id)}">Book appointment</button><button data-chat-mailbox="${esc(customer.id)}">Mailbox</button><button data-contact="call" data-contact-customer="${esc(customer.id)}">Call</button><button data-contact="email" data-contact-customer="${esc(customer.id)}">Email</button><button data-contact="whatsapp" data-contact-customer="${esc(customer.id)}">WhatsApp</button></div>`;
      }
      return customerMiniList(matches);
    }
    if(/how many|total customers|customer count/.test(q))return `<p>There are <strong>${customers.length}</strong> synthetic customer records in this demo.</p>`;
    return `<p>I can help with customer lookups, clinical flags, overdue recalls, practitioner availability, appointment history and the practice mailbox.</p><p>Try asking: <strong>“Who is overdue for a check-up?”</strong></p>`;
  }

  function exportCsv(){
    const headers=['Customer ID','First name','Last name','DOB','Phone','Email','Address','Last eye exam','Next recall','Preferred contact','Status'];
    const rows=customers.map(c=>[c.id,c.firstName,c.lastName,c.dob,c.phone,c.email,c.address,c.lastEyeExam,c.nextRecall,c.preferredContact,c.status]);
    const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    download('pingstar-customers.csv',csv,'text/csv');
  }

  function download(name,content,type){
    const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
  }


  window.OPTIVIEW_MAIL={
    importMessages(items){
      if(!Array.isArray(items))return;
      const live=items.map(item=>({id:String(item.id||`LIVE-${Date.now()}-${Math.random()}`),folder:item.folder||'inbox',customerId:item.customerId||customers.find(c=>String(c.email).toLowerCase()===String(item.from||item.to||'').toLowerCase())?.id||'',from:item.from||'',to:item.to||'',subject:item.subject||'(No subject)',datetime:item.datetime||new Date().toISOString(),body:item.body||'',unread:Boolean(item.unread),starred:Boolean(item.starred),replyTo:item.replyTo||''}));
      const demoOnly=emails.filter(e=>!String(e.id).startsWith('gmail:')&&!String(e.id).startsWith('m365:'));
      emails=[...demoOnly,...live];
      save();activeMailFolder='inbox';emailCustomerFilter='';activeEmailId='';renderMailbox();renderDashboard();
    },
    openMailbox(){navigate('mailbox');},
    toast
  };

  function renderAll(){renderDashboard();renderCustomers();renderAppointments();renderProducts();renderMailbox();}

  $$('.nav-item[data-view]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
  $$('[data-jump]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.filter){activeFilter=button.dataset.filter;$('#customer-filter').value=activeFilter;}
    navigate(button.dataset.jump);
  }));
  $('#customer-filter').addEventListener('change',event=>{activeFilter=event.target.value;customerPage=1;renderCustomers();});
  $('#global-search').addEventListener('input',event=>{searchTerm=event.target.value.trim();customerPage=1;if(searchTerm)navigate('customers');renderCustomers();});
  $('#customers-body').addEventListener('click',event=>{
    if(event.target.dataset.contact)contactCustomer(event.target.dataset.contactCustomer,event.target.dataset.contact);
    else if(event.target.dataset.viewCustomer)showCustomer(event.target.dataset.viewCustomer);
  });
  $('#pagination').addEventListener('click',event=>{if(event.target.dataset.page){customerPage=Number(event.target.dataset.page);renderCustomers();}});
  $('#customer-dialog-body').addEventListener('click',event=>{
    if(event.target.dataset.contact)contactCustomer(event.target.dataset.contactCustomer,event.target.dataset.contact);
    else if(event.target.dataset.editCustomer)openEditCustomer(event.target.dataset.editCustomer);
    else if(event.target.dataset.bookCustomer){$('#customer-dialog').close();openBooking(event.target.dataset.bookCustomer);}
    else if(event.target.dataset.saleCustomer){$('#customer-dialog').close();openSale(event.target.dataset.saleCustomer);}
    else if(event.target.dataset.mailboxCustomer)openMailboxForCustomer(event.target.dataset.mailboxCustomer);
    else if(event.target.dataset.editAppointment)openEditAppointmentHistory(event.target.dataset.editAppointment);
    else if(event.target.dataset.rebookAppointment)rebookHistoricalAppointment(event.target.dataset.rebookAppointment);
    else if(event.target.dataset.removePhoto&&confirm('Remove this photo from the demo customer record?'))removeCustomerPhoto(event.target.dataset.photoCustomer,event.target.dataset.removePhoto);
  });
  $('#customer-dialog-body').addEventListener('change',event=>{
    if(event.target.matches('[data-photo-input]'))uploadCustomerPhoto(event.target.dataset.photoCustomer,event.target.files[0]);
  });
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  $('#new-appointment-btn').addEventListener('click',()=>openBooking());
  $('#new-appointment-btn-2').addEventListener('click',()=>openBooking());

  $('#previous-week').addEventListener('click',()=>{calendarWeekStart=addDays(calendarWeekStart,-7);renderAppointments();});
  $('#next-week').addEventListener('click',()=>{calendarWeekStart=addDays(calendarWeekStart,7);renderAppointments();});
  $('#current-week').addEventListener('click',()=>{calendarWeekStart=startOfWeek(TODAY);renderAppointments();});
  $('#calendar-provider-filter').addEventListener('change',event=>{calendarProviderFilter=event.target.value;renderAppointments();});
  $('#optometrist-team').addEventListener('click',event=>{
    const card=event.target.closest('[data-provider-filter]'); if(!card)return;
    calendarProviderFilter=calendarProviderFilter===card.dataset.providerFilter?'all':card.dataset.providerFilter;
    renderAppointments();
  });
  $('#calendar-grid').addEventListener('click',event=>{
    const customer=event.target.closest('[data-calendar-customer]');
    if(customer){showCustomer(customer.dataset.calendarCustomer);return;}
    const slot=event.target.closest('[data-calendar-slot]');
    if(slot)openBooking('',slot.dataset.slotDate,slot.dataset.slotTime,slot.dataset.slotProvider||'');
  });
  $('#available-slots').addEventListener('click',event=>{
    const slot=event.target.closest('[data-slot-date]');
    if(slot)openBooking('',slot.dataset.slotDate,slot.dataset.slotTime,slot.dataset.slotProvider||'');
  });
  $('#appointments-list').addEventListener('click',event=>{
    const row=event.target.closest('[data-calendar-customer]'); if(row)showCustomer(row.dataset.calendarCustomer);
  });
  $('#history-search').addEventListener('input',event=>{historySearchTerm=event.target.value.trim();renderAppointmentHistory();});
  $('#history-status-filter').addEventListener('change',event=>{historyStatusFilter=event.target.value;renderAppointmentHistory();});
  $('#history-provider-filter').addEventListener('change',event=>{historyProviderFilter=event.target.value;renderAppointmentHistory();});
  $('#appointment-history-list').addEventListener('click',event=>{
    const customer=event.target.closest('[data-history-customer]');
    const edit=event.target.closest('[data-edit-appointment]');
    const rebook=event.target.closest('[data-rebook-appointment]');
    if(customer)showCustomer(customer.dataset.historyCustomer);
    else if(edit)openEditAppointmentHistory(edit.dataset.editAppointment);
    else if(rebook)rebookHistoricalAppointment(rebook.dataset.rebookAppointment);
  });
  $('#appointment-history-form').addEventListener('submit',event=>{event.preventDefault();saveAppointmentHistory();});
  ['appointment-date','appointment-time','appointment-type'].forEach(id=>$('#'+id).addEventListener('change',()=>updateProviderOptions($('#appointment-optometrist').value)));
  $('#appointment-form').addEventListener('submit',event=>{
    event.preventDefault();
    const ok=createAppointment($('#appointment-customer').value,$('#appointment-date').value,$('#appointment-time').value,$('#appointment-type').value,$('#appointment-optometrist').value);
    if(ok)$('#appointment-dialog').close();
  });

  $('#product-category-filter').addEventListener('change',event=>{productCategoryFilter=event.target.value;renderProducts();});
  $('#product-search').addEventListener('input',event=>{productSearchTerm=event.target.value.trim();renderProducts();});
  $('#products-body').addEventListener('click',event=>{const button=event.target.closest('[data-sale-product]');if(button)openSale('',button.dataset.saleProduct);});
  $('#new-sale-btn').addEventListener('click',()=>openSale());
  $('#recent-sales').addEventListener('click',event=>{const row=event.target.closest('[data-sale-customer-view]');if(row)showCustomer(row.dataset.saleCustomerView);});
  $('#dashboard-sales').addEventListener('click',event=>{const row=event.target.closest('[data-dashboard-sale-customer]');if(row)showCustomer(row.dataset.dashboardSaleCustomer);});
  $('#sale-product').addEventListener('change',updateSaleSummary);
  $('#sale-quantity').addEventListener('input',updateSaleSummary);
  $('#sale-form').addEventListener('submit',event=>{event.preventDefault();recordSale();});
  $('#export-sales').addEventListener('click',exportSalesCsv);

  $('#mail-folders').addEventListener('click',event=>{
    const folder=event.target.closest('[data-mail-folder]');if(!folder)return;
    activeMailFolder=folder.dataset.mailFolder;emailCustomerFilter='';activeEmailId='';renderMailbox();
  });
  $('#mail-search').addEventListener('input',event=>{emailSearchTerm=event.target.value.trim();activeEmailId='';renderMailbox();});
  $('#clear-mail-customer-filter').addEventListener('click',()=>{emailCustomerFilter='';activeEmailId='';renderMailbox();});
  $('#mail-list').addEventListener('click',event=>{const item=event.target.closest('[data-email-id]');if(item)openEmail(item.dataset.emailId);});
  $('#mail-reader').addEventListener('click',event=>{
    if(event.target.dataset.mailReply)openCompose('',event.target.dataset.mailReply,'');
    else if(event.target.dataset.mailEditDraft)openCompose('','',event.target.dataset.mailEditDraft);
    else if(event.target.dataset.mailCustomer)showCustomer(event.target.dataset.mailCustomer);
    else if(event.target.dataset.mailToggleUnread){const email=emailById(event.target.dataset.mailToggleUnread);if(email){email.unread=!email.unread;save();renderMailbox();}}
    else if(event.target.dataset.mailToggleStar){const email=emailById(event.target.dataset.mailToggleStar);if(email){email.starred=!email.starred;save();renderMailbox();}}
  });
  $('#compose-email-btn').addEventListener('click',()=>openCompose());
  $('#compose-customer').addEventListener('change',event=>{const customer=getCustomer(event.target.value);if(customer)$('#compose-to').value=customer.email;});
  $('#email-compose-form').addEventListener('submit',event=>{event.preventDefault();sendDemoEmail();});
  $('#save-email-draft').addEventListener('click',saveEmailDraft);

  $('#edit-customer-form').addEventListener('submit',event=>{event.preventDefault();saveCustomerEdit();});
  function handleChatAction(event){
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.contact)contactCustomer(target.dataset.contactCustomer,target.dataset.contact);
    else if(target.dataset.chatCustomer)showCustomer(target.dataset.chatCustomer);
    else if(target.dataset.chatBook)openBooking(target.dataset.chatBook);
    else if(target.dataset.chatBookSlot)openBooking(target.dataset.chatCustomerId||'',target.dataset.slotDate,target.dataset.slotTime,target.dataset.slotProvider||'',target.dataset.slotType);
    else if(target.dataset.chatCalendar)navigate('appointments');
    else if(target.dataset.chatProducts)navigate('products');
    else if(target.dataset.chatSale)openSale(target.dataset.chatSale);
    else if(target.dataset.chatMailbox){if(target.dataset.chatMailbox==='all'){emailCustomerFilter='';navigate('mailbox');}else openMailboxForCustomer(target.dataset.chatMailbox);}
    else if(target.dataset.chatAutomations){navigate('automations');window.setTimeout(()=>window.PingstarAutomation?.openTab?.(target.dataset.chatAutomations),100);}
    else if(target.dataset.chatAiWorkflow){navigate('automations');window.setTimeout(()=>document.querySelector('#ai-workflow-dialog')?.showModal(),120);}
    else if(target.dataset.chatBriefing)askAssistant('Give me today’s practice briefing');
  }
  $('#chat-form').addEventListener('submit',event=>{event.preventDefault();const input=$('#chat-input');const text=input.value;input.value='';askAssistant(text);});
  $('#suggestions').addEventListener('click',event=>{if(event.target.tagName==='BUTTON')askAssistant(event.target.textContent);});
  $('#chat-messages').addEventListener('click',handleChatAction);
  $('#floating-chat-messages').addEventListener('click',handleChatAction);
  $('#ai-chat-launcher').addEventListener('click',()=>$('#ai-floating-chat').classList.contains('open')?closeFloatingChat():openFloatingChat());
  $('#ai-chat-close').addEventListener('click',closeFloatingChat);
  $('#ai-chat-clear').addEventListener('click',()=>{if(confirm('Clear the local AI conversation?'))clearChat();});
  $('#ai-chat-expand').addEventListener('click',()=>{closeFloatingChat();navigate('assistant');});
  $('#floating-chat-form').addEventListener('submit',event=>{event.preventDefault();const input=$('#floating-chat-input');const text=input.value;input.value='';input.style.height='auto';askAssistant(text);});
  $('#floating-chat-suggestions').addEventListener('click',event=>{if(event.target.tagName==='BUTTON')askAssistant(event.target.textContent);});
  $('#floating-chat-input').addEventListener('input',event=>{event.target.style.height='auto';event.target.style.height=`${Math.min(event.target.scrollHeight,92)}px`;});
  $('#floating-chat-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#floating-chat-form').requestSubmit();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#ai-floating-chat').classList.contains('open'))closeFloatingChat();});
  $('#export-customers').addEventListener('click',exportCsv);
  $('#download-json').addEventListener('click',()=>download('pingstar-demo-data.json',JSON.stringify({customers,optometrists,appointments,products,sales,emails},null,2),'application/json'));
  $('#reset-demo').addEventListener('click',()=>{
    if(!confirm('Reset all demo changes and restore the original data?'))return;
    customers=clone(window.DEMO_CUSTOMERS).map(customer=>({...customer,photos:[]}));
    appointments=clone(window.DEMO_APPOINTMENTS);
    products=clone(window.DEMO_PRODUCTS);
    sales=clone(window.DEMO_SALES);
    emails=clone(window.DEMO_EMAILS);
    chatHistory=[{role:'assistant',html:CHAT_GREETING,at:new Date().toISOString()}];saveChat();
    calendarWeekStart=startOfWeek(TODAY);calendarProviderFilter='all';productCategoryFilter='all';productSearchTerm='';activeMailFolder='inbox';activeEmailId='';emailSearchTerm='';emailCustomerFilter='';historySearchTerm='';historyStatusFilter='all';historyProviderFilter='all';
    $('#product-search').value='';$('#mail-search').value='';$('#history-search').value='';
    save();renderAll();
    if(window.PingstarAutomation) window.PingstarAutomation.reset(false);
    toast('Demo data restored.');
  });

  window.PingstarApp={
    addPublicBooking(booking,sourceRef=''){
      if(!booking||!booking.date||!booking.time)return null;
      const cleanRef=String(sourceRef||booking.reference||Date.now()).replace(/[^a-z0-9-]/gi,'').slice(0,50);
      const customerId=`WEB-${cleanRef}`;
      let customer=getCustomer(customerId);
      if(!customer){
        const parts=String(booking.name||'Website Customer').trim().split(/\s+/);
        const firstName=parts.shift()||'Website';
        const lastName=parts.join(' ')||'Customer';
        const next=new Date(`${booking.date}T12:00:00`);next.setFullYear(next.getFullYear()+1);
        customer={id:customerId,firstName,lastName,dob:'1990-01-01',phone:booking.phone||'',email:booking.email||'',address:'To be confirmed',preferredContact:'SMS',status:'Active',communicationConsent:false,lastEyeExam:booking.date,recallMonths:12,nextRecall:isoDate(next),prescription:{right:{sphere:0,cylinder:0,axis:0,add:0},left:{sphere:0,cylinder:0,axis:0,add:0},issued:booking.date},clinicalFlags:[],lastContact:{date:booking.date,type:'Website chatbot',reason:'Self-service appointment booking',outcome:'Appointment confirmed'},notes:'Created automatically from the public missed-call booking chatbot. Personal and clinical details require staff verification.',photos:[]};
        customers.push(customer);
      }
      const appointmentId=`PUBLIC-${cleanRef}`;
      let appointment=appointments.find(item=>item.id===appointmentId);
      const typeMap={routine:'Routine eye examination',contact:'Contact lens check',children:"Children's eye examination",urgent:'Urgent eye concern',collection:'Frame fitting'};
      const record={id:appointmentId,customerId,date:booking.date,time:booking.time,type:typeMap[booking.type]||booking.appointmentType||'Routine eye examination',optometrist:booking.practitioner||'Dr Amelia Reed',status:'Confirmed',duration:Number(booking.duration)||30,source:'Public missed-call chatbot',bookingReference:booking.reference||sourceRef};
      if(appointment)Object.assign(appointment,record);else appointments.push(record);
      save();renderAll();
      return {customerId,appointmentId};
    }
  };
  if(!Array.isArray(chatHistory)||!chatHistory.length)chatHistory=[{role:'assistant',html:CHAT_GREETING,at:new Date().toISOString()}];
  renderChatHistory();
  renderAll();
  checkLiveAiStatus();
})();
