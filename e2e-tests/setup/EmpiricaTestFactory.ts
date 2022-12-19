import { promises as fs, constants, createWriteStream } from "fs";
import * as path from "path";
import * as uuid from "uuid";
import * as childProcess from "node:child_process";

import * as tar from "tar";

const EMPIRICA_CMD = "empirica";
const EMPIRICA_CONFIG_RELATIVE_PATH = path.join(".empirica", "local");

const CACHE_FOLDER = "cache";
const CACHE_FILENAME = "cache.tar.gz";
const CACHE_FILEPATH = path.join(CACHE_FOLDER, CACHE_FILENAME);

export default class EmpiricaTestFactory {
  private uniqueProjectId: string;

  private projectDirName: string;

  private empiricaProcess: childProcess.ChildProcess;

  constructor() {
    this.uniqueProjectId = uuid.v4();
    this.projectDirName = `test-experiment-${this.uniqueProjectId}`;
  }

  public async init() {
    const cacheExists = await this.checkIfCacheExists();

    if (cacheExists) {
      await this.createProjectFromCache();
    } else {
      await this.createEmpiricaProject();
      await this.createProjectCache();
    }

    await this.startEmpiricaProject();
  }

  async teardown() {
    await this.stopEmpiricaProject();
    await this.fullCleanup();
  }

  async fullCleanup() {
    await fs.rm(this.projectDirName, { recursive: true });
  }

  private getProjectId() {
    return this.projectDirName;
  }

  async removeConfigFolder() {
    const configDir = path.join(
      this.projectDirName,
      EMPIRICA_CONFIG_RELATIVE_PATH
    );

    await fs.rm(configDir, { recursive: true });
  }

  private async createEmpiricaProject() {
    return new Promise((resolve, reject) => {
      const process = childProcess.spawn(EMPIRICA_CMD, [
        "create",
        this.projectDirName,
      ]);

      process.stdout.on("data", (data) => {
        console.log(`${data}`);
      });

      process.stderr.on("data", (data) => {
        console.error(`create project stderr: ${data}`);
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          console.log(
            `"${EMPIRICA_CMD} create" process exited with code ${code}`
          );

          reject(code);
        }
      });
    });
  }

  private async checkIfCacheExists() {
    console.log("Checking if project cache exists");

    try {
      await fs.access(CACHE_FILEPATH, constants.F_OK);

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
      const outputDir = path.join(__dirname, "..", this.getProjectId());

      await fs.mkdir(outputDir);

      await tar.x({
        file: CACHE_FILEPATH,
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

    return tar
      .c(
        {
          gzip: true,
          cwd: path.join(__dirname, "..", this.getProjectId()),
        },
        ["."]
      )
      .pipe(createWriteStream(CACHE_FILEPATH));
  }

  private async startEmpiricaProject() {
    console.log(`Starting rpoject ${this.getProjectId()}`);

    return new Promise((resolve) => {
      this.empiricaProcess = childProcess.spawn(EMPIRICA_CMD, {
        cwd: this.getProjectId(),
      });

      resolve(true);

      process.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      process.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      process.on("close", (code) => {
        console.log(`"${EMPIRICA_CMD}" process exited with code ${code}`);
      });
    });
  }

  private async stopEmpiricaProject() {
    return new Promise((resolve) => {
      this.empiricaProcess.kill();

      resolve(true);
    });
  }
}
