import TrafficStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { Button, Form, Select } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useDebounceFn } from "ahooks";
import { useIntl } from "umi";
import { SearchOutlined } from "@ant-design/icons";
import { DEBOUNCE_WAIT } from "@/config/config";

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
      setBusinessChart([]);
      setNodes([]);
      setEdges([]);
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
        <div className={TrafficStyles.title}>
          {i18n.formatMessage({ id: "menu.bigdata.realtime" })}
        </div>
        <Form form={form} onFinish={handleSearch}>
          <Form.Item noStyle shouldUpdate>
            {() => {
              return (
                <Form.Item name={"dn"} required>
                  <Select
                    showSearch
                    options={databases.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    placeholder={i18n.formatMessage({
                      id: "alarm.rules.selected.placeholder.database",
                    })}
                    optionFilterProp="label"
                    onChange={(databaseName) => {
                      setTables([]);
                      setNodes([]);
                      setEdges([]);
                      if (databaseName) {
                        doGetTables
                          .run(currentInstances!, { database: databaseName })
                          .then((res) => setTables(res?.data ?? []));
                      }
                      form.resetFields(["tn"]);
                    }}
                    filterOption={(input: any, option: any) =>
                      (option!.label as unknown as string)
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(pre, next) => pre.dn !== next.dn}>
            {() => {
              return (
                <Form.Item name={"tn"} required>
                  <Select
                    showSearch
                    options={tables.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    placeholder={i18n.formatMessage({
                      id: "alarm.rules.selected.placeholder.logLibrary",
                    })}
                    optionFilterProp="label"
                    onChange={() => {
                      setNodes([]);
                      setEdges([]);
                    }}
                    filterOption={(input: any, option: any) =>
                      (option!.label as unknown as string)
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
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
