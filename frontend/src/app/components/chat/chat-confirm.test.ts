import { describe, it, expect } from 'vitest';

import { sanitizeArgs, telHref, validateArgs, validateEmail, isConfirmTool } from './chat-confirm';

describe('chat-confirm', () => {
  it('validates email', () => {
    expect(validateEmail('')).toMatch(/enter your email/i);
    expect(validateEmail('nope')).toMatch(/valid/i);
    expect(validateEmail('a@b')).toMatch(/valid/i);
    expect(validateEmail(`${'a'.repeat(250)}@b.co`)).toMatch(/too long/i);
    expect(validateEmail('me@example.com')).toBeNull();
  });

  it('validates args per tool', () => {
    expect(validateArgs('contact_jordan', { subject: 'x', message: 'y' })).toEqual({});
    expect(Object.keys(validateArgs('contact_jordan', {}))).toEqual(['subject', 'message']);
    expect(validateArgs('request_meeting', { topic: 'x' })).toEqual({});
    expect(validateArgs('request_meeting', {})).toHaveProperty('topic');
    expect(validateArgs('request_phone', {})).toEqual({});
  });

  it('drops non-string and over-long args from the frame', () => {
    expect(sanitizeArgs({ subject: 5, message: 'ok', extra: 'x' })).toEqual({ message: 'ok' });
    expect(sanitizeArgs({ subject: 'x'.repeat(500) }).subject).toHaveLength(150);
    expect(sanitizeArgs(null)).toEqual({});
  });

  it('builds a safe tel href and recognises tools', () => {
    expect(telHref('+1 (555) 010-0100"><script>')).toBe('tel:+15550100100');
    expect(isConfirmTool('request_phone')).toBe(true);
    expect(isConfirmTool('open_modal')).toBe(false);
  });
});
