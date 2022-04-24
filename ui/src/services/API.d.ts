import {ClusterItem} from "@/models/cluster";

declare namespace API {
  export interface Res<T> {
    code: number;
    msg: string;
    data: T;
  }

  export interface CurrentUser {
    avatar?: string;
    username?: string;
    nickname?: string;
    uid?: number;
    email?: string;
  }

  type User = CurrentUser;

  type UserSelect = (User & SelectOption)[];

  type SelectOption = {
    title: string;
    value: number;
  };

  export interface Zone {
    id?: number;
    name?: string;
    cloud?: string;
    region?: string;
    artiRepoId?: number;
    clusters?: ClusterItem[];
  }

  export interface LoginStateType {
    code?: number;
    msg?: string;
  }
}

declare namespace Resource {
  export interface Node {
    id: number;
    host_name?: string;
    ip?: string;
    create_time?: number;
    update_time?: number;
    heartbeat_time?: number;
    env?: string;
    region_code?: string;
    region_name?: string;
    zone_code?: string;
    zone_name?: string;
    node_type?: number;
    agent_type?: number;
    agent_version?: string;
  }

  export interface Transfer {
    target: any[];
    zone_id: number;
  }
}
