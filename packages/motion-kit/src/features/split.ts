import type { Feature } from './types';

// data-sf-split="words|chars" — splits a headline so each word (or letter)
// slides up in turn. Screen readers still read the original sentence.
export function splitText(el: HTMLElement, mode: 'words' | 'chars') {
  const original = el.textContent ?? '';
  let i = 0;
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        const parts = (child.textContent ?? '').split(/(\s+)/);
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(' '));
            continue;
          }
          const units = mode === 'chars' ? Array.from(part) : [part];
          const word = document.createElement('span');
          word.className = 'sf-w';
          for (const u of units) {
            const inner = document.createElement('span');
            inner.className = 'sf-wi';
            inner.style.setProperty('--i', String(i++));
            inner.textContent = u;
            word.append(inner);
          }
          frag.append(word);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.className = 'sf-split-visual';
  visual.append(...Array.from(el.childNodes));
  walk(visual);
  const sr = document.createElement('span');
  sr.className = 'sf-sr';
  sr.textContent = original;
  el.append(sr, visual);
  el.classList.add('sf-split');
  return i;
}

export const split: Feature = {
  selector: '[data-sf-split]',
  setup(el) {
    const mode = el.getAttribute('data-sf-split') === 'chars' ? 'chars' : 'words';
    splitText(el, mode);
  },
};
