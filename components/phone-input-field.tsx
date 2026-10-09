"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import {
  findPhoneCountry,
  getPhoneCountryOptions,
  type PhoneCountryOption,
} from "@/lib/phone-countries";
import { checkNationalPhone, digitsOnly } from "@/lib/phone";
import type { CountryCode } from "libphonenumber-js";

export type PhoneInputValue = {
  country: CountryCode;
  national: string;
};

export function PhoneInputField({
  id,
  label = "Téléphone",
  value,
  onChange,
  disabled,
  size = "sm",
  required,
}: {
  id?: string;
  label?: string;
  value: PhoneInputValue;
  onChange: (next: PhoneInputValue) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  required?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => getPhoneCountryOptions(), []);
  const selected = findPhoneCountry(value.country);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.callingCode.includes(q.replace(/^\+/, "")),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickCountry(option: PhoneCountryOption) {
    onChange({ country: option.code, national: value.national });
    setOpen(false);
    setQuery("");
  }

  const fieldClass = size === "sm" ? "field field-sm" : "field";
  const maxLen = Math.max(selected.nationalLength + 2, 15);

  return (
    <div className={fieldClass} ref={rootRef}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="field-required" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className="phone-input-row">
        <button
          type="button"
          className="phone-country-trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="phone-flag" aria-hidden>
            {selected.flag}
          </span>
          <span className="phone-dial">+{selected.callingCode}</span>
          <ChevronsUpDownIcon className="phone-caret" aria-hidden />
        </button>

        <div className="phone-national-wrap">
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required={required}
            disabled={disabled}
            className="phone-national-input"
            placeholder={selected.placeholder}
            maxLength={maxLen}
            value={value.national}
            onChange={(e) =>
              onChange({
                country: value.country,
                national: digitsOnly(e.target.value).slice(0, maxLen),
              })
            }
            aria-describedby={id ? `${id}-hint` : undefined}
          />
        </div>
      </div>

      <p id={id ? `${id}-hint` : undefined} className="phone-hint">
        Indicatif <strong>+{selected.callingCode}</strong> · saisissez seulement
        le numéro local (~{selected.nationalLength} chiffres)
      </p>

      {open ? (
        <div className="phone-country-panel" role="listbox" id={listId}>
          <div className="phone-country-search">
            <SearchIcon className="size-3.5 opacity-60" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays…"
              aria-label="Rechercher un pays"
            />
          </div>
          <ul className="phone-country-list">
            {filtered.length === 0 ? (
              <li className="phone-country-empty">Aucun pays trouvé</li>
            ) : (
              filtered.map((option) => {
                const active = option.code === selected.code;
                return (
                  <li key={option.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={
                        active
                          ? "phone-country-option is-active"
                          : "phone-country-option"
                      }
                      onClick={() => pickCountry(option)}
                    >
                      <span className="phone-flag" aria-hidden>
                        {option.flag}
                      </span>
                      <span className="phone-country-name">{option.name}</span>
                      <span className="phone-country-code">
                        +{option.callingCode}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function resolvePhoneInput(
  value: PhoneInputValue,
): ReturnType<typeof checkNationalPhone> {
  return checkNationalPhone(value.national, value.country);
}
