// Komponen App Bar
class AppBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<header style="display:flex;align-items:center;justify-content:center;"><span style="font-size:1.5rem;font-weight:500;letter-spacing:1px;">Aplikasi Catatan</span></header>`;
  }
}
customElements.define('app-bar', AppBar);

// Helper API
const API_BASE = 'https://notes-api.dicoding.dev/v2';

async function fetchNotes(archived = false) {
  try {
    const url = archived ? `${API_BASE}/notes/archived` : `${API_BASE}/notes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal mengambil data catatan');
    const data = await res.json();
    return data.data;
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat mengambil data.');
    return [];
  }
}

async function archiveNote(id) {
  try {
    const res = await fetch(`${API_BASE}/notes/${id}/archive`, { method: 'POST' });
    if (!res.ok) throw new Error('Gagal mengarsipkan catatan');
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat mengarsipkan catatan.');
  }
}

async function unarchiveNote(id) {
  try {
    const res = await fetch(`${API_BASE}/notes/${id}/unarchive`, { method: 'POST' });
    if (!res.ok) throw new Error('Gagal membatalkan arsip catatan');
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat membatalkan arsip catatan.');
  }
}

async function addNote(title, body) {
  try {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
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
    const { id, title, body, createdAt, archived } = this._note;
    let actions = `<button class="note-delete-btn" data-id="${id}" title="Delete">❌</button>`;
    if (archived) {
      actions += `<button class="note-unarchive-btn" data-id="${id}" title="Unarchive">↩️</button>`;
    } else {
      actions += `<button class="note-archive-btn" data-id="${id}" title="Archive">📦</button>`;
    }
    this.innerHTML = `
      <div class="note-item__actions">${actions}</div>
      <div class="note-item__date">${new Date(createdAt).toLocaleString('id-ID')}</div>
      <div class="note-item__title">${title}</div>
      <div class="note-item__body">${body.replace(/\n/g, '<br>')}</div>
    `;
    this.querySelector('.note-delete-btn').onclick = async (e) => {
      const noteId = e.target.getAttribute('data-id');
      await performActionWithMinLoader(() => deleteNote(noteId));
      document.querySelector('notes-list').refresh();
    };
    if (this.querySelector('.note-archive-btn')) {
      this.querySelector('.note-archive-btn').onclick = async (e) => {
        const noteId = e.target.getAttribute('data-id');
        await performActionWithMinLoader(() => archiveNote(noteId));
        document.querySelector('notes-list').refresh();
      };
    }
    if (this.querySelector('.note-unarchive-btn')) {
      this.querySelector('.note-unarchive-btn').onclick = async (e) => {
        const noteId = e.target.getAttribute('data-id');
        await performActionWithMinLoader(() => unarchiveNote(noteId));
        document.querySelector('notes-list').refresh();
      };
    }
    if (this.querySelector('.note-edit-btn')) {
      this.querySelector('.note-edit-btn').onclick = (e) => {
        const noteId = e.target.getAttribute('data-id');
        const notesList = document.querySelector('notes-list');
        const notes = Array.from(notesList.children).map((item) => item._note);
        const note = notes.find((n) => n.id === noteId);
        if (note) {
          const form = document.querySelector('note-form');
          form.setEdit(note);
        }
      };
    }
  }
}
customElements.define('note-item', NoteItem);

// Komponen Notes List
class NotesList extends HTMLElement {
  async connectedCallback() {
    this.archived = false;
    await this.render();
  }
  async render() {
    const container = this;
    if (container.classList) {
      container.classList.remove('animating');
    }
    this.innerHTML = '';
    const notes = await fetchNotes(this.archived);
    notes.forEach((note) => {
      const item = document.createElement('note-item');
      item.note = note;
      this.appendChild(item);
    });
  }
  async refresh() {
    await this.render();
  }
  showArchived(archived) {
    if (this.archived !== archived) {
      this.archived = archived;
      const container = this;
      if (container.classList) {
        container.classList.add('animating');
        setTimeout(() => {
          this.refresh();
          container.classList.remove('animating');
        }, 400);
      } else {
        this.refresh();
      }
    }
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
    await performActionWithMinLoader(async () => {
      await addNote(title, body);
    });
    document.querySelector('notes-list').refresh();
    this.querySelector('#noteForm').reset();
  }
}
customElements.define('note-form', NoteForm);

// Fungsi untuk menampilkan error
function showError(msg) {
  let el = document.querySelector('.error-message');
  if (!el) {
    el = document.createElement('div');
    el.className = 'error-message';
    el.style.cssText =
      'color:#fff;background:#c0392b;padding:8px 16px;margin:16px auto;text-align:center;border-radius:6px;max-width:400px;';
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
      await new Promise((res) => setTimeout(res, minDuration - elapsed));
    }
    hideLoader();
  }
}

// Tambahkan tombol switch dengan gaya konsisten
document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main');
  if (!document.getElementById('show-active')) {
    const switcher = document.createElement('div');
    switcher.style.display = 'flex';
    switcher.style.justifyContent = 'center';
    switcher.style.margin = '24px 0 8px 0';
    switcher.innerHTML = `
      <button id="show-active" class="switch-btn active">Aktif</button>
      <button id="show-archived" class="switch-btn">Arsip</button>
    `;
    main.insertBefore(switcher, main.querySelector('section'));
    const notesList = document.querySelector('notes-list');
    document.getElementById('show-active').addEventListener('click', () => {
      notesList.showArchived(false);
      document.getElementById('show-active').classList.add('active');
      document.getElementById('show-archived').classList.remove('active');
    });
    document.getElementById('show-archived').addEventListener('click', () => {
      notesList.showArchived(true);
      document.getElementById('show-archived').classList.add('active');
      document.getElementById('show-active').classList.remove('active');
    });
  }
});
