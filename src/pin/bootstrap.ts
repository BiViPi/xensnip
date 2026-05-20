export interface PinBootstrapParams {
  pinId: string | null;
  assetId: string | null;
}

export function readPinBootstrapParams(search: string): PinBootstrapParams {
  const params = new URLSearchParams(search);
  return {
    pinId: params.get("pin_id"),
    assetId: params.get("asset_id"),
  };
}
