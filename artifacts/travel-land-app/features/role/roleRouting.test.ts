import { roleHome, unauthorizedHome } from './roleRouting';

describe('role routing', () => {
  it('maps each primary role to its protected home', () => {
    expect(roleHome('user')).toBe('/(tabs)');
    expect(roleHome('vendor')).toBe('/vendor');
    expect(roleHome('admin')).toBe('/admin');
  });

  it('returns the authenticated role home for direct access to another group', () => {
    expect(unauthorizedHome('user', 'admin')).toBe('/(tabs)');
    expect(unauthorizedHome('vendor', 'admin')).toBe('/vendor');
    expect(unauthorizedHome('user', 'vendor')).toBe('/(tabs)');
    expect(unauthorizedHome('admin', 'vendor')).toBeNull();
    expect(unauthorizedHome('admin', '(tabs)')).toBeNull();
    expect(unauthorizedHome('user', 'login')).toBeNull();
  });
});
