import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import { message, Progress, Tooltip } from "antd";
import { AlarmHistoryType, AlarmInfoType } from "@/services/alarm";
import { useIntl } from "umi";
import copy from "copy-to-clipboard";
import "@/styles/var.less";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
import IconFont from "@/components/IconFont";
import useTimeUnits from "@/hooks/useTimeUnits";
import moment from "moment";

type HistoryBoardProps = {
  sucPublish: number;
  total: number;
  dataList: AlarmHistoryType[];
  currentAlarm: AlarmInfoType;
  dashboardUrl: string;
};
const HistoryBoard = ({
  sucPublish,
  total,
  currentAlarm,
  dashboardUrl,
}: HistoryBoardProps) => {
  const i18n = useIntl();
  const {
    username,
    status: value,
    uuid,
    ctime,
    utime,
    unit,
    interval,
    uid,
    instance,
    table,
  } = currentAlarm;
  const { AlarmStatus } = useAlarmEnums();
  const status = AlarmStatus.find((item) => value === item.status);
  const { FixedTimeUnits } = useTimeUnits();
  const unitItem = FixedTimeUnits.filter((item) => item.key === unit)[0];

  const basicInfo = [
    {
      id: 101,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.theLog",
      }),
      content: (
        <a href={dashboardUrl}>
          {i18n.formatMessage({ id: "alarm.rules.historyBorad.toView" })}
        </a>
      ),
      isCopy: false,
    },
    {
      id: 102,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.checkFrequency",
      }),
      content: interval + " " + unitItem.label,
      isCopy: false,
    },
    {
      id: 103,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.status",
      }),
      content: (
        <div>
          <IconFont
            type={status?.icon || ""}
            size={100}
            style={{ color: status?.color, marginRight: "10px" }}
          />
          {status?.label}
        </div>
      ),
      isCopy: false,
      color: status?.color,
    },
    {
      id: 104,
      title: i18n.formatMessage({ id: "alarm.rules.historyBorad.ctime" }),
      content: ctime && moment(ctime * 1000).format("YYYY-MM-DD hh:mm:ss"),
      isCopy: false,
    },
    {
      id: 105,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.table",
      }),
      content: table.name,
      isCopy: false,
    },
    {
      id: 106,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.lastUpdateTime",
      }),
      content: utime && moment(utime * 1000).format("YYYY-MM-DD hh:mm:ss"),
      isCopy: false,
    },
    {
      id: 107,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.database",
      }),
      content: table.database.name,
      isCopy: false,
    },
    {
      id: 108,
      title: "UUID",
      copyText: uuid,
      content: (
        <Tooltip
          title={i18n.formatMessage({
            id: "alarm.rules.historyBorad.clickOnTheCopy",
          })}
        >
          {uuid}
        </Tooltip>
      ),
      isCopy: true,
    },
    {
      id: 109,
      title: i18n.formatMessage({
        id: "datasource.logLibrary.from.newLogLibrary.instance",
      }),
      content: instance.name,
      isCopy: false,
    },
    {
      id: 110,
      title: i18n.formatMessage({ id: "alarm.rules.historyBorad.user" }),
      content: <Tooltip title={`uid: ${uid}`}>{username}</Tooltip>,
      isCopy: false,
    },
  ];
  const historicalStatistics = [
    {
      id: 201,
      title: i18n.formatMessage({ id: "alarm.rules.history.title.total" }),
      content: total,
    },
    {
      id: 202,
      title: i18n.formatMessage({ id: "alarm.rules.history.title.sucPublish" }),
      content: sucPublish,
    },
    {
      id: 203,
      title: i18n.formatMessage({
        id: "alarm.rules.historyBorad.successPushRate",
      }),
      content:
        (sucPublish && total && (
          <Progress
            width={50}
            strokeColor={{
              "0%": "#F7B997",
              "100%": "hsl(21, 85%, 59%)",
            }}
            percent={(sucPublish / total) * 100}
          />
        )) ||
        "-",
      contentPaddingRight: "100px",
    },
  ];

  return (
    <div>
      <div className={historyStyles.board}>
        <div className={historyStyles.header}>
          {i18n.formatMessage({
            id: "alarm.rules.historyBorad.basicInformation",
          })}
        </div>
        <div className={historyStyles.table}>
          {basicInfo.map((items: any) => (
            <div className={historyStyles.item} key={items.id}>
              <div className={historyStyles.title}>{items.title}: </div>
              <div
                className={`${historyStyles.content} ${
                  items.isCopy ? historyStyles.copy : ""
                }`}
                style={{ color: items.color }}
                onClick={() =>
                  items.isCopy &&
                  copy(items.copyText) &&
                  message.success(
                    i18n.formatMessage({ id: "log.item.copy.success" })
                  )
                }
              >
                {items.content || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={historyStyles.board}>
        <div className={historyStyles.header}>
          <div>
            {i18n.formatMessage({
              id: "alarm.rules.historyBorad.historicalAlarmStatistics",
            })}
          </div>
        </div>
        <div className={historyStyles.table}>
          {historicalStatistics.map((items: any) => (
            <div className={historyStyles.item} key={items.id}>
              <div className={historyStyles.title}>{items.title}: </div>
              <div
                className={historyStyles.content}
                style={{ paddingRight: items?.contentPaddingRight }}
              >
                {items.content || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default HistoryBoard;
