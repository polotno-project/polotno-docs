import { makeAutoObservable } from 'mobx';

class TemplateStore {
  templates = [];

  constructor() {
    makeAutoObservable(this);
    // Load templates from localStorage on initialization
    this.loadFromLocalStorage();
  }

  addTemplate(template) {
    this.templates.push({
      id: Date.now(),
      ...template,
    });
    this.saveToLocalStorage();
  }

  removeTemplate(id) {
    this.templates = this.templates.filter((t) => t.id !== id);
    this.saveToLocalStorage();
  }

  saveToLocalStorage() {
    localStorage.setItem('polotno-templates', JSON.stringify(this.templates));
  }

  loadFromLocalStorage() {
    const saved = localStorage.getItem('polotno-templates');
    if (saved) {
      try {
        this.templates = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load templates', e);
      }
    }
  }
}

export const templateStore = new TemplateStore();
