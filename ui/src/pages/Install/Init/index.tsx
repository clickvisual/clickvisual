import initStyles from "@/pages/Install/Init/index.less";
import classNames from "classnames";
import { Button, Modal } from "antd";
import IconFont from "@/components/IconFont";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT, LOGIN_PATH } from "@/config/config";
import { history } from "umi";

const Init = () => {
  const i18n = useIntl();
  const { doInstall } = useModel("install");

  const doInstallInit = useDebounceFn(
    () => {
      doInstall.run().then((res) => {
        if (res?.code !== 0) return;
        Modal.success({
          title: "初始化完成",
          content: "数据库初始化完成，点击'确定'按钮跳转到登录页面",
          okText: "确定",
          closable: true,
          onOk: () => {
            history.push(LOGIN_PATH);
          },
        });
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;
  return (
    <div className={classNames(initStyles.installMain)}>
      <div className={initStyles.installTip}>
        <span>需要进行数据库初始化，请点击下方安装按钮</span>
      </div>
      <div className={initStyles.installBtnBox}>
        <Button
          loading={doInstall.loading}
          className={initStyles.installBtn}
          type={"primary"}
          icon={<IconFont type={"icon-install"} />}
          size={"large"}
          onClick={doInstallInit}
        >
          数据库初始化
        </Button>
      </div>
    </div>
  );
};
export default Init;
