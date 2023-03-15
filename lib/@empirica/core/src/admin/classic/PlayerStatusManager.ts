
import { Participant } from "../participants";

export default class PlayerStatusManager {
    private onlineMap: Map<string, Participant>;
    
    constructor() {
        this.onlineMap = new Map<string, Participant>()
    }

    getIsPlayerOnlineByParticipantId(participantId: string) {
        return this.onlineMap.has(participantId);
    }

    handlePlayerDisconnect(participantId: string) {
        this.onlineMap.delete(participantId)
    }

    handlePlayerConnected(participantId: string, participant: Participant) {
        this.onlineMap.set(participantId, participant)
    }
}