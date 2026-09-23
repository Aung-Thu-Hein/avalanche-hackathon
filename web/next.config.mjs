/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,

  // RainbowKit -> @wagmi/connectors -> @base-org/account -> @coinbase/cdp-sdk
  // imports the @x402/* packages unconditionally, but declares them as OPTIONAL
  // peer dependencies - so npm does not install them and webpack cannot resolve
  // them, failing the build. Nothing in this app touches that payment path, so
  // we resolve them to an empty module. Delete this if you ever use x402.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm": false,
      "@x402/svm/exact/client": false,
      "@x402/extensions": false,
    };
    return config;
  },
};
