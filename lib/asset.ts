/** public/ 下的资源在子路径部署时需要前缀。 */
const PREFIX = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${PREFIX}${clean}`;
}
