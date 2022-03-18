import { environmentalAudit, installEnv } from "@/services/install";
import useRequest from "@/hooks/useRequest/useRequest";
import { history } from "umi";
import { INSTALL_INIT } from "@/config/config";

const install = () => {
  const doEnvironmentalAudit = useRequest(environmentalAudit, {
    loadingText: false,
    onSuccess: (res) => {
      if (res.data === 0) {
        history.push(INSTALL_INIT);
      }
    },
  });

  const doInstall = useRequest(installEnv, {
    loadingText: false,
  });

  return {
    doEnvironmentalAudit,
    doInstall,
  };
};
export default install;
