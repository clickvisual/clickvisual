import { Form } from "antd";
import CollapseItem from "./CollapseItem";

const RolesList = () => {
  return (
    <Form.List name={"roles"}>
      {(rolesFields, rolesOption) => (
        <>
          {rolesFields.map((rolesField) => (
            <CollapseItem
              key={rolesField.key}
              field={rolesField}
              fieldOperation={rolesOption}
            />
          ))}
        </>
      )}
    </Form.List>
  );
};
export default RolesList;
