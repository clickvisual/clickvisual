import DataAnalysisStyle from "../../index.less";
import { Form, Select, Tooltip } from "antd";
import { useIntl, useModel } from "umi";
import { useEffect, useMemo } from "react";
import useUrlState from "@ahooksjs/use-url-state";

const ScreeningRow = (props: { style?: any }) => {
  const [selectForm] = Form.useForm();
  const [urlState, setUrlState] = useUrlState<any>();
  const { style } = props;
  const i18n = useIntl();
  const {
    doGetDatabase,
    instances,
    onChangeCurrentInstances,
    doGetInstance,
    setInstances,
    realTimeTraffic,
    workflow,
  } = useModel("dataAnalysis");
  const { setDatabases, setTables, setNodes, setEdges } = realTimeTraffic;
  const { setIsFold } = workflow;

  useEffect(() => {
    doGetInstance.run().then((res: any) => {
      if (res.code == 0) {
        setInstances(res?.data ?? []);
        if (urlState && urlState?.iid) {
          doGetDatabase
            .run(urlState.iid as number)
            .then((res) => setDatabases(res?.data ?? []));
          onChangeCurrentInstances(parseInt(urlState.iid));
          selectForm.setFieldsValue({ instances: parseInt(urlState.iid) });
        }
      }
    });
    return () => onChangeCurrentInstances(undefined);
  }, []);

  const options = useMemo(() => {
    if (instances.length <= 0) return [];
    return instances.map((item) => ({
      label: (
        <Tooltip
          title={`${item.name}${item.desc && `(${item.desc})`}`}
          placement={"right"}
        >{`${item.name}${item.desc && `(${item.desc})`}`}</Tooltip>
      ),
      value: item.id,
    }));
  }, [instances]);

  return (
    <div className={DataAnalysisStyle.screeningRow} style={style}>
      <Form form={selectForm}>
        <Form.Item name={"instances"} noStyle>
          <Select
            showSearch
            allowClear
            style={{ width: "278px" }}
            options={options}
            placeholder={i18n.formatMessage({ id: "datasource.draw.selected" })}
            onChange={(iid: number) => {
              setDatabases([]);
              setTables([]);
              setNodes([]);
              setEdges([]);
              setIsFold(false);
              onChangeCurrentInstances(iid);
              setUrlState({ iid: iid });
              if (iid) {
                doGetDatabase
                  .run(iid as number)
                  .then((res) => setDatabases(res?.data ?? []));
              }
            }}
          />
        </Form.Item>
      </Form>
    </div>
  );
};
export default ScreeningRow;
