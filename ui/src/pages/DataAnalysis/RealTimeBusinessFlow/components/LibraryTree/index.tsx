import TrafficStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { Button, Form, Select } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useDebounceFn } from "ahooks";
import { useIntl } from "umi";
import { SearchOutlined } from "@ant-design/icons";
import { DEBOUNCE_WAIT } from "@/config/config";
import useUrlState from "@ahooksjs/use-url-state";

const LibraryTree = (props: { setUtime: (num?: number) => void }) => {
  const { setUtime } = props;
  const [form] = Form.useForm();
  const [urlState, setUrlState] = useUrlState();
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
      doGetBusinessChart.run(Number(currentInstances), field).then((res) => {
        if (res?.code === 0) {
          setBusinessChart(res.data?.data);
          setUtime(res.data?.utime);
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  useEffect(() => {
    form.resetFields(["databaseName", "tableName"]);
    setUtime(undefined);
  }, [currentInstances]);

  useEffect(() => {
    if (urlState?.dName && urlState?.tName && urlState?.iid) {
      doGetTables
        .run(parseInt(urlState?.iid), { database: urlState.dName })
        .then((res) => setTables(res?.data ?? []));
      form.setFieldsValue({
        databaseName: urlState.dName,
        tableName: urlState.tName,
      });
      form.submit();
    }
  }, []);

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
                <Form.Item name={"databaseName"} required>
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
                      setUtime(undefined);
                      setUrlState({ dName: databaseName });
                      if (databaseName) {
                        doGetTables
                          .run(currentInstances!, { database: databaseName })
                          .then((res) => setTables(res?.data ?? []));
                      }
                      form.resetFields(["tableName"]);
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
          <Form.Item
            noStyle
            shouldUpdate={(pre, next) => pre.databaseName !== next.databaseName}
          >
            {() => {
              return (
                <Form.Item name={"tableName"} required>
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
                    onChange={(tableName: string) => {
                      setNodes([]);
                      setEdges([]);
                      setUtime(undefined);
                      setUrlState({ tName: tableName });
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
