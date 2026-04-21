import { useEffect, useId, useRef, useState } from "react";

type PermissionMultiSelectOption = {
  value: string;
  label: string;
};

type PermissionMultiSelectProps = {
  ariaLabel: string;
  options: PermissionMultiSelectOption[];
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
};

export default function PermissionMultiSelect({
  ariaLabel,
  options,
  placeholder,
  value,
  onChange
}: PermissionMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupId = useId();

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  function toggleValue(nextValue: string) {
    onChange(
      value.includes(nextValue)
        ? value.filter((item) => item !== nextValue)
        : value.concat(nextValue)
    );
  }

  return (
    <div className="cv-multi-select" ref={rootRef}>
      <button
        type="button"
        className="cv-input cv-multi-select__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={popupId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedLabels.length > 0 ? "" : "cv-muted"}>
          {selectedLabels.length > 0 ? selectedLabels.join("、") : placeholder}
        </span>
        <span className="cv-multi-select__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="cv-multi-select__menu" id={popupId} role="listbox" aria-multiselectable="true">
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <label key={option.value} className="cv-multi-select__option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
