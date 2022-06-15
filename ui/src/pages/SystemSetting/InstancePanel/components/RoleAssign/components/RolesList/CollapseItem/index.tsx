import { Collapse, Form } from "antd";
import { MinusCircleOutlined } from "@ant-design/icons";
import { useContext } from "react";
import { AppRolesContext } from "../../../../RoleAssign";
import { FormListFieldData } from "antd/es/form/FormList";
import { FormListOperation } from "antd/lib/form/FormList";
import GrantList from "./GrantList";
import CollapseTitle from "./CollapseTitle";
import styles from "./index.less";
import { useIntl } from "umi";

const { Panel } = Collapse;

type CollapseItemProps = {
  field: FormListFieldData;
  fieldOperation: FormListOperation;
};

const CollapseItem = (props: CollapseItemProps) => {
  const { field, fieldOperation } = props;
  const { roleForm } = useContext(AppRolesContext);
  const role = roleForm?.getFieldValue(["roles", field.name]);
  const i18n = useIntl();
  return (
    <div key={field.key} className={styles.collapseCard}>
      <Collapse defaultActiveKey={`${field.key}`} className={styles.collapse}>
        <Panel key={`${field.key}`} header={<CollapseTitle role={role} />}>
          <Form.Item name={[field.name, "id"]} fieldKey={[field.key]} hidden />
          <Form.Item
            name={[field.name, "roleType"]}
            fieldKey={[field.key]}
            hidden
          />
          <Form.Item
            fieldKey={[field.key]}
            label={i18n.formatMessage({
              id: "systemSetting.instancePanel.roleAssign.rolesList.collapseItem.authorization",
            })}
          >
            <GrantList parentField={field} />
          </Form.Item>
        </Panel>
      </Collapse>
      {role.roleType === 2 && (
        <MinusCircleOutlined
          className={styles.icon}
          onClick={() => fieldOperation.remove(field.name)}
        />
      )}
    </div>
  );
};
export default CollapseItem;
