'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_PHONE_COUNTRY_ISO,
  findPhoneCountryOption,
  getPhoneCountryCodeOptions,
  toE164Phone,
} from '@/lib/phone-country-codes'

/**
 * Phone field UI inspired by modern country-code pickers:
 * flag trigger + searchable list + dial code inside the input.
 * Emits E.164 via onChange, e.g. +916983…
 */
export default function FormPhoneInput({
  label = 'Phone number',
  required = false,
  placeholder = '',
  value = '',
  countryCode = DEFAULT_PHONE_COUNTRY_CODE,
  countryIso = DEFAULT_PHONE_COUNTRY_ISO,
  onChange,
  onCountryChange,
  disabled = false,
  readOnly = false,
  className,
  style,
}) {
  const options = useMemo(() => getPhoneCountryCodeOptions(), [])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => findPhoneCountryOption(countryCode, countryIso))
  const [national, setNational] = useState(() => stripDialCode(value, countryCode))
  const rootRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    setSelected(findPhoneCountryOption(countryCode, countryIso))
  }, [countryCode, countryIso])

  useEffect(() => {
    setNational(stripDialCode(value, selected?.code || countryCode))
  }, [value, selected?.code, countryCode])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.code.includes(q) ||
        o.iso.toLowerCase().includes(q)
    )
  }, [options, query])

  const emit = (nextNational, nextCountry) => {
    const e164 = toE164Phone(nextCountry.code, nextNational)
    onChange?.(e164, {
      countryCode: nextCountry.code,
      countryIso: nextCountry.iso,
      national: nextNational,
    })
  }

  const pickCountry = (opt) => {
    setSelected(opt)
    setOpen(false)
    setQuery('')
    onCountryChange?.(opt)
    emit(national, opt)
  }

  const interactive = !disabled && !readOnly

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'flex min-h-[52px] items-stretch overflow-hidden rounded-lg border transition-shadow',
          !style?.backgroundColor && 'bg-white',
          open ? 'border-slate-700 shadow-sm' : !style?.borderColor && 'border-slate-300',
          disabled && 'opacity-70'
        )}
        style={style}
      >
        <button
          type="button"
          disabled={!interactive}
          onClick={(e) => {
            e.stopPropagation()
            if (!interactive) return
            setOpen((v) => !v)
          }}
          className={cn(
            'flex w-14 shrink-0 items-center justify-center gap-0.5 border-r border-slate-200 bg-white px-1.5',
            interactive && 'hover:bg-slate-50 cursor-pointer',
            !interactive && 'cursor-default'
          )}
          aria-label="Select country"
        >
          <span className="text-xl leading-none">{selected?.flag}</span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', open && 'rotate-180')}
          />
        </button>

        <label className="relative flex min-w-0 flex-1 cursor-text flex-col justify-center px-3 py-1.5">
          <span className="text-[11px] font-medium leading-none text-slate-400">
            {label}
            {required ? <span className="text-slate-500">*</span> : null}
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="shrink-0 text-sm font-medium text-slate-900">{selected?.code}</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              disabled={!interactive}
              readOnly={readOnly}
              value={national}
              placeholder={placeholder || ''}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d\s()-]/g, '')
                setNational(next)
                emit(next, selected)
              }}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-300 disabled:cursor-default"
            />
          </div>
        </label>
      </div>

      {open && interactive ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for countries."
              className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-slate-400">No countries found</li>
            ) : (
              filtered.map((opt) => {
                const isActive = opt.iso === selected?.iso && opt.code === selected?.code
                return (
                  <li key={`${opt.iso}-${opt.code}`}>
                    <button
                      type="button"
                      onClick={() => pickCountry(opt)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                        isActive ? 'bg-sky-50 text-slate-900' : 'text-slate-700 hover:bg-sky-50'
                      )}
                    >
                      <span className="text-lg leading-none">{opt.flag}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {opt.name} ({opt.code})
                      </span>
                      {isActive ? <Check className="h-4 w-4 shrink-0 text-sky-600" /> : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function stripDialCode(e164, countryCode) {
  const digits = String(e164 || '').replace(/\D/g, '')
  const codeDigits = String(countryCode || '').replace(/\D/g, '')
  if (!digits) return ''
  if (codeDigits && digits.startsWith(codeDigits)) return digits.slice(codeDigits.length)
  return digits
}

/** Markup shell for exported HTML forms — JS fills country list & syncs E.164. */
export function getFormPhoneExportMarkup(field, { fieldName, styleString, escapeHtmlAttr, required }) {
  const id = escapeHtmlAttr(field.id || 'phone')
  const label = escapeHtmlAttr(field.label || 'Phone number')
  const placeholder = escapeHtmlAttr(field.placeholder || '')
  const defaultCode = escapeHtmlAttr(field.defaultCountryCode || DEFAULT_PHONE_COUNTRY_CODE)
  const defaultIso = escapeHtmlAttr(field.defaultCountryIso || DEFAULT_PHONE_COUNTRY_ISO)
  const reqMark = required ? '*' : ''
  // Prefer CSS variables so host-page CSS can theme the whole control (not just the tel input).
  const shellExtra = styleString ? ` ${styleString}` : ''

  return `
      <div class="crm-phone-field" data-phone-field="1" data-default-code="${defaultCode}" data-default-iso="${defaultIso}" style="margin:0; position:relative; width:100%; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div class="crm-phone-shell" style="display:flex; min-height:52px; border:1px solid var(--cadance-input-border, #cbd5e1); border-radius:0.5rem; overflow:hidden; background:var(--cadance-input-bg, #fff); color:var(--cadance-input-text, #0f172a);${shellExtra}">
          <button type="button" class="crm-phone-flag-btn" aria-label="Select country" style="width:3.5rem; flex-shrink:0; border:none; border-right:1px solid var(--cadance-input-border, #e2e8f0); background:transparent; color:inherit; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:2px; padding:0 0.35rem;">
            <span class="crm-phone-flag" style="font-size:1.25rem; line-height:1;">🏳️</span>
            <span class="crm-phone-caret" style="font-size:10px; color:var(--cadance-muted-text, #64748b);">▾</span>
          </button>
          <div class="crm-phone-body" style="flex:1; min-width:0; padding:0.35rem 0.75rem; display:flex; flex-direction:column; justify-content:center; background:transparent;">
            <span class="crm-phone-label" style="font-size:11px; font-weight:500; color:var(--cadance-muted-text, #94a3b8); line-height:1;">${label}${reqMark}</span>
            <div class="crm-phone-row" style="display:flex; align-items:center; gap:0.35rem; margin-top:0.2rem;">
              <span class="crm-phone-dial" style="font-size:0.875rem; font-weight:500; color:var(--cadance-input-text, #0f172a);">${defaultCode}</span>
              <input type="tel" class="crm-phone-local" data-crm-phone-local="1" placeholder="${placeholder}" ${required ? 'required' : ''} inputmode="tel" autocomplete="tel-national" style="flex:1; min-width:0; border:none; outline:none; background:transparent; font-size:0.875rem; color:var(--cadance-input-text, #0f172a); padding:0;" />
            </div>
          </div>
        </div>
        <div class="crm-phone-dropdown" hidden style="position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:40; background:var(--cadance-input-bg, #fff); color:var(--cadance-input-text, #0f172a); border:1px solid var(--cadance-input-border, #e2e8f0); border-radius:0.5rem; box-shadow:0 10px 15px -3px rgba(0,0,0,.1); overflow:hidden;">
          <div class="crm-phone-search-row" style="display:flex; align-items:center; gap:0.5rem; padding:0.65rem 0.75rem; border-bottom:1px solid var(--cadance-input-border, #f1f5f9);">
            <span style="color:var(--cadance-muted-text, #94a3b8); font-size:0.85rem;">⌕</span>
            <input type="text" class="crm-phone-search" data-crm-phone-search="1" placeholder="Search for countries." style="flex:1; border:none; outline:none; font-size:0.875rem; background:transparent; color:inherit;" />
          </div>
          <ul class="crm-phone-list" style="list-style:none; margin:0; padding:0.25rem 0; max-height:14rem; overflow:auto;"></ul>
        </div>
        <input type="hidden" class="crm-phone-e164" name="${escapeHtmlAttr(fieldName)}" value="" data-crm-phone-e164="1" />
        <input type="hidden" class="crm-phone-cc" data-crm-phone-cc="1" value="${defaultCode}" />
      </div>`
}

export function getFormPhoneExportRuntimeScript() {
  const countriesJson = JSON.stringify(getPhoneCountryCodeOptions())
  return `
      (function() {
        var COUNTRIES = ${countriesJson};
        function flag(iso) {
          iso = String(iso || '').toUpperCase();
          if (!/^[A-Z]{2}$/.test(iso)) return '';
          return String.fromCodePoint.apply(null, iso.split('').map(function(c){ return 127397 + c.charCodeAt(0); }));
        }
        function toE164(code, national) {
          var codeDigits = String(code || '').replace(/\\D/g, '');
          var n = String(national || '').replace(/\\D/g, '');
          if (!n) return '';
          if (n.charAt(0) === '0') n = n.replace(/^0+/, '');
          if (codeDigits && n.indexOf(codeDigits) === 0) n = n.slice(codeDigits.length);
          return (codeDigits && n) ? ('+' + codeDigits + n) : (n ? ('+' + n) : '');
        }
        function findCountry(code, iso) {
          if (iso) {
            for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].iso === iso) return COUNTRIES[i];
          }
          for (var j = 0; j < COUNTRIES.length; j++) if (COUNTRIES[j].code === code) return COUNTRIES[j];
          return COUNTRIES[0];
        }
        function sync(wrap) {
          var dial = wrap.querySelector('.crm-phone-dial');
          var local = wrap.querySelector('.crm-phone-local');
          var hidden = wrap.querySelector('.crm-phone-e164');
          var cc = wrap.querySelector('.crm-phone-cc');
          var code = (cc && cc.value) || '';
          if (hidden) hidden.value = toE164(code, local && local.value);
          if (dial) dial.textContent = code;
        }
        function renderList(wrap, q) {
          var list = wrap.querySelector('.crm-phone-list');
          var cc = wrap.querySelector('.crm-phone-cc');
          var selectedCode = cc && cc.value;
          var selectedIso = wrap.getAttribute('data-selected-iso');
          var query = String(q || '').trim().toLowerCase();
          var html = '';
          COUNTRIES.forEach(function(c) {
            if (query && !(c.name.toLowerCase().indexOf(query) >= 0 || c.code.indexOf(query) >= 0 || c.iso.toLowerCase().indexOf(query) >= 0)) return;
            var active = c.iso === selectedIso && c.code === selectedCode;
            html += '<li><button type="button" data-iso="' + c.iso + '" data-code="' + c.code + '" style="display:flex;width:100%;align-items:center;gap:0.6rem;padding:0.5rem 0.75rem;border:none;background:' + (active ? '#f0f9ff' : 'transparent') + ';cursor:pointer;text-align:left;font-size:0.875rem;color:#334155;">'
              + '<span style="font-size:1.1rem;line-height:1;">' + (c.flag || flag(c.iso)) + '</span>'
              + '<span style="flex:1;">' + c.name + ' (' + c.code + ')</span>'
              + (active ? '<span style="color:#0284c7;">✓</span>' : '')
              + '</button></li>';
          });
          if (!html) html = '<li style="padding:0.65rem 0.75rem;color:#94a3b8;font-size:0.875rem;">No countries found</li>';
          list.innerHTML = html;
          Array.prototype.forEach.call(list.querySelectorAll('button[data-code]'), function(btn) {
            btn.addEventListener('click', function() {
              var opt = findCountry(btn.getAttribute('data-code'), btn.getAttribute('data-iso'));
              wrap.setAttribute('data-selected-iso', opt.iso);
              wrap.querySelector('.crm-phone-cc').value = opt.code;
              wrap.querySelector('.crm-phone-flag').textContent = opt.flag || flag(opt.iso);
              wrap.querySelector('.crm-phone-dial').textContent = opt.code;
              wrap.querySelector('.crm-phone-dropdown').hidden = true;
              sync(wrap);
            });
            btn.addEventListener('mouseenter', function(){ btn.style.background = '#f0f9ff'; });
            btn.addEventListener('mouseleave', function(){
              var active = btn.getAttribute('data-iso') === wrap.getAttribute('data-selected-iso');
              btn.style.background = active ? '#f0f9ff' : 'transparent';
            });
          });
        }
        function initPhone(wrap) {
          var code = wrap.getAttribute('data-default-code') || '+1';
          var iso = wrap.getAttribute('data-default-iso') || 'US';
          var opt = findCountry(code, iso);
          wrap.setAttribute('data-selected-iso', opt.iso);
          wrap.querySelector('.crm-phone-cc').value = opt.code;
          wrap.querySelector('.crm-phone-flag').textContent = opt.flag || flag(opt.iso);
          wrap.querySelector('.crm-phone-dial').textContent = opt.code;
          var dropdown = wrap.querySelector('.crm-phone-dropdown');
          var flagBtn = wrap.querySelector('.crm-phone-flag-btn');
          var search = wrap.querySelector('.crm-phone-search');
          var local = wrap.querySelector('.crm-phone-local');
          flagBtn.addEventListener('click', function(e) {
            e.preventDefault();
            dropdown.hidden = !dropdown.hidden;
            if (!dropdown.hidden) {
              renderList(wrap, '');
              search.value = '';
              setTimeout(function(){ search.focus(); }, 0);
            }
          });
          search.addEventListener('input', function(){ renderList(wrap, search.value); });
          local.addEventListener('input', function(){ sync(wrap); });
          document.addEventListener('click', function(e) {
            if (!wrap.contains(e.target)) dropdown.hidden = true;
          });
          sync(wrap);
        }
        window.__crmInitPhones = function() {
          Array.prototype.forEach.call(document.querySelectorAll('[data-phone-field="1"]'), initPhone);
        };
        window.__crmSyncPhones = function(form) {
          Array.prototype.forEach.call((form || document).querySelectorAll('[data-phone-field="1"]'), sync);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.__crmInitPhones);
        else window.__crmInitPhones();
      })();
`
}
