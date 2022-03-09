import { useState } from "react";

const useChannelModal = () => {
  const [visibleCreate, setVisibleCreate] = useState<boolean>(false);
  const [visibleUpdate, setVisibleUpdate] = useState<boolean>(false);
  return { visibleCreate, setVisibleCreate, visibleUpdate, setVisibleUpdate };
};
export default useChannelModal;
