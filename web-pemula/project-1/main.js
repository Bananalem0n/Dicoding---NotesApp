// Komponen App Bar
class AppBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<header style="display:flex;align-items:center;justify-content:center;"><span style="font-size:1.5rem;font-weight:500;letter-spacing:1px;">Aplikasi Catatan</span></header>`;
  }
}
customElements.define('app-bar', AppBar);

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
        <button class="note-edit-btn" data-id="${id}" title="Edit">✏️</button>
        <button class="note-delete-btn" data-id="${id}" title="Delete">❌</button>
      </div>
      <div class="note-item__date">${new Date(createdAt).toLocaleString('id-ID')}</div>
      <div class="note-item__title">${title}</div>
      <div class="note-item__body">${body.replace(/\n/g, '<br>')}</div>
    `;
    this.querySelector('.note-delete-btn').addEventListener('click', (e) => {
      const noteId = e.target.getAttribute('data-id');
      window.notesData = window.notesData.filter(n => n.id !== noteId);
      document.querySelector('notes-list').refresh();
    });
    this.querySelector('.note-edit-btn').addEventListener('click', (e) => {
      const noteId = e.target.getAttribute('data-id');
      const note = window.notesData.find(n => n.id === noteId);
      const form = document.querySelector('note-form');
      if (form && note) {
        form.querySelector('#title').value = note.title;
        form.querySelector('#body').value = note.body;
        form.setAttribute('data-edit-id', noteId);
        form.querySelector('button[type="submit"]').textContent = 'Update Note';
      }
    });
  }
}
customElements.define('note-item', NoteItem);

// Komponen Notes List
class NotesList extends HTMLElement {
  connectedCallback() {
    this.render();
  }
  render() {
    this.innerHTML = '';
    (window.notesData || []).forEach(note => {
      const item = document.createElement('note-item');
      item.note = note;
      this.appendChild(item);
    });
  }
  refresh() {
    this.render();
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
  handleSubmit(e) {
    e.preventDefault();
    const title = this.querySelector('#title').value.trim();
    const body = this.querySelector('#body').value.trim();
    if (!title || !body) return;
    const editId = this.getAttribute('data-edit-id');
    if (editId) {
      const idx = window.notesData.findIndex(n => n.id === editId);
      if (idx !== -1) {
        window.notesData[idx].title = title;
        window.notesData[idx].body = body;
      }
      this.removeAttribute('data-edit-id');
      this.querySelector('button[type="submit"]').textContent = 'Tambah Catatan';
    } else {
      const newNote = {
        id: 'notes-' + Math.random().toString(36).substr(2, 9),
        title,
        body,
        createdAt: new Date().toISOString(),
        archived: false
      };
      window.notesData.unshift(newNote);
    }
    document.querySelector('notes-list').refresh();
    this.querySelector('#noteForm').reset();
  }
}
customElements.define('note-form', NoteForm);