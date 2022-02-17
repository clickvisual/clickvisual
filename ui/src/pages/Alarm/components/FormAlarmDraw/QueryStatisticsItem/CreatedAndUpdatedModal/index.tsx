import {
  Button,
  DatePicker,
  Form,
  FormInstance,
  Input,
  Modal,
  Select,
  Table,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { FieldData } from "rc-field-form/lib/interface";
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import {
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
} from "@/config/config";
import useRequest from "@/hooks/useRequest/useRequest";
import api from "@/services/dataLogs";
import Request, { Canceler } from "umi-request";
import { ColumnsType } from "antd/es/table";

const { Option } = Select;
const { RangePicker } = DatePicker;

type CreatedAndUpdatedModalProps = {
  visible: boolean;
  onOk: (fields: FieldData) => void;
  onCancel: () => void;
};
const CreatedAndUpdatedModal = ({
  visible,
  onOk,
  onCancel,
}: CreatedAndUpdatedModalProps) => {
  const modalForm = useRef<FormInstance>(null);
  const cancelTokenQueryPreviewRef = useRef<Canceler | null>(null);
  const CancelToken = Request.CancelToken;

  const [showTable, setShowTable] = useState<boolean>(false);
  const [tableLogs, setTableLogs] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnsType<any>>([]);

  const [currentPagination, setCurrentPagination] = useState({
    current: FIRST_PAGE,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const { databaseList, logLibraryList, doGetDatabaseList, getLogLibraries } =
    useModel("dataLogs");

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

  const onSubmit = () => {
    if (modalForm.current) modalForm.current.submit();
  };

  useEffect(() => {
    if (visible) doGetDatabaseList();
  }, [visible]);

  useEffect(() => {
    if (!visible && modalForm.current) modalForm.current.resetFields();
  }, [visible]);

  return (
    <Modal
      centered
      title={"查询统计"}
      visible={visible}
      width={800}
      onOk={onSubmit}
      onCancel={onCancel}
      bodyStyle={{ maxHeight: "75vh", overflowY: "auto" }}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 19 }}
        ref={modalForm}
        onFinish={onOk}
      >
        <Form.Item label={"类型"} name={"logType"} initialValue={1}>
          <Select>
            <Option value={1}>日志库</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label={"查询区间"}
          name={"times"}
          initialValue={[
            moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME),
            moment(),
          ]}
        >
          <RangePicker showTime />
        </Form.Item>
        <Form.Item
          label={"数据库"}
          name={"databaseId"}
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            onChange={(id: number) => {
              getLogLibraries.run(id);
              modalForm.current?.resetFields(["tableId"]);
            }}
          >
            {databaseList.map((database) => (
              <Option key={database.id} value={database.id}>
                {database.name}
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
          {({ getFieldValue, resetFields }) => {
            const databaseId = getFieldValue("databaseId");
            // ...
            if (!databaseId) return <></>;
            return (
              <Form.Item
                label={"数据表"}
                name={"tableId"}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  onChange={() => {
                    doShowTable(false);
                    const database = databaseList.find(
                      (item) => item.id === getFieldValue("databaseId")
                    )?.name;
                    const table = logLibraryList.find(
                      (item) => item.id === getFieldValue("tableId")
                    );
                    modalForm.current?.setFields([
                      {
                        name: "sql",
                        value: `select * from ${database}.${table?.tableName} limit 1`,
                      },
                    ]);
                  }}
                >
                  {logLibraryList.map((logTable) => (
                    <Option key={logTable.id} value={logTable.id}>
                      {logTable.tableName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, nextValues) =>
            prevValues.tableId !== nextValues.tableId ||
            prevValues.sql !== nextValues.sql
          }
        >
          {({ getFieldValue }) => {
            if (!getFieldValue("tableId")) return <></>;

            const disabledBtn =
              !getFieldValue("sql") || getFieldValue("sql") === "";
            return (
              <Form.Item label={"查询"}>
                {/*<Input />*/}
                <Input.Group compact>
                  <Form.Item noStyle name={"sql"}>
                    <Input style={{ width: "90%" }} />
                  </Form.Item>
                  <Button
                    disabled={disabledBtn}
                    style={{ width: "10%" }}
                    type={"primary"}
                    onClick={() => {
                      doShowTable(true);
                      cancelTokenQueryPreviewRef.current?.();
                      const fields = modalForm.current?.getFieldsValue();
                      if (fields) {
                        doQueryPreview
                          .run(
                            fields.tableId,
                            {
                              st: parseInt(fields.times[0].format("X")),
                              et: parseInt(fields.times[1].format("X")),
                              query: fields.sql,
                              page: FIRST_PAGE,
                              pageSize: PAGE_SIZE,
                            },
                            new CancelToken(function executor(c) {
                              cancelTokenQueryPreviewRef.current = c;
                            })
                          )
                          .then((res) => {
                            if (res?.code === 0) {
                              const logs = res.data.logs;
                              if (logs.length <= 0) return;
                              const columns = Object.keys(logs[0]).map(
                                (item) => {
                                  return {
                                    title: item,
                                    dataIndex: item,
                                    width: 160,
                                  };
                                }
                              );
                              setCurrentPagination(() => {
                                return {
                                  ...currentPagination,
                                  total: res.data.count,
                                };
                              });
                              setTableColumns(columns);
                              setTableLogs(logs);
                            }
                          });
                      }
                      console.log(modalForm.current?.getFieldsValue());
                    }}
                  >
                    预览
                  </Button>
                </Input.Group>
                {showTable && (
                  <Table
                    style={{ marginTop: 10 }}
                    loading={doQueryPreview.loading}
                    scroll={{ y: 200 }}
                    columns={tableColumns}
                    dataSource={tableLogs}
                    pagination={{ ...currentPagination }}
                    showSorterTooltip
                    bordered
                  />
                )}
              </Form.Item>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreatedAndUpdatedModal;
