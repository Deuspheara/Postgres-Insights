import { NextRequest, NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { z } from "zod";
import type { DestructiveQueryPlan, TableImpact } from "@/types";

const schema = z.object({
  plan: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    steps: z.array(z.object({
      order: z.number(),
      type: z.enum(["verification", "deletion", "verification_final"]),
      description: z.string(),
      sql: z.string(),
    })),
    transactionWrapped: z.boolean(),
    rollbackSql: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { plan } = schema.parse(await req.json());
    
    const verificationSteps = plan.steps.filter(s => s.type === "verification");
    const tableImpacts: Map<string, TableImpact> = new Map();
    let totalRowsAffected = 0;

    for (const step of verificationSteps) {
      try {
        const result = await withClient(async (client) => {
          await client.query("SET statement_timeout = 30000");
          return await client.query(step.sql);
        });

        if (result.rows.length > 0) {
          const tableName = extractTableName(step.sql);
          const existingImpact = tableImpacts.get(tableName);
          
          if (existingImpact) {
            existingImpact.rowCountAffected += result.rows.length;
            existingImpact.sampleRows = result.rows.slice(0, 5);
          } else {
            tableImpacts.set(tableName, {
              tableName,
              rowCountBefore: 0,
              rowCountAffected: result.rows.length,
              sampleRows: result.rows.slice(0, 5),
            });
          }
          totalRowsAffected += result.rows.length;
        }
      } catch (e) {
        console.error(`Error running verification step: ${step.sql}`, e);
      }
    }

    const updatedPlan: DestructiveQueryPlan = {
      ...plan,
      totalTablesAffected: tableImpacts.size,
      totalRowsAffected,
      steps: plan.steps.map(s => ({
        ...s,
        tableImpact: s.type === "verification" ? tableImpacts.get(extractTableName(s.sql)) : undefined,
        executed: false,
      })),
    };

    return NextResponse.json({ plan: updatedPlan, tableImpacts: Array.from(tableImpacts.values()) });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function extractTableName(sql: string): string {
  const match = sql.match(/FROM\s+(\w+)/i);
  return match ? match[1] : "unknown";
}
