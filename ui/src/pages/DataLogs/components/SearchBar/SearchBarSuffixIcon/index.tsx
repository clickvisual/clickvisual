import { Space, Tooltip } from "antd";
import SearchBarToolTip from "@/pages/DataLogs/components/SearchBar/SearchBarToolTip";
import { ProfileFilled, QuestionCircleFilled } from "@ant-design/icons";
import ModalAddQueryCriteria from "@/pages/DataLogs/components/SearchBar/ModalAddQueryCriteria";
import { useState } from "react";
import { useIntl } from "umi";

const SearchBarSuffixIcon = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const i18n = useIntl();
  return (
    <Space>
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
      <Tooltip
        title={i18n.formatMessage({ id: "log.search.icon.quickSearch" })}
      >
        <ProfileFilled
          style={{ cursor: "pointer", color: "hsl(21, 85%, 56%)" }}
          onClick={() => setVisible(true)}
        />
      </Tooltip>
      <ModalAddQueryCriteria
        visible={visible}
        onCancel={() => setVisible(false)}
      />
    </Space>
  );
};
export default SearchBarSuffixIcon;
