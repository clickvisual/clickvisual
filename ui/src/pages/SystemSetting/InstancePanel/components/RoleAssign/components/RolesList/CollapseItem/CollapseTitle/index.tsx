import { PmsRole } from "@/services/pms";
import styles from "./index.less";
import { message, Tooltip } from "antd";
import { EditFilled, QuestionCircleOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { useState } from "react";

type DetailsProps = {
  details: any[];
};
const Details = (props: DetailsProps) => {
  const i18n = useIntl();
  const { details } = props;
  return (
    <>
      <div>
        <span>
          {i18n.formatMessage({
            id: "systemSetting.instancePanel.roleAssign.rolesList.CollapseTitle",
          })}
        </span>
      </div>
      {details.map((item: any, index) => {
        console.log(item);
        return (
          <div>
            <span>{index + 1}. </span>
            <span>[{item["sub_resources"].toString()}]</span>:{" "}
            <span>[{item.acts.toString()}]</span>
          </div>
        );
      })}
    </>
  );
};

type CollapseTitleProps = {
  role: PmsRole;
};

const CollapseTitle = (props: CollapseTitleProps) => {
  const { role } = props;
  const { doGetPmsRole, onChangeRoleModal } = useModel("pms");
  const i18n = useIntl();
  const [load, setLoad] = useState<any>();
  const stopPropagation = (event: any) => {
    event.stopPropagation();
  };

  const editorRole = (ev: any) => {
    setLoad(
      message.loading(
        i18n.formatMessage({
          id: "models.pms.loading",
        }),
        0
      )
    );
    doGetPmsRole(role.id).then((res) => {
      load;
      if (res?.code === 0) onChangeRoleModal(true, 2, "app");
    });
    stopPropagation(ev);
  };

  return (
    <>
      <div className={styles.main}>
        <span>
          {role.name}（{role.desc}）
        </span>
        <div>
          {role.roleType === 2 && (
            <Tooltip
              title={i18n.formatMessage({ id: "edit" })}
              className={styles.editor}
            >
              <EditFilled onClick={editorRole} />
            </Tooltip>
          )}
          <Tooltip
            title={<Details details={role.details} />}
            className={styles.question}
          >
            <QuestionCircleOutlined
              style={{ color: "hsl(21, 85%, 56%)", fontSize: "16px" }}
              onClick={(ev) => stopPropagation(ev)}
            />
          </Tooltip>
        </div>
      </div>
    </>
  );
};

export default CollapseTitle;
