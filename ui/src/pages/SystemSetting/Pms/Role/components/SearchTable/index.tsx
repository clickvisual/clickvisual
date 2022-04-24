import React, {
  forwardRef,
  ReactNode,
  Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Form, message, Table } from 'antd';
import { ColumnType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { FormInstance } from 'antd/es/form';
import { useHistory } from 'umi';
import qs, { stringify } from 'qs';
import './index.less';
import { SorterResult } from 'antd/lib/table/interface';

const directionMap: { [key: string]: string } = {
  ascend: 'asc',
  descend: 'desc',
};

export declare type TableColumnType<T> = ColumnType<T> & {
  children?: TableColumnTypes<T>;
};

export declare type TableEnumType = {
  text: ReactNode;
};

export declare type ValueEnumMap = {
  [key: string]: TableEnumType | ReactNode;
};

export declare type ValueEnumArray =
  | {
      key: number | string;
      text: string;
    }[]
  | {
      value: number | string;
      title: string;
    }[];

export declare type TableColumnTypes<T> = (TableColumnType<T> & {
  valueEnum?: ValueEnumMap | ValueEnumArray;
})[];

function isTableEnumType(object: any): object is TableEnumType {
  return 'text' in object;
}

interface PaginationProps {
  pageSize?: number;
  total?: number;
  current?: number;
}

interface SearchTableProps<T>
  extends Omit<TableProps<T>, 'pagination' | 'dataSource' | 'columns'> {
  formContent?: (
    search: (fields: any) => void,
    form: FormInstance,
  ) => React.ReactNode;
  request: (params: any) => Promise<{ data: T[]; pagination: PaginationProps }>;
  queryArrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
  columns: TableColumnTypes<T>;

  // 禁用 Query 参数用于搜索
  disableQuery?: Boolean;

  pagination?:
    | false
    | Omit<TablePaginationConfig, 'current' | 'total' | 'pageSize'>;
}

export interface SearchTableInstance {
  refresh: (params?: any) => void;
  form: FormInstance;
}

type Sorter = {
  _sortBy?: string;
  _sortOrder?: string;
};

const parseValueEnum = (
  valueEnum: ValueEnumMap | ValueEnumArray,
): ValueEnumMap => {
  let res: ValueEnumMap = {};

  if (valueEnum instanceof Array) {
    valueEnum.forEach((item: any) => {
      const key: string = item.key || item.value;
      res[key] = { text: item.title || item.text };
    });
  } else {
    res = valueEnum;
  }

  return res;
};

const SearchTable = function<T extends object>(
  props: SearchTableProps<T>,
  ref: Ref<SearchTableInstance>,
) {
  const {
    columns,
    formContent,
    request,
    queryArrayFormat,
    disableQuery,
    onChange,
    pagination,
    ...restProps
  } = props;
  const [dataSource, setDataSource] = useState<T[]>();
  const [page, setPage] = useState<PaginationProps>();
  const [loading, setLoading] = useState<boolean>(true);
  const [fields, setFields] = useState<any>({});
  const [sorter, setSorter] = useState<Sorter>({});

  const getQueryParams = () => {
    if (disableQuery === true) return {};
    return qs.parse(window.location.search.replace('?', ''));
  };
  const params = getQueryParams();

  const history = useHistory();
  const [form] = Form.useForm();

  const _form = useMemo(() => {
    return {
      ...form,
      resetFields: () => {
        setPage(undefined);
        form.resetFields();
      },
    };
  }, [form]);

  useImperativeHandle(ref, () => ({
    refresh: params => {
      params = loadFormData(params);
      setFields({ ...fields, ...params });
      onSearch({ ...fields, ...params }, page);
    },
    form: _form,
  }));

  useEffect(() => {
    const { current, pageSize, _sortBy, _sortOrder } = params;
    const page = {
      current: parseInt(current as string) || undefined,
      pageSize: parseInt(pageSize as string) || undefined,
    };
    const sorter: Sorter = {
      _sortBy: _sortBy as string,
      _sortOrder: _sortOrder as string,
    };
    const fields = loadFormData(params);
    onSearch({ ...fields }, page, sorter);
  }, []);

  const loadFormData = (params: any = {}) => {
    form.setFieldsValue(params);
    return form.getFieldsValue();
  };

  const onSearch = (fields: any, page?: PaginationProps, _sorter?: Sorter) => {
    page = page || page || {};
    _sorter = _sorter || sorter;
    let params = {
      ...fields,
      ...page,
      ..._sorter,
    };
    if (disableQuery !== true) {
      history.replace({
        search:
          '?' +
          stringify(
            { ...getQueryParams(), ...params },
            { arrayFormat: queryArrayFormat || 'repeat' },
          ),
      });
    }

    setFields(fields);
    setSorter(_sorter || {});
    setLoading(true);

    return request({ ...params })
      .then(r => {
        setDataSource(r.data);
        setPage(r.pagination);
        setLoading(false);
      })
      .catch(e => {
        message.error(e);
      });
  };

  const _columns = useMemo(() => {
    const makeColumns = function<T>(
      columns: TableColumnTypes<T>,
    ): TableColumnTypes<T> {
      return columns.map(col => {
        let { render, valueEnum, children } = col;
        if (!render && valueEnum) {
          render = val => {
            const valueEnumMap = parseValueEnum(valueEnum || []);
            let enumVal = valueEnumMap[val];
            if (!enumVal) return val;

            if (isTableEnumType(enumVal)) {
              return enumVal.text;
            }

            return enumVal;
          };
        }

        if (children) children = makeColumns(children);

        return {
          ...col,
          children,
          render,
        };
      });
    };

    return makeColumns(columns);
  }, [columns]);

  const _pagination = useMemo(() => {
    if (pagination === undefined) {
      return page;
    }
    if (pagination === false) {
      return false;
    }

    return {
      ...pagination,
      ...page,
    };
  }, [pagination, page]);

  return (
    <div>
      {formContent ? (
        <div>{formContent(fields => onSearch(fields, {}), _form)}</div>
      ) : (
        <Form form={form} onFinish={fields => onSearch(fields, {})} />
      )}

      <Table<T>
        style={{ marginTop: '10px' }}
        loading={loading}
        columns={_columns}
        dataSource={dataSource}
        pagination={_pagination}
        onChange={(pagination, filters, sorter, extra) => {
          const { pageSize, current } = pagination;
          sorter = sorter as SorterResult<T>;
          const sortParams: Sorter = {
            _sortBy: sorter.column?.dataIndex as string | undefined,
            _sortOrder:
              (sorter.order && directionMap[sorter.order]) || undefined,
          };
          onSearch(
            {
              ...fields,
            },
            { pageSize, current },
            sortParams,
          );

          onChange?.(pagination, filters, sorter, extra);
        }}
        {...restProps}
      />
    </div>
  );
};

export default forwardRef(SearchTable);
