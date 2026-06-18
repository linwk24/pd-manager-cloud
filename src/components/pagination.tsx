'use client';

import { Button } from '@/components/ui/button';

interface PaginationProps {
  total: number;
  pageSize: number;
  currentOffset: number;
  onPageChange: (offset: number) => void;
}

export function Pagination({ total, pageSize, currentOffset, onPageChange }: PaginationProps) {
  if (total <= pageSize) return null;

  const currentPage = Math.floor(currentOffset / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex items-center justify-center gap-2 mt-6 py-4 border-t">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(0)}
        disabled={currentOffset === 0}
      >
        首页
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(0, currentOffset - pageSize))}
        disabled={currentOffset === 0}
      >
        上一页
      </Button>
      <span className="text-sm text-muted-foreground px-4">
        第 {currentPage} / {totalPages} 页，共 {total} 条
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(total - pageSize, currentOffset + pageSize))}
        disabled={currentOffset + pageSize >= total}
      >
        下一页
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(0, Math.floor((total - 1) / pageSize) * pageSize))}
        disabled={currentOffset + pageSize >= total}
      >
        末页
      </Button>
    </div>
  );
}
