import { describe, test, expect } from '@jest/globals';
import { checkSwiftBridge } from '../dist/shared/swift.js';

describe('swift bridge', () => {
  test('checkSwiftBridge returns error when binary missing', async () => {
    const result = await checkSwiftBridge();
    // Binary won't exist in test env (requires macOS 26 to compile)
    expect(result).not.toBeNull();
    expect(result).toContain('Swift bridge binary not found');
    expect(result).toContain('swift-build');
  });
});
