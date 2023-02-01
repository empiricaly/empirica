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
import BasePage from "../page-objects/BasePage";
import PageManager from "./PageManager";

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

export default class EmpiricaTestFactory {
  private uniqueProjectId: string;

  private projectDirName: string;

  private rootDirPath: string;

  private shouldBuildCorePackage: boolean;

  private shoudLinkCoreLib: boolean;

  private versionInfo: EmpiricaVersion;

  private empiricaProcess: childProcess.ChildProcess;

  private pageManager: PageManager;

  constructor(params?: TestFactoryParams) {
    this.uniqueProjectId = uuid.v4();
    this.projectDirName = `test-experiment-${this.uniqueProjectId}`;
    this.shouldBuildCorePackage = params?.shouldBuildCorePackage || false;
    this.shoudLinkCoreLib = params?.shoudLinkCoreLib || false;
    this.pageManager = new PageManager();
  }

  public async init() {
    await this.checkEmpricaVersion();

    console.log(
      "Using empirica version:",
      this.versionInfo.version,
      this.versionInfo.build
    );

    this.rootDirPath = await this.createRootDirectory();

    const cacheExists = await this.checkIfCacheExists();

    if (this.shouldBuildCorePackage) {
      await this.buildCorePackage();
    }

    if (cacheExists) {
      console.log("Cache exists");

      await this.createProjectFromCache();
    } else {
      console.log("Cache doesn't exist");

      await this.createEmpiricaProject();
      await this.createProjectCache();
    }

    if (this.shoudLinkCoreLib) {
      await this.linkCorePackage();
    }

    await this.startEmpiricaProject();
  }

  async teardown() {
    console.log(`Teardown, project id: ${this.getProjectId()}`);

    await this.stopEmpiricaProject();
    await this.fullCleanup();
    await this.pageManager.cleanup();

    console.log("Cleanup finished");
  }

  async fullCleanup() {
    await fs.rm(this.getProjectFullPath(), { recursive: true });
  }

  private getProjectId() {
    return this.projectDirName;
  }

  async removeConfigFolder() {
    const configDir = path.join(
      this.getProjectFullPath(),
      EMPIRICA_CONFIG_RELATIVE_PATH
    );

    await fs.rm(configDir, { recursive: true });
  }

  private createEmpiricaProject() {
    console.log("this.getRootDirectory()", this.getRootDirectory());

    return executeCommand({
      command: EMPIRICA_CMD,
      params: ["create", this.projectDirName],
      cwd: this.getRootDirectory(),
    });
  }

  private getCacheFilename() {
    return `cache-${this.versionInfo.version}-${this.versionInfo.build}-${this.versionInfo.branchName}.tar.gz`;
  }

  private async createRootDirectory() {
    return fs.mkdtemp(path.join(os.tmpdir(), "empirica-test"));
  }

  private getRootDirectory() {
    return this.rootDirPath;
  }

  private getProjectFullPath() {
    return path.join(this.rootDirPath, this.getProjectId());
  }

  private getCacheFilePath() {
    return path.join(CACHE_FOLDER, this.getCacheFilename());
  }

  public createPage<T extends BasePage>(pageClass: new (...a: any[]) => T, options: { browser: Browser, baseUrl?: string}) {
    return this.pageManager.createPage<T>(pageClass, options);
  }

  private async checkEmpricaVersion() {
    const versionOutput = await executeCommand({
      command: EMPIRICA_CMD,
      params: ["version"],
      hideOutput: true,
    });

    if (typeof versionOutput === "string") {
      this.versionInfo = {
        version: parseVersion(versionOutput),
        branchName: parseBranchName(versionOutput),
        build: parseBuild(versionOutput),
      };
    } else {
      throw new Error(`Can't parse Empirica version: ${versionOutput}`);
    }
  }

  private async checkIfCacheExists() {
    console.log("Checking if project cache exists");

    try {
      await fs.access(this.getCacheFilePath(), constants.F_OK);

      return true;
    } catch (e) {
      return false;
    }
  }

  private async createProjectFromCache() {
    console.log(
      `Creating project "${this.getProjectId()}" from cached project`
    );

    try {
      const outputDir = path.join(this.getRootDirectory(), this.getProjectId());

      await fs.mkdir(outputDir);

      await tar.x({
        file: this.getCacheFilePath(),
        cwd: outputDir,
      });

      console.log(`Extracted cache to "${outputDir}" successfully`);
    } catch (e) {
      console.log(`Something went wrong. ${e}`);
    }
  }

  private async createProjectCache() {
    console.log("Creating cache.");

    const cacheDir = "cache";

    await fs.mkdir(cacheDir);

    await tar.c(
      {
        gzip: true,
        cwd: this.getProjectFullPath(),
        file: this.getCacheFilePath(),
      },
      ["."]
    );

    console.log("Cache created");
  }

  private async buildCorePackage() {
    console.log("Building the @empirica/core package");

    await executeCommand({
      command: "npm",
      params: ["run", "build"],
      cwd: EMPIRICA_CORE_PACKAGE_PATH,
    });
  }

  private async linkCorePackage() {
    await executeCommand({
      command: "npm",
      params: ["link"],
      cwd: EMPIRICA_CORE_PACKAGE_PATH,
    });

    await executeCommand({
      command: "npm",
      params: ["link", "@empirica/core"],
      cwd: path.join(this.getProjectId(), "client"),
    });
  }

  private async startEmpiricaProject() {
    console.log(`Starting project ${this.getProjectId()}`);

    return new Promise((resolve) => {
      this.empiricaProcess = childProcess.spawn(EMPIRICA_CMD, {
        cwd: this.getProjectFullPath(),
      });

      resolve(true);

      this.empiricaProcess?.stdout?.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      this.empiricaProcess.stderr?.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      this.empiricaProcess?.on("close", (code) => {
        console.log(`"${EMPIRICA_CMD}" process exited with code ${code}`);
      });
    });
  }

  private async stopEmpiricaProject() {
    console.log("Trying to kill Empirica process");

    return new Promise((resolve) => {
      try {
        this.empiricaProcess.stdout.destroy();
        this.empiricaProcess.stderr.destroy();

        this.empiricaProcess.kill();

        console.log("Killed Empirica process");

        resolve(true);
      } catch (e) {
        console.error("Failed to kill Empirica process", e);

        process.kill(this.empiricaProcess.pid, "SIGKILL");

        resolve(false);
      }
    });
  }
}
