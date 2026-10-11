// Reworked Notes — idee di abbigliamento reworked al volo (dati solo su questo dispositivo)
const ideaText = document.getElementById('ideaText');
const itemType = document.getElementById('itemType');
const style = document.getElementById('style');
const photo = document.getElementById('photo');
const saveBtn = document.getElementById('saveBtn');
const ideasList = document.getElementById('ideasList');
const countEl = document.getElementById('count');
const fab = document.getElementById('fab');
const formCard = document.getElementById('formCard');
const exportBtn = document.getElementById('exportBtn');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let ideas = [];
try { ideas = JSON.parse(localStorage.getItem('reworked_ideas') || '[]') || []; } catch (e) { ideas = []; }

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach((el) => el.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// Salva; se lo spazio è pieno non perde l'idea già scritta nel modulo
function saveIdeas() {
  try {
    localStorage.setItem('reworked_ideas', JSON.stringify(ideas));
    render();
    return true;
  } catch (e) {
    render();
    return false;
  }
}

function render() {
  if (window.navBadge) window.navBadge('ideasBadge', ideas.length);
  countEl.textContent = ideas.length ? `${ideas.length} ${ideas.length === 1 ? 'idea' : 'idee'}` : '';
  exportBtn.hidden = !ideas.length;
  if (!ideas.length) {
    ideasList.innerHTML = '<div class="empty">Nessuna idea ancora.<br><span class="only-wide">Scrivi qui sopra e premi «Salva idea».</span><a href="#nuova" class="only-mobile empty-link">Scrivi la prima idea</a></div>';
    return;
  }
  ideasList.innerHTML = ideas.map((idea, i) => `
    <div class="idea">
      <div class="idea-meta">${esc(new Date(idea.date).toLocaleString('it-IT'))} · ${esc(idea.itemType || '—')} · ${esc(idea.style || '—')}</div>
      <div class="idea-text">${esc(idea.text || '(senza testo)')}</div>
      ${idea.photo && /^data:image\//.test(idea.photo) ? `<img src="${esc(idea.photo)}" alt="Foto ispirazione">` : ''}
      <button class="secondary" data-del="${i}">Elimina</button>
    </div>
  `).join('');
}

ideasList.addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (b) window.deleteIdea(+b.dataset.del);
});

window.deleteIdea = (i) => {
  if (confirm('Eliminare questa idea?')) {
    ideas.splice(i, 1);
    saveIdeas();
  }
};

// Le foto del telefono sono grandi: le rimpicciolisco (max 1280 px, JPEG) per non riempire la memoria
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('foto non leggibile')); };
    img.src = url;
  });
}

saveBtn.onclick = async () => {
  const text = ideaText.value.trim();
  if (!text && !photo.files.length) {
    toast('Scrivi almeno un’idea o aggiungi una foto');
    ideaText.focus();
    return;
  }

  const idea = {
    text,
    itemType: itemType.value,
    style: style.value,
    date: Date.now(),
    photo: null
  };

  saveBtn.disabled = true;
  try {
    if (photo.files[0]) {
      try { idea.photo = await shrinkPhoto(photo.files[0]); }
      catch (e) { toast('Non riesco a leggere questa foto: salvo solo il testo'); }
    }
    ideas.unshift(idea);
    if (saveIdeas()) {
      resetForm();
      toast(window.matchMedia('(max-width: 899px)').matches ? 'Idea salvata: la trovi in «Idee»' : 'Idea salvata');
    } else {
      ideas.shift();
      render();
      toast('Memoria piena: elimina qualche idea con foto e riprova');
    }
  } finally {
    saveBtn.disabled = false;
  }
};

function resetForm() {
  ideaText.value = '';
  itemType.value = '';
  style.value = '';
  photo.value = '';
}

fab.onclick = () => {
  if (window.goTab) window.goTab('nuova');
  formCard.scrollIntoView({ behavior: 'smooth' });
  ideaText.focus();
};

// Copia tutte le idee come testo (per WhatsApp, email, note)
window.exportIdeas = () => {
  const txt = ideas.map(i =>
    `[${new Date(i.date).toLocaleString('it-IT')}] ${i.itemType || ''} | ${i.style || ''}\n${i.text}\n---`
  ).join('\n\n');
  const done = () => toast('Idee copiate: ora puoi incollarle dove vuoi');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
  } else {
    fallbackCopy(txt, done);
  }
};
function fallbackCopy(txt, done) {
  const ta = document.createElement('textarea');
  ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Copia non riuscita'); }
  ta.remove();
}
exportBtn.onclick = () => window.exportIdeas();

render();
