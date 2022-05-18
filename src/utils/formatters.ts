export function formatAddress(address: string): string {
  if (!address) return "";
  return (
    address.substring(0, 6) + "..." + address.substring(address.length - 6)
  );
}
