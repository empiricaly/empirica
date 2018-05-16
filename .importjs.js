const clientPattern = /(\/client|\/imports\/ui)/;

module.exports = {
  environments: ({ pathToCurrentFile }) => {
    if (clientPattern.test(pathToCurrentFile)) {
      return ["meteor", "browser"];
    }
    return ["meteor", "node"];
  },
  importStatementFormatter({ importStatement }) {
    return importStatement.replace(/'/g, '"');
  },
  moduleNameFormatter({ moduleName, pathToCurrentFile }) {
    // Without this, for some reason, npm import paths would get
    // a leading slash...
    return moduleName;
  },
  declarationKeyword: "import",
  maxLineLength: 150,
  stripFileExtensions: [],
  excludes: ["./private/**", "./public/**", "./.meteor/**"]
};
