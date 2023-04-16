import {
  ChangePayload,
  ParticipantChange,
  SetAttributeInput,
  SubAttributesPayload,
} from "@empirica/tajriba";
import { Observable, Subject, groupBy } from "rxjs";
import { AttributeChange, AttributeUpdate } from "../shared/attributes";
import { ScopeIdent, ScopeUpdate } from "../shared/scopes";
import { trace } from "../utils/console";
import { StepChange, StepUpdate } from "./steps";

export interface ParticipantUpdate {
  participant: ParticipantChange;
  removed: boolean;
}

export class TajribaProvider {
  public scopes = new Subject<ScopeUpdate>();
  public attributes = new Subject<AttributeUpdate>();
  public participants = new Subject<ParticipantUpdate>();
  public steps = new Subject<StepUpdate>();
  public dones = new Subject<void>();

  constructor(
    changes: Observable<ChangePayload>,
    readonly globals: Observable<SubAttributesPayload>,
    readonly setAttributes: (input: SetAttributeInput[]) => Promise<any>
  ) {
    changes.pipe(groupBy((chg) => chg?.change?.__typename)).subscribe({
      next: (group) => {
        switch (group.key) {
          case "ScopeChange":
            group.subscribe({
              next: (msg) => {
                if (
                  !msg.change ||
                  msg.removed === null ||
                  msg.removed === undefined
                ) {
                  trace("AttributeChange empty");
                } else {
                  this.scopes.next({
                    scope: <ScopeIdent>msg.change,
                    removed: msg.removed,
                  });
                }

                if (msg.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "AttributeChange":
            group.subscribe({
              next: (msg) => {
                if (
                  !msg.change ||
                  msg.removed === null ||
                  msg.removed === undefined
                ) {
                  trace("AttributeChange empty");
                } else {
                  this.attributes.next({
                    attribute: <AttributeChange>msg.change,
                    removed: msg.removed,
                  });
                }

                if (msg.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "ParticipantChange":
            group.subscribe({
              next: (msg) => {
                if (
                  !msg.change ||
                  msg.removed === null ||
                  msg.removed === undefined
                ) {
                  trace("ParticipantChange empty");
                } else {
                  this.participants.next({
                    participant: <ParticipantChange>msg.change,
                    removed: msg.removed,
                  });
                }

                if (msg.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "StepChange":
            group.subscribe({
              next: (msg) => {
                if (
                  !msg.change ||
                  msg.removed === null ||
                  msg.removed === undefined
                ) {
                  trace("StepChange empty");
                } else {
                  this.steps.next({
                    step: <StepChange>msg.change,
                    removed: msg.removed,
                  });
                }

                if (msg.done) {
                  this.dones.next();
                }
              },
            });

            break;
          default:
            group.subscribe({
              next: (change) => {
                if (change.done) {
                  this.dones.next();
                }
              },
            });

            break;
        }
      },
    });
  }
}
