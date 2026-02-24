/**
 * Base interface for MongoDB entities with common audit/timestamps fields.
 * Use `*ById` for references, `*By` for populated relations (typically User).
 */
export interface MongoEntity {
  __v?: number;
  _id?: string;

  createdBy?: { _id?: string; id?: string; name?: string };
  createdById?: string;
  createdAt?: Date;

  updatedBy?: { _id?: string; id?: string; name?: string };
  updatedById?: string;
  updatedAt?: Date;

  deletedAt?: Date;
  deletedBy?: { _id?: string; id?: string; name?: string };
  deletedById?: string;

  deleted?: boolean;
}
