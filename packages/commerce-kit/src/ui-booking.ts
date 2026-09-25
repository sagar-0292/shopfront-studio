import type { Kit } from './kit';
import type { Service, Slot } from './types';
import { h, announce } from './dom';
import { addDays, dayLabel, todayIST } from './slots';
import { checkCustomer, indianMobile } from './validate';
import { waLink, whatsappBookingText } from './whatsapp';
import { inr } from './money';

// <div data-sf-booking data-service="consultation" data-days="14"></div>
// Shows the next days, then the free time slots for the chosen day (checked
// live, and again just before booking), then a short form.
export function mountBooking(el: HTMLElement, kit: Kit) {
  const days = Math.min(60, Math.max(1, Number(el.getAttribute('data-days')) || 14));
  let services: Service[] = [];
  let service: Service | undefined;
  let date = todayIST();
  let slot: Slot | null = null;
  let slots: Slot[] = [];
  let loading = false;
  let message: { ok: boolean; text: string } | null = null;
  el.classList.add('sf-booking');

  async function loadSlots() {
    if (!service) return;
    loading = true; render();
    try { slots = await kit.source.slots(service.id, date); } catch { slots = []; message = { ok: false, text: 'We couldn’t load the free times. Please try again.' }; }
    if (slot && !slots.find((s) => s.time === slot!.time && s.available)) slot = null;
    loading = false; render();
  }

  function render() {
    if (!service) {
      el.replaceChildren(h('p', { class: 'sf-note' }, services.length ? '' : 'Online booking isn’t set up yet.'));
      if (!services.length) return;
    }
    const svcPicker = services.length > 1 && !el.getAttribute('data-service')
      ? h('div', { class: 'sf-field' }, h('label', { for: 'sf-b-service' }, 'Service'),
          h('select', { id: 'sf-b-service', onchange: (e: Event) => { service = services.find((s) => s.id === (e.target as HTMLSelectElement).value); slot = null; loadSlots(); } },
            ...services.map((s) => h('option', { value: s.id, selected: s.id === service?.id }, `${s.name} (${s.duration_minutes} min${s.price_paise ? `, ${inr(s.price_paise)}` : ''})`))))
      : h('p', { class: 'sf-booking-service' }, `${service!.name} · ${service!.duration_minutes} min${service!.price_paise ? ` · ${inr(service!.price_paise)}` : ''}`);
    const dayList = h('div', { class: 'sf-days', role: 'radiogroup', 'aria-label': 'Choose a day' },
      ...Array.from({ length: days }, (_, i) => {
        const d = addDays(todayIST(), i);
        const l = dayLabel(d);
        return h('button', { type: 'button', role: 'radio', 'aria-checked': String(d === date), class: 'sf-day', 'aria-label': l.long, 'data-date': d,
          onclick: () => { date = d; slot = null; message = null; loadSlots(); } },
          h('span', {}, i === 0 ? 'Today' : l.weekday), h('strong', {}, String(l.day)), h('span', {}, l.month));
      }));
    const slotList = loading
      ? h('p', { class: 'sf-note', 'aria-live': 'polite' }, 'Checking free times…')
      : slots.length
        ? h('div', { class: 'sf-slots', role: 'radiogroup', 'aria-label': `Times on ${dayLabel(date).long}` },
            ...slots.map((s) => h('button', { type: 'button', role: 'radio', class: 'sf-slot', 'aria-checked': String(slot?.time === s.time), disabled: !s.available, 'data-time': s.time,
              'aria-label': `${s.label}${s.available ? '' : ', not available'}`,
              onclick: () => { slot = s; message = null; render(); (el.querySelector('#sf-b-name') as HTMLInputElement | null)?.focus(); } }, s.label)))
        : h('p', { class: 'sf-note' }, 'No free times on this day. Please pick another day.');
    const form = slot
      ? h('form', { class: 'sf-booking-form', novalidate: true },
          h('p', { class: 'sf-booking-summary' }, `${dayLabel(date).long} at ${slot.label}`),
          h('div', { class: 'sf-field' }, h('label', { for: 'sf-b-name' }, 'Your name'), h('input', { id: 'sf-b-name', name: 'name', autocomplete: 'name', required: true, maxlength: 80 })),
          h('div', { class: 'sf-field' }, h('label', { for: 'sf-b-phone' }, 'Mobile number'), h('input', { id: 'sf-b-phone', name: 'phone', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', required: true, maxlength: 16 })),
          h('div', { class: 'sf-field' }, h('label', { for: 'sf-b-notes' }, 'Anything we should know? (optional)'), h('textarea', { id: 'sf-b-notes', name: 'notes', rows: 2, maxlength: 300 })),
          h('label', { class: 'sf-check sf-consent' }, h('input', { type: 'checkbox', name: 'consent', required: true }), ` I agree that ${kit.config.site.name} may use these details to manage my booking.`),
          h('button', { type: 'submit', class: 'sf-btn sf-btn-wide' }, 'Confirm booking'))
      : null;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const c = { name: String(d.get('name') ?? ''), phone: String(d.get('phone') ?? ''), notes: String(d.get('notes') ?? '') };
      const errs = checkCustomer(c, false);
      if (Object.keys(errs).length || !d.get('consent')) {
        message = { ok: false, text: errs.name ?? errs.phone ?? 'Please tick the box to agree to how we use your details.' };
        render();
        return;
      }
      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      btn.disabled = true; btn.textContent = 'Booking…';
      const r = await kit.source.book({ service: service!.id, date, time: slot!.time, name: c.name, phone: indianMobile(c.phone)!, notes: c.notes });
      if (r.ok) {
        message = { ok: true, text: `Booked! ${service!.name} on ${dayLabel(date).long} at ${slot!.label}. Reference ${r.reference}.` };
        announce(message.text);
        slot = null;
        await loadSlots();
      } else if (kit.config.whatsapp && /isn’t available yet/.test(r.message)) {
        window.open(waLink(kit.config.whatsapp, whatsappBookingText(kit.config.site.name, service!.name, dayLabel(date).long, slot!.label, c)), '_blank', 'noopener');
        message = { ok: true, text: 'Your booking request is ready in WhatsApp — press send and we’ll confirm.' };
        render();
      } else {
        message = { ok: false, text: r.message };
        await loadSlots();
      }
    });
    el.replaceChildren(svcPicker, dayList, slotList, ...(form ? [form] : []),
      message ? h('p', { class: message.ok ? 'sf-ok sf-booking-msg' : 'sf-err sf-booking-msg', role: message.ok ? 'status' : 'alert' }, message.text) : '');
    el.dataset.state = loading ? 'loading' : 'ready';
  }

  kit.source.services().then((list) => {
    services = list;
    service = list.find((s) => s.id === el.getAttribute('data-service')) ?? list[0];
    render();
    loadSlots();
  });
  // Keep availability fresh while the page is open.
  const timer = window.setInterval(() => { if (!document.hidden && !loading && el.isConnected) loadSlots(); }, 60_000);
  return () => clearInterval(timer);
}
