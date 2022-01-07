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
}
