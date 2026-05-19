"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { useActiveConnectionId } from "@/components/active-connection-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SchemaInfo } from "@/types";

const AGG_FUNCTIONS = [
  { label: "COUNT(*)", insert: "COUNT(*)" },
  { label: "COUNT(col)", insert: "COUNT()" },
  { label: "SUM()", insert: "SUM()" },
  { label: "AVG()", insert: "AVG()" },
  { label: "MAX()", insert: "MAX()" },
  { label: "MIN()", insert: "MIN()" },
];

const ALL_FUNCTIONS = [
  { label: "COUNT(*)", insert: "COUNT(*)" },
  { label: "COUNT(col)", insert: "COUNT()" },
  { label: "SUM()", insert: "SUM()" },
  { label: "AVG()", insert: "AVG()" },
  { label: "MAX()", insert: "MAX()" },
  { label: "MIN()", insert: "MIN()" },
  { label: "COALESCE()", insert: "COALESCE()" },
  { label: "date_trunc()", insert: "date_trunc()" },
  { label: "NOW()", insert: "NOW()" },
  { label: "CURRENT_TIMESTAMP", insert: "CURRENT_TIMESTAMP" },
  { label: "LOWER()", insert: "LOWER()" },
  { label: "UPPER()", insert: "UPPER()" },
  { label: "NULLIF()", insert: "NULLIF()" },
];

interface SuggestionItem {
  label: string;
  description?: string;
  insert: string;
}

interface AutocompleteContext {
  visible: boolean;
  type: "table" | "column" | "general";
  items: SuggestionItem[];
  filter?: string;
}

interface AutocompleteProps {
  sql: string;
  cursorPos: number;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSelect: (replacement: { before: number; after: number; text: string }) => void;
}

function getContext(sql: string, cursorPos: number, schema: SchemaInfo): AutocompleteContext {
  const textBefore = sql.slice(0, cursorPos);

  const dotMatch = textBefore.match(/(\w+)\.(\w+)\.\s*$/);
  if (dotMatch) {
    const schemaName = dotMatch[1];
    const tableName = dotMatch[2];
    const table = schema.tables.find(
      (t) =>
        t.schema.toLowerCase() === schemaName.toLowerCase() &&
        t.name.toLowerCase() === tableName.toLowerCase()
    );
    if (table) {
      return {
        visible: true,
        type: "column",
        items: table.columns.map((col) => ({
          label: col.name,
          description: col.type,
          insert: col.name,
        })),
      };
    }
    return { visible: false, type: "column", items: [] };
  }

  const tableMatch = textBefore.match(/(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([\w.]*)$/i);
  if (tableMatch) {
    const partial = tableMatch[1];
    let tables = schema.tables;

    if (partial) {
      const parts = partial.split(".");
      if (parts.length === 2) {
        tables = tables.filter(
          (t) =>
            t.schema.toLowerCase().startsWith(parts[0].toLowerCase()) &&
            t.name.toLowerCase().startsWith(parts[1].toLowerCase())
        );
      } else {
        const search = partial.toLowerCase();
        tables = tables.filter(
          (t) =>
            t.schema.toLowerCase().startsWith(search) ||
            t.name.toLowerCase().startsWith(search)
        );
      }
    }

    return {
      visible: true,
      type: "table",
      items: tables.slice(0, 30).map((t) => ({
        label: t.fullName,
        description: t.estimatedRowCount > 0
          ? `~${t.estimatedRowCount.toLocaleString()} rows`
          : undefined,
        insert: t.fullName,
      })),
      filter: partial,
    };
  }

  const selectMatches = [...textBefore.matchAll(/\bSELECT\b/gi)];
  const fromMatches = [...textBefore.matchAll(/\bFROM\b/gi)];
  const lastSelectIdx = selectMatches.length > 0
    ? selectMatches[selectMatches.length - 1].index!
    : -1;
  const lastFromIdx = fromMatches.length > 0
    ? fromMatches[fromMatches.length - 1].index!
    : -1;

  if (lastSelectIdx !== -1 && (lastFromIdx === -1 || lastSelectIdx > lastFromIdx)) {
    const fromMatch = sql.match(/FROM\s+([\w.]+(?:\s*,\s*[\w.]+)*)/i);
    let columns: SuggestionItem[] = [];

    if (fromMatch) {
      const refs = fromMatch[1].split(",").map((s) => s.trim().split(/\s+/)[0]);
      for (const ref of refs) {
        const parts = ref.split(".");
        if (parts.length === 2) {
          const t = schema.tables.find(
            (tbl) =>
              tbl.schema.toLowerCase() === parts[0].toLowerCase() &&
              tbl.name.toLowerCase() === parts[1].toLowerCase()
          );
          if (t) {
            columns.push(
              ...t.columns.map((col) => ({
                label: col.name,
                description: col.type,
                insert: col.name,
              }))
            );
          }
        } else {
          const t = schema.tables.find(
            (tbl) => tbl.name.toLowerCase() === parts[0].toLowerCase()
          );
          if (t) {
            columns.push(
              ...t.columns.map((col) => ({
                label: col.name,
                description: col.type,
                insert: col.name,
              }))
            );
          }
        }
      }
    }

    const lastWord = textBefore.match(/[\s,(]+(\w*)$/);
    const filter = lastWord ? lastWord[1] : "";

    if (filter) {
      columns = columns.filter((c) =>
        c.label.toLowerCase().startsWith(filter.toLowerCase())
      );
    }

    return {
      visible: true,
      type: "column",
      items: [...AGG_FUNCTIONS, ...columns.slice(0, 30)],
      filter,
    };
  }

  return { visible: false, type: "general", items: [] };
}

export function Autocomplete({ sql, cursorPos, textareaRef, onSelect }: AutocompleteProps) {
  const connectionId = useActiveConnectionId();
  const { data: schema } = useQuery<SchemaInfo>({
    queryKey: ["schema", connectionId],
    queryFn: () => fetch("/api/schema").then((r) => r.json()),
    enabled: !!connectionId,
    staleTime: 30_000,
  });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);

  const measureRef = useRef<HTMLDivElement>(null);
  const cursorSpanRef = useRef<HTMLSpanElement>(null);

  const updateContext = useCallback(
    (forceGeneral?: boolean) => {
      if (!schema) {
        setOpen(false);
        return;
      }

      let ctx: AutocompleteContext;
      if (forceGeneral) {
        ctx = {
          visible: true,
          type: "general",
          items: [
            ...schema.tables.slice(0, 20).map((t) => ({
              label: t.fullName,
              description: t.estimatedRowCount > 0
                ? `~${t.estimatedRowCount.toLocaleString()} rows`
                : undefined,
              insert: t.fullName,
            })),
            ...ALL_FUNCTIONS,
          ],
        };
      } else {
        ctx = getContext(sql, cursorPos, schema);
      }

      if (ctx.visible && ctx.items.length > 0) {
        setSuggestions(ctx.items);
        setFilterText(ctx.filter || "");
        setOpen(true);
        setActiveIndex(0);
      } else {
        setOpen(false);
      }
    },
    [sql, cursorPos, schema]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recalculate autocomplete context on input change
    updateContext();
  }, [updateContext]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const measure = measureRef.current;
    const span = cursorSpanRef.current;
    if (!textarea || !measure || !span) return;

    const textareaRect = textarea.getBoundingClientRect();
    const cs = window.getComputedStyle(textarea);

    measure.style.font = cs.font;
    measure.style.fontSize = cs.fontSize;
    measure.style.fontFamily = cs.fontFamily;
    measure.style.lineHeight = cs.lineHeight;
    measure.style.padding = cs.padding;
    measure.style.letterSpacing = cs.letterSpacing;
    measure.style.wordSpacing = cs.wordSpacing;
    measure.style.tabSize = cs.tabSize;
    measure.style.whiteSpace = "pre-wrap";
    measure.style.wordBreak = "break-word";
    measure.style.overflowWrap = "break-word";
    measure.style.visibility = "hidden";
    measure.style.pointerEvents = "none";
    measure.style.position = "fixed";
    measure.style.left = `${textareaRect.left}px`;
    measure.style.top = `${textareaRect.top}px`;
    measure.style.width = `${textareaRect.width}px`;
    measure.style.border = cs.border;
    measure.style.boxSizing = "border-box";

    span.textContent = sql.slice(0, cursorPos);

    requestAnimationFrame(() => {
      const spanRect = span.getBoundingClientRect();
      setCursorX(Math.round(spanRect.right));
      setCursorY(Math.round(spanRect.bottom));
    });
  }, [sql, cursorPos, textareaRef]);

  const handleSelect = useCallback(
    (item: SuggestionItem) => {
      onSelect({ before: filterText.length, after: 0, text: item.insert });
      setOpen(false);
    },
    [filterText, onSelect]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        updateContext(true);
        return;
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        const item = suggestions[activeIndex];
        if (item) {
          e.preventDefault();
          handleSelect(item);
        }
        return;
      }
    };

    textarea.addEventListener("keydown", handleKeyDown);
    return () => textarea.removeEventListener("keydown", handleKeyDown);
  }, [open, suggestions, activeIndex, textareaRef, updateContext, handleSelect]);

  if (!schema) return null;

  return (
    <>
      <div ref={measureRef} aria-hidden="true">
        <span ref={cursorSpanRef} />
      </div>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
          <span
            aria-hidden="true"
            className="fixed pointer-events-none"
            style={{ left: cursorX, top: cursorY, width: 0, height: 0 }}
          />
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className="z-50 flex w-64 flex-col rounded-md border bg-popover p-1 text-popover-foreground shadow-lg max-h-48 overflow-auto"
            side="bottom"
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {suggestions.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer",
                  i === activeIndex ? "bg-accent" : "hover:bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="flex-1 truncate" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {item.label}
                </span>
                {item.description && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {item.description}
                  </Badge>
                )}
              </div>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
