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
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import { FIRST_PAGE, MINUTES_UNIT_TIME, PAGE_SIZE } from "@/config/config";
import useRequest from "@/hooks/useRequest/useRequest";
import api from "@/services/dataLogs";
import Request, { Canceler } from "umi-request";
import { ColumnsType } from "antd/es/table";
import { useIntl } from "umi";
import { SaveOutlined } from "@ant-design/icons";

const { Option } = Select;
const { RangePicker } = DatePicker;

type CreatedAndUpdatedModalProps = {
  visible: boolean;
  onOk: (fields: any) => void;
  onCancel: () => void;
};
const CreatedAndUpdatedModal = ({
  visible,
  onOk,
  onCancel,
}: CreatedAndUpdatedModalProps) => {
  const modalForm = useRef<FormInstance>(null);
  const onClickPreview = useRef<boolean>(false);
  const cancelTokenQueryPreviewRef = useRef<Canceler | null>(null);
  const CancelToken = Request.CancelToken;
  const i18n = useIntl();

  const { operations } = useModel("alarm");

  const [showTable, setShowTable] = useState<boolean>(false);
  const [isDisable, setIsDisable] = useState<boolean>(false);
  const [tableLogs, setTableLogs] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnsType<any>>([]);

  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const { databaseList, logLibraryList, doGetDatabaseList, getLogLibraries } =
    useModel("dataLogs");

  const doQueryPreview = useRequest(api.getLogs, {
    loadingText: false,
    onError: (e) => {
      // setTableColumns([]);
      // setTableLogs([]);
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

  const handlePreview = (fields: any) => {
    if (!fields) return;
    doShowTable(true);
    onClickPreview.current = true;
    cancelTokenQueryPreviewRef.current?.();
    doQueryPreview
      .run(
        fields.tableId,
        {
          st: parseInt(fields.between[0].format("X")),
          et: parseInt(fields.between[1].format("X")),
          query: fields.when,
          page: FIRST_PAGE,
          pageSize: PAGE_SIZE,
        },
        new CancelToken(function executor(c) {
          cancelTokenQueryPreviewRef.current = c;
        })
      )
      .then((res) => {
        if (res?.code === 0) {
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
    doQueryPreview
      .run(
        fields.tableId,
        {
          st: parseInt(fields.between[0].format("X")),
          et: parseInt(fields.between[1].format("X")),
          query: fields.when,
          page,
          pageSize,
        },
        new CancelToken(function executor(c) {
          cancelTokenQueryPreviewRef.current = c;
        })
      )
      .then((res) => {
        if (res?.code === 0) {
          const logs = res.data.logs.map((item, index) => {
            return { id: index, ...item };
          });
          setTableLogs(logs);
        }
      });
  };

  const onSubmit = () => {
    if (!modalForm.current) return;
    modalForm.current.submit();
  };

  const handleFinish = (fields: any) => {
    if (!onClickPreview.current) {
      Modal.warning({
        content: i18n.formatMessage({
          id: "alarm.rules.form.notPreview.content",
        }),
      });
      return;
    }
    onOk(fields);
  };

  useEffect(() => {
    if (visible && modalForm.current) {
      doGetDatabaseList();
      if (operations.selectDid) {
        modalForm.current.setFieldsValue({ databaseId: operations.selectDid });
        getLogLibraries.run(operations.selectDid);
        handleChangeDisable(true);
      }
      if (operations.selectTid)
        modalForm.current.setFieldsValue({ tableId: operations.selectTid });
    }
  }, [visible, operations.selectDid, operations.selectTid]);

  useEffect(() => {
    if (!visible && modalForm.current) {
      modalForm.current.resetFields();
      onClickPreview.current = false;
    }
  }, [visible]);

  return (
    <Modal
      centered
      title={i18n.formatMessage({
        id: "alarm.rules.form.inspectionStatistics",
      })}
      visible={visible}
      width={800}
      onOk={onSubmit}
      onCancel={onCancel}
      bodyStyle={{ maxHeight: "75vh", overflowY: "auto" }}
      okButtonProps={{
        icon: <SaveOutlined />,
      }}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 19 }}
        ref={modalForm}
        onFinish={handleFinish}
      >
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
                  { instance: database.instanceName, database: database.name }
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
            prevValues.when !== nextValues.when
          }
        >
          {({ getFieldValue, getFieldsValue }) => {
            if (!getFieldValue("tableId")) return <></>;
            return (
              <Form.Item label={i18n.formatMessage({ id: "search" })}>
                <Input.Group compact>
                  <Form.Item noStyle name={"when"} initialValue={"1=1"}>
                    <Input style={{ width: "85%" }} />
                  </Form.Item>
                  <Button
                    style={{ width: "15%" }}
                    type={"primary"}
                    onClick={() => {
                      const fields = getFieldsValue();
                      handlePreview(fields);
                    }}
                  >
                    {i18n.formatMessage({ id: "alarm.rules.form.preview" })}
                  </Button>
                </Input.Group>
                {showTable && (
                  <Table
                    rowKey={"id"}
                    style={{ marginTop: 10 }}
                    loading={doQueryPreview.loading}
                    scroll={{ y: 200 }}
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
              </Form.Item>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreatedAndUpdatedModal;
