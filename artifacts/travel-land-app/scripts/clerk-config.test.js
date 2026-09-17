const {
  getExpoClerkConfiguration,
  isReleaseBuild,
} = require('./clerk-config');

describe('Clerk build configuration', () => {
  const developmentKey = 'pk_test_development-only';
  const productionKey = 'pk_live_production-only';

  it('keeps the external development configuration unchanged for development builds', () => {
    const config = getExpoClerkConfiguration({
      NODE_ENV: 'development',
      TRAVEL_LAND_AUTH_TARGET: 'external-development',
      TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY: developmentKey,
    });

    expect(config).toEqual({ publishableKey: developmentKey, proxyUrl: '' });
    expect(isReleaseBuild({ NODE_ENV: 'development' })).toBe(false);
  });

  it('rejects the external development target for production builds', () => {
    expect(() =>
      getExpoClerkConfiguration({
        NODE_ENV: 'production',
        TRAVEL_LAND_AUTH_TARGET: 'external-development',
        TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY: developmentKey,
      }),
    ).toThrow(/Production\/release builds cannot use TRAVEL_LAND_AUTH_TARGET=external-development/);
  });

  it('requires a production key when a release uses the managed target', () => {
    expect(() =>
      getExpoClerkConfiguration({
        NODE_ENV: 'production',
        TRAVEL_LAND_AUTH_TARGET: 'replit-managed',
      }),
    ).toThrow(/missing CLERK_PUBLISHABLE_KEY/);

    expect(() =>
      getExpoClerkConfiguration({
        NODE_ENV: 'production',
        TRAVEL_LAND_AUTH_TARGET: 'replit-managed',
        CLERK_PUBLISHABLE_KEY: developmentKey,
      }),
    ).toThrow(/requires CLERK_PUBLISHABLE_KEY to be a pk_live_/);
  });

  it('accepts a pk_live key for a production build without logging it', () => {
    const config = getExpoClerkConfiguration({
      NODE_ENV: 'production',
      TRAVEL_LAND_AUTH_TARGET: 'replit-managed',
      CLERK_PUBLISHABLE_KEY: productionKey,
    });

    expect(config).toEqual({ publishableKey: productionKey, proxyUrl: '' });
  });

  it('treats explicit release signals as production builds', () => {
    expect(isReleaseBuild({ TRAVEL_LAND_BUILD_ENV: 'release' })).toBe(true);
    expect(isReleaseBuild({ TRAVEL_LAND_BUILD_ENV: 'production' })).toBe(true);
    expect(isReleaseBuild({ EAS_BUILD_PROFILE: 'production' })).toBe(true);
    expect(isReleaseBuild({ EAS_BUILD_PROFILE: 'preview' })).toBe(false);
  });
});