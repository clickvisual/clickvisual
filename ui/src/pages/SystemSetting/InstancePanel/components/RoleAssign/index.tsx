import styles from "./index.less";
import { Button, Form, Modal } from "antd";
// import RolesList from "./components/RolesList";
import React, { useEffect } from "react";
import { FormInstance } from "antd/es/form";
import RoleModel from "./components/RoleModel";
import { useModel } from "@@/plugin-model/useModel";
import useRequestX from "@/hooks/useRequest/useRequest";
import { reqUpdatePmsGrant } from "@/services/pms";

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
  const { onChangeIid,onChangeRoleModal, doGetPmsGrant, pmsGrant } = useModel("pms");

  const updatePmsGrant = useRequestX(reqUpdatePmsGrant, {
    loadingText: { loading: "保存中...", done: "保存成功" },
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
      title={`实例 ${instanceName} 角色授权`}
      onCancel={() => {
        onChangeDrawerVisible(false);
      }}
      bodyStyle={{ padding: 0 }}
      visible={drawerVisible}
      width={"90%"}
      wrapClassName={styles.roleModal}
    >
      <AppRolesContext.Provider value={contextValue}>
        <div className={styles.divMain}>
          <Form form={pmsForm} onFinish={handleSubmit}>
            <div className={styles.formItem}>
              <div className={styles.form}>
                <Form.Item name={"iid"} hidden />
                <Form.Item label={<span>角色</span>}>
                  {/*<RolesList />*/}
                </Form.Item>
              </div>
            </div>
            <Form.Item noStyle>
              <div className={styles.formBtnDiv}>
                <Button
                  className={styles.formLeftBtn}
                  type="primary"
                  htmlType="submit"
                >
                  提交
                </Button>
                <Button
                  onClick={() => {
                    onChangeRoleModal(true, 2, "instance");
                  }}
                >
                  新建自定义角色
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
        <RoleModel/>
      </AppRolesContext.Provider>
    </Modal>
  );
};
export default AppRoleAssignListForm;
