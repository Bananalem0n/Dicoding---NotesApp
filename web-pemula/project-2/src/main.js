import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Komponen App Bar
class AppBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<header style="display:flex;align-items:center;justify-content:center;"><span style="font-size:1.5rem;font-weight:500;letter-spacing:1px;">Aplikasi Catatan</span></header>`;
  }
}
customElements.define('app-bar', AppBar);

// Helper API
const API_BASE = 'https://notes-api.dicoding.dev/v2';

async function fetchNotes() {
  try {
    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error('Gagal mengambil data catatan');
    const data = await res.json();
    return data.data;
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat mengambil data.');
    return [];
  }
}

async function addNote(title, body) {
  try {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });
    if (!res.ok) throw new Error('Gagal menambahkan catatan');
    const data = await res.json();
    return data.data;
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat menambahkan catatan.');
    return null;
  }
}

async function deleteNote(id) {
  try {
    await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat menghapus catatan.');
  }
}

// Komponen Note Item
class NoteItem extends HTMLElement {
  set note(value) {
    this._note = value;
    this.render();
  }
  render() {
    const { id, title, body, createdAt } = this._note;
    this.innerHTML = `
      <div class="note-item__actions">
        <button class="note-delete-btn" data-id="${id}" title="Delete">❌</button>
      </div>
      <div class="note-item__date">${new Date(createdAt).toLocaleString('id-ID')}</div>
      <div class="note-item__title">${title}</div>
      <div class="note-item__body">${body.replace(/\n/g, '<br>')}</div>
    `;
    this.querySelector('.note-delete-btn').addEventListener('click', async (e) => {
      const noteId = e.target.getAttribute('data-id');
      await performActionWithMinLoader(() => deleteNote(noteId));
      document.querySelector('notes-list').refresh();
    });
  }
}
customElements.define('note-item', NoteItem);

// Komponen Notes List
class NotesList extends HTMLElement {
  async connectedCallback() {
    await this.render();
  }
  async render() {
    this.innerHTML = '';
    const notes = await fetchNotes();
    notes.forEach(note => {
      const item = document.createElement('note-item');
      item.note = note;
      this.appendChild(item);
    });
  }
  async refresh() {
    await this.render();
  }
}
customElements.define('notes-list', NotesList);

// Komponen Note Form
class NoteForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <form id="noteForm">
        <input class="note-form__input" type="text" id="title" name="title" placeholder="Judul catatan" required minlength="5" maxlength="50" />
        <textarea class="note-form__input" id="body" name="body" placeholder="Isi catatan" required minlength="10" rows="3"></textarea>
        <button class="note-form__button" type="submit">Tambah Catatan</button>
      </form>
    `;
    this.querySelector('#noteForm').addEventListener('submit', this.handleSubmit.bind(this));
    this.querySelector('#title').addEventListener('input', this.validateInput.bind(this));
    this.querySelector('#body').addEventListener('input', this.validateInput.bind(this));
  }
  validateInput(e) {
    const input = e.target;
    if (input.validity.tooShort) {
      input.setCustomValidity(`Minimum length is ${input.minLength} characters.`);
    } else {
      input.setCustomValidity('');
    }
  }
  async handleSubmit(e) {
    e.preventDefault();
    const title = this.querySelector('#title').value.trim();
    const body = this.querySelector('#body').value.trim();
    if (!title || !body) return;
    await performActionWithMinLoader(() => addNote(title, body));
    this.querySelector('#title').value = '';
    this.querySelector('#body').value = '';
    document.querySelector('notes-list').refresh();
  }
}
customElements.define('note-form', NoteForm);

// Fungsi untuk menampilkan error
function showError(msg) {
  let el = document.querySelector('.error-message');
  if (!el) {
    el = document.createElement('div');
    el.className = 'error-message';
    el.style.cssText = 'color:#fff;background:#c0392b;padding:8px 16px;margin:16px auto;text-align:center;border-radius:6px;max-width:400px;';
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.textContent = msg;
  setTimeout(() => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, 3500);
}

function showLoader() {
  document.getElementById('loading-indicator').style.display = 'flex';
}
function hideLoader() {
  document.getElementById('loading-indicator').style.display = 'none';
}
async function performActionWithMinLoader(action, minDuration = 600) {
  showLoader();
  const start = Date.now();
  try {
    await action();
  } finally {
    const elapsed = Date.now() - start;
    if (elapsed < minDuration) {
      await new Promise(res => setTimeout(res, minDuration - elapsed));
    }
    hideLoader();
  }
}
