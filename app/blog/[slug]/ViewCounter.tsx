'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function ViewCounter({
  slug,
  initialCount,
}: {
  slug: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const increaseView = async () => {
      const storageKey = `hohaeng-viewed:${slug}`;

      if (sessionStorage.getItem(storageKey)) {
        return;
      }

      sessionStorage.setItem(
        storageKey,
        'pending'
      );

      const { error } = await supabase.rpc(
        'increment_post_view',
        {
          target_slug: slug,
        }
      );

      if (error) {
        console.error(
          '조회수 증가 오류:',
          error
        );

        sessionStorage.removeItem(
          storageKey
        );

        return;
      }

      sessionStorage.setItem(
        storageKey,
        'done'
      );

      setCount((prev) => prev + 1);
    };

    increaseView();
  }, [slug]);

  return (
    <span>
      👁 {count.toLocaleString('ko-KR')}회
    </span>
  );
}