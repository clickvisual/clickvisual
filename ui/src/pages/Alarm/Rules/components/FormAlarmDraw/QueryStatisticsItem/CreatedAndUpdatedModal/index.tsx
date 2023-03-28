import { FIRST_PAGE, MINUTES_UNIT_TIME, PAGE_SIZE } from "@/config/config";
import useRequest from "@/hooks/useRequest/useRequest";
import api from "@/services/dataLogs";
import { FormatPainterOutlined, SaveOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import {
  Button,
  DatePicker,
  Form,
  FormInstance,
  Input,
  Modal,
  Select,
  Spin,
  Table,
} from "antd";
import { ColumnsType } from "antd/es/table";
import axios, { Canceler } from "axios";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "sql-formatter";
import { useIntl } from "umi";
import queryStatisticsItemStyle from "../index.less";
import styles from "./index.less";

import "codemirror/addon/display/placeholder.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/hint/javascript-hint.js";
import "codemirror/addon/lint/javascript-lint.js";
import "codemirror/addon/lint/json-lint.js";
import "codemirror/addon/lint/lint.css";
import "codemirror/addon/lint/lint.js";
import "codemirror/lib/codemirror.css";
import "codemirror/lib/codemirror.js";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/mode/sql/sql.js";
import { UnControlled as CodeMirror } from "react-codemirror2";
// 引入代码自动提示插件
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/sql-hint";

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

export enum alarmModeType {
  /**
   * 普通模式
   */
  NormalMode = 0,
  /**
   * 聚合模式
   */
  AggregationMode = 1,
}

export enum alarmModePreviewType {
  /**
   * 预览聚合数据
   */
  AggregateData = 1,
  /**
   * 预览告警指标
   */
  AlarmIndicator = 2,
  /**
   * 预览完毕
   */
  AfterPreview = 3,
}

type CreatedAndUpdatedModalProps = {
  open: boolean;
  onOk: (fields: any) => void;
  onCancel: () => void;
  isEdit: boolean;
  defaultData: any;
};
const CreatedAndUpdatedModal = ({
  open,
  onOk,
  isEdit,
  defaultData,
  onCancel,
}: CreatedAndUpdatedModalProps) => {
  const modalForm = useRef<FormInstance>(null);
  const codeRef = useRef<any>(null);
  const onClickPreview = useRef<boolean>(false);
  const cancelTokenQueryPreviewRef = useRef<Canceler | null>(null);
  const CancelToken = axios.CancelToken;
  const i18n = useIntl();
  const { doGetLogLibrary } = useModel("dataLogs");

  const { operations } = useModel("alarm");

  const [showTable, setShowTable] = useState<boolean>(false);
  const [isDisable, setIsDisable] = useState<boolean>(false);
  const [tableLogs, setTableLogs] = useState<any[]>([]);
  const [aggregationTableLogs, setAggregationTableLogs] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnsType<any>>([]);
  const [aggregationTableColumns, setAggregationTableColumns] = useState<
    ColumnsType<any>
  >([]);
  const [isPreviewData, setIsPreviewData] = useState<number>(
    alarmModePreviewType.AggregateData
  );
  const [currentTableName, setCurrentTableName] = useState<string>("");
  const [defaultWhen, setDefaultWhen] = useState<string>("1=1");

  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const { databaseList, logLibraryList, doGetDatabaseList, getLogLibraries } =
    useModel("dataLogs");

  const alarmModeList = [
    {
      key: alarmModeType.NormalMode,
      name: i18n.formatMessage({ id: "alarm.rules.form.mode.normalMode" }),
    },
    {
      key: alarmModeType.AggregationMode,
      name: i18n.formatMessage({ id: "alarm.rules.form.mode.aggregationMode" }),
    },
  ];

  const doQueryPreview = useRequest(api.getLogs, {
    loadingText: false,
    onError: (e) => {
      setTableColumns([]);
      setTableLogs([]);
      if (axios.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  const doShowTable = (isShow: boolean) => {
    setShowTable(isShow);
  };
  const handleChangeLogLibrary = () => {
    doShowTable(false);
  };

  const handleChangeDisable = (flag: boolean) => {
    setIsDisable(flag);
  };

  const handlePreview = (fields: any, num?: number) => {
    if (!fields) return;
    const { mode } = fields;
    doShowTable(true);
    if (mode != alarmModeType.AggregationMode) {
      onClickPreview.current = true;
    }
    cancelTokenQueryPreviewRef.current?.();
    const alarmMode =
      mode != alarmModeType.AggregationMode ? undefined : num || isPreviewData;
    doQueryPreview
      .run(
        fields.tableId,
        {
          st: parseInt(fields.between[0].format("X")),
          et: parseInt(fields.between[1].format("X")),
          query: fields.when,
          page: FIRST_PAGE,
          pageSize: PAGE_SIZE,
          alarmMode: alarmMode,
        },
        new CancelToken(function executor(c) {
          cancelTokenQueryPreviewRef.current = c;
        })
      )
      .then((res) => {
        if (res?.code === 0) {
          if (mode == alarmModeType.AggregationMode) {
            if (isPreviewData == alarmModePreviewType.AggregateData) {
              setIsPreviewData(alarmModePreviewType.AlarmIndicator);
            } else if (isPreviewData == alarmModePreviewType.AlarmIndicator) {
              setIsPreviewData(alarmModePreviewType.AfterPreview);
            }
          }
          const logs = res.data.logs.map((item, index) => {
            return { id: index, ...item };
          });
          const columns: { title: string; dataIndex: string; width: number }[] =
            [];
          for (const item of logs.length <= 0
            ? res.data.defaultFields
            : Object.keys(res.data.logs[0])) {
            columns.push({
              title: item,
              dataIndex: item,
              width: 200,
            });
          }

          setCurrentPagination(() => {
            return {
              ...currentPagination,
              total: res.data.count,
            };
          });
          if (alarmMode == alarmModePreviewType.AlarmIndicator) {
            setAggregationTableColumns(columns);
            setAggregationTableLogs(logs);
            return;
          }
          setTableColumns(columns);
          setTableLogs(logs);
        }
      });
  };

  const handleChangePage = (page: number, pageSize: number, fields: any) => {
    if (!fields) return;
    setCurrentPagination(() => {
      return {
        ...currentPagination,
        current: page,
        pageSize,
      };
    });
    cancelTokenQueryPreviewRef.current?.();
    const { mode } = fields;
    const alarmMode = mode != alarmModeType.AggregationMode ? undefined : 1;
    doQueryPreview
      .run(
        fields.tableId,
        {
          st: parseInt(fields.between[0].format("X")),
          et: parseInt(fields.between[1].format("X")),
          query: fields.when,
          page,
          pageSize,
          alarmMode: alarmMode,
        },
        new CancelToken(function executor(c) {
          cancelTokenQueryPreviewRef.current = c;
        })
      )
      .then((res) => {
        if (res?.code === 0) {
          if (mode == alarmModeType.AggregationMode) {
            if (isPreviewData == alarmModePreviewType.AggregateData) {
              setIsPreviewData(alarmModePreviewType.AlarmIndicator);
            } else if (isPreviewData == alarmModePreviewType.AlarmIndicator) {
              setIsPreviewData(alarmModePreviewType.AfterPreview);
            }
          }
          const logs = res.data.logs.map((item, index) => {
            return { id: index, ...item };
          });
          // if (alarmMode == alarmModePreviewType.AlarmIndicator) {
          //   setAggregationTableLogs(logs);
          //   return;
          // }
          setTableLogs(logs);
        }
      });
  };

  const onSubmit = () => {
    if (!modalForm.current) return;
    modalForm.current.submit();
  };

  const handleFinish = (fields: any) => {
    const { mode } = fields;
    const conditions =
      mode == alarmModeType.NormalMode
        ? !onClickPreview.current
        : isPreviewData != alarmModePreviewType.AfterPreview;
    if (conditions) {
      Modal.warning({
        content: i18n.formatMessage({
          id: "alarm.rules.form.notPreview.content",
        }),
      });
      return;
    }
    let params = fields;
    if (isEdit) {
      params = {
        ...fields,
        tid: fields.tableId,
        typ: defaultData.typ,
        fieldName: defaultData.fieldName,
        tableName: currentTableName || defaultData.tableName,
        conditions: defaultData.conditions,
      };
    } else {
      params.tableName = currentTableName;
      params.conditions = [{ typ: 0, exp: 0, cond: 0 }];
    }
    onOk(params);
  };

  const databaseId = modalForm.current?.getFieldValue("databaseId");
  const codeMirrorOptions = {
    // 显示行号
    lineNumbers: true,
    mode: {
      name: "text/x-mysql",
    },
    hintOptions: {
      // 自定义提示选项
      completeSingle: false, // 当匹配只有一项的时候是否自动补全
      // 自定义的提示库
      tables: {
        _key: [],
        _raw_log_: [],
      },
    },
    autofocus: false,
    styleActiveLine: true,
    // 主题
    // theme: "neo",
    // 溢出滚动而非换行
    lineWrapping: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    indentUnit: 2,
    // 光标高度
    cursorHeight: 1,
    // tab缩进
    tabSize: 2,
    fixedGutter: true,
    coverGutterNextToScrollbar: true,
  };

  useEffect(() => {
    if (!open || !databaseId) return;
    getLogLibraries.run(databaseId);
  }, [open, databaseId]);

  useEffect(() => {
    if (!open) return;
    doGetDatabaseList();
  }, [open]);

  useEffect(() => {
    if (open && modalForm.current && !isEdit) {
      modalForm.current.setFieldsValue({
        mode: alarmModeType.NormalMode,
      });
      if (operations.selectDid) {
        modalForm.current.setFieldsValue({
          databaseId: operations.selectDid,
        });
        getLogLibraries.run(operations.selectDid);
        handleChangeDisable(true);
      }
      if (operations.selectTid)
        modalForm.current.setFieldsValue({ tableId: operations.selectTid });
    }
  }, [open, operations.selectDid, operations.selectTid]);

  useEffect(() => {
    if (open && isEdit && (defaultData?.tid || defaultData?.tableId)) {
      doGetLogLibrary
        .run(defaultData?.tid || defaultData?.tableId)
        .then((res) => {
          if (res?.code !== 0) {
            return;
          }
          getLogLibraries.run(res.data.did || 0);
          setDefaultWhen(defaultData?.when);
          modalForm.current?.setFieldsValue({
            ...defaultData,
            databaseId: res.data.did,
            tableId: defaultData.tid || defaultData?.tableId,
          });
          // handlePreview(modalForm.current?.getFieldsValue());
        });
    }
  }, [open, isEdit, defaultData]);

  useEffect(() => {
    if (!open && modalForm.current) {
      setDefaultWhen("1=1");
      setCurrentTableName("");
      modalForm.current.resetFields();
      onClickPreview.current = false;
      setIsPreviewData(alarmModePreviewType.AggregateData);
      doShowTable(false);
    }
  }, [open]);

  const aggregatePreviewText = useMemo(() => {
    switch (isPreviewData) {
      case alarmModePreviewType.AggregateData:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.aggregatedData",
        });
      case alarmModePreviewType.AlarmIndicator:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.aggregatedIndicators",
        });
      case alarmModePreviewType.AfterPreview:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.canConfirm",
        });
      default:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.unknownState",
        });
    }
  }, [isPreviewData]);

  return (
    <Modal
      centered
      title={i18n.formatMessage({
        id: "alarm.rules.form.inspectionStatistics",
      })}
      open={open}
      width={"60%"}
      onOk={onSubmit}
      onCancel={onCancel}
      bodyStyle={{ maxHeight: "80vh", overflowY: "auto" }}
      okButtonProps={{
        icon: <SaveOutlined />,
      }}
    >
      <Spin spinning={doGetLogLibrary.loading}>
        <Form
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 19 }}
          ref={modalForm}
          onFinish={handleFinish}
        >
          <Form.Item name={"id"} hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({ id: "type" })}
            name={"logType"}
            initialValue={1}
          >
            <Select disabled>
              <Option value={1}>
                {i18n.formatMessage({
                  id: "alarm.rules.inspectionFrequency.selectOption.logLibrary",
                })}
              </Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "alarm.rules.inspectionFrequency.between",
            })}
            name={"between"}
            initialValue={[dayjs().subtract(1, MINUTES_UNIT_TIME), dayjs()]}
          >
            <RangePicker showTime />
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "alarm.rules.inspectionFrequency.database",
            })}
            name={"databaseId"}
            rules={[{ required: true }]}
          >
            <Select
              disabled={isDisable}
              showSearch
              filterOption={(input: any, option: any) =>
                (option?.children ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder={`${i18n.formatMessage({
                id: "alarm.rules.inspectionFrequency.placeholder.database",
              })}`}
              onChange={(id: number) => {
                getLogLibraries.run(id);
                modalForm.current?.resetFields(["tableId"]);
              }}
            >
              {databaseList.map((database) => (
                <Option key={database.id} value={database.id}>
                  {i18n.formatMessage(
                    { id: "alarm.rules.inspectionFrequency.database.Option" },
                    {
                      instance:
                        database.instanceName +
                        (database.instanceDesc
                          ? ` | ${database.instanceDesc}`
                          : ""),
                      database:
                        database.name +
                        (database.desc ? ` | ${database.desc}` : ""),
                    }
                  )}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, nextValues) =>
              prevValues.databaseId !== nextValues.databaseId
            }
          >
            {({ getFieldValue }) => {
              const databaseId = getFieldValue("databaseId");
              if (!databaseId) return <></>;
              return (
                <Form.Item
                  label={i18n.formatMessage({
                    id: "alarm.rules.inspectionFrequency.logLibrary",
                  })}
                  name={"tableId"}
                  rules={[{ required: true }]}
                >
                  <Select
                    placeholder={`${i18n.formatMessage({
                      id: "alarm.rules.inspectionFrequency.placeholder.logLibrary",
                    })}`}
                    showSearch
                    filterOption={(input: any, option: any) =>
                      ((option?.children && option?.children[0]) ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onChange={(id: number) => {
                      handleChangeLogLibrary();
                      const currentTable = logLibraryList.filter(
                        (item: any) => item.id == id
                      );
                      setCurrentTableName(
                        (currentTable &&
                          currentTable.length == 1 &&
                          currentTable[0].tableName) ||
                          ""
                      );
                    }}
                  >
                    {logLibraryList.map((logTable) => (
                      <Option key={logTable.id} value={logTable.id}>
                        {logTable.tableName}
                        {logTable.desc ? ` | ${logTable.desc}` : ""}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>
          <div style={{ display: "block", position: "relative" }}>
            <Form.Item
              label={i18n.formatMessage({ id: "alarm.rules.form.mode" })}
              name={"mode"}
              required
            >
              <Select
                style={{ width: "calc(100% - 110px)" }}
                onChange={() => {
                  setIsPreviewData(alarmModePreviewType.AggregateData);
                  setAggregationTableLogs;
                  setAggregationTableLogs([]);
                  setTableLogs([]);
                  setShowTable(false);
                  onClickPreview.current = false;
                }}
              >
                {alarmModeList.map((item: any) => {
                  return (
                    <Option value={item.key} key={item.key}>
                      {item.name}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Button className={queryStatisticsItemStyle.formItem} type="link">
              <a
                href="https://clickvisual.gocn.vip/zh/clickvisual/03funcintro/alarm-function-configuration-description.html#%E8%81%9A%E5%90%88%E6%A8%A1%E5%BC%8F"
                target="_bank"
              >
                {i18n.formatMessage({
                  id: "alarm.rules.form.level.instructions",
                })}
              </a>
            </Button>
          </div>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, nextValues) =>
              prevValues.tableId !== nextValues.tableId ||
              prevValues.when !== nextValues.when ||
              prevValues.mode !== nextValues.mode
            }
          >
            {({ getFieldValue, getFieldsValue }) => {
              if (!getFieldValue("tableId")) return <></>;
              const mode = getFieldValue("mode");
              return (
                <Form.Item label={i18n.formatMessage({ id: "search" })}>
                  <Input.Group compact style={{ display: "flex" }}>
                    <Form.Item noStyle name={"when"} initialValue={"1=1"}>
                      <div
                        className={styles.editor}
                        style={{
                          width:
                            mode != alarmModeType.AggregationMode
                              ? "calc(100% - 100px)"
                              : "100%",
                          borderRadius: "8px",
                        }}
                      >
                        <CodeMirror
                          className={styles.editorsDom}
                          ref={codeRef}
                          onChange={(
                            CodeMirror: string,
                            changeObj: any,
                            value: string
                          ) => {
                            modalForm.current?.setFieldsValue({
                              when: value,
                            });
                          }}
                          onKeyPress={() => {
                            // 按键的时候触发代码提示
                            codeRef.current.editor.showHint();
                          }}
                          value={defaultWhen}
                          options={codeMirrorOptions}
                        />
                        <Button
                          icon={<FormatPainterOutlined />}
                          style={{
                            position: "absolute",
                            zIndex: 10,
                            right: 20,
                            top: 10,
                          }}
                          onClick={() => {
                            setDefaultWhen(format(getFieldValue("when")));
                            modalForm.current?.setFieldsValue({
                              when: format(getFieldValue("when")),
                            });
                          }}
                        ></Button>
                      </div>
                    </Form.Item>
                    {mode != alarmModeType.AggregationMode && (
                      <>
                        <Button
                          style={{
                            width: "calc(90px)",
                            borderRadius: "8px",
                            marginLeft: "10px",
                          }}
                          type={"primary"}
                          onClick={() => {
                            const fields = getFieldsValue();
                            handlePreview(fields);
                          }}
                        >
                          {mode != alarmModeType.AggregationMode
                            ? i18n.formatMessage({
                                id: "alarm.rules.form.preview",
                              })
                            : aggregatePreviewText}
                        </Button>
                      </>
                    )}
                  </Input.Group>
                  {mode == alarmModeType.AggregationMode && (
                    <div
                      style={{
                        marginTop: "10px",
                        borderRadius: "2px",
                        display: "flex",
                        justifyContent: "space-around",
                      }}
                    >
                      「
                      {i18n.formatMessage({
                        id: "alarm.rules.form.aggregatedData",
                      })}
                      」
                      {mode == alarmModeType.AggregationMode && (
                        <Button
                          style={{
                            width: "230px",
                            borderRadius: "8px",
                            marginLeft: "10px",
                          }}
                          size="small"
                          type={"primary"}
                          onClick={() => {
                            const fields = getFieldsValue();
                            handlePreview(
                              fields,
                              alarmModeType.AggregationMode
                            );
                          }}
                        >
                          <a href="#bottom">
                            {i18n.formatMessage({
                              id: "alarm.rules.form.preview.aggregatedData",
                            })}
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                  {showTable && (
                    <Table
                      rowKey={"id"}
                      style={{ marginTop: 10 }}
                      loading={doQueryPreview.loading}
                      scroll={{ y: 400 }}
                      columns={tableColumns}
                      dataSource={tableLogs}
                      pagination={{
                        ...currentPagination,
                        onChange: (page, pageSize) => {
                          const fields = getFieldsValue();
                          handleChangePage(page, pageSize, fields);
                        },
                      }}
                      showSorterTooltip
                      bordered
                    />
                  )}
                  {isPreviewData != alarmModePreviewType.AggregateData &&
                    mode == alarmModeType.AggregationMode && (
                      <div
                        style={{
                          marginTop: "10px",
                          borderRadius: "2px",
                          display: "flex",
                          justifyContent: "space-around",
                        }}
                      >
                        「
                        {i18n.formatMessage({
                          id: "alarm.rules.form.aggregatedIndicators",
                        })}
                        」
                        <Button
                          style={{
                            width: "230px",
                            borderRadius: "8px",
                            marginLeft: "10px",
                          }}
                          size="small"
                          type={"primary"}
                          onClick={() => {
                            const fields = getFieldsValue();
                            handlePreview(
                              fields,
                              alarmModePreviewType.AlarmIndicator
                            );
                          }}
                        >
                          {i18n.formatMessage({
                            id: "alarm.rules.form.preview.aggregatedIndicators",
                          })}
                        </Button>
                      </div>
                    )}
                  {isPreviewData == alarmModePreviewType.AfterPreview &&
                    mode == alarmModeType.AggregationMode && (
                      <Table
                        rowKey={"id"}
                        style={{ marginTop: 10 }}
                        loading={doQueryPreview.loading}
                        scroll={{ y: 400 }}
                        columns={aggregationTableColumns}
                        dataSource={aggregationTableLogs}
                        // pagination={{
                        //   ...currentPagination,
                        //   onChange: (page, pageSize) => {
                        //     const fields = getFieldsValue();
                        //     handleChangePage(page, pageSize, fields);
                        //   },
                        // }}
                        showSorterTooltip
                        bordered
                      />
                    )}
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Spin>
      <span id="bottom" />
    </Modal>
  );
};
export default CreatedAndUpdatedModal;
