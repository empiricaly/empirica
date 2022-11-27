import { promises as fs } from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';
import * as childProcess from 'node:child_process';

const EMPIRICA_CMD = 'empirica'
const EMPIRICA_CONFIG_RELATIVE_PATH = path.join('.empirica', 'local');

type InstallMode = 'NPM' | 'CACHED';

type EmpiricaTestFactoryOptions = {
    installMode: InstallMode
}

export default class EmpiricaTestFactory {
    private uniqueProjectId: string;
    private projectDirName: string;
    private installMode: InstallMode;
    private empiricaProcess: childProcess.ChildProcess;

    constructor(options: EmpiricaTestFactoryOptions) {
        this.uniqueProjectId = uuid.v4();
        this.projectDirName = `test-experiment-${this.uniqueProjectId}`;
        this.installMode = options.installMode || 'NPM'; // TODO: implement caching the setup

    }

    public async init() {

        await this.createEmpiricaProject();
        await this.startEmpiricaProject();
    }

    async teardown() {
        await this.stopEmpiricaProject();
        await this.fullCleanup();
    }

    async fullCleanup() {
        await fs.rm(this.projectDirName, { recursive: true });
    }

    async removeConfigFolder() {
        const configDir = path.join(this.projectDirName, EMPIRICA_CONFIG_RELATIVE_PATH);

        await fs.rm(configDir, { recursive: true });
    }

    private async createEmpiricaProject() {
        return new Promise((resolve, reject) => {
            const process = childProcess.spawn(EMPIRICA_CMD, ['create', this.projectDirName]);

            process.stdout.on('data', (data) => {
                console.log(`${data}`);
            });
                
            process.stderr.on('data', (data) => {
                console.error(`create project stderr: ${data}`);
            });
                
            process.on('close', (code) => {
                
                if (code === 0) {
                    resolve(true)
                } else {
                    console.log(`"${EMPIRICA_CMD} create" process exited with code ${code}`);

                    reject(code)
                }
            });
        })
    }

    private async startEmpiricaProject() {
        return new Promise((resolve, reject) => {
            this.empiricaProcess = childProcess.spawn(EMPIRICA_CMD, { cwd: this.projectDirName });

            resolve(true)

            process.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
                
            process.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            process.on('close', (code) => {
                console.log(`"${EMPIRICA_CMD}" process exited with code ${code}`);
            });
        })

    }

    private async stopEmpiricaProject() {
        return new Promise((resolve, reject) => {
            this.empiricaProcess.kill()

            resolve(true);
        });
    }

}