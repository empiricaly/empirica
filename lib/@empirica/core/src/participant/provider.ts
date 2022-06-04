import {
  AttributeChange as TAttribute,
  ChangePayload,
  ParticipantChange as TParticipant,
  ScopeChange as TScope,
  SetAttributeInput,
  StepChange as TStep,
  SubAttributesPayload,
} from "@empirica/tajriba";
import { groupBy, Observable, Subject } from "rxjs";

export interface ScopeChange {
  scope: TScope;
  removed: boolean;
}

export interface AttributeChange {
  attribute: TAttribute;
  removed: boolean;
}

export interface ParticipantChange {
  participant: TParticipant;
  removed: boolean;
}

export interface StepChange {
  step: TStep;
  removed: boolean;
}

export class TajribaProvider {
  public scopes = new Subject<ScopeChange>();
  public attributes = new Subject<AttributeChange>();
  public participants = new Subject<ParticipantChange>();
  public steps = new Subject<StepChange>();
  public dones = new Subject<void>();

  constructor(
    changes: Observable<ChangePayload>,
    readonly globals: Observable<SubAttributesPayload>,
    readonly setAttributes: (input: SetAttributeInput[]) => Promise<void>
  ) {
    changes.pipe(groupBy((chg) => chg.change.__typename)).subscribe({
      next: (group) => {
        switch (group.key) {
          case "ScopeChange":
            group.subscribe({
              next: (scope) => {
                this.scopes.next({
                  scope: <TScope>scope.change,
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
              next: (scope) => {
                this.attributes.next({
                  attribute: <TAttribute>scope.change,
                  removed: scope.removed,
                });

                if (scope.done) {
                  this.dones.next();
                }
              },
            });

            break;
          case "ParticipantChange":
            group.subscribe({
              next: (scope) => {
                this.participants.next({
                  participant: <TParticipant>scope.change,
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
                  step: <TStep>scope.change,
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
