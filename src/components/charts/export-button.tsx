"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  exportElementAsPng,
  exportElementAsSvg,
  copyElementAsImage,
} from "@/lib/export";

export function ExportButton({
  elementRef,
  baseName,
}: {
  elementRef: React.RefObject<HTMLDivElement | null>;
  baseName: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const getFilename = () =>
    `${baseName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-${Date.now()}`;

  const wrap = async (fn: (el: HTMLElement, name: string) => Promise<void>, label: string) => {
    if (!elementRef.current || isExporting) return;
    setIsExporting(true);
    toast("Exporting…");
    try {
      await fn(elementRef.current, getFilename());
      toast(`Exported as ${label}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Export"
          className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem
          disabled={isExporting}
          onClick={() => wrap(exportElementAsPng, "PNG")}
        >
          PNG (2x)
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isExporting}
          onClick={() => wrap(exportElementAsSvg, "SVG")}
        >
          SVG
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isExporting}
          onClick={() => {
            if (!elementRef.current || isExporting) return;
            setIsExporting(true);
            toast("Copying…");
            copyElementAsImage(elementRef.current)
              .then(() => toast.success("Copied to clipboard"))
              .catch(() => toast.error("Copy failed"))
              .finally(() => setIsExporting(false));
          }}
        >
          Copy Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
