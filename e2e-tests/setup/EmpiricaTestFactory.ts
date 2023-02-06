import { promises as fs, constants, existsSync } from "fs";
import * as path from "path";
import * as os from "os";
import * as uuid from "uuid";
import * as toml from "toml";
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
import { AdminUser, EmpricaConfigToml } from "../utils/adminUtils";
import createEmpiricaConfigToml from "../utils/configUtils";
import BasePage from "../page-objects/BasePage";
import PageManager from "./PageManager";
import killProcess from "../utils/killProcess";

const EMPIRICA_CMD = "empirica";
const EMPIRICA_CONFIG_RELATIVE_PATH = path.join(".empirica", "local");
const EMPIRICA_BUILD = "build: 175";

const EMPIRICA_COMMANDS = {
  SERVE: "serve",
  BUNDLE: "bundle",
  VERSION: "version",
};

const EMPIRICA_CORE_PACKAGE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "lib",
  "@empirica",
  "core"
);

const CACHE_FOLDER = "cache";

export enum START_MODES {
  DEV = "DEV",
  BUNDLE = "BUNDLE",
}

interface TestFactoryParams {
  shouldBuildCorePackage?: boolean;
  shoudLinkCoreLib?: boolean;
  startMode: START_MODES;
}

export default class EmpiricaTestFactory {
  private uniqueProjectId: string;

  private projectDirName: string;

  private rootDirPath: string;

  private shouldBuildCorePackage: boolean;

  private shoudLinkCoreLib: boolean;

  private versionInfo: EmpiricaVersion;

  private startMode: START_MODES;

  private empiricaProcess: childProcess.ChildProcess;

  private pageManager: PageManager;

  constructor(params?: TestFactoryParams) {
    this.uniqueProjectId = uuid.v4();
    this.projectDirName = `test-experiment-${this.uniqueProjectId}`;
    this.shouldBuildCorePackage = params?.shouldBuildCorePackage || false;
    this.shoudLinkCoreLib = params?.shoudLinkCoreLib || false;
    this.startMode = params?.startMode || START_MODES.DEV;
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

    if (this.startMode === START_MODES.DEV) {
      await this.startEmpiricaProject();
    } else {
      await this.bundleEmpiricaProject();

      await this.startBundledEmpiricaProject();
    }
  }

  async teardown() {
    console.log(`Teardown, project id: ${this.getProjectId()}`);

    try {
      await this.stopEmpiricaProject();
      await this.fullCleanup();

    } catch (e) {
      console.error("Failed to stop Empirica", e)
    } finally {
      await this.pageManager.cleanup();

      console.log("Cleanup finished");
    }

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
      env: {
        EMPIRICA_BUILD,
      },
      cwd: this.getRootDirectory(),
    });
  }

  private getCacheFilename() {
    return `cache-${this.versionInfo.version}-${this.versionInfo.build}-${this.versionInfo.branchName}.tar.gz`;
  }

  private async createRootDirectory() {
    // return fs.mkdtemp(path.join(os.tmpdir(), "empirica-test"));
    return fs.mkdtemp(path.join(__dirname,"..", "..","..", "empirica-test-"));
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
      params: [EMPIRICA_COMMANDS.VERSION],
      hideOutput: true,
      env: {
        EMPIRICA_BUILD,
      },
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

      const newEmpiricaConfig = createEmpiricaConfigToml(this.getProjectId(), {
        username: uuid.v4(),
        password: uuid.v4(),
      });

      await tar.x({
        file: this.getCacheFilePath(),
        cwd: outputDir,
      });

      await fs.writeFile(
        this.getEmpiricaConfigTomlPath(this.getProjectId()),
        newEmpiricaConfig
      );

      console.log(`Extracted cache to "${outputDir}" successfully`);
    } catch (e) {
      console.log(`Something went wrong. ${e}`);
    }
  }

  private async createProjectCache() {
    console.log("Creating cache.");

    const cacheDir = "cache";

    if (!existsSync(cacheDir)) {
      await fs.mkdir(cacheDir);
    }

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

  private getEmpiricaConfigTomlPath(projectId: string) {
    return path.join(this.getProjectFullPath(), ".empirica", "empirica.toml");
  }

  public async getAdminCredentials(): Promise<AdminUser> {
    const configPath = this.getEmpiricaConfigTomlPath(this.getProjectId());
    const configFile = await fs.readFile(configPath, {
      encoding: "utf8",
    });

    const config = toml.parse(configFile) as EmpricaConfigToml;

    const adminUser = config.tajriba.auth.users[0];

    return {
      username: adminUser.username,
      password: adminUser.password,
    };
  }

  private async bundleEmpiricaProject() {
    console.log(`Starting bundled project ${this.getProjectId()}`);

    await executeCommand({
      command: EMPIRICA_CMD,
      params: [EMPIRICA_COMMANDS.BUNDLE],
      cwd: this.getProjectFullPath(),
      env: {
        EMPIRICA_BUILD,
      },
    });

    console.log(`Finished bundling project.`);
  }

  private async startBundledEmpiricaProject() {
    console.log(
      `Starting project "${this.getProjectId()}" in the bundled mode`
    );

    return new Promise((resolve) => {
      const archiveName = `${this.getProjectId()}.tar.zst`;

      this.empiricaProcess = childProcess.spawn(
        EMPIRICA_CMD,
        [EMPIRICA_COMMANDS.SERVE, archiveName],
        {
          env: {
            ...process.env,
            EMPIRICA_BUILD,
          },
          cwd: this.getProjectFullPath()
        }
      );

      resolve(true);

      this.empiricaProcess?.stdout?.on("data", (data) => {
        console.log(`${data}`);
      });

      this.empiricaProcess.stderr?.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      this.empiricaProcess?.on("close", (code) => {
        console.log(
          `"${EMPIRICA_CMD} ${EMPIRICA_COMMANDS.SERVE}" process exited with code ${code}`
        );
      });
    });
  }

  private async startEmpiricaProject() {
    console.log(`Starting project "${this.getProjectId()}" in dev mode`);

    return new Promise((resolve) => {
      this.empiricaProcess = childProcess.spawn(EMPIRICA_CMD, {
        env: {
          ...process.env,
          EMPIRICA_BUILD,
        },
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
        console.log(`"${EMPIRICA_CMD}" process closed with code ${code}`);
      });

      this.empiricaProcess?.on("exit", (code, signal) => {
        console.log(`"${EMPIRICA_CMD}" process exited with code ${code}, signal "${signal}"`);
      });
    });
  }

  private async stopEmpiricaProject() {
    console.log("Trying to kill Empirica process");

    
    return new Promise(async (resolve, reject) => {
      if (!this.empiricaProcess) reject(false);

      try {
        this.empiricaProcess.stdout.destroy();
        this.empiricaProcess.stderr.destroy();

        // This would send a kill signal to the child process
        // but it doesn't verify that the process has been really killed
        // see https://nodejs.org/api/child_process.html#subprocesskilled for details
        // and also: https://github.com/nodejs/node/issues/27490
        process.kill(this.empiricaProcess.pid, "SIGKILL");

        // Sometimes, the process is not killed by the command above
        // so we might need to call the kill cmd in the system
        killProcess({ port: 8844 });
        killProcess({ port: 3000 });

        console.log("Killed Empirica process");

        resolve(true);
      } catch (e) {
        console.error("Failed to kill Empirica process", e);
        
        reject(false);
      }
    });
  }
}
