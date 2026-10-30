import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function ErrorState({
  message,
  onRetry,
  tone = 'auto',
}: {
  message: string;
  onRetry: () => void;
  tone?: 'auto' | 'dark';
}) {
  return (
    <EmptyState
      title={message}
      tone={tone}
      action={
        <Button variant="primary" onPress={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
}
