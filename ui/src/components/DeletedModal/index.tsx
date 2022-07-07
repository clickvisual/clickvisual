import deletedModalStyles from "@/components/DeletedModal/index.less";
import { Modal, ModalFuncProps, ModalProps } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

const deletedModal = (params: ModalProps & ModalFuncProps) => {
  return Modal.confirm({
    title: "确认删除吗？",
    icon: <ExclamationCircleOutlined style={{ color: "hsl(360,68%,59%)" }} />,
    okButtonProps: { danger: true },
    className: deletedModalStyles.deletedModalMain,
    ...params,
  });
};

export default deletedModal;
