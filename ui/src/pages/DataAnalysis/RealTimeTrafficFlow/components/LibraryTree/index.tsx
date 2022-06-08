import TrafficStyles from "@/pages/DataAnalysis/RealTimeTrafficFlow/index.less";
import { AutoComplete, Button, Form, Select, Input, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useDebounceFn } from "ahooks";
import { useIntl } from "umi";
import { SearchOutlined } from "@ant-design/icons";
import { DEBOUNCE_WAIT } from "@/config/config";

const { Option } = Select;

const LibraryTree = () => {
  const [form] = Form.useForm();
  const i18n = useIntl();
  const { doGetInstance, doGetDatabase, doGetTables, realTimeTraffic } =
    useModel("dataAnalysis");

  const {
    instances,
    databases,
    tables,
    setInstances,
    setDatabases,
    setTables,
    setTrafficChart,
    doGetTrafficChart,
  } = realTimeTraffic;

  useEffect(() => {
    doGetInstance.run().then((res) => setInstances(res?.data ?? []));
  }, []);

  const handleSearch = useDebounceFn(
    (field) => {
      doGetTrafficChart.run(field).then((res) => {
        if (res?.code === 0) setTrafficChart(res.data);
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  return (
    <div className={TrafficStyles.libraryTree}>
      <Form form={form} onFinish={handleSearch}>
        <Form.Item name={"iid"} required>
          <Select
            showSearch
            allowClear
            placeholder={i18n.formatMessage({ id: "datasource.draw.selected" })}
            onChange={(iid) => {
              setDatabases([]);
              setTables([]);
              if (iid) {
                doGetDatabase
                  .run(iid as number)
                  .then((res) => setDatabases(res?.data ?? []));
              }
              form.resetFields(["dn", "tn"]);
            }}
          >
            {instances.length > 0 &&
              instances.map((item) => (
                <Option key={item.id} value={item.id as number}>
                  <Tooltip
                    title={item.name + (item.desc ? `(${item.desc})` : "")}
                  >
                    {item.name}
                    {item.desc ? `(${item.desc})` : ""}
                  </Tooltip>
                </Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(pre, next) => pre.iid !== next.iid}>
          {() => {
            return (
              <Form.Item name={"dn"} required>
                <AutoComplete
                  allowClear
                  filterOption
                  style={{ width: "100%" }}
                  options={databases.map((item) => ({ value: item.name }))}
                  onChange={(dn) => {
                    setTables([]);
                    if (dn) {
                      const did = databases.find(
                        (item) => item.name === dn
                      )?.id;
                      if (did) {
                        doGetTables
                          .run(did)
                          .then((res) => setTables(res?.data ?? []));
                      }
                    }
                    form.resetFields(["tn"]);
                  }}
                >
                  <Input
                    placeholder={i18n.formatMessage({
                      id: "alarm.rules.selected.placeholder.database",
                    })}
                  />
                </AutoComplete>
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(pre, next) =>
            pre.iid !== next.iid || pre.dn !== next.dn
          }
        >
          {() => {
            return (
              <Form.Item name={"tn"} required>
                <AutoComplete
                  allowClear
                  filterOption
                  style={{ width: "100%" }}
                  options={tables.map((item) => ({ value: item.tableName }))}
                >
                  <Input
                    placeholder={i18n.formatMessage({
                      id: "alarm.rules.selected.placeholder.logLibrary",
                    })}
                  />
                </AutoComplete>
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item>
          <Button
            type={"primary"}
            htmlType={"submit"}
            icon={<SearchOutlined />}
            loading={doGetTrafficChart.loading}
          >
            {i18n.formatMessage({ id: "search" })}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
export default LibraryTree;
