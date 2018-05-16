import Collection2 from "meteor/aldeed:collection2";
import SimpleSchema from "simpl-schema";

// The field is a reference to another record of the given type. For ex.
//   PageId: {
//     Type: String,
//     AssociatedMustExist: Page
//   }
// => Page.findOne(pageId) should not be null.
SimpleSchema.extendOptions(["associatedMustExist"]);

Collection2.on("schema.attached", (collection, ss) => {
  if (ss.version >= 2) {
    ss.messageBox.messages({
      missingAssociated: "Associated record missing"
    });
  }

  ss.addValidator(function() {
    if (!this.isSet) {
      return;
    }

    const def = this.definition;
    const coll = def.associatedMustExist;

    if (coll && Meteor.isServer && this.isSet) {
      if (coll.find(this.value).count() === 0) {
        return "missingAssociated";
      }
    }
  });
});

// Must be unique scoped by other field (for given value of passed field,
// The current field should be unique). For ex:
//   Name: {
//     Type: String,
//     ScopedUnique: "orgId"
//   }
// Name must be unique for document with equal orgId.
// Documents with different orgId can have same name.
SimpleSchema.extendOptions(["scopedUnique"]);

Collection2.on("schema.attached", (collection, ss) => {
  if (ss.version >= 2) {
    ss.messageBox.messages({
      uniqueScoped: "Already exists"
    });
  }

  ss.addValidator(function() {
    if (!this.isSet) {
      return;
    }

    const def = this.definition;
    const uniqueFieldScope = def.scopedUnique;

    if (!uniqueFieldScope) {
      return;
    }

    const val = this.field(uniqueFieldScope).value;
    const key = this.key;
    if (
      collection
        .find({
          [uniqueFieldScope]: val,
          [key]: this.value
        })
        .count() > 0
    ) {
      return "uniqueScoped";
    }
  });
});
