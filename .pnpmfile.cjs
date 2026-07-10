module.exports = {
  hooks: {
    readPackage(pkg) {
      // Allow build scripts for critical dependencies
      if (['@tailwindcss/oxide', 'esbuild'].includes(pkg.name)) {
        pkg.scripts = pkg.scripts || {};
      }
      return pkg;
    }
  }
}
