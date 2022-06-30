import deletedModalStyles from "@/components/DeletedModal/index.less";
import { Modal, ModalFuncProps, ModalProps } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

// todo: 方法应该使用小驼峰
const DeletedModal = (
  params: ModalProps & ModalFuncProps,
  loading?: boolean
) => {
  return Modal.confirm({
    title: "确认删除吗？",
    icon: <ExclamationCircleOutlined style={{ color: "hsl(360,68%,59%)" }} />,
    okButtonProps: { danger: true, loading },
    className: deletedModalStyles.deletedModalMain,
    ...params,
  });
};

export default DeletedModal;
