import useUser from "@/models/system/useUser";

const UseSystem = () => {
  const sysUser = useUser();

  return {
    sysUser,
  };
};

export default UseSystem;
