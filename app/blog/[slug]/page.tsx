import type { Metadata } from "next";

import FastBlogDetailPage, {
  buildBlogMetadata,
} from "./FastBlogDetailPage";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return buildBlogMetadata({ params });
}

export default FastBlogDetailPage;
