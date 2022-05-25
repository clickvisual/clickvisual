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
          title: i18n.formatMessage({
            id: "install.init.model.databaseInit.successTitle",
          }),
          content: i18n.formatMessage({
            id: "install.init.model.databaseInit.successContent",
          }),
          okText: i18n.formatMessage({
            id: "button.ok",
          }),
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
        <span>
          {i18n.formatMessage({ id: "install.init.text.databaseInit" })}
        </span>
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
          {i18n.formatMessage({ id: "install.init.btn.databaseInit" })}
        </Button>
      </div>
    </div>
  );
};
export default Init;
