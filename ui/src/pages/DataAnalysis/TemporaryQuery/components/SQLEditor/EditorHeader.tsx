import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import { Button, Tooltip } from "antd";
import { FormatPainterOutlined } from "@ant-design/icons";
// import { format } from "sql-formatter";

const EditorHeader = () => {
  return (
    <div className={TemporaryQueryStyle.header}>
      <Tooltip title={"格式化 SQL"}>
        <Button type={"link"} icon={<FormatPainterOutlined />} />
      </Tooltip>
    </div>
  );
};

export default EditorHeader;
