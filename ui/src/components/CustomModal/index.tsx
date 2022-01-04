import { Modal, ModalProps } from 'antd';
import { ReactNode } from 'react';

type CustomModalType = ModalProps & {
  children: ReactNode;
};

const CustomModal = (props: CustomModalType) => {
  return (
    <Modal centered footer={null} {...props}>
      {props.children}
    </Modal>
  );
};

export default CustomModal;
