const RELEASE_BUILD_ENVIRONMENTS = new Set(['production', 'release']);

function isReleaseBuild(env = process.env) {
  const buildEnvironment = (env.TRAVEL_LAND_BUILD_ENV || '').trim().toLowerCase();

  return (
    env.NODE_ENV === 'production' ||
    RELEASE_BUILD_ENVIRONMENTS.has(buildEnvironment) ||
    env.EAS_BUILD_PROFILE === 'production'
  );
}

function requireLivePublishableKey(env) {
  const publishableKey = env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      'Production/release Clerk configuration is missing CLERK_PUBLISHABLE_KEY. ' +
        'Set it to a pk_live_ publishable key and use TRAVEL_LAND_AUTH_TARGET=replit-managed.',
    );
  }

  if (!/^pk_live_.+/.test(publishableKey)) {
    throw new Error(
      'Production/release Clerk configuration requires CLERK_PUBLISHABLE_KEY to be a pk_live_ publishable key. ' +
        'Development pk_test_ keys cannot be used for release builds.',
    );
  }

  return publishableKey;
}

function getExpoClerkConfiguration(env = process.env) {
  const target = env.TRAVEL_LAND_AUTH_TARGET;

  if (target === 'external-development') {
    if (isReleaseBuild(env)) {
      requireLivePublishableKey(env);
      throw new Error(
        'Production/release builds cannot use TRAVEL_LAND_AUTH_TARGET=external-development. ' +
          'Use TRAVEL_LAND_AUTH_TARGET=replit-managed with a pk_live_ CLERK_PUBLISHABLE_KEY.',
      );
    }

    const publishableKey = env.TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error(
        'TRAVEL_LAND_DEV_CLERK_PUBLISHABLE_KEY is required for external-development authentication.',
      );
    }
    return { publishableKey, proxyUrl: '' };
  }

  if (target && target !== 'replit-managed') {
    throw new Error(
      `Invalid TRAVEL_LAND_AUTH_TARGET "${target}". Expected "external-development" or "replit-managed".`,
    );
  }

  if (env.NODE_ENV === 'development' && !target) {
    throw new Error(
      'TRAVEL_LAND_AUTH_TARGET must be set explicitly in development; refusing to fall back to replit-managed authentication.',
    );
  }

  const publishableKey = isReleaseBuild(env)
    ? requireLivePublishableKey(env)
    : env.CLERK_PUBLISHABLE_KEY || '';

  return {
    publishableKey,
    proxyUrl: env.CLERK_PROXY_URL
      ? `https://${env.EXPO_PUBLIC_DOMAIN || env.REPLIT_DEV_DOMAIN}${env.CLERK_PROXY_URL}`
      : '',
  };
}

module.exports = {
  getExpoClerkConfiguration,
  isReleaseBuild,
};