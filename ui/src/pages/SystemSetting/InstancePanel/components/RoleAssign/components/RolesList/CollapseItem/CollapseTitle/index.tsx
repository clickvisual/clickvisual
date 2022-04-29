import { PmsRole } from "@/services/pms";
import styles from "./index.less";
import { Tooltip } from "antd";
import { EditFilled, QuestionOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";

type DetailsProps = {
  details: any[];
};
const Details = (props: DetailsProps) => {
  const { details } = props;
  return (
    <>
      <div>
        <span>角色权限 ( [子资源]: [准许操作] )</span>
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
  const stopPropagation = (event: any) => {
    event.stopPropagation();
  };

  const editorRole = (ev: any) => {
    doGetPmsRole(role.id).then((res) => {
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
            <Tooltip title={"编辑"} className={styles.editor}>
              <EditFilled onClick={editorRole} />
            </Tooltip>
          )}
          <Tooltip
            title={<Details details={role.details} />}
            className={styles.question}
          >
            <QuestionOutlined onClick={(ev) => stopPropagation(ev)} />
          </Tooltip>
        </div>
      </div>
    </>
  );
};

export default CollapseTitle;
