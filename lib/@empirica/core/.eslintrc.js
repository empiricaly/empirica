module.exports = {
  extends: "airbnb-typescript-prettier",
  rules: {
    "class-methods-use-this": 0,
    "no-console": 0,
    "no-restricted-syntax": 0,
    "no-await-in-loop": 0,
    "no-underscore-dangle": 0,
    "react/require-default-props": 0,
    "react/forbid-prop-types": 0,
    "react/jsx-filename-extension": ["error", { extensions: [".tsx", "jsx"] }],
    "react/state-in-constructor": 0,
    "react/destructuring-assignment": 0,
    "react/jsx-props-no-spreading": 0,
    "react/no-access-state-in-setstate": 0,
  },
};
