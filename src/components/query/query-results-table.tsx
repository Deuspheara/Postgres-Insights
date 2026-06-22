"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ObjectViewer } from "@/components/ui/object-viewer";
import { Search, WrapText, Hash, Rows3 } from "lucide-react";
import type { QueryResult } from "@/types";
import { cn } from "@/lib/utils";

interface QueryResultsTableProps {
  result: QueryResult;
}

function isNumericValue(value: unknown) {
  return typeof value === "number" || typeof value === "bigint";
}

function isBooleanValue(value: unknown) {
  return typeof value === "boolean";
}

function getSearchableValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function formatCellText(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toLocaleString();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function QueryResultsTable({ result }: QueryResultsTableProps) {
  const [search, setSearch] = useState("");
  const [wrapCells, setWrapCells] = useState(false);
  const [showRowNumbers, setShowRowNumbers] = useState(true);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return result.rows;

    return result.rows.filter((row) =>
      result.fields.some((field) =>
        getSearchableValue(row[field.name]).toLowerCase().includes(term),
      ),
    );
  }, [result.fields, result.rows, search]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b bg-muted/20 px-4 py-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal">
              {result.fields.length} columns
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {filteredRows.length.toLocaleString()} visible rows
            </Badge>
            {filteredRows.length !== result.rows.length && (
              <span>
                filtered from {result.rows.length.toLocaleString()} rows
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search visible results"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={showRowNumbers ? "secondary" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setShowRowNumbers((current) => !current)}
              >
                <Hash className="mr-1.5 h-3.5 w-3.5" />
                Row #
              </Button>
              <Button
                type="button"
                size="sm"
                variant={wrapCells ? "secondary" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setWrapCells((current) => !current)}
              >
                <WrapText className="mr-1.5 h-3.5 w-3.5" />
                Wrap
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <Rows3 className="h-8 w-8 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-foreground">No rows match this search</p>
              <p className="text-xs text-muted-foreground">
                Try a different term or clear the results filter.
              </p>
            </div>
          </div>
        ) : (
          <table className="min-w-full border-collapse text-xs align-top">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <tr className="border-b border-border/80">
                {showRowNumbers && (
                  <th className="sticky left-0 z-20 w-14 border-r border-border/70 bg-background/95 px-3 py-2 text-right font-medium text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    #
                  </th>
                )}
                {result.fields.map((field) => (
                  <th
                    key={field.name}
                    className="min-w-[160px] max-w-[360px] border-r border-border/60 px-3 py-2 text-left font-medium last:border-r-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-foreground">
                        {field.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        type {field.dataTypeID}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border/50 odd:bg-muted/10 hover:bg-muted/30">
                  {showRowNumbers && (
                    <td className="sticky left-0 z-10 border-r border-border/70 bg-background/95 px-3 py-2 text-right font-mono text-[11px] text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
                      {rowIndex + 1}
                    </td>
                  )}
                  {result.fields.map((field) => {
                    const cellValue = row[field.name];
                    const isObjectLike =
                      cellValue !== null && typeof cellValue === "object";
                    const cellText = formatCellText(cellValue);

                    return (
                      <td
                        key={field.name}
                        className={cn(
                          "max-w-[360px] border-r border-border/40 px-3 py-2 align-top last:border-r-0",
                          isNumericValue(cellValue) && "text-right font-medium tabular-nums",
                        )}
                      >
                        {cellValue === null ? (
                          <Badge variant="outline" className="font-normal italic text-muted-foreground">
                            NULL
                          </Badge>
                        ) : isBooleanValue(cellValue) ? (
                          <Badge variant={cellValue ? "default" : "secondary"} className="font-normal">
                            {cellValue ? "true" : "false"}
                          </Badge>
                        ) : isObjectLike ? (
                          <ObjectViewer value={cellValue} />
                        ) : (
                          <span
                            title={cellText}
                            className={cn(
                              "block font-mono text-[11px] text-foreground/95",
                              wrapCells
                                ? "whitespace-pre-wrap break-words"
                                : "truncate whitespace-nowrap",
                            )}
                          >
                            {cellText}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
