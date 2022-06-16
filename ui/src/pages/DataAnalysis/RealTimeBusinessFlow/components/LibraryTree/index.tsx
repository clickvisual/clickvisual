import TrafficStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { AutoComplete, Button, Form, Input } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useDebounceFn } from "ahooks";
import { useIntl } from "umi";
import { SearchOutlined } from "@ant-design/icons";
import { DEBOUNCE_WAIT } from "@/config/config";
import ScreeningRow from "@/pages/DataAnalysis/ScreeningRow";

const LibraryTree = () => {
  const [form] = Form.useForm();
  const i18n = useIntl();
  const { doGetTables, currentInstances, realTimeTraffic } =
    useModel("dataAnalysis");

  const {
    databases,
    tables,
    setTables,
    setBusinessChart,
    doGetBusinessChart,
    setNodes,
    setEdges,
  } = realTimeTraffic;

  const handleSearch = useDebounceFn(
    (field) => {
      doGetBusinessChart
        .run({ ...field, iid: currentInstances })
        .then((res) => {
          if (res?.code === 0) setBusinessChart(res.data);
        });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  useEffect(() => {
    form.resetFields(["dn", "tn"]);
  }, [currentInstances]);

  return (
    <div className={TrafficStyles.libraryTree}>
      <div className={TrafficStyles.libraryTreeForm}>
        <Form form={form} onFinish={handleSearch}>
          <Form.Item noStyle shouldUpdate>
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
                      setNodes([]);
                      setEdges([]);
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
          <Form.Item noStyle shouldUpdate={(pre, next) => pre.dn !== next.dn}>
            {() => {
              return (
                <Form.Item name={"tn"} required>
                  <AutoComplete
                    allowClear
                    filterOption
                    onChange={() => {
                      setNodes([]);
                      setEdges([]);
                    }}
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
              loading={doGetBusinessChart.loading}
            >
              {i18n.formatMessage({ id: "search" })}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};
export default LibraryTree;
