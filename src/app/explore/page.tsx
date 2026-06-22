"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  RefreshCw,
  Search,
  ChevronRight,
  ArrowUpDown,
  TableProperties,
  Network,
  KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import type { SchemaInfo, TableInfo } from "@/types";
import { useActiveConnectionId } from "@/components/active-connection-provider";
import { formatRows, timeAgo } from "@/lib/utils";

export default function ExplorePage() {
  const qc = useQueryClient();
  const connectionId = useActiveConnectionId();
  const [search, setSearch] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<string>("all");
  const [sortBy, setSortBy] = useState("name-asc");

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

  const filtered = useMemo(() => {
    if (!schema) return [];
    const result = schema.tables.filter((table) => {
      const matchSearch = table.fullName.toLowerCase().includes(search.toLowerCase());
      const matchSchema = selectedSchema === "all" || table.schema === selectedSchema;
      return matchSearch && matchSchema;
    });

    switch (sortBy) {
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "rows-desc":
        result.sort((a, b) => b.estimatedRowCount - a.estimatedRowCount);
        break;
      case "rows-asc":
        result.sort((a, b) => a.estimatedRowCount - b.estimatedRowCount);
        break;
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [schema, search, selectedSchema, sortBy]);

  const missingPkCount =
    schema?.tables.filter((table) => !table.columns.some((column) => column.isPrimaryKey)).length ?? 0;

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[280px] shrink-0 border-r border-border/60 bg-background/50">
        <div className="flex h-full flex-col">
          <div className="border-b border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Schema explorer
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Navigate tables</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={isFetching}>
                <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Search tables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none"
              >
                <option value="name-asc">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
                <option value="rows-desc">Rows (high to low)</option>
                <option value="rows-asc">Rows (low to high)</option>
              </select>
            </div>

            {schema && schema.schemas.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={selectedSchema === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedSchema("all")}
                >
                  All
                </Badge>
                {schema.schemas.map((schemaName) => (
                  <Badge
                    key={schemaName}
                    variant={selectedSchema === schemaName ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedSchema(schemaName)}
                  >
                    {schemaName}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading tables...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {schema ? "No tables found" : "Connect a database in Settings"}
              </p>
            ) : (
              <div className="py-2">
                {filtered.map((table) => (
                  <Link
                    key={table.fullName}
                    href={`/explore/${encodeURIComponent(table.fullName)}`}
                    className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                  >
                    <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{table.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {table.schema}.{table.name}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>

          {schema && (
            <div className="border-t border-border/60 p-4 text-xs text-muted-foreground">
              {filtered.length} of {schema.tables.length} tables
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto px-8 py-7">
        {!schema && !isLoading && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <Database className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">No database connected</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Go to Settings to add a PostgreSQL connection.
              </p>
            </div>
          </div>
        )}

        {schema && (
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Schema overview
                  </Badge>
                  {schema.capturedAt && (
                    <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                      Refreshed {timeAgo(schema.capturedAt)}
                    </Badge>
                  )}
                </div>
                <h1 className="mt-3 text-[30px] font-bold tracking-tight">
                  Explore structure and relationships
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Browse tables, compare sizes, and inspect key schema signals without the page fighting for attention.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={refresh} disabled={isFetching}>
                  <RefreshCw className={isFetching ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} />
                  Refresh
                </Button>
                <Button asChild>
                  <Link href="/query">Open Query Editor</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="Tables" value={schema.tables.length.toString()} sub={`${schema.schemas.length} schemas`} icon={TableProperties} />
              <InfoCard label="Relationships" value={schema.relationships.length.toString()} sub="Foreign keys" icon={Network} />
              <InfoCard label="Missing PK" value={missingPkCount.toString()} sub="Tables lacking a primary key" icon={KeyRound} />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {filtered.slice(0, 24).map((table) => (
                <TableRow key={table.fullName} table={table} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function TableRow({ table }: { table: TableInfo }) {
  const pkCols = table.columns.filter((c) => c.isPrimaryKey);
  const fkCols = table.columns.filter((c) => c.isForeignKey);

  return (
    <Link href={`/explore/${encodeURIComponent(table.fullName)}`}>
      <Card className="transition-shadow hover:shadow-[0_8px_28px_-18px_rgba(28,28,26,0.18)]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {table.schema}
                </Badge>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {table.name}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatRows(table.estimatedRowCount)} rows · {table.sizePretty} · {table.columns.length} columns
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <span>
                View
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pkCols.length > 0 && <Badge variant="outline">PK</Badge>}
            {fkCols.length > 0 && <Badge variant="outline">{fkCols.length} FK</Badge>}
            {table.indexes.length > 0 && <Badge variant="outline">{table.indexes.length} idx</Badge>}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {table.columns.slice(0, 6).map((column) => (
              <span key={column.name} className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground">
                {column.name}
              </span>
            ))}
            {table.columns.length > 6 && (
              <span className="px-1 py-1 text-[11px] text-muted-foreground">
                +{table.columns.length - 6} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
