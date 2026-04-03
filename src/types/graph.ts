export type MoeTag = {
  id: string;
  label: string;
  reason: string;
  createdAt: string;
};

export type GraphNode = {
  id: string;
  name: string;
  avatarUrl: string;
  backstory: string;
  ringColor: string;
  createdAt: string;
  /** 关系图 API 会带上；单条角色接口可能省略 */
  moeTags?: MoeTag[];
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
