module.exports = {
  hooks: {
    readPackageJson: async (pkg) => {
      // Allow build scripts for critical dependencies
      if (pkg.name === '@tailwindcss/oxide' || pkg.name === 'esbuild') {
        if (!pkg.pnpm) pkg.pnpm = {};
        pkg.pnpm.allowBuild = true;
      }
      return pkg;
    },
  },
};
