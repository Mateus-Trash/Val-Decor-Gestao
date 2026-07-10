module.exports = {
  // Allow all build dependencies to execute their build scripts
  // This is necessary for native dependencies like esbuild and @tailwindcss/oxide
  allowedBuildDependencies: [
    '@tailwindcss/oxide',
    'esbuild',
    '@esbuild-kit/core-utils',
    '@esbuild-kit/esm-loader',
    'esbuild-register',
    'tsx',
  ],
  
  // Hook to ensure build scripts are allowed during installation
  hooks: {
    readPackageJson: async (pkg) => {
      // Mark critical build dependencies as allowed
      if (['@tailwindcss/oxide', 'esbuild', 'tsx'].includes(pkg.name)) {
        if (!pkg.pnpm) pkg.pnpm = {};
        pkg.pnpm.allowBuild = true;
      }
      return pkg;
    },
  },
};
