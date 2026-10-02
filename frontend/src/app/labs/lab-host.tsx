import { lazy, Suspense, useMemo } from 'react';

import type { ComponentType } from 'react';

import { LabComingSoon, LabNotFound } from './lab-not-found';
import { LabShell, useLabInfo } from './lab-shell';

type LabModule = { default: ComponentType };
type LabLoader = () => Promise<LabModule>;

/** Each lab is a self-contained folder `./<slug>/lab.tsx`; Vite splits one chunk per lab. */
const discovered = import.meta.glob<LabModule>('./*/lab.tsx');

/** `./aibilling/lab.tsx` to `aibilling`. */
export function slugFromModulePath(path: string): string | null {
  return /^\.\/([^/]+)\/lab\.tsx$/.exec(path)?.[1] ?? null;
}

export function findLabLoader(
  slug: string,
  modules: Record<string, LabLoader> = discovered
): LabLoader | null {
  for (const [path, loader] of Object.entries(modules)) {
    if (slugFromModulePath(path) === slug) return loader;
  }
  return null;
}

const Loading = () => <p role="status" className="lab-shell-loading">Loading…</p>;

const HostedLab = ({ slug, loader }: { slug: string; loader: LabLoader }) => {
  const Lab = useMemo(() => lazy(loader), [loader]);
  const info = useLabInfo(slug);
  return (
    <LabShell slug={slug} info={info}>
      <Suspense fallback={<Loading />}>
        <Lab />
      </Suspense>
    </LabShell>
  );
};

/** A slug with no interface in this build: ask the server whether it is real. */
const Unbuilt = ({ slug }: { slug: string }) => {
  const info = useLabInfo(slug);
  if (info === null) return <Loading />;
  if (info === false) return <LabNotFound pathname={`/${slug}`} />;
  return <LabComingSoon lab={info} />;
};

export const LabHost = ({ slug }: { slug: string }) => {
  const loader = findLabLoader(slug);
  return loader ? <HostedLab slug={slug} loader={loader} /> : <Unbuilt slug={slug} />;
};

export default LabHost;
