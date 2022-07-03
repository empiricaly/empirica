import {
  ChangePayload,
  ParticipantChange,
  SetAttributeInput,
  SubAttributesPayload,
} from "@empirica/tajriba";
import { groupBy, Observable, Subject } from "rxjs";
import { AttributeChange, AttributeUpdate } from "../shared/attributes";
import { ScopeIdent, ScopeUpdate } from "../shared/scopes";
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
    changes.pipe(groupBy((chg) => chg.change.__typename)).subscribe({
      next: (group) => {
        switch (group.key) {
          case "ScopeChange":
            group.subscribe({
              next: (scope) => {
                this.scopes.next({
                  scope: <ScopeIdent>scope.change,
                  removed: scope.removed,
                });

                if (scope.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "AttributeChange":
            group.subscribe({
              next: (attribute) => {
                this.attributes.next({
                  attribute: <AttributeChange>attribute.change,
                  removed: attribute.removed,
                });

                if (attribute.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "ParticipantChange":
            group.subscribe({
              next: (scope) => {
                this.participants.next({
                  participant: <ParticipantChange>scope.change,
                  removed: scope.removed,
                });

                if (scope.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "StepChange":
            group.subscribe({
              next: (scope) => {
                this.steps.next({
                  step: <StepChange>scope.change,
                  removed: scope.removed,
                });

                if (scope.done) {
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
