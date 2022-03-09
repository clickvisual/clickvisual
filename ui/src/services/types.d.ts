declare namespace API {
  interface ResMsg {
    code: number;
    msg: string;
  }

  interface Res<T> extends ResMsg {
    data: T;
  }

  interface Pagination {
    current: number;
    total: number;
    pageSize: number;
  }

  interface ResPage<T> extends Res<T> {
    data: T[];
    pagination: Pagination;
  }

  interface ResPageData<T> extends Res<T> {
    data: T;
    pagination: Pagination;
  }

  interface CurrentUser {
    nickname?: string;
    username?: string;
    uid?: number;
    id: number;
    email?: string;
    avatar?: string;
    access?: string;
    oauth?: string | number;
    oauthId?: string | number;
  }
}
