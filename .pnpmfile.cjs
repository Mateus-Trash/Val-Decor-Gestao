module.exports = {
  hooks: {
    readPackage(pkg) {
      // Allow esbuild and related packages to run their build scripts
      if (pkg.name && pkg.name.startsWith('esbuild')) {
        pkg.scripts = pkg.scripts || {};
        // Allow esbuild to run its build scripts for native bindings
      }
      // Also allow @tailwindcss/oxide to run build scripts
      if (pkg.name === '@tailwindcss/oxide') {
        pkg.scripts = pkg.scripts || {};
      }
      return pkg;
    }
  }
};
