import { Suspense, lazy, ReactNode, ComponentType } from "react";

type Props = {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  componentProps?: Record<string, unknown>;
};

export const LazyWrapper = ({ loader, fallback = null, componentProps = {} }: Props) => {
  const Component = lazy(loader);
  return (
    <Suspense fallback={fallback}>
      <Component {...componentProps} />
    </Suspense>
  );
};
