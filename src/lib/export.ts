import { toPng, toSvg, toBlob } from "html-to-image";

function getBackgroundColor(): string {
  if (typeof window === "undefined") return "#fcf9f6";
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  return bg || "#fcf9f6";
}

const OPTIONS = { pixelRatio: 2, backgroundColor: getBackgroundColor() };

export async function exportElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toPng(element, OPTIONS);
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("PNG export failed:", err);
  }
}

export async function exportElementAsSvg(element: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toSvg(element, OPTIONS);
    const link = document.createElement("a");
    link.download = `${filename}.svg`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("SVG export failed:", err);
  }
}

export async function copyElementAsImage(element: HTMLElement): Promise<void> {
  try {
    const blob = await toBlob(element, OPTIONS);
    if (!blob) throw new Error("No blob returned");
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
  } catch (err) {
    console.error("Copy image failed:", err);
  }
}
