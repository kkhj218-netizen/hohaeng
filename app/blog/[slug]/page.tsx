import type { Metadata } from "next";

import FastBlogDetailPage, {
  buildBlogMetadata,
} from "./FastBlogDetailPage";

// 새 글을 공개한 직후 과거 404 결과가 남지 않도록
// 상세 페이지 자체는 항상 최신 상태를 확인한다.
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return buildBlogMetadata({ params });
}

export default FastBlogDetailPage;
