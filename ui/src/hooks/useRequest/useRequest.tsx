import { useDebounceFn } from "ahooks";
import { Button, message, notification } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import copy from "copy-to-clipboard";
import { formatMessage } from "@@/plugin-locale/localeExports";

export interface ResPage {
  current: number;
  pageSize: number;
  total: number;
}

export interface BaseRes<T> {
  code: number;
  msg: string;
  data: T;
  traceId?: string;
  pagination?: ResPage;
}

export interface ErrorWithResponse<T> extends Error {
  response?: BaseRes<T>;
}

function newError<T>(res: BaseRes<T>): ErrorWithResponse<T> {
  return {
    name: res.msg,
    message: res.msg,
    response: res,
  };
}

export interface RequestOptions<R, P extends any[]> {
  // 刷新依赖
  // deps = undefined. 不执行
  // deps = []. 首次自动执行
  // deps = [x]. 依赖变化了之后执行
  deps?: any[];

  // 请求参数
  // 自动执行时使用本参数进行请求
  params?: P[];

  // 默认 loading 状态. defalt false
  defaultLoading?: boolean;

  // 防抖等待时间 (ms). default 1000ms
  debounceWait?: number;

  // service throw exception 时回调
  onError?: (e: any) => void | boolean;

  // service 调用成功后回调. 如果返回 false, 则不进行后续的异常提示
  onSuccess?: (res: BaseRes<R>) => void | boolean;

  // 加载的文字提示. 设置为 false 则不显示.
  loadingText?:
    | {
        loading?: string; // 正在加载中的文字提示
        done?: string; // 加载成功的文字提示
      }
    | false;
}

export interface RequestType<R, P extends any[] = any> {
  // 响应的数据
  data?: R;

  // 分页数据 (如果有的话)
  pagination?: ResPage;

  // loading状态
  loading: boolean;

  // 发起请求，返回值是 service 的响应值
  run: (...args: P) => Promise<BaseRes<R> | undefined>;

  // 清空 data
  reset: () => void;

  // 防抖模式执行, 无返回值
  debounceRun: (...args: P) => void;
}

const defaultOptions = <R, P extends any[]>(): RequestOptions<R, P> => {
  return {
    deps: undefined,
    defaultLoading: false,
    loadingText: {
      loading: formatMessage({ id: "loading" }),
      done: formatMessage({ id: "loadingDone" }),
    },
    // @ts-ignore
    defaultParams: [],
    debounceWait: 500,
  };
};

function convertHeaders(h?: Headers) {
  const ret: any[] = [];

  h?.forEach((val, key) => {
    ret.push({
      key,
      val,
    });
  });

  return ret;
}

function useRequest<R = any, P extends any[] = any>(
  service: (...args: P) => Promise<BaseRes<R>>,
  options?: RequestOptions<R, P>
): RequestType<R, P> {
  const {
    params,
    deps,
    defaultLoading,
    debounceWait,
    onError,
    onSuccess,
    loadingText,
  } = {
    ...defaultOptions<R, P>(),
    ...options,
  } as RequestOptions<R, P>;
  const [data, setData] = useState<R>();
  const [pagination, setPagination] = useState<ResPage>();
  const [loading, setLoading] = useState<boolean>(!!defaultLoading);

  const debounceService = useDebounceFn(
    async (...args: P) => {
      await handleReq(...args);
    },
    { wait: debounceWait }
  );

  useEffect(() => {
    if (deps === undefined) {
      return;
    }

    //@ts-ignore
    debounceRun(...(params || []));
  }, deps);

  const debounceRun = (...args: P) => {
    setLoading(true);
    debounceService.run(...args);
  };

  const run = async (...args: P) => {
    setLoading(true);
    return await handleReq(...args);
  };

  const reset = () => setData(undefined);

  const handleReq = async (...args: P) => {
    let hideLoading = () => {};
    if (loadingText && loadingText?.loading) {
      hideLoading = message.loading(loadingText?.loading);
    }

    try {
      const res = await service(...args);
      handleRes(res);

      hideLoading();
      setLoading(false);

      return res;
    } catch (e) {
      handleError(e);

      hideLoading();
      setLoading(false);
      return;
    }
  };

  const handleError = (e: any) => {
    console.error("useRequest: catch an error while call service", e);
    const skipMsg = onError && !onError(e);
    if (skipMsg) return;
    showError(e.data, e.response, e.request);
  };

  const showError = (data: BaseRes<R>, res?: Response, req?: Request) => {
    let resText = JSON.stringify({
      data,
      response: res && {
        headers: res?.headers ? convertHeaders(res?.headers) : undefined,
        ok: res?.ok,
        redirected: res?.redirected,
        status: res?.status,
        statusText: res?.statusText,
        type: res?.type,
        url: res?.url,
      },
      request: req && {
        url: req?.url,
        headers: req?.headers && convertHeaders(req?.headers),
        method: req?.method,
        referer: req?.referrer,
      },
    });

    notification.error({
      message: formatMessage({ id: "error.title" }),
      description: (
        <div>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {formatMessage(
              { id: "error.content" },
              { msg: `${data?.msg || formatMessage({ id: "error.default" })}` }
            )}
          </div>
          <div style={{ marginTop: "10px" }}>
            <Button
              size="small"
              type="primary"
              shape="round"
              style={{ marginRight: "10px" }}
              onClick={() => {
                copy(resText);
              }}
            >
              <CopyOutlined />
              {formatMessage({ id: "error.copy" })}
            </Button>
          </div>
        </div>
      ),
    });
  };

  const handleRes = (res: BaseRes<R>) => {
    setData(res?.data);
    setPagination(res?.pagination);
    // 错误提示
    if (res?.code !== 0) {
      const skipMsg = onError && onError(newError(res)) === false;
      if (skipMsg) return;

      showError(res);
      return;
    }

    if (loadingText && loadingText?.done) {
      message.success(loadingText.done);
    }

    if (onSuccess) onSuccess(res);
  };

  return {
    data,
    pagination,
    loading,
    reset,
    run,
    debounceRun,
  };
}

export default useRequest;
