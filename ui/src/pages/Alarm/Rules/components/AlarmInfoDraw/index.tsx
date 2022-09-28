import infoStyles from "@/pages/Alarm/Rules/components/AlarmInfoDraw/index.less";
import { Drawer, Empty, message, Select, Tabs, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo, useState } from "react";
import { useIntl } from "umi";
import useTimeUnits from "@/hooks/useTimeUnits";
import MonacoEditor from "react-monaco-editor";
import copy from "copy-to-clipboard";
import classNames from "classnames";

const { Option } = Select;

const { TabPane } = Tabs;

const AlarmInfoDraw = () => {
  const { FixedTimeUnits } = useTimeUnits();
  const { alarmDraw } = useModel("alarm");
  const { onChangeVisibleInfo, visibleInfo, alarmInfo, setAlarmInfo } =
    alarmDraw;
  const i18n = useIntl();
  const [viewIndex, setViewIndex] = useState<string>("");
  const [rulesIndex, setRulesIndex] = useState<string>("");

  const onClose = () => {
    onChangeVisibleInfo(false);
  };

  const infoData: any = [
    {
      id: 101,
      title: i18n.formatMessage({ id: "alarm.rules.table.alarmName" }),
      content: alarmInfo?.alarmName || "-",
    },
    {
      id: 102,
      title: i18n.formatMessage({ id: "alarm.rules.inspectionFrequency" }),
      content:
        `${alarmInfo?.interval} ${
          FixedTimeUnits.filter((item) => item.key === alarmInfo?.unit)[0]
            ?.label
        }` || "-",
    },
    {
      id: 103,
      title: "UUID",
      content:
        (
          <span
            style={{ cursor: "pointer" }}
            onClick={() =>
              copy(alarmInfo?.uuid || "") &&
              message.success(
                i18n.formatMessage({ id: "log.item.copy.success" })
              )
            }
          >
            {alarmInfo?.uuid}
          </span>
        ) || "-",
      tooltipTitle: i18n.formatMessage({
        id: "alarm.rules.historyBorad.clickOnTheCopy",
      }),
      tooltipText: alarmInfo?.uuid || "nil",
    },
    {
      id: 104,
      title: i18n.formatMessage({ id: "alarm.rules.creator" }),
      content: alarmInfo?.nickname || "-",
      tooltipTitle: "UID",
      tooltipText: alarmInfo?.uid || "nil",
    },
  ];

  const showViewDDLs = useMemo(() => {
    return alarmInfo?.viewDDLs && Object.keys(alarmInfo?.viewDDLs).length > 0;
  }, [alarmInfo?.viewDDLs]);

  const showRules = useMemo(() => {
    return (
      alarmInfo?.alertRules && Object.keys(alarmInfo?.alertRules).length > 0
    );
  }, [alarmInfo?.alertRules]);

  useEffect(() => {
    if (!visibleInfo) {
      setAlarmInfo(undefined);
      setViewIndex("");
      setRulesIndex("");
    }
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
        {infoData.map((item: any) => {
          return (
            <div className={infoStyles.item} key={item.id}>
              <div className={infoStyles.title}>{item.title}: </div>
              {item.tooltipTitle ? (
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
                      <span className={infoStyles.title}>
                        {item.tooltipTitle}:&nbsp;
                      </span>
                      <span>{item.tooltipText}</span>
                    </div>
                  }
                >
                  <div className={infoStyles.content}>{item.content}</div>
                </Tooltip>
              ) : (
                <div className={infoStyles.content}>{item.content}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className={infoStyles.configs}>
        <Tabs defaultActiveKey="view" size="small" className={infoStyles.tabs}>
          <TabPane
            forceRender={false}
            tab={i18n.formatMessage({ id: "alarm.rules.info.view" })}
            key="view"
          >
            {showViewDDLs &&
              i18n.formatMessage({ id: "alarm.rules.materializedViews" })}
            {showViewDDLs && (
              <Select
                className={infoStyles.select}
                onChange={(e) => setViewIndex(e)}
                value={viewIndex}
              >
                {alarmInfo?.viewDDLs &&
                  Object.keys(alarmInfo?.viewDDLs).map((item: any) => (
                    <Option value={item} key={item}>
                      {item}
                    </Option>
                  ))}
              </Select>
            )}
            <div
              className={classNames([
                showViewDDLs ? infoStyles.editor : infoStyles.editorHeight,
              ])}
            >
              {!showViewDDLs || (showViewDDLs && viewIndex.length > 0) ? (
                <MonacoEditor
                  height={"100%"}
                  language={"sql"}
                  theme="vs-dark"
                  value={
                    showViewDDLs
                      ? alarmInfo?.viewDDLs[viewIndex]
                      : alarmInfo?.view
                  }
                  options={{
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    wordWrap: "on",
                    scrollbar: { alwaysConsumeMouseWheel: false },
                  }}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={i18n.formatMessage(
                    { id: "select.placeholder" },
                    {
                      name: i18n.formatMessage({
                        id: "alarm.rules.materializedViews",
                      }),
                    }
                  )}
                />
              )}
            </div>
          </TabPane>
          <TabPane
            forceRender={false}
            tab={i18n.formatMessage({ id: "alarm.rules.info.rule" })}
            key="rule"
          >
            {showRules && "Prometheus Rule："}
            {showRules && (
              <Select
                className={infoStyles.select}
                onChange={(e) => setRulesIndex(e)}
                value={rulesIndex}
              >
                {alarmInfo?.alertRules &&
                  Object.keys(alarmInfo?.alertRules).map((item: any) => (
                    <Option value={item} key={item}>
                      {item}
                    </Option>
                  ))}
              </Select>
            )}
            <div
              className={classNames([
                showRules ? infoStyles.editor : infoStyles.editorHeight,
              ])}
            >
              {!showRules || (showRules && rulesIndex.length > 0) ? (
                <MonacoEditor
                  height={"100%"}
                  language={"yaml"}
                  theme="vs-dark"
                  value={
                    showRules
                      ? alarmInfo?.alertRules[rulesIndex]
                      : alarmInfo?.alertRule
                  }
                  options={{
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    smoothScrolling: true,
                    scrollbar: { alwaysConsumeMouseWheel: false },
                  }}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={i18n.formatMessage(
                    { id: "select.placeholder" },
                    { name: "Prometheus Rule" }
                  )}
                />
              )}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </Drawer>
  );
};
export default AlarmInfoDraw;
