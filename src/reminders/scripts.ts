// JXA scripts for Apple Reminders automation.
// Each function returns a JXA script string to be executed via osascript.

import { esc } from "../shared/esc.js";

export function listReminderListsScript(): string {
  return `
    const Reminders = Application('Reminders');
    const lists = Reminders.lists();
    const names = Reminders.lists.name();
    const ids = Reminders.lists.id();
    const result = names.map((name, i) => ({
      id: ids[i],
      name: name,
      reminderCount: lists[i].reminders.length
    }));
    JSON.stringify(result);
  `;
}

export function listRemindersScript(limit: number, offset: number, list?: string, completed?: boolean): string {
  const filterParts: string[] = [];
  if (completed === true) filterParts.push("r.completed()");
  if (completed === false) filterParts.push("!r.completed()");

  const filterExpr = filterParts.length > 0 ? `.filter(r => ${filterParts.join(" && ")})` : "";

  if (list) {
    return `
      const Reminders = Application('Reminders');
      const lists = Reminders.lists.whose({name: '${esc(list)}'})();
      if (lists.length === 0) throw new Error('List not found: ${esc(list)}');
      const l = lists[0];
      const reminders = l.reminders();
      const filtered = reminders${filterExpr};
      const all = filtered.map(r => ({
        id: r.id(),
        name: r.name(),
        completed: r.completed(),
        dueDate: r.dueDate() ? r.dueDate().toISOString() : null,
        priority: r.priority(),
        flagged: r.flagged(),
        list: '${esc(list)}'
      }));
      const start = Math.min(${offset}, all.length);
      const end = Math.min(start + ${limit}, all.length);
      const result = all.slice(start, end);
      JSON.stringify({total: all.length, offset: start, returned: result.length, reminders: result});
    `;
  }
  const whoseFilter =
    completed === true ? ".whose({completed: true})" : completed === false ? ".whose({completed: false})" : "";
  return `
    const Reminders = Application('Reminders');
    const lists = Reminders.lists();
    const all = [];
    for (const l of lists) {
      const src = l.reminders${whoseFilter};
      const count = src.length;
      if (count === 0) continue;
      const rIds = src.id();
      const rNames = src.name();
      const rCompleted = src.completed();
      const rDueDates = src.dueDate();
      const rPriorities = src.priority();
      const rFlagged = src.flagged();
      const listName = l.name();
      for (let i = 0; i < count; i++) {
        all.push({
          id: rIds[i], name: rNames[i], completed: rCompleted[i],
          dueDate: rDueDates[i] ? rDueDates[i].toISOString() : null,
          priority: rPriorities[i], flagged: rFlagged[i], list: listName
        });
      }
    }
    const start = Math.min(${offset}, all.length);
    const end = Math.min(start + ${limit}, all.length);
    const result = all.slice(start, end);
    JSON.stringify({total: all.length, offset: start, returned: result.length, reminders: result});
  `;
}

export function readReminderScript(id: string): string {
  return `
    const Reminders = Application('Reminders');
    const r = Reminders.reminders.byId('${esc(id)}');
    JSON.stringify({
      id: r.id(),
      name: r.name(),
      body: r.body(),
      completed: r.completed(),
      completionDate: r.completionDate() ? r.completionDate().toISOString() : null,
      creationDate: r.creationDate().toISOString(),
      modificationDate: r.modificationDate().toISOString(),
      dueDate: r.dueDate() ? r.dueDate().toISOString() : null,
      priority: r.priority(),
      flagged: r.flagged(),
      list: r.container().name()
    });
  `;
}

export function createReminderScript(
  title: string,
  opts: { body?: string; dueDate?: string; priority?: number; list?: string },
): string {
  const props = [`name: '${esc(title)}'`];
  if (opts.body) props.push(`body: '${esc(opts.body)}'`);
  if (opts.priority !== undefined) props.push(`priority: ${opts.priority}`);

  const dateSetup = opts.dueDate ? `r.dueDate = new Date('${esc(opts.dueDate)}');` : "";

  if (opts.list) {
    return `
      const Reminders = Application('Reminders');
      const lists = Reminders.lists.whose({name: '${esc(opts.list)}'})();
      if (lists.length === 0) throw new Error('List not found: ${esc(opts.list)}');
      const r = Reminders.Reminder({${props.join(", ")}});
      lists[0].reminders.push(r);
      ${dateSetup}
      JSON.stringify({id: r.id(), name: r.name()});
    `;
  }
  return `
    const Reminders = Application('Reminders');
    const r = Reminders.Reminder({${props.join(", ")}});
    Reminders.defaultList().reminders.push(r);
    ${dateSetup}
    JSON.stringify({id: r.id(), name: r.name()});
  `;
}

export function updateReminderScript(
  id: string,
  updates: { name?: string; body?: string; dueDate?: string | null; priority?: number; flagged?: boolean },
): string {
  const lines: string[] = [];
  if (updates.name !== undefined) lines.push(`r.name = '${esc(updates.name)}';`);
  if (updates.body !== undefined) lines.push(`r.body = '${esc(updates.body)}';`);
  if (updates.dueDate === null) lines.push("r.dueDate = null;");
  else if (updates.dueDate !== undefined) lines.push(`r.dueDate = new Date('${esc(updates.dueDate)}');`);
  if (updates.priority !== undefined) lines.push(`r.priority = ${updates.priority};`);
  if (updates.flagged !== undefined) lines.push(`r.flagged = ${updates.flagged};`);

  return `
    const Reminders = Application('Reminders');
    const r = Reminders.reminders.byId('${esc(id)}');
    ${lines.join("\n    ")}
    JSON.stringify({id: r.id(), name: r.name()});
  `;
}

export function completeReminderScript(id: string, completed: boolean): string {
  return `
    const Reminders = Application('Reminders');
    const r = Reminders.reminders.byId('${esc(id)}');
    r.completed = ${completed};
    JSON.stringify({id: r.id(), name: r.name(), completed: r.completed()});
  `;
}

export function deleteReminderScript(id: string): string {
  return `
    const Reminders = Application('Reminders');
    const r = Reminders.reminders.byId('${esc(id)}');
    const name = r.name();
    Reminders.delete(r);
    JSON.stringify({deleted: true, name: name});
  `;
}

export function searchRemindersScript(query: string, limit: number): string {
  return `
    const Reminders = Application('Reminders');
    const lists = Reminders.lists();
    const q = '${esc(query)}'.toLowerCase();
    const result = [];
    for (const l of lists) {
      if (result.length >= ${limit}) break;
      const count = l.reminders.length;
      if (count === 0) continue;
      const rNames = l.reminders.name();
      const rBodies = l.reminders.body();
      const rIds = l.reminders.id();
      const rCompleted = l.reminders.completed();
      const rDueDates = l.reminders.dueDate();
      const rPriorities = l.reminders.priority();
      const rFlagged = l.reminders.flagged();
      const listName = l.name();
      for (let i = 0; i < count && result.length < ${limit}; i++) {
        const name = rNames[i] || '';
        const body = rBodies[i] || '';
        if (name.toLowerCase().includes(q) || body.toLowerCase().includes(q)) {
          result.push({
            id: rIds[i], name: name, completed: rCompleted[i],
            dueDate: rDueDates[i] ? rDueDates[i].toISOString() : null,
            priority: rPriorities[i], flagged: rFlagged[i], list: listName
          });
        }
      }
    }
    JSON.stringify({returned: result.length, reminders: result});
  `;
}

export function createReminderListScript(name: string): string {
  return `
    const Reminders = Application('Reminders');
    const l = Reminders.List({name: '${esc(name)}'});
    Reminders.lists.push(l);
    JSON.stringify({id: l.id(), name: l.name()});
  `;
}

export function deleteReminderListScript(name: string): string {
  return `
    const Reminders = Application('Reminders');
    const lists = Reminders.lists.whose({name: '${esc(name)}'})();
    if (lists.length === 0) throw new Error('List not found: ${esc(name)}');
    Reminders.delete(lists[0]);
    JSON.stringify({deleted: true, name: '${esc(name)}'});
  `;
}
