"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, RefreshCw, Code2, BarChart3, Key, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import type { SchemaInfo, TableProfile } from "@/types";

export default function TableDetailPage({ params }: { params: Promise<{ table: string }> }) {
  const { table } = use(params);
  const tableName = decodeURIComponent(table);

  const { data: schema } = useQuery<SchemaInfo>({
    queryKey: ["schema"],
    queryFn: () => fetch("/api/schema").then((r) => r.json()),
  });

  const tableInfo = schema?.tables.find((t) => t.fullName === tableName);

  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileErrorMsg, refetch: refetchProfile } = useQuery<TableProfile>({
    queryKey: ["profile", tableName],
    queryFn: () => fetch(`/api/profile/${encodeURIComponent(tableName)}`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to load profile");
      return data;
    }),
    enabled: !!tableInfo,
  });

  if (!tableInfo) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Table not found. <Link href="/explore" className="underline">Back to explorer</Link></p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/explore" className="hover:underline">Explore</Link>
            <span>/</span>
            <span>{tableInfo.schema}</span>
          </div>
          <h1 className="text-2xl font-bold font-mono">{tableInfo.name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary">~{tableInfo.estimatedRowCount.toLocaleString()} rows</Badge>
            <Badge variant="secondary">{tableInfo.sizePretty}</Badge>
            <Badge variant="secondary">{tableInfo.columns.length} columns</Badge>
            {tableInfo.indexes.length > 0 && <Badge variant="outline">{tableInfo.indexes.length} indexes</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/query?table=${encodeURIComponent(tableName)}`}>
              <Code2 className="w-4 h-4 mr-1.5" />
              Query
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchProfile()}
            disabled={profileLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${profileLoading ? "animate-spin" : ""}`} />
            Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="columns">
        <TabsList>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        {/* Columns tab */}
        <TabsContent value="columns" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Nullable</th>
                    <th className="text-left p-3 font-medium">Constraints</th>
                  </tr>
                </thead>
                <tbody>
                  {tableInfo.columns.map((col) => (
                    <tr key={col.name} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium">
                        {col.name}
                        {col.isPrimaryKey && <span className="ml-1.5 text-amber-500"><Key className="inline w-3 h-3" /></span>}
                        {col.isForeignKey && <span className="ml-1.5 text-blue-500"><LinkIcon className="inline w-3 h-3" /></span>}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{col.type}</td>
                      <td className="p-3">
                        {col.nullable ? (
                          <Badge variant="outline" className="text-xs">nullable</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">not null</Badge>
                        )}
                      </td>
                      <td className="p-3 space-x-1">
                        {col.isPrimaryKey && <Badge variant="outline" className="text-xs bg-amber-50">PK</Badge>}
                        {col.isForeignKey && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            FK → {col.references?.table}
                          </Badge>
                        )}
                        {col.isUnique && !col.isPrimaryKey && <Badge variant="outline" className="text-xs">unique</Badge>}
                        {col.hasDefault && <Badge variant="outline" className="text-xs">default</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile tab */}
        <TabsContent value="profile" className="mt-4">
          {profileLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Profiling table... (this may take a moment)
            </div>
          )}
          {profileError && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive mb-3">{(profileErrorMsg as Error)?.message ?? "Failed to load profile"}</p>
              <Button size="sm" variant="outline" onClick={() => refetchProfile()}>Retry</Button>
            </div>
          )}
          {!profile && !profileLoading && !profileError && (
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Click Profile to analyze column distributions</p>
              <Button className="mt-3" size="sm" onClick={() => refetchProfile()}>
                Run Profile
              </Button>
            </div>
          )}
          {profile && (
            <div className="space-y-3">
              {profile.isPartial && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200">
                  Partial profile — not all columns were analyzed.
                </div>
              )}
              {profile.columnProfiles.map((cp) => (
                <Card key={cp.name}>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono">{cp.name}</CardTitle>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-xs">{cp.type}</Badge>
                        {cp.roleHint && cp.roleHint !== "other" && (
                          <Badge variant="secondary" className="text-xs">{cp.roleHint}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-3 space-y-2">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {cp.nullPercent.toFixed(1)}% null
                        {cp.nullPercent > 20 && (
                          <span className="ml-1 text-amber-500 font-medium">⚠</span>
                        )}
                      </span>
                      {cp.distinctCount !== undefined && (
                        <span>{cp.distinctCount.toLocaleString()} distinct</span>
                      )}
                      {cp.min !== undefined && <span>min: {cp.min}</span>}
                      {cp.max !== undefined && <span>max: {cp.max}</span>}
                      {cp.avg !== undefined && <span>avg: {cp.avg.toFixed(2)}</span>}
                    </div>
                    {cp.nullPercent > 0 && (
                      <Progress value={cp.nullPercent} className="h-1" />
                    )}
                    {cp.topValues && cp.topValues.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Top values</p>
                        <div className="space-y-1">
                          {cp.topValues.slice(0, 6).map((v, vi) => (
                            <div key={`${v.value}-${vi}`} className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-muted-foreground w-32 truncate">{v.value}</span>
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary/60 rounded-full"
                                  style={{ width: `${Math.min(100, v.percent)}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground w-12 text-right">{v.percent.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Indexes tab */}
        <TabsContent value="indexes" className="mt-4">
          {tableInfo.indexes.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No indexes found.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Columns</th>
                      <th className="text-left p-3 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableInfo.indexes.map((idx) => (
                      <tr key={idx.name} className="border-b last:border-0">
                        <td className="p-3 font-mono text-sm">{idx.name}</td>
                        <td className="p-3 font-mono text-sm">{idx.columns.join(", ")}</td>
                        <td className="p-3 space-x-1">
                          {idx.isPrimary && <Badge variant="outline" className="text-xs">primary</Badge>}
                          {idx.isUnique && !idx.isPrimary && <Badge variant="outline" className="text-xs">unique</Badge>}
                          {!idx.isPrimary && !idx.isUnique && <Badge variant="secondary" className="text-xs">index</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Relationships tab */}
        <TabsContent value="relationships" className="mt-4 space-y-3">
          {tableInfo.foreignKeys.length === 0 && (
            <p className="text-muted-foreground text-sm">No foreign key relationships found.</p>
          )}
          {tableInfo.foreignKeys.map((fk) => (
            <Card key={fk.constraintName}>
              <CardContent className="flex items-center gap-3 py-3">
                <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="text-sm">
                  <span className="font-mono">{tableName}.{fk.fromColumn}</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <Link
                    href={`/explore/${encodeURIComponent(fk.toTable)}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {fk.toTable}.{fk.toColumn}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Incoming FKs */}
          {schema && (() => {
            const incoming = schema.relationships.filter((r) => r.to === tableName);
            return incoming.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Referenced by</p>
                {incoming.map((r) => (
                  <Card key={`${r.from}.${r.fromColumn}`} className="mb-2">
                    <CardContent className="flex items-center gap-3 py-3">
                      <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="text-sm">
                        <Link
                          href={`/explore/${encodeURIComponent(r.from)}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {r.from}.{r.fromColumn}
                        </Link>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="font-mono">{tableName}.{r.toColumn}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null;
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
