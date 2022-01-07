import { useModel } from "@@/plugin-model/useModel";
import Files from "@/pages/Configure/components/Menu/Files";
import Publish from "@/pages/Configure/components/Menu/Publish";

type MenuProps = {};
const Menu = (props: MenuProps) => {
  const { activeMenu } = useModel("configure");

  switch (activeMenu) {
    case "files":
      return <Files />;
    case "publish":
      return <Publish />;
    default:
      return <></>;
  }
};

export default Menu;
