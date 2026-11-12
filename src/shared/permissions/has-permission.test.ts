import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/shared/permissions/has-permission';
import { resolvePath } from '@/shared/api/http-client';

describe('hasPermission', () => {
  it('allows everything while permissions are not wired', () => {
    expect(hasPermission('all', ['team', 'edit'])).toBe(true);
  });
  it('edit implies view; view does not imply edit', () => {
    expect(hasPermission([['team', 'edit']], ['team', 'view'])).toBe(true);
    expect(hasPermission([['team', 'view']], ['team', 'edit'])).toBe(false);
  });
});

describe('resolvePath', () => {
  it('passes a path through when no API root is set', () => {
    expect(resolvePath('Reservations/List')).toBe('Reservations/List');
  });
});
