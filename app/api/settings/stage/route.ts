export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findFirst()

    // If no settings exist yet, create the default one
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {}
      })
    }

    return NextResponse.json({ currentStageStart: settings.currentStageStart })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Error al obtener la configuración" },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // 1. Get or create settings
    let settings = await prisma.systemSettings.findFirst()
    
    // We update the stage start to now
    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { currentStageStart: new Date() }
      })
    } else {
      settings = await prisma.systemSettings.create({
        data: { currentStageStart: new Date() }
      })
    }

    // We won't deactivate any users as Contracts manage their own lifecycle now
    return NextResponse.json({ 
      success: true, 
      currentStageStart: settings.currentStageStart
    })
  } catch (error) {
    console.error("Error restarting stage:", error)
    return NextResponse.json(
      { error: "Error al reiniciar la etapa" },
      { status: 500 }
    )
  }
}
