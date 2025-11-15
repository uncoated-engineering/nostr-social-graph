import { useEffect, useRef, useState } from 'react';
import { ForceDirectedGraph, type GraphData, type GraphNode } from '@/lib/forceGraph';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface GraphVisualizationProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

export function GraphVisualization({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  className = '',
}: GraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<ForceDirectedGraph | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const animationFrameRef = useRef<number>();
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || width,
          height: rect.height || height,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  // Initialize graph
  useEffect(() => {
    if (data.nodes.length > 0) {
      const newGraph = new ForceDirectedGraph(data, dimensions.width, dimensions.height);
      setGraph(newGraph);
    } else {
      setGraph(null);
    }
  }, [data, dimensions.width, dimensions.height]);

  // Preload avatar images
  useEffect(() => {
    for (const node of data.nodes) {
      if (node.avatar && !imageCache.current.has(node.avatar)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = node.avatar;
        img.onload = () => {
          imageCache.current.set(node.avatar!, img);
        };
      }
    }
  }, [data.nodes]);

  // Animation loop
  useEffect(() => {
    if (!graph || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let iterations = 0;
    const maxIterations = 300; // Run simulation for 300 frames

    const animate = () => {
      if (iterations < maxIterations) {
        graph.tick();
        iterations++;
      }

      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw links
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; // slate-400 with opacity
      ctx.lineWidth = 1;

      for (const link of graph.getLinks()) {
        const sourceNode = graph.getNodes().find(n => n.id === link.source);
        const targetNode = graph.getNodes().find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const node of graph.getNodes()) {
        const isHovered = hoveredNode?.id === node.id;

        // Draw avatar if available
        const img = node.avatar ? imageCache.current.get(node.avatar) : undefined;
        if (img && img.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(
            img,
            node.x - node.radius,
            node.y - node.radius,
            node.radius * 2,
            node.radius * 2
          );
          ctx.restore();

          // Border
          ctx.strokeStyle = isHovered ? '#a855f7' : node.color;
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Draw colored circle if no avatar
          ctx.fillStyle = node.color;
          ctx.strokeStyle = isHovered ? '#a855f7' : '#ffffff';
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Draw label on hover or for root node
        if (isHovered || node.isRoot) {
          ctx.fillStyle = '#1f2937'; // gray-800
          ctx.font = node.isRoot ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Background for label
          const metrics = ctx.measureText(node.label);
          const padding = 4;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(
            node.x - metrics.width / 2 - padding,
            node.y + node.radius + 4,
            metrics.width + padding * 2,
            16
          );

          // Draw label text
          ctx.fillStyle = '#1f2937';
          ctx.fillText(node.label, node.x, node.y + node.radius + 6);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [graph, dimensions, hoveredNode]);

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graph || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = graph.findNodeAt(x, y);
    setHoveredNode(node || null);

    // Change cursor
    canvasRef.current.style.cursor = node ? 'pointer' : 'default';
  };

  // Handle click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graph || !canvasRef.current || !onNodeClick) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = graph.findNodeAt(x, y);
    if (node) {
      onNodeClick(node);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-lg"
      />
    </div>
  );
}

export function GraphVisualizationSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={className}>
      <Skeleton className="w-full h-full min-h-[600px]" />
    </Card>
  );
}
