import { message } from "antd";
import { useIntl } from "umi";
import { reqCreatePmsDefaultRole, reqGrantRootUids } from "@/services/pms";

const useRole = () => {
  const i18n = useIntl();

  const handleCreate = async (values: any) => {
    const hide = message.loading(
      i18n.formatMessage({ id: "hooks.role.create.ing" })
    );
    try {
      const resp = await reqCreatePmsDefaultRole({ ...values });
      if (resp.code !== 0) {
        hide();
        message.error(
          `${i18n.formatMessage({ id: "hooks.role.create.failure" })}. ${
            resp.msg
          }`
        );
        return true;
      }
      hide();
      message.success(i18n.formatMessage({ id: "hooks.role.create.success" }));
      return true;
    } catch (error) {
      hide();
      message.error(
        i18n.formatMessage({ id: "hooks.role.create.failure.tips" })
      );
      return false;
    }
  };

  const handleGrantUsers = async (values: any) => {
    const hide = message.loading(
      i18n.formatMessage({ id: "hooks.role.authorization.ing" })
    );
    try {
      const resp = await reqGrantRootUids({ ...values });
      if (resp.code !== 0) {
        hide();
        message.error(
          `${i18n.formatMessage({ id: "hooks.role.authorization.failure" })}. ${
            resp.msg
          }`
        );
        return true;
      }
      hide();
      message.success(
        i18n.formatMessage({ id: "hooks.role.authorization.success" })
      );
      return true;
    } catch (error) {
      hide();
      message.error(
        i18n.formatMessage({ id: "hooks.role.authorization.failure.tips" })
      );
      return false;
    }
  };
  return { handleCreate, handleGrantUsers };
};
export default useRole;
