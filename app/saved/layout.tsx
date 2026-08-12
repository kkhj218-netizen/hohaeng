import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 관심 글 | 호행처럼',
  description: '이 기기에 저장한 호행처럼 관심 글을 다시 확인하는 개인용 페이지입니다.',
  alternates: {
    canonical: '/saved',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
