import useRequestX from "@/hooks/useRequest/useRequest";
import { reqUpdatePmsGrant } from "@/services/pms";
import { useModel } from "@umijs/max";
import { Button, Form, Modal } from "antd";
import { FormInstance } from "antd/es/form";
import React, { useEffect } from "react";
import { useIntl } from "umi";
import RoleModel from "./components/RoleModel";
import RolesList from "./components/RolesList";
import styles from "./index.less";

export type AppRolesContextType = {
  iid: number;
  instanceName: string;
  roleForm: FormInstance<any> | undefined;
};

const defaultAppRolesContext = {
  iid: -1,
  instanceName: "",
  roleForm: undefined,
};
export const AppRolesContext = React.createContext<AppRolesContextType>(
  defaultAppRolesContext
);
type AppRolesProps = {
  iid: number;
  instanceName: string;
  drawerVisible: boolean;
  onChangeDrawerVisible: (flag: boolean) => void;
};
const AppRoleAssignListForm = (props: AppRolesProps) => {
  const { drawerVisible, iid, instanceName, onChangeDrawerVisible } = props;
  const [pmsForm] = Form.useForm();
  const contextValue = {
    roleForm: pmsForm,
    iid: iid,
    instanceName: instanceName,
  };
  const { onChangeIid, onChangeRoleModal, doGetPmsGrant, pmsGrant } =
    useModel("pms");
  const i18n = useIntl();

  const updatePmsGrant = useRequestX(reqUpdatePmsGrant, {
    loadingText: {
      loading: i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.loadingText",
      }),
      done: i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.loadingSucText",
      }),
    },
    onSuccess: (res) => onChangeDrawerVisible(false),
  });

  const handleSubmit = (field: any) => {
    updatePmsGrant.run(iid, field);
  };

  useEffect(() => {
    if (!iid) return;
    if (drawerVisible) {
      pmsForm.setFieldsValue({ iid: iid });
      onChangeIid(iid);
      doGetPmsGrant(iid);
    }
  }, [drawerVisible]);

  useEffect(() => {
    if (pmsGrant) pmsForm.setFieldsValue({ ...pmsGrant });
  }, [pmsGrant]);

  return (
    <Modal
      centered
      destroyOnClose
      afterClose={() => {
        pmsForm.resetFields();
      }}
      footer={null}
      title={`${i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.modelTitle.roleAuth",
      })}: ${i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.modelTitle.name",
      })} (${instanceName}) `}
      onCancel={() => {
        onChangeDrawerVisible(false);
      }}
      bodyStyle={{ padding: 0 }}
      open={drawerVisible}
      width={"90%"}
      wrapClassName={styles.roleModal}
    >
      <AppRolesContext.Provider value={contextValue}>
        <div className={styles.divMain}>
          <Form form={pmsForm} onFinish={handleSubmit}>
            <div className={styles.formItem}>
              <div className={styles.form}>
                <Form.Item name={"iid"} hidden />
                <Form.Item
                  label={
                    <span>
                      {i18n.formatMessage({
                        id: "systemSetting.instancePanel.roleAssign.modelLabel.role",
                      })}
                    </span>
                  }
                >
                  <RolesList />
                </Form.Item>
              </div>
            </div>
            <Form.Item noStyle>
              <div className={styles.formBtnDiv}>
                <Button
                  className={styles.formLeftBtn}
                  type="primary"
                  htmlType="submit"
                  style={{ width: "200px" }}
                >
                  {i18n.formatMessage({
                    id: "submit",
                  })}
                </Button>
                <Button
                  block
                  onClick={() => {
                    onChangeRoleModal(true, 2, "instance");
                  }}
                  style={{ width: "200px" }}
                >
                  {i18n.formatMessage({
                    id: "systemSetting.instancePanel.roleAssign.modelBottom.createCustomRoleBtn",
                  })}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
        <RoleModel />
      </AppRolesContext.Provider>
    </Modal>
  );
};
export default AppRoleAssignListForm;
