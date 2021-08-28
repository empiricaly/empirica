import { Readable, Writable, writable } from "svelte/store";
import { Attribute as Attr, TajribaUser } from "tajriba";

export interface AttributeOptions {
  /**
   * Private indicates the attribute will not be visible to other Participants.
   */
  private: boolean;
  /**
   * Protected indicates the attribute will not be updatable by other
   * Participants.
   */
  protected: boolean;
  /** Immutable creates an Attribute that cannot be updated. */
  immutable: boolean;
  /** Vector indicates the value is a vector. */
  vector: boolean;
  /**
   * Index, only used if the Attribute is a vector, indicates which index to
   * update the value at.
   */
  index: number | null;
  /**
   * Append, only used if the Attribute is a vector, indicates to append the
   * attribute to the vector.
   */
  append: boolean | null;
}

export class Attribute {
  private val: any;
  private rval: Writable<any>;

  constructor(
    private taj: TajribaUser,
    private attr: Attr | null = null,
    public key: string = "",
    public nodeID: string = ""
  ) {
    if (attr) {
      this.val = attr.val ? JSON.parse(attr.val) : null;
      this.key = attr.key;
      this.nodeID = attr.node.id;
    } else if (!this.key) {
      throw "key is missing";
    }

    this.rval = writable(this.val);
  }

  get readable() {
    return <Readable<any>>this.rval;
  }

  update(attr: Attr) {
    if (this.attr) {
      if (attr.key !== this.attr.key) {
        throw "key does not match";
      }

      if (attr.id === this.attr.id) {
        // TODO Why this happens?!
        // console.debug("attr: id has not changed");
        return false;
      }
    }

    this.val = attr.val ? JSON.parse(attr.val) : null;
    this.rval.set(this.val);
    this.attr = attr;

    return true;
  }

  get value() {
    return this.val;
  }

  set value(val: any) {
    this.set(val);
  }

  set(val: any, options: Partial<AttributeOptions> = {}) {
    // if (this.key === "ei:batchIDs") {
    //   console.log(this.attr, this.val, val);
    // }

    if (this.attr) {
      // console.warn(
      //   val,
      //   this.val,
      //   this.attr.val ? JSON.parse(this.attr.val) : null
      // );
      if (this.val === val) {
        // Double checking. In case of in-place edits to arrays and objects,
        // must check against original val.
        // TODO Improve attr not changed verification
        const pval = this.attr.val ? JSON.parse(this.attr.val) : null;
        if (pval === val) {
          return;
        }
      }
    } else {
      const opts = Object.assign(
        {
          private: false,
          protected: false,
          immutable: false,
          vector: false,
          index: null,
          append: false,
        },
        options
      );

      this.val = val;

      this.taj
        .setAttributes([
          {
            key: this.key,
            val: JSON.stringify(val),
            nodeID: this.nodeID,
            private: opts.private,
            protected: opts.protected,
            immutable: opts.immutable,
            vector: opts.vector,
            index: opts.index,
            append: opts.append,
          },
        ])
        .then((res) => {
          if (!res) {
            console.error("attr: failed to set new attr, undefined");
            return;
          }

          const nattr = res[0].attribute;

          // This is an ugly hack...
          this.attr = <Attr>{
            id: nattr.id,
            key: this.key,
            val: JSON.stringify(val),
            node: { id: this.nodeID },
            private: options.private,
            protected: options.protected,
            immutable: options.immutable,
            vector: options.vector,
            index: nattr.index,
            createdAt: nattr.createdAt,
            createdBy: nattr.createdBy,
            current: true,
          };
        })
        .catch((err) => {
          // TODO Handler failed attr save
          console.error("attr: failed to set new attr", this.nodeID);
          console.error(err);
        });

      return;
    }

    if (this.attr.immutable) {
      console.warn(`cannot update immutable attribute (${this.key})`);
      return;
    }

    this.taj
      .setAttributes([
        {
          key: this.attr.key,
          val: JSON.stringify(val),
          nodeID: this.attr.node.id,
          private: this.attr.private,
          protected: this.attr.protected,
          vector: this.attr.vector,
          index: this.attr.index,
        },
      ])
      .then(() => {})
      .catch((err) => {
        // TODO Handler failed attr save
        console.error("attr: failed to set existing attr");
        console.error(err);
      });

    this.val = val;
    this.rval.set(this.val);
  }
}
