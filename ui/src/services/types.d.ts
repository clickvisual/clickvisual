declare namespace API {
  interface Res<T> {
    data: T;
    code: number;
    msg: string;
  }
}
