import * as yup from "yup";

const simpleSchema = yup.object().shape({
  count: yup.number().required().positive().integer(),
  treatments: yup
    .array()
    .of(
      yup
        .object()
        .required()
        .shape({
          factors: yup.object().required().shape({
            playerCount: yup.number().required().positive().integer(),
          }),
        })
    )
    .required()
    .min(1),
});

const completeSchema = yup.object().shape({
  treatments: yup
    .array()
    .of(
      yup.object().shape({
        count: yup.number().required().positive().integer(),
        treatment: yup
          .object()
          .required()
          .shape({
            factors: yup.object().required().shape({
              playerCount: yup.number().required().positive().integer(),
            }),
          }),
      })
    )
    .required()
    .min(1),
});

const batchConfigSchema = yup.object().shape({
  kind: yup.string().required().oneOf(["simple", "complete", "custom"]),
  config: yup.object().required().noUnknown(false).required(),
});

export function validateComplete(config) {
  return completeSchema.validateSync(config);
}

export function validateSimple(config) {
  return simpleSchema.validateSync(config);
}

export function validateBatchConfig(config) {
  config = batchConfigSchema.validateSync(config);
  console.log(config);

  switch (config.kind) {
    case "simple":
      config.config = validateSimple(config.config);
      break;
    case "complete":
      config.config = validateComplete(config.config);
      break;
  }

  return config;
}
