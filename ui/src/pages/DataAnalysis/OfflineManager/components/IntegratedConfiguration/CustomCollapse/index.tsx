import {useState} from "react";
import {CustomCollapseEnums} from "@/pages/DataAnalysis/OfflineManager/config";
import style from "./index.less";
import {RightOutlined} from "@ant-design/icons";
import {useIntl} from "umi";

const CustomCollapse = (props: { children: any; type: number }) => {
  const { children, type } = props;
  const [visibleCustomCollapse, setVisibleCustomCollapse] =
    useState<boolean>(true);
  const i18n = useIntl();

  let title = "";
  switch (type) {
    case CustomCollapseEnums.dataSource:
      title = i18n.formatMessage({
          id: "instance.form.placeholder.datasource",
      });
      break;
    case CustomCollapseEnums.fieldMapping:
        title = i18n.formatMessage({
            id: "instance.form.placeholder.orm",
        });
      break;
    case CustomCollapseEnums.schedulingConfig:
        title = i18n.formatMessage({
            id: "instance.form.placeholder.schedule",
        });
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
          <RightOutlined
            className={
              visibleCustomCollapse ? style.titleIconOpen : style.titleIconClose
            }
          />
          &nbsp;&nbsp;
          {title}
        </div>
      </div>
      <div
        className={style.content}
        style={{ display: visibleCustomCollapse ? "block" : "none" }}
      >
        {children}
      </div>
    </div>
  );
};
export default CustomCollapse;
