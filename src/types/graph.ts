export type GraphNode = {
  id: string;
  name: string;
  avatarUrl: string;
  backstory: string;
  ringColor: string;
  createdAt: string;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  viewpoint: string;
  interactionHistory: string;
  updatedAt: string;
};

export type GraphPayload = {
  nodes: GraphNode[];
  links: GraphLink[];
};
