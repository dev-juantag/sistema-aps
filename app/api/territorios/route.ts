export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const territorios = await prisma.territorio.findMany({
      orderBy: { codigo: "asc" }
    });
    return NextResponse.json(territorios);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener territorios" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { codigo, nombre, descripcion, whatsappLink } = body;

    const existing = await prisma.territorio.findUnique({
      where: { codigo },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un territorio con este código" },
        { status: 400 }
      );
    }

    const newTerritorio = await prisma.territorio.create({
      data: {
        codigo: codigo.toUpperCase(),
        nombre,
        descripcion,
        whatsappLink
      },
    });

    return NextResponse.json(newTerritorio);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear territorio" },
      { status: 500 }
    );
  }
}
