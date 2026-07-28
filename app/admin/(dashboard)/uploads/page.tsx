import { Suspense } from "react";
import UploadsClientImpl from "./UploadsClientImpl";

export default function AdminUploadsPage() {
  return (
    <Suspense fallback={<p>加载上传页…</p>}>
      <UploadsClientImpl />
    </Suspense>
  );
}
