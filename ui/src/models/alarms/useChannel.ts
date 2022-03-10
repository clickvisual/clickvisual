import useRequest from "@/hooks/useRequest/useRequest";
import api, { ChannelType } from "@/services/alarm";
import { useState } from "react";

const useChannel = () => {
  const [currentChannel, setCurrentChannel] = useState<ChannelType>();

  const doGetChannels = useRequest(api.getChannels, { loadingText: false });

  const doGetChannelInfo = useRequest(api.getChannelInfo, {
    loadingText: false,
  });

  const doCreatedChannel = useRequest(api.createdChannel, {
    loadingText: false,
  });

  const doUpdatedChannel = useRequest(api.updatedChannel, {
    loadingText: false,
  });

  const doDeletedChannel = useRequest(api.deletedChannel, {
    loadingText: false,
  });

  return {
    currentChannel,
    setCurrentChannel,
    doGetChannels,
    doGetChannelInfo,
    doCreatedChannel,
    doUpdatedChannel,
    doDeletedChannel,
  };
};
export default useChannel;
