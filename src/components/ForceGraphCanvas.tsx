"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from "react-force-graph-2d";
import { normalizeRingColor } from "@/lib/ring-color";
import type { GraphLink, GraphNode } from "@/types/graph";

type SimNode = GraphNode & { x?: number; y?: number };

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (node: GraphNode) => void;
  onLinkClick: (link: GraphLink) => void;
  highlightNodeId: string | null;
  highlightLinkId: string | null;
};

const R = 22;
const RING_W = 4.5;

function loadImages(
  nodes: GraphNode[],
  cache: Map<string, HTMLImageElement>,
) {
  for (const n of nodes) {
    if (cache.has(n.id)) continue;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = n.avatarUrl;
    cache.set(n.id, img);
  }
}

export function ForceGraphCanvas({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
  highlightNodeId,
  highlightLinkId,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<
    ForceGraphMethods<NodeObject<GraphNode>, GraphLink> | undefined
  >(undefined);
  const [dim, setDim] = useState({ w: 320, h: 320 });
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    loadImages(nodes, imgCache.current);
  }, [nodes]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDim({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setDim({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({
        ...l,
        source: l.source,
        target: l.target,
      })),
    };
  }, [nodes, links]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const linkForce = fg.d3Force("link") as
      | { distance?: (d: number) => void }
      | undefined;
    if (linkForce?.distance) {
      linkForce.distance(180);
    }
    const chargeForce = fg.d3Force("charge") as
      | { strength?: (s: number) => void }
      | undefined;
    if (chargeForce?.strength) {
      chargeForce.strength(-520);
    }
    fg.d3ReheatSimulation();
  }, [nodes.length, links.length]);

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D) => {
      const n = node as SimNode;
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const ring = normalizeRingColor(n.ringColor);
      const img = imgCache.current.get(n.id);
      const hl = n.id === highlightNodeId;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, R + RING_W / 2, 0, 2 * Math.PI);
      ctx.strokeStyle = ring;
      ctx.lineWidth = RING_W;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(x, y, R, 0, 2 * Math.PI, false);
      ctx.save();
      ctx.clip();
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x - R, y - R, R * 2, R * 2);
      } else {
        ctx.fillStyle = "#3d3a35";
        ctx.fillRect(x - R, y - R, R * 2, R * 2);
      }
      ctx.restore();

      if (hl) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, R + RING_W + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = "#e8c547";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    },
    [highlightNodeId],
  );

  return (
    <div
      ref={wrapRef}
      className="h-full min-h-[420px] w-full flex-1 rounded-sm border border-[var(--border-subtle)] bg-[var(--panel-dark)]"
    >
      <ForceGraph2D
        ref={fgRef}
        width={dim.w}
        height={dim.h}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={4}
        warmupTicks={120}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as SimNode;
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, R + RING_W + 6, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        nodeCanvasObjectMode={() => "replace" as const}
        nodeCanvasObject={paintNode}
        linkColor={(link) => {
          const l = link as GraphLink;
          return l.id === highlightLinkId
            ? "#e8c547"
            : "rgba(201, 169, 98, 0.38)";
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => "rgba(232, 197, 71, 0.75)"}
        linkWidth={(link) => {
          const l = link as GraphLink;
          return l.id === highlightLinkId ? 2.5 : 1.1;
        }}
        onNodeClick={(node) => {
          onNodeClick(node as GraphNode);
        }}
        onLinkClick={(raw) => {
          const l = raw as GraphLink;
          const r = raw as unknown as {
            id: string;
            viewpoint: string;
            interactionHistory: string;
            updatedAt: string;
            source: string | { id: string };
            target: string | { id: string };
          };
          const source =
            typeof r.source === "object" && r.source !== null
              ? String(r.source.id)
              : String(r.source);
          const target =
            typeof r.target === "object" && r.target !== null
              ? String(r.target.id)
              : String(r.target);
          onLinkClick({ ...l, source, target });
        }}
        cooldownTicks={120}
        d3AlphaDecay={0.022}
        d3VelocityDecay={0.22}
      />
    </div>
  );
}
