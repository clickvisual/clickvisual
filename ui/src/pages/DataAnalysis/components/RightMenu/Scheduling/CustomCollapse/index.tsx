import style from "./index.less";
import { RightOutlined } from "@ant-design/icons";
import { useState } from "react";

const CustomCollapse = (props: { children: any; title: string }) => {
  const { children, title } = props;
  const [visibleCustomCollapse, setVisibleCustomCollapse] =
    useState<boolean>(true);

  return (
    <div className={style.CustomCollapse}>
      <div
        className={style.titleBox}
        onClick={() => setVisibleCustomCollapse(!visibleCustomCollapse)}
      >
        <div className={style.title}>
          <RightOutlined
            className={
              visibleCustomCollapse ? style.titleIconOpen : style.titleIconClose
            }
          />
          &nbsp;&nbsp;
          {title}
        </div>
      </div>
      <div
        className={style.content}
        style={{ display: visibleCustomCollapse ? "block" : "none" }}
      >
        {children}
      </div>
    </div>
  );
};

export default CustomCollapse;
