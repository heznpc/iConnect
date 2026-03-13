import { describe, test, expect } from '@jest/globals';
import {
  listContactsScript,
  searchContactsScript,
  readContactScript,
  createContactScript,
  updateContactScript,
  deleteContactScript,
  listGroupsScript,
} from '../dist/contacts/scripts.js';

describe('contacts script generators', () => {
  test('listContactsScript with pagination', () => {
    const script = listContactsScript(50, 10);
    expect(script).toContain("Application('Contacts')");
    expect(script).toContain('50');
    expect(script).toContain('10');
  });

  test('searchContactsScript filters by name', () => {
    const script = searchContactsScript('John', 30);
    expect(script).toContain("'John'");
    expect(script).toContain('toLowerCase()');
    expect(script).toContain('30');
  });

  test('readContactScript uses byId', () => {
    const script = readContactScript('contact-123');
    expect(script).toContain("byId('contact-123')");
    expect(script).toContain('p.emails()');
    expect(script).toContain('p.phones()');
    expect(script).toContain('p.addresses()');
  });

  test('createContactScript with minimal params', () => {
    const script = createContactScript('John', 'Doe', {});
    expect(script).toContain("firstName: 'John'");
    expect(script).toContain("lastName: 'Doe'");
    expect(script).toContain('Contacts.save()');
  });

  test('createContactScript with all options', () => {
    const script = createContactScript('Jane', 'Smith', {
      email: 'jane@test.com',
      phone: '555-1234',
      organization: 'Acme',
      jobTitle: 'Engineer',
    });
    expect(script).toContain("organization: 'Acme'");
    expect(script).toContain("jobTitle: 'Engineer'");
    expect(script).toContain("jane@test.com");
    expect(script).toContain("555-1234");
  });

  test('updateContactScript with partial updates', () => {
    const script = updateContactScript('id-1', { firstName: 'Updated', organization: 'NewCo' });
    expect(script).toContain("byId('id-1')");
    expect(script).toContain("p.firstName = 'Updated'");
    expect(script).toContain("p.organization = 'NewCo'");
  });

  test('deleteContactScript', () => {
    const script = deleteContactScript('id-1');
    expect(script).toContain("byId('id-1')");
    expect(script).toContain('Contacts.delete(p)');
  });

  test('listGroupsScript', () => {
    const script = listGroupsScript();
    expect(script).toContain('Contacts.groups.name()');
  });
});

describe('contacts esc() injection prevention', () => {
  test('escapes single quotes in name', () => {
    const script = searchContactsScript("O'Brien", 10);
    expect(script).toContain("O\\'Brien");
  });

  test('handles unicode', () => {
    const script = createContactScript('길동', '홍', {});
    expect(script).toContain('길동');
    expect(script).toContain('홍');
  });
});
