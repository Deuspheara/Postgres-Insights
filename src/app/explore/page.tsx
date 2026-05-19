"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import type { SchemaInfo, TableInfo } from "@/types";
import { useActiveConnectionId } from "@/components/active-connection-provider";

export default function ExplorePage() {
  const qc = useQueryClient();
  const connectionId = useActiveConnectionId();
  const [search, setSearch] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<string>("all");

  const { data: schema, isLoading, isFetching } = useQuery<SchemaInfo>({
    queryKey: ["schema", connectionId],
    queryFn: () => fetch("/api/schema").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const refresh = () => {
    fetch("/api/schema?refresh=true")
      .then((r) => r.json())
      .then((data) => {
        qc.setQueryData(["schema", connectionId], data);
      });
  };

  const filtered = schema?.tables.filter((t) => {
    const matchSearch = t.fullName.toLowerCase().includes(search.toLowerCase());
    const matchSchema = selectedSchema === "all" || t.schema === selectedSchema;
    return matchSearch && matchSchema;
  }) ?? [];

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Schema Explorer</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-7 h-8 text-xs"
              placeholder="Search tables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {schema && schema.schemas.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={selectedSchema === "all" ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedSchema("all")}
              >
                All
              </Badge>
              {schema.schemas.map((s) => (
                <Badge
                  key={s}
                  variant={selectedSchema === s ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedSchema(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              {schema ? "No tables found" : "Connect a database in Settings"}
            </p>
          ) : (
            <div className="py-1">
              {filtered.map((t) => (
                <Link
                  key={t.fullName}
                  href={`/explore/${encodeURIComponent(t.fullName)}`}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-sm group"
                >
                  <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate font-mono text-xs">{t.name}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>

        {schema && (
          <div className="p-3 border-t text-xs text-muted-foreground">
            {filtered.length} of {schema.tables.length} tables
          </div>
        )}
      </div>

      {/* Center panel */}
      <div className="flex-1 p-6">
        {!schema && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Database className="w-12 h-12 text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold">No database connected</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Go to Settings to add a PostgreSQL connection
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/settings">Open Settings</Link>
            </Button>
          </div>
        )}

        {schema && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold">Schema Overview</h1>
              <p className="text-sm text-muted-foreground">
                {schema.tables.length} tables · {schema.schemas.length} schemas · {schema.relationships.length} relationships
              </p>
            </div>

            <div className="grid gap-3">
              {filtered.slice(0, 20).map((t) => (
                <TableRow key={t.fullName} table={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableRow({ table }: { table: TableInfo }) {
  const pkCols = table.columns.filter((c) => c.isPrimaryKey);
  const fkCols = table.columns.filter((c) => c.isForeignKey);

  return (
    <Link href={`/explore/${encodeURIComponent(table.fullName)}`}>
      <div className="bg-card rounded-lg p-3 shadow-[0_4px_20px_-2px_rgba(28,28,26,0.06)] hover:shadow-[0_6px_24px_-2px_rgba(138,75,49,0.12)] transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-sm font-semibold">{table.fullName}</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">~{table.estimatedRowCount.toLocaleString()} rows</Badge>
              <span className="text-xs text-muted-foreground">{table.sizePretty}</span>
              <span className="text-xs text-muted-foreground">{table.columns.length} columns</span>
            </div>
          </div>
          <div className="flex gap-1">
            {pkCols.length > 0 && <Badge variant="outline" className="text-xs">PK</Badge>}
            {fkCols.length > 0 && <Badge variant="outline" className="text-xs">{fkCols.length} FK</Badge>}
            {table.indexes.length > 0 && <Badge variant="outline" className="text-xs">{table.indexes.length} idx</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {table.columns.slice(0, 8).map((c) => (
            <span key={c.name} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {c.name}
              <span className="text-muted-foreground ml-1">{c.type}</span>
            </span>
          ))}
          {table.columns.length > 8 && (
            <span className="text-xs text-muted-foreground px-1">+{table.columns.length - 8} more</span>
          )}
        </div>
      </div>
    </Link>
  );
}
