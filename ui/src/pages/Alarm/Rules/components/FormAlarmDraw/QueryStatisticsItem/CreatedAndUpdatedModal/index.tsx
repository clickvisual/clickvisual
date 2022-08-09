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
import { useEffect, useMemo, useRef, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import { FIRST_PAGE, MINUTES_UNIT_TIME, PAGE_SIZE } from "@/config/config";
import useRequest from "@/hooks/useRequest/useRequest";
import api from "@/services/dataLogs";
import Request, { Canceler } from "umi-request";
import { ColumnsType } from "antd/es/table";
import { useIntl } from "umi";
import { SaveOutlined } from "@ant-design/icons";
import { format } from "sql-formatter";
import queryStatisticsItemStyle from "../index.less";

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
  visible: boolean;
  onOk: (fields: any) => void;
  onCancel: () => void;
  isEdit: boolean;
  defaultData: any;
};
const CreatedAndUpdatedModal = ({
  visible,
  onOk,
  isEdit,
  defaultData,
  onCancel,
}: CreatedAndUpdatedModalProps) => {
  const modalForm = useRef<FormInstance>(null);
  const onClickPreview = useRef<boolean>(false);
  const cancelTokenQueryPreviewRef = useRef<Canceler | null>(null);
  const CancelToken = Request.CancelToken;
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
      if (Request.isCancel(e)) {
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
      };
    }
    onOk(params);
  };

  const databaseId = modalForm.current?.getFieldValue("databaseId");

  useEffect(() => {
    if (!visible || !databaseId) return;
    getLogLibraries.run(databaseId);
  }, [visible, databaseId]);

  useEffect(() => {
    if (!visible) return;
    doGetDatabaseList();
  }, [visible]);

  useEffect(() => {
    if (visible && modalForm.current && !isEdit) {
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
  }, [visible, operations.selectDid, operations.selectTid]);

  useEffect(() => {
    if (visible && isEdit && (defaultData?.tid || defaultData?.tableId)) {
      doGetLogLibrary
        .run(defaultData?.tid || defaultData?.tableId)
        .then((res) => {
          if (res?.code !== 0) {
            return;
          }
          getLogLibraries.run(res.data.did || 0);
          modalForm.current?.setFieldsValue({
            ...defaultData,
            databaseId: res.data.did,
            tableId: defaultData.tid || defaultData?.tableId,
          });
          // handlePreview(modalForm.current?.getFieldsValue());
        });
    }
  }, [visible, isEdit, defaultData]);

  useEffect(() => {
    if (!visible && modalForm.current) {
      modalForm.current.resetFields();
      onClickPreview.current = false;
      setIsPreviewData(alarmModePreviewType.AggregateData);
      doShowTable(false);
    }
  }, [visible]);

  const aggregatePreviewText = useMemo(() => {
    switch (isPreviewData) {
      case alarmModePreviewType.AggregateData:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.aggregatedData",
        });
        break;

      case alarmModePreviewType.AlarmIndicator:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.aggregatedIndicators",
        });
        break;
      case alarmModePreviewType.AfterPreview:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.canConfirm",
        });
        break;

      default:
        return i18n.formatMessage({
          id: "alarm.rules.form.preview.unknownState",
        });
        break;
    }
  }, [isPreviewData]);

  return (
    <Modal
      centered
      title={i18n.formatMessage({
        id: "alarm.rules.form.inspectionStatistics",
      })}
      visible={visible}
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
            initialValue={[moment().subtract(1, MINUTES_UNIT_TIME), moment()]}
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
                    onChange={() => handleChangeLogLibrary()}
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
                  return <Option value={item.key}>{item.name}</Option>;
                })}
              </Select>
            </Form.Item>
            <Button className={queryStatisticsItemStyle.formItem} type="link">
              <a
                href="https://clickvisual.gocn.vip/clickvisual/03funcintro/alarm-function-configuration-description.html#%E8%81%9A%E5%90%88%E6%A8%A1%E5%BC%8F"
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
                  <Input.Group compact>
                    <Form.Item noStyle name={"when"} initialValue={"1=1"}>
                      <TextArea
                        autoSize={{ minRows: 1, maxRows: 15 }}
                        style={{
                          width:
                            mode != alarmModeType.AggregationMode
                              ? "calc(100% - 200px)"
                              : "100%",
                          borderRadius: "8px",
                        }}
                      />
                    </Form.Item>
                    {mode != alarmModeType.AggregationMode && (
                      <>
                        <Button
                          style={{
                            width: "calc(90px)",
                            borderRadius: "8px",
                            marginLeft: "10px",
                          }}
                          onClick={() => {
                            modalForm.current?.setFieldsValue({
                              when: format(getFieldValue("when")),
                            });
                          }}
                        >
                          {i18n.formatMessage({
                            id: "bigdata.components.FileTitle.formatting",
                          })}
                        </Button>
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
                          {i18n.formatMessage({
                            id: "alarm.rules.form.preview.aggregatedData",
                          })}
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
    </Modal>
  );
};
export default CreatedAndUpdatedModal;
