import eventStyles from "@/pages/SystemSetting/Events/index.less";
import { Button, Form, FormInstance, Select, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import useRequest from "@/hooks/useRequest/useRequest";
import { getSourceOptions } from "@/services/events";
import { useIntl } from "umi";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import useUrlState from "@ahooksjs/use-url-state";

const { Option } = Select;

type OperationsProps = {
  loadList: (params?: any) => void;
  onChangeData: (data: any[]) => void;
};
const Operations = ({ loadList, onChangeData }: OperationsProps) => {
  const { setCurrentPagination, eventEnums, setQuery } = useModel("events");
  const formRef = useRef<FormInstance>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [urlState, setUrlState] = useUrlState<any>({});

  const doGetOptions = useRequest(getSourceOptions, {
    loadingText: false,
    onSuccess: (res) => {
      const arr: any[] = Object.keys(res.data.operationEnums).map((item) => {
        return { value: item, name: res.data.operationEnums[item] };
      });
      setOptions(arr);
    },
  });

  const sources: any[] = useMemo(() => {
    if (!eventEnums) return [];
    return Object.keys(eventEnums.sourceEnums).map((item) => {
      return { name: eventEnums.sourceEnums[item], value: item };
    });
  }, [eventEnums]);

  const users: any[] = useMemo(() => {
    if (!eventEnums) return [];
    return Object.keys(eventEnums.userEnums).map((item) => {
      return { name: eventEnums.userEnums[item], value: item };
    });
  }, [eventEnums]);
  useEffect(() => {
    formRef.current?.setFieldsValue({ ...urlState });
    if (urlState.source) {
      doGetOptions.run(urlState.source);
    }
  }, []);

  const onFinish = (fields: any) => {
    setUrlState(fields);
    setCurrentPagination({
      pageSize: PAGE_SIZE,
      current: FIRST_PAGE,
      total: 0,
    });
    onChangeData([]);
    loadList({ ...fields, current: 1 });
    setQuery(fields);
  };
  const i18n = useIntl();
  return (
    <div className={eventStyles.operations}>
      <Form ref={formRef} name="evnets-query" onFinish={onFinish}>
        <Space>
          <Form.Item noStyle name={"source"}>
            <Select
              placeholder={i18n.formatMessage(
                { id: "events.input.placeholder" },
                { value: "source" }
              )}
              showSearch
              allowClear
              optionFilterProp="children"
              className={eventStyles.select}
              onChange={() => {
                formRef.current?.resetFields(["operation"]);
                setOptions([]);
              }}
              onSelect={(val: string) => {
                doGetOptions.run(val);
              }}
            >
              {sources.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            name={"operation"}
            shouldUpdate={(prevValues, nextValues) =>
              prevValues.source !== prevValues.source
            }
          >
            <Select
              disabled={!formRef.current?.getFieldValue(["source"])}
              placeholder={i18n.formatMessage(
                { id: "events.input.placeholder" },
                { value: "operation" }
              )}
              showSearch
              optionFilterProp="children"
              className={eventStyles.select}
              allowClear
            >
              {options.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item noStyle name={"uid"}>
            <Select
              className={eventStyles.select}
              showSearch
              allowClear
              optionFilterProp="children"
              placeholder={i18n.formatMessage(
                { id: "events.input.placeholder" },
                {
                  value: i18n.formatMessage({
                    id: "alarm.rules.historyBorad.user",
                  }),
                }
              )}
            >
              {users.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item noStyle>
            <Button
              icon={<SearchOutlined />}
              type={"primary"}
              htmlType={"submit"}
            >
              {i18n.formatMessage({ id: "search" })}
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </div>
  );
};
export default Operations;
