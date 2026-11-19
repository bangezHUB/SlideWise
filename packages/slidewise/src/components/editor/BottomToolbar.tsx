import {
  MousePointer2,
  Type,
  Shapes,
  Spline,
  Image as ImageIcon,
  Table2,
  Sigma,
  Sparkles,
  MonitorPlay,
  Maximize2,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useEditor } from "@/lib/StoreProvider";
import {
  SHAPE_OPTIONS,
  LINE_OPTIONS,
  ICON_OPTIONS,
  shapePreviewPath,
} from "@/lib/insertCatalog";
import type { Tool } from "@/lib/store";

export function BottomToolbar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const toolOption = useEditor((s) => s.toolOption);
  // Which insert tool's gallery is open (shape, line or icon).
  const [gallery, setGallery] = useState<Tool | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gallery) return;
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setGallery(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setGallery(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [gallery]);
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const fitMode = useEditor((s) => s.fitMode);
  const setFitMode = useEditor((s) => s.setFitMode);

  const items: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "select", icon: <MousePointer2 size={18} />, label: "Select (V)" },
    { id: "text", icon: <Type size={18} />, label: "Text (T)" },
    { id: "shape", icon: <Shapes size={18} />, label: "Shape (S)" },
    { id: "line", icon: <Spline size={18} />, label: "Line (L)" },
    { id: "image", icon: <ImageIcon size={18} />, label: "Image (I)" },
    { id: "table", icon: <Table2 size={18} />, label: "Table" },
    { id: "formula", icon: <Sigma size={18} />, label: "Formula" },
    { id: "icon", icon: <Sparkles size={18} />, label: "Icon" },
    { id: "embed", icon: <MonitorPlay size={18} />, label: "Embed" },
  ];

  return (
    <div
      ref={barRef}
      style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: 8,
        background: "var(--toolbar-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        boxShadow: "var(--toolbar-shadow)",
        zIndex: 20,
        color: "var(--ink)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {gallery && (
        <InsertGallery
          kind={gallery}
          selected={toolOption}
          onPick={(id) => {
            setTool(gallery, id);
            setGallery(null);
          }}
        />
      )}

      {items.map((it) => {
        const active = tool === it.id;
        return (
          <button
            key={it.id}
            title={it.label}
            aria-label={it.label}
            aria-pressed={active}
            onClick={() => {
              // Shape, line and icon open a gallery of variants; the rest just arm the tool.
              if (it.id === "shape" || it.id === "line" || it.id === "icon") {
                setGallery(gallery === it.id ? null : it.id);
                if (tool !== it.id) setTool(it.id, toolOption);
              } else {
                setGallery(null);
                setTool(it.id);
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? "var(--tool-active-bg)" : "transparent",
              color: active ? "var(--tool-active-fg)" : "var(--ink)",
              transition: "background 120ms ease, color 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "var(--hover)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            {it.icon}
          </button>
        );
      })}

      <div style={{ width: 1, height: 24, background: "var(--border-strong)", margin: "0 6px" }} />

      <button
        title="Fit to window"
        aria-label="Fit slide to window"
        onClick={() => setFitMode("fit")}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: fitMode === "fit" ? "var(--active)" : "transparent",
          color: "var(--ink)",
        }}
      >
        <Maximize2 size={16} />
      </button>

      <ZoomMenu
        zoom={zoom}
        fitMode={fitMode}
        onChange={(z) => setZoom(z)}
        onFit={() => setFitMode("fit")}
      />
    </div>
  );
}

function ZoomMenu({
  zoom,
  fitMode,
  onChange,
  onFit,
}: {
  zoom: number;
  fitMode: "fit" | "fill" | "manual";
  onChange: (z: number) => void;
  onFit: () => void;
}) {
  const presets = [0.25, 0.5, 0.6, 0.75, 1, 1.5, 2];
  const display = fitMode === "fit" ? "Fit" : `${Math.round(zoom * 100)}%`;
  return (
    <div style={{ position: "relative" }}>
      <details style={{ position: "relative" }}>
        <summary
          aria-label={`Zoom (${display})`}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          style={{
            listStyle: "none",
            cursor: "pointer",
            height: 40,
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--ink)",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 12,
          }}
        >
          {display}
          <ChevronDown size={14} style={{ opacity: 0.6 }} />
        </summary>
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 0,
            background: "var(--menu-bg)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            padding: 6,
            minWidth: 130,
            boxShadow: "var(--menu-shadow)",
            color: "var(--ink)",
            zIndex: 50,
          }}
        >
          <ZoomItem label="Fit" onClick={onFit} />
          {presets.map((p) => (
            <ZoomItem
              key={p}
              label={`${Math.round(p * 100)}%`}
              onClick={() => onChange(p)}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

function ZoomItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        borderRadius: 6,
        fontSize: 13,
        color: "var(--ink)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}

function InsertGallery({
  kind,
  selected,
  onPick,
}: {
  kind: Tool;
  selected: string | null;
  onPick: (id: string) => void;
}) {
  const cell = {
    width: 52,
    height: 44,
    borderRadius: 10,
    border: "1px solid var(--border)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--ink)",
  } as const;
  const entries: { id: string; label: string; node: React.ReactNode }[] =
    kind === "shape"
      ? SHAPE_OPTIONS.map((o) => ({
          id: o.id,
          label: o.label,
          node: (
            <svg width="32" height="24" viewBox="0 0 32 24" aria-hidden="true">
              <path
                d={shapePreviewPath(o, 30, 22)}
                transform="translate(1 1)"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ),
        }))
      : kind === "line"
        ? LINE_OPTIONS.map((o) => ({
            id: o.id,
            label: o.label,
            node: (
              <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true">
                <line
                  x1={o.startArrow ? 7 : 3}
                  y1="8"
                  x2={o.endArrow ? 29 : 33}
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={o.dashType === "dash" ? "6 4" : o.dashType === "dot" ? "1.5 4" : o.dashType === "dashDot" ? "6 3 1.5 3" : undefined}
                  strokeLinecap="round"
                />
                {o.startArrow && <GalleryHead x={4} dir={-1} kind={o.startArrow} />}
                {o.endArrow && <GalleryHead x={32} dir={1} kind={o.endArrow} />}
              </svg>
            ),
          }))
        : ICON_OPTIONS.map((o) => ({
            id: o.glyph,
            label: o.label,
            node: <span style={{ fontSize: 22, lineHeight: 1 }}>{o.glyph}</span>,
          }));
  return (
    <div
      role="menu"
      aria-label={kind === "shape" ? "Shapes" : kind === "line" ? "Lines" : "Icons"}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        display: "grid",
        gridTemplateColumns: "repeat(6, 52px)",
        gap: 6,
        padding: 10,
        background: "var(--menu-bg)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "var(--toolbar-shadow)",
        maxHeight: 280,
        overflowY: "auto",
      }}
    >
      {entries.map((e) => (
        <button
          key={e.id}
          role="menuitem"
          title={e.label}
          aria-label={e.label}
          aria-pressed={selected === e.id}
          onClick={() => onPick(e.id)}
          style={{
            ...cell,
            background: selected === e.id ? "var(--tool-active-bg)" : "transparent",
            color: selected === e.id ? "var(--tool-active-fg)" : "var(--ink)",
          }}
        >
          {e.node}
        </button>
      ))}
    </div>
  );
}

/** Tiny arrowhead for the line gallery previews (`dir` 1 = right end, -1 = left end). */
function GalleryHead({ x, dir, kind }: { x: number; dir: 1 | -1; kind: string }) {
  const y = 8;
  if (kind === "oval") return <circle cx={x - dir * 3} cy={y} r="3" fill="currentColor" />;
  if (kind === "diamond") {
    const c = x - dir * 3.5;
    return <path d={`M ${c - 3.5} ${y} L ${c} ${y - 3.5} L ${c + 3.5} ${y} L ${c} ${y + 3.5} Z`} fill="currentColor" />;
  }
  const back = x - dir * 7;
  return <path d={`M ${x} ${y} L ${back} ${y - 4} L ${back} ${y + 4} Z`} fill="currentColor" />;
}
