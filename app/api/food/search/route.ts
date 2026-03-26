import { NextRequest, NextResponse } from "next/server";
import { searchFood } from "@/lib/food-database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const results = searchFood(query);

  return NextResponse.json({ results });
}
