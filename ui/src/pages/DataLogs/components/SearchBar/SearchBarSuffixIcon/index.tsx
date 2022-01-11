import { Space, Tooltip } from "antd";
import SearchBarToolTip from "@/pages/DataLogs/components/SearchBar/SearchBarToolTip";
import { ProfileFilled, QuestionCircleFilled } from "@ant-design/icons";

const SearchBarSuffixIcon = () => {
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
        <QuestionCircleFilled size={32} />
      </Tooltip>
      <Tooltip title={"添加查询条件"}>
        <ProfileFilled style={{ cursor: "pointer" }} />
      </Tooltip>
    </Space>
  );
};
export default SearchBarSuffixIcon;
