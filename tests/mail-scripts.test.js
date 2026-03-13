import { describe, test, expect } from '@jest/globals';
import {
  listMailboxesScript,
  listMessagesScript,
  readMessageScript,
  searchMessagesScript,
  markReadScript,
  sendMailScript,
  replyMailScript,
} from '../dist/mail/scripts.js';

describe('mail script generators', () => {
  test('listMailboxesScript', () => {
    const script = listMailboxesScript();
    expect(script).toContain("Application('Mail')");
    expect(script).toContain('Mail.accounts()');
    expect(script).toContain('unreadCount');
  });

  test('listMessagesScript with mailbox', () => {
    const script = listMessagesScript('INBOX', 50);
    expect(script).toContain("whose({name: 'INBOX'})");
    expect(script).toContain('50');
  });

  test('listMessagesScript with account', () => {
    const script = listMessagesScript('INBOX', 50, 'Work');
    expect(script).toContain("whose({name: 'Work'})");
    expect(script).toContain("whose({name: 'INBOX'})");
  });

  test('readMessageScript', () => {
    const script = readMessageScript('12345');
    expect(script).toContain('12345');
    expect(script).toContain('m.content()');
    expect(script).toContain('toRecipients');
  });

  test('searchMessagesScript', () => {
    const script = searchMessagesScript('invoice', 'INBOX', 30);
    expect(script).toContain("'invoice'");
    expect(script).toContain('toLowerCase()');
    expect(script).toContain('30');
  });

  test('markReadScript marks as read', () => {
    const script = markReadScript('12345', true);
    expect(script).toContain('readStatus = true');
  });

  test('markReadScript marks as unread', () => {
    const script = markReadScript('12345', false);
    expect(script).toContain('readStatus = false');
  });
});

describe('sendMailScript', () => {
  test('includes recipient addresses', () => {
    const script = sendMailScript(['alice@example.com'], 'Hello', 'Body text');
    expect(script).toContain("Application('Mail')");
    expect(script).toContain("address: 'alice@example.com'");
    expect(script).toContain('toRecipients.push');
  });

  test('includes subject and body', () => {
    const script = sendMailScript(['bob@test.com'], 'Meeting Tomorrow', 'See you at 10am');
    expect(script).toContain("subject: 'Meeting Tomorrow'");
    expect(script).toContain("content: 'See you at 10am'");
  });

  test('includes multiple to recipients', () => {
    const script = sendMailScript(['a@test.com', 'b@test.com'], 'Hi', 'Hello');
    expect(script).toContain("address: 'a@test.com'");
    expect(script).toContain("address: 'b@test.com'");
  });

  test('includes cc recipients', () => {
    const script = sendMailScript(['a@test.com'], 'Hi', 'Body', ['cc@test.com']);
    expect(script).toContain("address: 'cc@test.com'");
    expect(script).toContain('ccRecipients.push');
  });

  test('includes bcc recipients', () => {
    const script = sendMailScript(['a@test.com'], 'Hi', 'Body', [], ['bcc@test.com']);
    expect(script).toContain("address: 'bcc@test.com'");
    expect(script).toContain('bccRecipients.push');
  });

  test('includes sender account when provided', () => {
    const script = sendMailScript(['a@test.com'], 'Hi', 'Body', undefined, undefined, 'work@co.com');
    expect(script).toContain("msg.sender = 'work@co.com'");
  });

  test('calls msg.send()', () => {
    const script = sendMailScript(['a@test.com'], 'Hi', 'Body');
    expect(script).toContain('msg.send()');
  });
});

describe('replyMailScript', () => {
  test('includes message id', () => {
    const script = replyMailScript('99999', 'Thanks!', false);
    expect(script).toContain("Application('Mail')");
    expect(script).toContain('99999');
  });

  test('includes reply body', () => {
    const script = replyMailScript('100', 'Got it, thanks', false);
    expect(script).toContain("'Got it, thanks'");
  });

  test('replyToAll false', () => {
    const script = replyMailScript('100', 'Reply body', false);
    expect(script).toContain('replyToAll: false');
  });

  test('replyToAll true', () => {
    const script = replyMailScript('100', 'Reply body', true);
    expect(script).toContain('replyToAll: true');
  });

  test('calls reply.send()', () => {
    const script = replyMailScript('100', 'Body', false);
    expect(script).toContain('reply.send()');
  });
});

describe('mail esc() injection prevention', () => {
  test('escapes single quotes in mailbox name', () => {
    const script = listMessagesScript("it's a box", 10);
    expect(script).toContain("it\\'s a box");
  });

  test('escapes single quotes in sendMailScript subject', () => {
    const script = sendMailScript(['a@test.com'], "it's urgent", 'body');
    expect(script).toContain("it\\'s urgent");
  });

  test('escapes single quotes in sendMailScript body', () => {
    const script = sendMailScript(['a@test.com'], 'Subject', "don't forget");
    expect(script).toContain("don\\'t forget");
  });

  test('escapes backslashes in sendMailScript subject', () => {
    const script = sendMailScript(['a@test.com'], 'path\\dir', 'body');
    expect(script).toContain('path\\\\dir');
  });

  test('escapes single quotes in replyMailScript body', () => {
    const script = replyMailScript('100', "I'm replying", false);
    expect(script).toContain("I\\'m replying");
  });

  test('escapes backslashes in replyMailScript body', () => {
    const script = replyMailScript('100', 'back\\slash', false);
    expect(script).toContain('back\\\\slash');
  });
});
