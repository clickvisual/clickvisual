export interface FileTitleProps {
  file: any;
}
const FileTitle = ({ file }: FileTitleProps) => {
  return <div>{file.name}</div>;
};
export default FileTitle;
