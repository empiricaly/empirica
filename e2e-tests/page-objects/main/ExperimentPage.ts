import { expect } from "@playwright/test";
import BasePageObject, { BasePageObjectConstructor } from "../BasePageObject";
import NoExperimentsElement from "./NoExperimentsElement";
import LoginPage from "./LoginPage";
import InstructionsElement from "./InstructionElement";
import JellyBeansGameElement from "./JellyBeansGameElement";
import FinishedElement from "./FinishedElement";
import ExitSurveyElement from "./ExitSurveyElement";
import ConsentElement from "./ConsentElement";
import MinesweeperGameElement from "./MinesweeperGameElement";


export default class ExperimentPage extends BasePageObject {
    private noExperimentsElement: NoExperimentsElement
    private loginPage: LoginPage;
    private jellyBeansGame: JellyBeansGameElement;
    private exitSurveyElement: ExitSurveyElement;
    private instructionsElement: InstructionsElement;
    private minesweeperGameElement: MinesweeperGameElement;
    private consentElement: ConsentElement;
    private finishedElement: FinishedElement;

    constructor({ page, baseUrl }: BasePageObjectConstructor) {
        super({ page, baseUrl });

        this.loginPage = new LoginPage({ page });
        this.noExperimentsElement = new NoExperimentsElement({ page });
        this.consentElement = new ConsentElement({ page });
        this.instructionsElement = new InstructionsElement({ page });
        this.exitSurveyElement = new ExitSurveyElement({ page });
        this.jellyBeansGame = new JellyBeansGameElement({ page });
        this.minesweeperGameElement = new MinesweeperGameElement({ page });
        this.finishedElement = new FinishedElement({ page });
    }

    public async open() {
        await this.page.goto(`${this.baseUrl}`)
    }

    public async passInstructions() {
        await this.instructionsElement.gotoNextPage()
    }

    public async login({ playerId} : { playerId: string}) {
        await this.loginPage.login({ playerId });
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