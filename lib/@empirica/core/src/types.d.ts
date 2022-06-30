declare module "youch-terminal" {
  function YouchForTerminal(
    err: { error: Error },
    opts: YouchTerminalOptions
  ): void;
  interface YouchTerminalOptions {
    prefix: String;
    displayShortPath: Boolean;
    hideErrorTitle: Boolean;
    hideMessage: Boolean;
    displayMainFrameOnly: Boolean;
  }
  export = YouchForTerminal;
}
