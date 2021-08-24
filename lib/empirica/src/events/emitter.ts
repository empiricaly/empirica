import { EventEmitter } from "events";
import { EventType, OnEventPayload, TajribaAdmin } from "tajriba";
import { Context } from "./context";
import { EmpiricaEvent, EventCallback, eventMap } from "./events";

type tajListener = (payload: OnEventPayload, error: Error | undefined) => void;

export class Emitter {
  private emitter: EventEmitter;
  private listening: Partial<{ [key in EventType]: boolean }> = {};
  private tajListeners: tajListener[] = [];

  constructor(private taj: TajribaAdmin, private context: Context) {
    this.emitter = new EventEmitter();
  }

  on<K>(eventType: EmpiricaEvent, listener: EventCallback<K>) {
    this.emitter.on(eventType, listener.bind(this.context));

    const evtts = eventMap[eventType] || [];

    for (const evtt of evtts) {
      this.initListen(evtt);
    }

    return () => {
      this.emitter.off(eventType, listener);
    };
  }

  trigger(eventType: EmpiricaEvent, args: any) {
    this.emitter.emit(eventType, args);
  }

  private initListen(eventType: EventType) {
    if (this.listening[eventType]) {
      return;
    }

    this.listening[eventType] = true;

    this.taj.onEvent({ eventTypes: [eventType] }, this.processEvent.bind(this));
  }

  listenTaj(listener: tajListener) {
    this.tajListeners.push(listener);
  }

  private async processEvent(
    payload: OnEventPayload,
    error: Error | undefined
  ) {
    for (const listener of this.tajListeners) {
      listener(payload, error);
    }
  }
}
