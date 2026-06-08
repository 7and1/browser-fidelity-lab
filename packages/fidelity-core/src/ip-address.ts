const ipv4Pattern =
  /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;

export function extractIpv4Addresses(value: string): string[] {
  return [...value.matchAll(ipv4Pattern)].map((match) => match[0]);
}

export function isPrivateIpv4Address(address: string): boolean {
  const octets = parseIpv4Address(address);
  if (!octets) return false;

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

export function isPublicIpv4Address(address: string): boolean {
  const octets = parseIpv4Address(address);
  if (!octets) return false;

  const [first, second, third] = octets;
  if (isPrivateIpv4Address(address)) return false;
  if (first >= 224) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function parseIpv4Address(address: string): [number, number, number, number] | undefined {
  if (!address.match(new RegExp(`^${ipv4Pattern.source}$`))) return undefined;
  const octets = address.split(".").map((value) => Number(value));
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return undefined;
  }
  return octets as [number, number, number, number];
}
