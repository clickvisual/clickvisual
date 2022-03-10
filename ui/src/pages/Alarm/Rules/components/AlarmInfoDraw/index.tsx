import infoStyles from "@/pages/Alarm/Rules/components/AlarmInfoDraw/index.less";
import { Drawer, Space, Tabs, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useIntl } from "umi";
import useTimeUnits from "@/hooks/useTimeUnits";
import MonacoEditor from "react-monaco-editor";

const { TabPane } = Tabs;

const AlarmInfoDraw = () => {
  const { FixedTimeUnits } = useTimeUnits();
  const { alarmDraw } = useModel("alarm");
  const { onChangeVisibleInfo, visibleInfo, alarmInfo, setAlarmInfo } =
    alarmDraw;
  const i18n = useIntl();
  const onClose = () => {
    onChangeVisibleInfo(false);
  };

  useEffect(() => {
    if (!visibleInfo) setAlarmInfo(undefined);
  }, [visibleInfo]);

  useEffect(() => {
    return () => onClose();
  }, []);
  return (
    <Drawer
      closable
      getContainer={false}
      width={"66vw"}
      bodyStyle={{
        margin: 10,
        padding: 0,
        display: "flex",
        flexDirection: "column",
      }}
      headerStyle={{ padding: 10 }}
      destroyOnClose
      title={i18n.formatMessage({ id: "alarm.rules.info.title" })}
      visible={visibleInfo}
      onClose={onClose}
    >
      <div className={infoStyles.details}>
        <div>
          <span className={infoStyles.title}>
            {i18n.formatMessage({ id: "alarm.rules.table.alarmName" })}
            :&nbsp;
          </span>
          <Tooltip
            color={"#fff"}
            placement={"left"}
            overlayInnerStyle={{
              color: "#41464beb",
              fontSize: 12,
              lineHeight: "24px",
            }}
            title={
              <div>
                <span className={infoStyles.title}>UID:&nbsp;</span>
                <span>{alarmInfo?.uuid ? alarmInfo?.uuid : "nil"}</span>
              </div>
            }
          >
            <span>{alarmInfo?.alarmName}</span>
          </Tooltip>
        </div>
        <Space>
          <div>
            <span className={infoStyles.title}>
              {i18n.formatMessage({ id: "alarm.rules.inspectionFrequency" })}
              :&nbsp;
            </span>
            <span>{`${alarmInfo?.interval} ${
              FixedTimeUnits.filter((item) => item.key === alarmInfo?.unit)[0]
                ?.label
            }`}</span>
          </div>
          <div>
            <span className={infoStyles.title}>
              {i18n.formatMessage({ id: "alarm.rules.creator" })}:&nbsp;
            </span>
            <Tooltip
              color={"#fff"}
              placement={"left"}
              overlayInnerStyle={{
                color: "#41464beb",
                fontSize: 12,
                lineHeight: "24px",
              }}
              title={
                <div>
                  <span className={infoStyles.title}>UID:&nbsp;</span>
                  <span>{alarmInfo?.uid ? alarmInfo?.uid : "nil"}</span>
                </div>
              }
            >
              <span>{alarmInfo?.nickname}</span>
            </Tooltip>
          </div>
        </Space>
      </div>
      <div className={infoStyles.configs}>
        <Tabs defaultActiveKey="view" size="small" className={infoStyles.tabs}>
          <TabPane
            forceRender={false}
            tab={i18n.formatMessage({ id: "alarm.rules.info.view" })}
            key="view"
          >
            <MonacoEditor
              height={"100%"}
              language={"sql"}
              theme="vs-dark"
              value={alarmInfo?.view || ""}
              options={{
                automaticLayout: true,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                scrollbar: { alwaysConsumeMouseWheel: false },
              }}
            />
          </TabPane>
          <TabPane
            forceRender={false}
            tab={i18n.formatMessage({ id: "alarm.rules.info.rule" })}
            key="rule"
          >
            <MonacoEditor
              height={"100%"}
              language={"yaml"}
              theme="vs-dark"
              value={alarmInfo?.alertRule || ""}
              options={{
                automaticLayout: true,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                scrollbar: { alwaysConsumeMouseWheel: false },
              }}
            />
          </TabPane>
        </Tabs>
      </div>
    </Drawer>
  );
};
export default AlarmInfoDraw;
