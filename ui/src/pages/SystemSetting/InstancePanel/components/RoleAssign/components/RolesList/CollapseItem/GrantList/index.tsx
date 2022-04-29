import { FormListFieldData } from "antd/es/form/FormList";
import { Button, Cascader, Form, Tooltip } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import UserSelect from "@/pages/SystemSetting/Pms/Role/components/UserSelect";
import styles from "./index.less";
import { useContext } from "react";
import { AppRolesContext } from "../../../../../RoleAssign";

type GrantListProps = {
  parentField: FormListFieldData;
};

const GrantList = (props: GrantListProps) => {
  const { parentField } = props;
  const { commonInfo } = useModel("pms");
  const { roleForm } = useContext(AppRolesContext);
  console.log("commonInfo", commonInfo)
  console.log("grantFields", parentField)
  return (
    <Form.List name={[parentField.name, "grant"]}>
      {(grantFields, grantOption) => (
        <>
          {grantFields.map((grantField) => {
            const grant = roleForm?.getFieldValue([
              "roles",
              parentField.name,
              "grant",
              grantField.name,
            ]);
            return (
              <div key={grantField.key} className={styles.grantMain}>
                <Form.Item
                  label={
                    <Tooltip title={"domain"}>
                      <span>作用域</span>
                    </Tooltip>
                  }
                  {...grantField}
                  name={[grantField.name, "domain"]}
                  fieldKey={[grantField.fieldKey]}
                  className={styles.grantDomain}
                  rules={[
                    {
                      required: true,
                      message: "请选择授权域名",
                    },
                  ]}
                >
                  <Cascader
                    disabled={grant.created === 1}
                    expandTrigger="hover"
                    options={commonInfo?.domainCascader}
                    placeholder="请选择授权域名"
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <Tooltip title={"user"}>
                      <span>用户</span>
                    </Tooltip>
                  }
                  {...grantField}
                  name={[grantField.name, "userIds"]}
                  fieldKey={[grantField.fieldKey]}
                  className={styles.grantUser}
                  rules={[
                    {
                      required: true,
                      message: "请选择授权用户",
                    },
                  ]}
                >
                  <UserSelect
                    placeholder="请选择授权用户"
                    multiple
                    mode="list"
                  />
                </Form.Item>
                <MinusCircleOutlined
                  className={styles.grantIcon}
                  onClick={() => grantOption.remove(grantField.name)}
                />
              </div>
            );
          })}
          <Form.Item noStyle>
            <Button
              type="dashed"
              onClick={() =>
                grantOption.add({
                  created: 0,
                  // domain: [commonInfo?.domainCascader[0].value],
                })
              }
              block
              icon={<PlusOutlined />}
            >
              新增授权
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default GrantList;
