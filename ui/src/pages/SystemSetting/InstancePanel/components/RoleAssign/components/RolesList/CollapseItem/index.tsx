import { Collapse, Form } from "antd";
import { MinusCircleOutlined } from "@ant-design/icons";
import { useContext } from "react";
import { AppRolesContext } from "../../../../RoleAssign";
import { FormListFieldData } from "antd/es/form/FormList";
import { FormListOperation } from "antd/lib/form/FormList";
import GrantList from "./GrantList";
import CollapseTitle from "./CollapseTitle";
import styles from "./index.less";

const { Panel } = Collapse;

type CollapseItemProps = {
  field: FormListFieldData;
  fieldOperation: FormListOperation;
};

const CollapseItem = (props: CollapseItemProps) => {
  const { field, fieldOperation } = props;
  const { roleForm } = useContext(AppRolesContext);
  const role = roleForm?.getFieldValue(["roles", field.name]);
  return (
    <div key={field.key} className={styles.collapseCard}>
      <Collapse defaultActiveKey={`${field.key}`} className={styles.collapse}>
        <Panel key={`${field.key}`} header={<CollapseTitle role={role} />}>
          <Form.Item
            name={[field.name, "id"]}
            fieldKey={[field.fieldKey]}
            hidden
          />
          <Form.Item
            name={[field.name, "roleType"]}
            fieldKey={[field.fieldKey]}
            hidden
          />
          <Form.Item fieldKey={[field.fieldKey]} label={"授权"}>
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
