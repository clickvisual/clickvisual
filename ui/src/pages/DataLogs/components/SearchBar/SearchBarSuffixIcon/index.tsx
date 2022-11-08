import styles from "./index.less";
import { Button, message, Space, Tooltip } from "antd";
import SearchBarToolTip from "@/pages/DataLogs/components/SearchBar/SearchBarToolTip";
import { QuestionCircleFilled } from "@ant-design/icons";
import ModalAddQueryCriteria from "@/pages/DataLogs/components/SearchBar/ModalAddQueryCriteria";
import { useState } from "react";
import { useIntl, useModel } from "umi";
import IconFont from "@/components/IconFont";
import CreatCollectingHistorical from "./CreatCollectingHistorical";

const SearchBarSuffixIcon = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [visibleCollectingHistorical, setVisibleCollectingHistorical] =
    useState<boolean>(false);
  const { keywordInput } = useModel("dataLogs");
  const i18n = useIntl();

  return (
    <Space className={styles.space}>
      <Tooltip title={i18n.formatMessage({ id: "log.collectHistory.tooltip" })}>
        <Button
          type="link"
          size="small"
          style={{ width: "16px" }}
          icon={<IconFont type={"icon-shoucang"} />}
          onClick={() => {
            if (keywordInput?.trim()?.length == 0) {
              message.info(
                i18n.formatMessage({ id: "log.collectHistory.placeholder" })
              );
              return;
            }
            setVisibleCollectingHistorical(true);
          }}
        ></Button>
      </Tooltip>
      <Tooltip
        title={<SearchBarToolTip />}
        color={"#fff"}
        overlayInnerStyle={{
          padding: "8px 16px",
          width: 300,
          color: "#41464beb",
          fontSize: 12,
          lineHeight: "24px",
        }}
      >
        <QuestionCircleFilled
          size={32}
          style={{ color: "hsl(21, 85%, 56%)" }}
        />
      </Tooltip>
      <ModalAddQueryCriteria
        visible={visible}
        onCancel={() => setVisible(false)}
      />
      <CreatCollectingHistorical
        visible={visibleCollectingHistorical}
        onChangeVisible={() => setVisibleCollectingHistorical(false)}
      />
    </Space>
  );
};
export default SearchBarSuffixIcon;
