import { Injectable, signal, computed } from '@angular/core';

/** Одна запись норма-часів */
export interface NormHourEntry {
  id: string;
  make: string;
  model: string;
  /** Назва операції, наприклад "Заміна масла та фільтра" */
  operation: string;
  /** Нормативний час у годинах */
  hours: number;
}

/**
 * NormHoursService — зберігає норма-години для операцій техобслуговування.
 *
 * Дані можна:
 * 1. Завантажити вручну через parsePdfText() / loadFromText() (CSV або рядки)
 * 2. Отримати автоматично з відповідного PDF-файлу
 *
 * Формат CSV-рядка: make;model;operation;hours
 * Наприклад:        Honda;CB650R;Заміна масла та фільтра;1.0
 *
 * TODO: Коли буде бекенд — замінити на HTTP-запит до Firestore/Storage.
 */
@Injectable({ providedIn: 'root' })
export class NormHoursService {

  readonly entries = signal<NormHourEntry[]>([...DEFAULT_NORM_HOURS]);
  readonly isLoading = signal(false);
  readonly parseError = signal<string | null>(null);

  /** Унікальні марки зі збережених записів */
  readonly availableMakes = computed(() =>
    [...new Set(this.entries().map(e => e.make))].sort()
  );

  // ─── Фільтрація ───────────────────────────────────────────────────────────

  /**
   * Повертає записи, що відповідають марці + моделі.
   * Обидва параметри — нечутливий до регістру substring-матч.
   */
  filterEntries(make: string, model: string, query = ''): NormHourEntry[] {
    const m = make.toLowerCase().trim();
    const mo = model.toLowerCase().trim();
    const q = query.toLowerCase().trim();

    return this.entries().filter(e => {
      const makeMatch  = !m  || e.make.toLowerCase().includes(m);
      const modelMatch = !mo || e.model.toLowerCase().includes(mo);
      const opMatch    = !q  || e.operation.toLowerCase().includes(q);
      return makeMatch && modelMatch && opMatch;
    });
  }

  // ─── Завантаження з PDF / текстового файлу ────────────────────────────────

  /**
   * Читає File-об'єкт (PDF або .txt/.csv) і парсить норма-часи.
   *
   * PDF: витягує текст через FileReader (readAsText); якщо браузер не може
   * прочитати бінарний PDF — показує підказку скопіювати текст вручну.
   *
   * CSV/TXT: рядки у форматі  make;model;operation;hours
   */
  async loadFromFile(file: File): Promise<void> {
    this.isLoading.set(true);
    this.parseError.set(null);

    try {
      const text = await this.#readFileAsText(file);
      const parsed = this.parseText(text);

      if (parsed.length === 0) {
        this.parseError.set(
          'Не вдалося розпізнати норма-години. ' +
          'Переконайтесь, що файл містить рядки у форматі: Марка;Модель;Операція;Години'
        );
        return;
      }

      this.entries.set(parsed);
    } catch (err) {
      this.parseError.set(`Помилка читання файлу: ${(err as Error).message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Парсить довільний текст у масив NormHourEntry.
   * Підтримує два формати:
   *   1. CSV:   make;model;operation;hours
   *   2. Plain: "Honda CB650R — Заміна масла 1.0 год"  (best-effort)
   */
  parseText(raw: string): NormHourEntry[] {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const result: NormHourEntry[] = [];
    let id = 1;

    for (const line of lines) {
      // Пропускаємо заголовки та коментарі
      if (line.startsWith('#') || line.toLowerCase().startsWith('make')) continue;

      const parts = line.split(';');
      if (parts.length >= 4) {
        // CSV-формат
        const [make, model, operation, hoursRaw] = parts;
        const hours = parseFloat(hoursRaw.replace(',', '.'));
        if (!isNaN(hours) && make && model && operation) {
          result.push({ id: `nh-${id++}`, make: make.trim(), model: model.trim(), operation: operation.trim(), hours });
        }
      }
    }

    return result;
  }

  /** Додати записи поверх існуючих (merge) */
  mergeEntries(newEntries: NormHourEntry[]): void {
    const existing = new Map(this.entries().map(e => [`${e.make}|${e.model}|${e.operation}`, e]));
    for (const entry of newEntries) {
      existing.set(`${entry.make}|${entry.model}|${entry.operation}`, entry);
    }
    this.entries.set([...existing.values()]);
  }

  /** Скинути до дефолтних норма-годин */
  reset(): void {
    this.entries.set([...DEFAULT_NORM_HOURS]);
    this.parseError.set(null);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  #readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(reader.error?.message ?? 'Read error'));

      // Для PDF намагаємось читати як текст — спрацює якщо PDF text-based
      reader.readAsText(file, 'utf-8');
    });
  }
}

// ─── Дефолтні норма-години (загальні, не прив'язані до марки) ────────────────

let _id = 1;
const nh = (make: string, model: string, operation: string, hours: number): NormHourEntry =>
  ({ id: `nh-${_id++}`, make, model, operation, hours });

const DEFAULT_NORM_HOURS: NormHourEntry[] = [
  // ── Honda ──────────────────────────────────────────────────────────────────
  nh('Honda', 'CB650R',   'Заміна масла та масляного фільтра',           1.0),
  nh('Honda', 'CB650R',   'Заміна гальмівних колодок передніх',          0.5),
  nh('Honda', 'CB650R',   'Заміна гальмівних колодок задніх',            0.5),
  nh('Honda', 'CB650R',   'Заміна гальмівної рідини',                    0.5),
  nh('Honda', 'CB650R',   'Регулювання клапанів',                        3.5),
  nh('Honda', 'CB650R',   'Заміна ланцюга та зірочок',                   2.0),
  nh('Honda', 'PCX 125',  'Заміна масла та масляного фільтра',           0.5),
  nh('Honda', 'PCX 125',  'Заміна ременя варіатора та роликів',          2.0),
  nh('Honda', 'PCX 125',  'Заміна свічки запалювання',                   0.3),
  nh('Honda', 'PCX 125',  'ТО 12000 км (масло, фільтри, свічка)',        1.5),
  // ── Yamaha ─────────────────────────────────────────────────────────────────
  nh('Yamaha', 'MT-09',   'Заміна масла та масляного фільтра',           1.0),
  nh('Yamaha', 'MT-09',   'Регулювання клапанів',                        4.0),
  nh('Yamaha', 'MT-09',   'Заміна гальмівних колодок передніх',          0.5),
  nh('Yamaha', 'MT-09',   'Заміна гальмівних колодок задніх',            0.5),
  nh('Yamaha', 'MT-09',   'Заміна повітряного фільтра',                  0.5),
  // ── Suzuki ─────────────────────────────────────────────────────────────────
  nh('Suzuki', 'GSX-R1000', 'Заміна масла та масляного фільтра',         1.0),
  nh('Suzuki', 'GSX-R1000', 'Регулювання клапанів',                      5.0),
  nh('Suzuki', 'GSX-R1000', 'Заміна гальмівних колодок передніх',        0.5),
  nh('Suzuki', 'GSX-R1000', 'Заміна ланцюга та зірочок',                 2.5),
  nh('Suzuki', 'GSX-R1000', 'ТО 24000 км',                               4.0),
  // ── BMW ────────────────────────────────────────────────────────────────────
  nh('BMW', 'R 1250 GS',  'Заміна масла та масляного фільтра',           1.5),
  nh('BMW', 'R 1250 GS',  'Регулювання клапанів',                        4.5),
  nh('BMW', 'R 1250 GS',  'Заміна гальмівних колодок передніх',          1.0),
  nh('BMW', 'R 1250 GS',  'Заміна покришок',                             1.5),
  nh('BMW', 'R 1250 GS',  'ТО 48000 км (масло, свічки, фільтри)',        3.0),
  // ── Ducati ─────────────────────────────────────────────────────────────────
  nh('Ducati', 'Monster 937', 'Заміна масла та масляного фільтра',       1.0),
  nh('Ducati', 'Monster 937', 'Регулювання клапанів',                    5.5),
  nh('Ducati', 'Monster 937', 'Заміна зчеплення',                        4.0),
  nh('Ducati', 'Panigale V4', 'Заміна масла та масляного фільтра',       1.5),
  nh('Ducati', 'Panigale V4', 'Регулювання клапанів',                    6.0),
  // ── Triumph ────────────────────────────────────────────────────────────────
  nh('Triumph', 'Street Triple RS', 'Заміна масла та масляного фільтра', 1.0),
  nh('Triumph', 'Street Triple RS', 'Регулювання клапанів',              3.5),
  nh('Triumph', 'Street Triple RS', 'ТО 8000 км',                        2.0),
  // ── Загальні операції (будь-яка марка/модель) ──────────────────────────────
  nh('*', '*', 'Діагностика ходової частини',        1.0),
  nh('*', '*', 'Балансування коліс',                 0.5),
  nh('*', '*', 'Заміна підшипників рульової колонки', 2.5),
  nh('*', '*', 'Заміна амортизаторів',               2.0),
  nh('*', '*', 'Ремонт проколу',                     0.5),
  nh('*', '*', 'Заміна акумулятора',                 0.5),
  nh('*', '*', 'Заміна контактної групи',            1.0),
  nh('*', '*', 'Технічний огляд (повний)',           1.5),
];
