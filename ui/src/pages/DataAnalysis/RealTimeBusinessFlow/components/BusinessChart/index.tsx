import { lazy, Suspense } from "react";

// './Page' 该组件将被自动拆出去
const Page = lazy(() => import("./BusinessChart"));

export default function (props: any) {
  return (
    <Suspense fallback={<div>loading...</div>}>
      <Page {...props} />
    </Suspense>
  );
}
