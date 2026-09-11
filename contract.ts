import pgvector from "@prisma/orm-extension-pgvector/pack";
import { defineContract, enumType, member, rel } from "@prisma/orm-postgres/contract-builder";

const pgText = { codecId: "pg/text@1", nativeType: "text" } as const;
const Priority = enumType(
  "Priority",
  pgText,
  member("Low", "low"),
  member("High", "high"),
  member("Urgent", "urgent"),
);

export const contract = defineContract(
  {
    extensions: { pgvector },
  },
  ({ field, model, type }) => {
    const types = {
      Embedding1536: type.pgvector.Vector(1536),
    } as const;

    const User = model("User", {
      fields: {
        id: field.id.uuidv4String(),
        email: field.text().unique(),
        passwordHash: field.text(),
        createdAt: field.temporal.createdAt(),
        updatedAt: field.temporal.updatedAt(),
        address: field.json().optional(),
      },
    });

    const MerchantRule = model("MerchantRule", {
      fields: {
        id: field.id.uuidv4String(),
        userId: field.uuidString().optional(),
        defaultRuleId: field.uuidString().optional(),
        pattern: field.text(),
        patternType: field.text().default("contains"),
        normalizedName: field.text(),
        category: field.text(),
        priority: field.int().default(1000),
        isDisabled: field.boolean().default(false),
        createdAt: field.temporal.createdAt(),
        updatedAt: field.temporal.updatedAt(),
      },
    });

    const Transaction = model("Transaction", {
      fields: {
        id: field.id.uuidv4String(),
        fingerprint: field.text().unique(),
        date: field.temporal.timestamp(),
        originalDescription: field.text(),
        normalizedDescription: field.text(),
        amount: field.float(),
        category: field.text(),
        createdAt: field.temporal.createdAt(),
        updatedAt: field.temporal.updatedAt(),
      },
    });

    return {
      enums: { Priority },
      types,
      models: {
        User: User.relations({
          merchantRules: rel.hasMany(MerchantRule, { by: "userId" }),
        }).sql({
          table: "user",
        }),
        MerchantRule: MerchantRule.relations({
          user: rel.belongsTo(User, { from: "userId", to: "id" }),
        }).sql(({ cols, constraints }) => ({
          table: "merchant_rule",
          foreignKeys: [
            constraints.foreignKey(cols.userId, User.refs.id, {
              name: "merchant_rule_userId_fkey",
            }),
          ],
        })),
        Transaction: Transaction.sql({
          table: "transaction",
        }),
      },
    };
  })