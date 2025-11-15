// Force-directed graph layout engine for social graph visualization

export interface GraphNode {
  id: string;
  label: string;
  avatar?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isRoot?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export class ForceDirectedGraph {
  private nodes: GraphNode[];
  private links: GraphLink[];
  private width: number;
  private height: number;

  // Force parameters
  private repulsionStrength = 5000;
  private attractionStrength = 0.01;
  private damping = 0.8;
  private centeringStrength = 0.01;

  constructor(data: GraphData, width: number, height: number) {
    this.nodes = data.nodes.map(node => ({
      ...node,
      x: node.x || Math.random() * width,
      y: node.y || Math.random() * height,
      vx: node.vx || 0,
      vy: node.vy || 0,
    }));
    this.links = data.links;
    this.width = width;
    this.height = height;
  }

  // Calculate repulsion force between two nodes
  private calculateRepulsion(node1: GraphNode, node2: GraphNode): { fx: number; fy: number } {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) return { fx: 0, fy: 0 };

    const distance = Math.sqrt(distanceSquared);
    const force = this.repulsionStrength / distanceSquared;

    return {
      fx: (dx / distance) * force,
      fy: (dy / distance) * force,
    };
  }

  // Calculate attraction force along a link
  private calculateAttraction(node1: GraphNode, node2: GraphNode): { fx: number; fy: number } {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { fx: 0, fy: 0 };

    const force = distance * this.attractionStrength;

    return {
      fx: (dx / distance) * force,
      fy: (dy / distance) * force,
    };
  }

  // Calculate centering force to keep graph centered
  private calculateCentering(node: GraphNode): { fx: number; fy: number } {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      fx: (centerX - node.x) * this.centeringStrength,
      fy: (centerY - node.y) * this.centeringStrength,
    };
  }

  // Run one iteration of the force simulation
  public tick(): void {
    // Calculate forces
    for (const node of this.nodes) {
      let fx = 0;
      let fy = 0;

      // Repulsion from all other nodes
      for (const other of this.nodes) {
        if (node.id !== other.id) {
          const repulsion = this.calculateRepulsion(node, other);
          fx -= repulsion.fx;
          fy -= repulsion.fy;
        }
      }

      // Attraction along links
      for (const link of this.links) {
        let other: GraphNode | undefined;
        let direction = 1;

        if (link.source === node.id) {
          other = this.nodes.find(n => n.id === link.target);
        } else if (link.target === node.id) {
          other = this.nodes.find(n => n.id === link.source);
          direction = -1;
        }

        if (other) {
          const attraction = this.calculateAttraction(node, other);
          fx += attraction.fx * direction;
          fy += attraction.fy * direction;
        }
      }

      // Centering force
      const centering = this.calculateCentering(node);
      fx += centering.fx;
      fy += centering.fy;

      // Apply forces to velocity
      node.vx = (node.vx + fx) * this.damping;
      node.vy = (node.vy + fy) * this.damping;
    }

    // Update positions
    for (const node of this.nodes) {
      node.x += node.vx;
      node.y += node.vy;

      // Keep nodes within bounds with padding
      const padding = node.radius + 10;
      node.x = Math.max(padding, Math.min(this.width - padding, node.x));
      node.y = Math.max(padding, Math.min(this.height - padding, node.y));
    }
  }

  public getNodes(): GraphNode[] {
    return this.nodes;
  }

  public getLinks(): GraphLink[] {
    return this.links;
  }

  public updateSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  // Find node at given coordinates
  public findNodeAt(x: number, y: number): GraphNode | undefined {
    return this.nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= node.radius * node.radius;
    });
  }
}
