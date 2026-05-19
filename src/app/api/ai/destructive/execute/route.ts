import { NextRequest, NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { getSafetyConfig } from "@/lib/settings";
import { z } from "zod";
import type { DestructiveExecutionResult } from "@/types";

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
  }),
});

export async function POST(req: NextRequest) {
  const safety = getSafetyConfig();
  
  if (!safety.writesEnabled) {
    return NextResponse.json({ 
      error: "Write operations are disabled. Enable writes in Settings to execute destructive queries." 
    }, { status: 403 });
  }

  try {
    const { plan } = schema.parse(await req.json());
    
    const result: DestructiveExecutionResult = {
      planId: plan.id,
      success: true,
      steps: [],
      totalDurationMs: 0,
      committed: false,
      rolledBack: false,
    };

    const startTime = Date.now();

    await withClient(async (client) => {
      await client.query("SET statement_timeout = 120000");
      
      if (plan.transactionWrapped) {
        await client.query("BEGIN");
      }

      try {
        for (const step of plan.steps) {
          const stepStart = Date.now();
          
          try {
            const res = await client.query(step.sql);
            const stepDuration = Date.now() - stepStart;
            
            result.steps.push({
              order: step.order,
              type: step.type,
              sql: step.sql,
              success: true,
              rowsAffected: res.rowCount ?? 0,
              durationMs: stepDuration,
            });
          } catch (e) {
            const stepDuration = Date.now() - stepStart;
            result.steps.push({
              order: step.order,
              type: step.type,
              sql: step.sql,
              success: false,
              durationMs: stepDuration,
              error: (e as Error).message,
            });
            
            result.success = false;
            
            if (plan.transactionWrapped) {
              await client.query("ROLLBACK");
              result.rolledBack = true;
            }
            
            result.totalDurationMs = Date.now() - startTime;
            return;
          }
        }

        if (plan.transactionWrapped && result.success) {
          await client.query("COMMIT");
          result.committed = true;
        }
      } finally {
        result.totalDurationMs = Date.now() - startTime;
      }
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
