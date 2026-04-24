// Vantage content script — runs on every page
// Listens for messages from the popup to scan and fill forms.

const FILLABLE_SELECTORS = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]), textarea, select';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_FORM") {
    handleScan(sendResponse);
    return true; // keep channel open for async response
  }

  if (message.type === "FILL_FORM") {
    handleFill(message.mapping);
    sendResponse({ ok: true });
    return true;
  }
});

function handleScan(sendResponse: (r: unknown) => void) {
  const form = findBestForm();
  if (!form) {
    sendResponse({ formHtml: null, fieldCount: 0 });
    return;
  }

  const fields = form.querySelectorAll(FILLABLE_SELECTORS);
  sendResponse({
    formHtml: form.outerHTML,
    fieldCount: fields.length,
  });
}

function handleFill(mapping: Record<string, string>) {
  const form = findBestForm();
  if (!form) return;

  for (const [key, value] of Object.entries(mapping)) {
    // Try by name, id, then placeholder
    const el =
      form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${CSS.escape(key)}"], [id="${CSS.escape(key)}"]`
      );

    if (!el) continue;

    if (el instanceof HTMLSelectElement) {
      const opt = Array.from(el.options).find(
        (o) => o.value.toLowerCase() === value.toLowerCase() || o.text.toLowerCase() === value.toLowerCase()
      );
      if (opt) {
        el.value = opt.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      // Native input value setter to trigger React/Vue/Angular listeners
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeInputValueSetter && el instanceof HTMLInputElement) {
        nativeInputValueSetter.call(el, value);
      } else {
        el.value = value;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    highlightFilled(el);
  }
}

function findBestForm(): HTMLFormElement | null {
  const forms = Array.from(document.querySelectorAll("form"));
  if (forms.length === 0) return null;

  // Prefer the form with the most fillable fields
  return forms.sort((a, b) => {
    return b.querySelectorAll(FILLABLE_SELECTORS).length -
           a.querySelectorAll(FILLABLE_SELECTORS).length;
  })[0];
}

function highlightFilled(el: Element) {
  const prev = (el as HTMLElement).style.outline;
  (el as HTMLElement).style.outline = "2px solid #4ade80";
  (el as HTMLElement).style.transition = "outline 0.3s";
  setTimeout(() => {
    (el as HTMLElement).style.outline = prev;
  }, 2000);
}
