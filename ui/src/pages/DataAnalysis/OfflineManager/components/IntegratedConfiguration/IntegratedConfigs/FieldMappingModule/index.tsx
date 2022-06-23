import { FormInstance } from "antd";

export interface FieldMappingModule {
  form: FormInstance<any>;
  iid: number;
}
const FieldMappingModule = ({ iid, form }: FieldMappingModule) => {
  return <div></div>;
};
export default FieldMappingModule;
