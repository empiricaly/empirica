/*
    Example version output from the `empirica version` command:

    Version: v1.0.0-rc.24
    SHA:     bc4184e
    Build:   169
    Branch:  main
    Time:    2022-12-28T08:21:58Z

*/

export type EmpiricaVersion = {
  version: string | null;
  build: string | null;
  branchName: string | null;
};

export const VERSION_REGEXP = /Version:\s*(.*)\n/;
export const BUILD_REGEXP = /Build:\s*(.*)\n/;
export const BRANCH_REGEXP = /Branch:\s*(.*)\n/;

function parseValueFromString(string: string, regexp: RegExp) {
  const parseResult = regexp.exec(string);

  const valueMatch = Array.isArray(parseResult) ? parseResult[1] : null;

  return valueMatch;
}

export function parseVersion(cmdOutput: string) {
  return parseValueFromString(cmdOutput, VERSION_REGEXP);
}

export function parseBuild(cmdOutput: string) {
  return parseValueFromString(cmdOutput, BUILD_REGEXP);
}

export function parseBranchName(cmdOutput: string) {
  return parseValueFromString(cmdOutput, BRANCH_REGEXP);
}
