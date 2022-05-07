import { message } from "antd";
import {
  reqCreatedPmsRole,
  reqGetPmsGrant,
  reqGetPmsRole,
  reqPmsCommonInfo,
  reqUpdatePmsRole,
} from "@/services/pms";
import { useEffect, useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";

export interface PermissionCheck {
  userId?: number;
  objectType: string;
  objectIdx: string;
  subResource: string;
  acts: string[];
  domainType: string;
  domainId: string;
}

export interface ItemInfo {
  name: string;
  desc: string;
}

export interface CascaderInfo {
  label: string;
  value: string;
  children?: CascaderInfo[];
}

export interface CommonInfo {
  rules_info: ItemInfo[];
  prefixes_info: ItemInfo[];
  all_acts_info: ItemInfo[];
  domainCascader: CascaderInfo[];
  normal_acts_info: ItemInfo[];
  app_subResources_info: ItemInfo[];
  configRsrc_subResources_info: ItemInfo[];
}

export interface ReqPmsRoleGrantInfoParam {
  resourceType: string;
  resourceId: number;
  grantObjectType: string;
  domainType: string;
  domainId: number;
  roleType: number;
}

export interface PmsRoleDetail {
  id: number;
  pmsRoleId: number;
  subResources: string[];
  acts: string[];
}

export interface PmsRole {
  id: number;
  name: string;
  desc: string;
  belongResource: string;
  roleType: string;
  resourceId: number;
  details: PmsRoleDetail[];
  // Refs
}

export interface GrantObjDetail {
  domainType: string;
  domainId: number;
  objectIds: number[];
}

export interface GrantObj {
  objectType: string;
  grantInfo: GrantObjDetail;
}

export interface GrantResource {
  resourceId: number;
  grantObjs: GrantObj[];
}

export interface RoleGrantInfo {
  pmsRole: PmsRole;
  grantResources: GrantResource[];
}

const usePmsCommonModel = () => {
  // const appId: number = parseInt(history.location.query?.aid as string);
  const [commonInfo, setCommonInfo] = useState<CommonInfo | undefined>(
    undefined
  );
  const [roleModal, setRoleModal] = useState<boolean>(false);
  const [roleType, setRoleType] = useState<number>(1);
  const [callBack, setCallBack] = useState<(params?: any) => void>();
  const [openModalType, setOpenModalTyle] = useState<string>("");
  const [iid, setIID] = useState<number>(0);
  const [pmsGrant, setPmsGrant] = useState<any>();
  const [selectedRole, setSelectedRole] = useState<any>();
  const [isEditor, setIsEditor] = useState<boolean>(false);

  const onChangeRoleModal = (
    flag: boolean,
    roleType: number,
    openType: string,
    callBackFuc?: (params?: any) => void
  ) => {
    setRoleType(roleType);
    setOpenModalTyle(openType);
    setRoleModal(flag);
    setCallBack(() => callBackFuc);
  };

  const onChangeIid = (id: number) => {
    setIID(id);
  };

  const getPmsRole = useRequest(reqGetPmsRole, {
    loadingText: { loading: "加载中...", done: undefined },
    onSuccess: (res) => {
      setSelectedRole(res.data);
      setIsEditor(true);
    },
  });

  const getPmsGrant = useRequest(reqGetPmsGrant, {
    loadingText: false,
    onError: undefined,
    onSuccess: (res) => setPmsGrant(res.data),
  });

  const createdPmsRole = useRequest(reqCreatedPmsRole, {
    loadingText: { loading: "创建中...", done: "创建成功" },
    onSuccess: (res) => {
      resetRole();
      if (openModalType === "instance") {
        doGetPmsGrant(iid);
      }
      if (openModalType === "global") {
        callBack?.();
      }
    },
  });

  const updatePmsRole = useRequest(reqUpdatePmsRole, {
    loadingText: { loading: "更新中...", done: "更新成功" },
    onSuccess: (res) => {
      resetRole();
      if (openModalType === "instance") {
        doGetPmsGrant(iid);
      }
      if (openModalType === "global") {
        callBack?.();
      }
    },
  });

  const doGetPmsRole = (roleId: number) => {
    return getPmsRole.run(roleId);
  };

  const doGetPmsGrant = (iid: number) => {
    getPmsGrant.run(iid);
  };

  const doCreatedPmsRole = (role: any) => {
    createdPmsRole.run(role);
  };

  const doUpdatePmsRole = (roleId: number, role: any) => {
    updatePmsRole.run(roleId, role);
  };

  const resetRole = () => {
    setIsEditor(false);
    setSelectedRole(undefined);
    setRoleModal(false);
  };

  const fetchPmsCommonInfo = (iid: number) => {
    reqPmsCommonInfo(iid).then((r) => {
      if (r.code !== 0) {
        message.error(`获取权限相关基础信息失败 ${r.msg}`);
        return;
      }
      setCommonInfo(r.data);
    });
  };

  useEffect(() => {
    if (window.location.href.indexOf("/user/login") == -1) {
      fetchPmsCommonInfo(iid);
    }
  }, [iid]);

  return {
    commonInfo,
    roleModal,
    openModalType,
    selectedRole,
    isEditor,
    pmsGrant,
    roleType,
    iid,
    onChangeIid,
    fetchPmsCommonInfo,
    onChangeRoleModal,
    doGetPmsRole,
    resetRole,
    doUpdatePmsRole,
    doCreatedPmsRole,
    doGetPmsGrant,
  };
};
export default usePmsCommonModel;
