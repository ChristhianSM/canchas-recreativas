import { cn } from '@/lib/utils';

type PublicacionTagsProps = {
  tags?: string[] | null;
  className?: string;
};

export function PublicacionTags({ tags, className }: PublicacionTagsProps) {
  if (!tags?.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
