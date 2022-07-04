import workflowApi from "@/services/bigDataWorkflow";
import useRequest from "@/hooks/useRequest/useRequest";
import { useRef, useState } from "react";
import Request, { Canceler } from "umi-request";

const useIntegratedConfigs = () => {
  const [sourceColumns, setSourceColumns] = useState<any[]>([]);
  const [targetColumns, setTargetColumns] = useState<any[]>([]);
  const [mappingData, setMappingData] = useState<any[]>([]);

  const cancelTokenTargetRef = useRef<Canceler | null>(null);
  const cancelTokenSourceRef = useRef<Canceler | null>(null);

  const cancelTokenTargetTableRef = useRef<Canceler | null>(null);
  const cancelTokenSourceTableRef = useRef<Canceler | null>(null);

  const cancelTokenTargetColumnsRef = useRef<Canceler | null>(null);
  const cancelTokenSourceColumnsRef = useRef<Canceler | null>(null);

  const doGetSources = useRequest(workflowApi.getSourceList, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      }
      return;
    },
  });
  const doGetSourceTables = useRequest(workflowApi.getSourceTables, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  const doGetColumns = useRequest(workflowApi.getSourceColumns, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  return {
    doGetSources,
    doGetColumns,
    doGetSourceTables,

    sourceColumns,
    targetColumns,
    mappingData,
    setSourceColumns,
    setTargetColumns,
    setMappingData,

    cancelTokenTargetRef,
    cancelTokenSourceRef,
    cancelTokenTargetTableRef,
    cancelTokenSourceTableRef,
    cancelTokenTargetColumnsRef,
    cancelTokenSourceColumnsRef,
  };
};
export default useIntegratedConfigs;
