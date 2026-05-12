import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd";

export async function GET() {
  try {
    const response = await fetch(COINGECKO_URL, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return fallbackPrices();
    }

    const data = await response.json();

    return NextResponse.json({
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      SOL: data.solana.usd,
      stale: false,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return fallbackPrices();
  }
}

function fallbackPrices() {
  return NextResponse.json({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    stale: true,
    updatedAt: new Date().toISOString(),
  });
}
