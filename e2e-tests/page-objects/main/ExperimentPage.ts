import { expect } from "@playwright/test";
import BasePage, { BasePageConstructor } from "../BasePage";
import NoExperimentsElement from "./elements/NoExperimentsElement";
import LoginElement from "./elements/LoginElement";
import InstructionsElement from "./elements/InstructionElement";
import JellyBeansGameElement from "./elements/JellyBeansGameElement";
import FinishedElement from "./elements/FinishedElement";
import ExitSurveyElement from "./elements/ExitSurveyElement";
import ConsentElement from "./elements/ConsentElement";
import MinesweeperGameElement from "./elements/MinesweeperGameElement";


export default class ExperimentPage extends BasePage {
    private noExperimentsElement: NoExperimentsElement
    private loginElement: LoginElement;
    private jellyBeansGame: JellyBeansGameElement;
    private exitSurveyElement: ExitSurveyElement;
    private instructionsElement: InstructionsElement;
    private minesweeperGameElement: MinesweeperGameElement;
    private consentElement: ConsentElement;
    private finishedElement: FinishedElement;

    public async init() {
        await this.initContext();

        const page = this.page;

        this.loginElement = new LoginElement({ page });
        this.noExperimentsElement = new NoExperimentsElement({ page });
        this.consentElement = new ConsentElement({ page });
        this.instructionsElement = new InstructionsElement({ page });
        this.exitSurveyElement = new ExitSurveyElement({ page });
        this.jellyBeansGame = new JellyBeansGameElement({ page });
        this.minesweeperGameElement = new MinesweeperGameElement({ page });
        this.finishedElement = new FinishedElement({ page });
    }

    public async open() {
        await this.init();

        await this.page.goto(`${this.baseUrl}`);
    }

    public async checkIfNoExperimentsVisible() {
        this.noExperimentsElement = new NoExperimentsElement({ page: this.page });

        await this.noExperimentsElement.checkIfVisible();
    }

    public async passInstructions() {
        await this.instructionsElement.gotoNextPage();
    }

    public async login({ playerId} : { playerId: string}) {
        await this.loginElement.login({ playerId });
    }

    public async playJellyBeanGame({ count}: { count: number}) {
        await this.jellyBeansGame.selectJellyBeansCount(count);
        await this.jellyBeansGame.submitResult();
        await this.jellyBeansGame.finishGame();
    }

    public async playMinesweeper() {
        const fieldNumber = 0;

        await this.minesweeperGameElement.openMinefieldElement(fieldNumber);
        await this.minesweeperGameElement.finishGame();
    }

    public async acceptConsent() {
        await this.consentElement.acceptConsent();
    }

    public async fillExitSurvey({ age, gender} : { age: number, gender: string}) {
        await this.exitSurveyElement.fillSurvey({ age, gender });
    }

    public async checkIfFinished() {
        await this.finishedElement.checkIfVisible();
    }
}