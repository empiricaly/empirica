import SimpleSchema from "simpl-schema";
import inflection from "inflection";

export const IdSchema = new SimpleSchema({
  _id: {
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Id
  }
});

export const ArchivedSchema = new SimpleSchema({
  archivedById: {
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Id,
    autoValue() {
      if (this.field("archivedAt").isSet) {
        return this.userId;
      }
      return undefined;
    }
  },
  archivedAt: {
    type: Date,
    label: "Archived at",
    optional: true,
    denyInsert: true
  }
});

export const DebugModeSchema = new SimpleSchema({
  debugMode: {
    type: Boolean,
    defaultValue: false
  }
});

export const TimestampSchema = new SimpleSchema({
  createdAt: {
    type: Date,
    label: "Created at",
    denyUpdate: true,
    index: true,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      } else {
        this.unset(); // Prevent user from supplying their own value
      }
    }
  },
  updatedAt: {
    type: Date,
    label: "Last updated at",
    optional: true,
    denyInsert: true,
    index: true,
    autoValue() {
      if (this.isUpdate) {
        return new Date();
      }
    }
  }
});

// Userful for admin operations, tracking who created what.
export const CreatorSchema = new SimpleSchema({
  createdById: {
    type: String,
    label: "Created by",
    denyUpdate: true,
    regEx: SimpleSchema.RegEx.Id,
    autoValue() {
      if (this.isInsert) {
        return this.isSet && this.isFromTrustedCode ? undefined : this.userId;
      }
      return undefined;
    },
    index: true
  },
  updatedById: {
    type: String,
    label: "Last updated by",
    optional: true,
    regEx: SimpleSchema.RegEx.Id,
    autoValue() {
      if (this.isUpdate) {
        return this.userId;
      }
    },
    index: true
  }
});

export const UserDataSchema = new SimpleSchema({
  data: {
    type: Object,
    blackbox: true,
    defaultValue: {}
  }
});

// The PolymorphicSchema allows to have records be attached to different
// types of collection. (belongs_to :coll, polymorphic: true)
// objectType and objectId point to the owning object of the record
// objectTypes are the names of the collection that the record can be
// associated with. ex. ["BriefSection", "Brief", "Board"]
export const PolymorphicSchema = function(collTypes) {
  return new SimpleSchema({
    objectType: {
      type: String,
      allowedValues: collTypes,
      denyUpdate: true,
      index: true
    },
    objectId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
      denyUpdate: true,
      index: true
    }
  });
};

export const HasManyByRef = function(coll) {
  const camel = inflection.camelize(inflection.singularize(coll._name), true);
  const label = inflection.titleize(coll._name);
  const fieldName = `${camel}Ids`;
  return new SimpleSchema({
    [fieldName]: {
      type: Array,
      defaultValue: [],
      label,
      index: true
    },
    [`${fieldName}.$`]: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
      label: `${label} Item`
      // associatedMustExist: coll
    }
  });
};

export const BelongsTo = function(coll, denyUpdate = true, required = true) {
  const singular = inflection.singularize(coll._name);
  const camel = inflection.camelize(singular, true);
  const label = inflection.titleize(singular);
  const fieldName = `${camel}Id`;
  return new SimpleSchema({
    [fieldName]: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
      label,
      denyUpdate,
      // associatedMustExist: coll,
      index: true,
      optional: !required
    }
  });
};
