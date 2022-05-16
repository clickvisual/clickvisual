import { FormListFieldData } from "antd/es/form/FormList";
import { Button, Cascader, Form, Tooltip } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import UserSelect from "@/pages/SystemSetting/Role/components/UserSelect";
import styles from "./index.less";
import { useContext } from "react";
import { AppRolesContext } from "../../../../../RoleAssign";
import { useIntl } from "umi";

type GrantListProps = {
  parentField: FormListFieldData;
};

const GrantList = (props: GrantListProps) => {
  const { parentField } = props;
  const { commonInfo } = useModel("pms");
  const { roleForm } = useContext(AppRolesContext);
  console.log("commonInfo", commonInfo);
  console.log("grantFields", parentField);
  const i18n = useIntl();
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
                  style={{ width: "50%" }}
                  label={
                    <Tooltip title={"domain"}>
                      <span>
                        {i18n.formatMessage({
                          id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope",
                        })}
                      </span>
                    </Tooltip>
                  }
                  {...grantField}
                  name={[grantField.name, "domain"]}
                  fieldKey={[grantField.fieldKey]}
                  className={styles.grantDomain}
                  rules={[
                    {
                      required: true,
                      message: i18n.formatMessage({
                        id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope.placeholder",
                      }),
                    },
                  ]}
                >
                  <Cascader
                    disabled={grant.created === 1}
                    expandTrigger="hover"
                    options={commonInfo?.domainCascader}
                    placeholder={i18n.formatMessage({
                      id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope.placeholder",
                    })}
                  />
                </Form.Item>
                <Form.Item
                  style={{ width: "50%" }}
                  label={
                    <Tooltip title={"user"}>
                      <span>
                        {i18n.formatMessage({
                          id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.user",
                        })}
                      </span>
                    </Tooltip>
                  }
                  {...grantField}
                  name={[grantField.name, "userIds"]}
                  fieldKey={[grantField.fieldKey]}
                  className={styles.grantUser}
                  rules={[
                    {
                      required: true,
                      message: i18n.formatMessage({
                        id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.user.placeholder",
                      }),
                    },
                  ]}
                >
                  <UserSelect
                    placeholder={i18n.formatMessage({
                      id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.user.placeholder",
                    })}
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
              {i18n.formatMessage({
                id: "systemSetting.instancePanel.roleAssign.rolesList.grantList.createAuthorization",
              })}
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default GrantList;
