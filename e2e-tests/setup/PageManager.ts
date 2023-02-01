/* eslint-disable   */
/* eslint-disable */
import { promises as fs, constants } from "fs";
import * as path from "path";
import * as os from "os";
import * as uuid from "uuid";
import * as childProcess from "node:child_process";
import { type Page, type Browser, type BrowserContext } from "@playwright/test";

import * as tar from "tar";
import executeCommand from "../utils/launchProcess";
import {
  EmpiricaVersion,
  parseBranchName,
  parseBuild,
  parseVersion,
} from "../utils/versionUtils";
import BasePage, { BasePageConstructorInterface, BasePageInterface } from "../page-objects/BasePage";

const EMPIRICA_CMD = "empirica";
const EMPIRICA_CONFIG_RELATIVE_PATH = path.join(".empirica", "local");

const EMPIRICA_CORE_PACKAGE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "lib",
  "@empirica",
  "core"
);

const CACHE_FOLDER = "cache";

interface TestFactoryParams {
  shouldBuildCorePackage: boolean;
  shoudLinkCoreLib: boolean;
}


export default class PageManager {
  private pages: BasePage[];

  constructor(params?: TestFactoryParams) {
    this.pages = [];
  }

  public createPage<T extends BasePage>(pageClass: new (...a: any[]) => T, {browser, baseUrl}: { browser: Browser, baseUrl?: string}): T {
    const page  = new pageClass({
      browser,
      baseUrl
    })

    this.pages.push(page);

    return page;
  }

 
  public async cleanup() {
    for (const page of this.pages) {
      await page.close();
    }
  }
}
