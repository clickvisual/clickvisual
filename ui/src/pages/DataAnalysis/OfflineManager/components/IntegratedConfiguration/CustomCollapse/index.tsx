import { useState } from "react";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import style from "./index.less";
import { DownOutlined, RightOutlined } from "@ant-design/icons";

const CustomCollapse = (props: { children: any; type: number }) => {
  const { children, type } = props;
  const [visibleCustomCollapse, setVisibleCustomCollapse] =
    useState<boolean>(true);
  let title = "";
  switch (type) {
    case CustomCollapseEnums.dataSource:
      title = "选择数据源";
      break;
    case CustomCollapseEnums.fieldMapping:
      title = "字段映射";
      break;
    case CustomCollapseEnums.schedulingConfig:
      title = "调度配置";
      break;

    default:
      break;
  }
  return (
    <div className={style.CustomCollapse}>
      <div
        className={style.titleBox}
        onClick={() => setVisibleCustomCollapse(!visibleCustomCollapse)}
      >
        <div className={style.title}>
          {visibleCustomCollapse ? <DownOutlined /> : <RightOutlined />}
          &nbsp;&nbsp;
          {title}
        </div>
      </div>
      {visibleCustomCollapse && <div className={style.content}>{children}</div>}
    </div>
  );
};
export default CustomCollapse;
