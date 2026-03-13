// JXA scripts for Apple Contacts automation.

import { esc } from "../shared/esc.js";

export function listContactsScript(limit: number, offset: number): string {
  return `
    const Contacts = Application('Contacts');
    const names = Contacts.people.name();
    const ids = Contacts.people.id();
    const total = names.length;
    const s = Math.min(${offset}, total);
    const e = Math.min(s + ${limit}, total);
    const result = [];
    for (let i = s; i < e; i++) {
      const p = Contacts.people[i];
      const emails = p.emails();
      const phones = p.phones();
      result.push({
        id: ids[i],
        name: names[i],
        email: emails.length > 0 ? emails[0].value() : null,
        phone: phones.length > 0 ? phones[0].value() : null
      });
    }
    JSON.stringify({total, offset: s, returned: result.length, contacts: result});
  `;
}

export function searchContactsScript(query: string, limit: number): string {
  return `
    const Contacts = Application('Contacts');
    const names = Contacts.people.name();
    const ids = Contacts.people.id();
    const q = '${esc(query)}'.toLowerCase();
    const result = [];
    for (let i = 0; i < names.length && result.length < ${limit}; i++) {
      const p = Contacts.people[i];
      const nameMatch = names[i] && names[i].toLowerCase().includes(q);
      let emailMatch = false;
      let phoneMatch = false;
      let orgMatch = false;
      if (!nameMatch) {
        try {
          const org = p.organization() || '';
          orgMatch = org.toLowerCase().includes(q);
        } catch(e) {}
      }
      if (!nameMatch && !orgMatch) {
        try {
          const emails = p.emails();
          for (let e = 0; e < emails.length; e++) {
            if ((emails[e].value() || '').toLowerCase().includes(q)) { emailMatch = true; break; }
          }
        } catch(e) {}
      }
      if (!nameMatch && !orgMatch && !emailMatch) {
        try {
          const phones = p.phones();
          for (let ph = 0; ph < phones.length; ph++) {
            if ((phones[ph].value() || '').includes(q)) { phoneMatch = true; break; }
          }
        } catch(e) {}
      }
      if (nameMatch || emailMatch || phoneMatch || orgMatch) {
        const emails = p.emails();
        const phones = p.phones();
        result.push({
          id: ids[i],
          name: names[i],
          organization: p.organization() || null,
          email: emails.length > 0 ? emails[0].value() : null,
          phone: phones.length > 0 ? phones[0].value() : null,
          matchedField: nameMatch ? 'name' : orgMatch ? 'organization' : emailMatch ? 'email' : 'phone'
        });
      }
    }
    JSON.stringify({total: names.length, returned: result.length, contacts: result});
  `;
}

export function readContactScript(id: string): string {
  return `
    const Contacts = Application('Contacts');
    const p = Contacts.people.byId('${esc(id)}');
    const emails = p.emails();
    const phones = p.phones();
    const addresses = p.addresses();
    JSON.stringify({
      id: p.id(),
      name: p.name(),
      firstName: p.firstName(),
      lastName: p.lastName(),
      organization: p.organization(),
      jobTitle: p.jobTitle(),
      department: p.department(),
      note: p.note(),
      emails: emails.map(e => ({value: e.value(), label: e.label()})),
      phones: phones.map(ph => ({value: ph.value(), label: ph.label()})),
      addresses: addresses.map(a => ({
        street: a.street(),
        city: a.city(),
        state: a.state(),
        zip: a.zip(),
        country: a.country(),
        label: a.label()
      })),
      creationDate: p.creationDate().toISOString(),
      modificationDate: p.modificationDate().toISOString()
    });
  `;
}

export function createContactScript(
  firstName: string,
  lastName: string,
  opts: { email?: string; phone?: string; organization?: string; jobTitle?: string; note?: string },
): string {
  const props = [
    `firstName: '${esc(firstName)}'`,
    `lastName: '${esc(lastName)}'`,
  ];
  if (opts.organization) props.push(`organization: '${esc(opts.organization)}'`);
  if (opts.jobTitle) props.push(`jobTitle: '${esc(opts.jobTitle)}'`);
  if (opts.note) props.push(`note: '${esc(opts.note)}'`);

  const emailLine = opts.email
    ? `p.emails.push(Contacts.Email({value: '${esc(opts.email)}', label: 'work'}));`
    : "";
  const phoneLine = opts.phone
    ? `p.phones.push(Contacts.Phone({value: '${esc(opts.phone)}', label: 'mobile'}));`
    : "";

  return `
    const Contacts = Application('Contacts');
    const p = Contacts.Person({${props.join(", ")}});
    Contacts.people.push(p);
    ${emailLine}
    ${phoneLine}
    Contacts.save();
    JSON.stringify({id: p.id(), name: p.name()});
  `;
}

export function updateContactScript(
  id: string,
  updates: { firstName?: string; lastName?: string; organization?: string; jobTitle?: string; note?: string },
): string {
  const lines: string[] = [];
  if (updates.firstName !== undefined) lines.push(`p.firstName = '${esc(updates.firstName)}';`);
  if (updates.lastName !== undefined) lines.push(`p.lastName = '${esc(updates.lastName)}';`);
  if (updates.organization !== undefined) lines.push(`p.organization = '${esc(updates.organization)}';`);
  if (updates.jobTitle !== undefined) lines.push(`p.jobTitle = '${esc(updates.jobTitle)}';`);
  if (updates.note !== undefined) lines.push(`p.note = '${esc(updates.note)}';`);

  return `
    const Contacts = Application('Contacts');
    const p = Contacts.people.byId('${esc(id)}');
    ${lines.join("\n    ")}
    Contacts.save();
    JSON.stringify({id: p.id(), name: p.name()});
  `;
}

export function deleteContactScript(id: string): string {
  return `
    const Contacts = Application('Contacts');
    const p = Contacts.people.byId('${esc(id)}');
    const name = p.name();
    Contacts.delete(p);
    Contacts.save();
    JSON.stringify({deleted: true, name: name});
  `;
}

export function listGroupsScript(): string {
  return `
    const Contacts = Application('Contacts');
    const names = Contacts.groups.name();
    const ids = Contacts.groups.id();
    const result = names.map((name, i) => ({
      id: ids[i],
      name: name
    }));
    JSON.stringify(result);
  `;
}

export function addContactEmailScript(id: string, email: string, label: string): string {
  return `
    const Contacts = Application('Contacts');
    const p = Contacts.people.byId('${esc(id)}');
    const e = Contacts.Email({value: '${esc(email)}', label: '${esc(label)}'});
    p.emails.push(e);
    Contacts.save();
    JSON.stringify({id: p.id(), name: p.name(), addedEmail: '${esc(email)}'});
  `;
}

export function addContactPhoneScript(id: string, phone: string, label: string): string {
  return `
    const Contacts = Application('Contacts');
    const p = Contacts.people.byId('${esc(id)}');
    const ph = Contacts.Phone({value: '${esc(phone)}', label: '${esc(label)}'});
    p.phones.push(ph);
    Contacts.save();
    JSON.stringify({id: p.id(), name: p.name(), addedPhone: '${esc(phone)}'});
  `;
}

export function listGroupMembersScript(groupName: string, limit: number): string {
  return `
    const Contacts = Application('Contacts');
    const groups = Contacts.groups.whose({name: '${esc(groupName)}'})();
    if (groups.length === 0) throw new Error('Group not found: ${esc(groupName)}');
    const g = groups[0];
    const people = g.people();
    const count = Math.min(people.length, ${limit});
    const result = [];
    for (let i = 0; i < count; i++) {
      const p = people[i];
      const emails = p.emails();
      const phones = p.phones();
      result.push({
        id: p.id(),
        name: p.name(),
        email: emails.length > 0 ? emails[0].value() : null,
        phone: phones.length > 0 ? phones[0].value() : null
      });
    }
    JSON.stringify({group: '${esc(groupName)}', total: people.length, returned: result.length, contacts: result});
  `;
}
