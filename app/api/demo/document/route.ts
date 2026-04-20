import { demoContractText } from "@/data/demo-contract";

export const runtime = "nodejs";

export async function GET() {
  return new Response(demoContractText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="demo-contract.txt"'
    }
  });
}
