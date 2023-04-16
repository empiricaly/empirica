import { AddScopeInput, SetAttributeInput } from "@empirica/tajriba";
import { AttributeOptions } from "../../shared/attributes";
import { JsonValue } from "../../utils/json";

export function attribs(scopeID: string) {
  const result: SetAttributeInput[] = [];

  return {
    set: (key: string, value: JsonValue, ao?: Partial<AttributeOptions>) => {
      const props: SetAttributeInput = {
        key: key,
        nodeID: scopeID,
        val: JSON.stringify(value),
        ...ao,
      };

      result.push(props);
    },
    result,
  };
}

export function scopeConstructor(input: AddScopeInput) {
  return [
    input,
    {
      get(key: string) {
        const attr = input.attributes?.find((a) => a.key === key);
        if (!attr) {
          return;
        }

        return attr.val ? JSON.parse(attr.val) : undefined;
      },
      set: (key: string, value: JsonValue, ao?: Partial<AttributeOptions>) => {
        const attr = input.attributes?.find((a) => a.key === key);
        if (attr) {
          attr.val = JSON.stringify(value);

          return;
        }

        const props: SetAttributeInput = {
          key: key,
          val: JSON.stringify(value),
          ...ao,
        };

        if (!input.attributes) {
          input.attributes = [];
        }

        input.attributes.push(props);
      },
    },
  ] as const;
}

export type AttributeInput = {
  append?: boolean;
  immutable?: boolean;
  index?: number;
  key: string;
  nodeID?: string;
  private?: boolean;
  protected?: boolean;
  value: JsonValue;
  vector?: boolean;
};

export function attrs(attrs: AttributeInput[]) {
  const result: SetAttributeInput[] = [];

  for (const attr of attrs) {
    const {
      append,
      immutable,
      index,
      key,
      nodeID,
      private: privat,
      protected: protecte,
      value,
    } = attr;

    result.push({
      append,
      immutable,
      index,
      key,
      nodeID,
      private: privat,
      protected: protecte,
      val: JSON.stringify(value),
    });
  }

  return result;
}
