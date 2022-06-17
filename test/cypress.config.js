module.exports = {
  projectId: "vbn4os",
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('../test/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:3000',
    specPattern: '../test/e2e/**/*.{js,jsx,ts,tsx}',
    supportFile: '../test/support/e2e.{js,jsx,ts,tsx}'
  },
}
