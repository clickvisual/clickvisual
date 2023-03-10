import useRequest from "@/hooks/useRequest/useRequest";
import workflowApi from "@/services/bigDataWorkflow";
import axios, { Canceler } from "axios";
import { useRef } from "react";

export enum OpenTypeEnums {
  source = "source",
  target = "target",
}
const useIntegratedConfigs = () => {
  const cancelTokenTargetRef = useRef<Canceler | null>(null);
  const cancelTokenSourceRef = useRef<Canceler | null>(null);

  const cancelTokenTargetTableRef = useRef<Canceler | null>(null);
  const cancelTokenSourceTableRef = useRef<Canceler | null>(null);

  const cancelTokenTargetColumnsRef = useRef<Canceler | null>(null);
  const cancelTokenSourceColumnsRef = useRef<Canceler | null>(null);

  const doGetSources = useRequest(workflowApi.getSourceList, {
    loadingText: false,
    onError: (e) => {
      if (axios.isCancel(e)) {
        return false;
      }
      return;
    },
  });
  const doGetSourceTables = useRequest(workflowApi.getSourceTables, {
    loadingText: false,
    onError: (e) => {
      if (axios.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  const doGetColumns = useRequest(workflowApi.getSourceColumns, {
    loadingText: false,
    onError: (e) => {
      if (axios.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  const doStructuralTransfer = useRequest(workflowApi.structuralTransfer, {
    loadingText: false,
    onError: (e) => {
      if (axios.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  return {
    doGetSources,
    doGetColumns,
    doGetSourceTables,
    doStructuralTransfer,

    cancelTokenTargetRef,
    cancelTokenSourceRef,
    cancelTokenTargetTableRef,
    cancelTokenSourceTableRef,
    cancelTokenTargetColumnsRef,
    cancelTokenSourceColumnsRef,
  };
};
export default useIntegratedConfigs;
