export const publicPath = (slug: string) => `/c/${slug}`;
export const registryPath = (slug: string, version?: number) =>
  `/r/${slug}${version ? `@${version}` : ""}.json`;

export function publishLinks(origin: string, slug: string) {
  return {
    publicUrl: origin + publicPath(slug),
    registryUrl: origin + registryPath(slug),
    installCommand: `npx shadcn@latest add ${origin + registryPath(slug)}`,
  };
}
