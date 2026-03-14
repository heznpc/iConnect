import { describe, test, expect } from '@jest/globals';
import {
  listChatsScript,
  readChatScript,
  searchMessagesScript,
  sendMessageScript,
  sendFileScript,
  listParticipantsScript,
} from '../dist/messages/scripts.js';

describe('messages script generators', () => {
  test('listChatsScript', () => {
    const script = listChatsScript(50);
    expect(script).toContain("Application('Messages')");
    expect(script).toContain('Messages.chats()');
    expect(script).toContain('50');
  });

  test('readChatScript', () => {
    const script = readChatScript('chat123');
    expect(script).toContain("whose({id: 'chat123'})");
    expect(script).toContain('participants');
    expect(script).toContain('updatedDate');
  });

  test('searchMessagesScript', () => {
    const script = searchMessagesScript('john', 20);
    expect(script).toContain("'john'");
    expect(script).toContain('toLowerCase()');
    expect(script).toContain('20');
  });

  test('sendMessageScript', () => {
    const script = sendMessageScript('+821012345678', 'Hello');
    expect(script).toContain('+821012345678');
    expect(script).toContain('Hello');
    expect(script).toContain('send');
    expect(script).toContain('buddy');
  });

  test('sendFileScript', () => {
    const script = sendFileScript('+821012345678', '/tmp/test.png');
    expect(script).toContain('+821012345678');
    expect(script).toContain('/tmp/test.png');
    expect(script).toContain('send');
    expect(script).toContain('POSIX file');
  });

  test('listParticipantsScript', () => {
    const script = listParticipantsScript('chat123');
    expect(script).toContain("whose({id: 'chat123'})");
    expect(script).toContain('p.name()');
    expect(script).toContain('p.handle()');
  });
});

describe('messages esc() injection prevention', () => {
  test('escapes single quotes in chat ID', () => {
    const script = readChatScript("test'inject");
    expect(script).toContain("test\\'inject");
  });

  test('escapes quotes in message text', () => {
    const script = sendMessageScript('+8210', 'say "hello"');
    expect(script).toContain('say \\"hello\\"');
  });

  test('escapes single quotes in search query', () => {
    const script = searchMessagesScript("O'Brien", 10);
    expect(script).toContain("O\\'Brien");
  });
});
