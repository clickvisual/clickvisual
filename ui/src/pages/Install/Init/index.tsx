import IconFont from "@/components/IconFont";
import { DEBOUNCE_WAIT, LOGIN_PATH } from "@/config/config";
import initStyles from "@/pages/Install/Init/index.less";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import { Button, Modal } from "antd";
import classNames from "classnames";
import { history, useIntl } from "umi";

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
