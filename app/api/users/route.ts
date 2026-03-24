export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// ──────────── GET ────────────

export async function GET() {
  try {
    const users = await prisma.user.findMany();

    const formattedUsers = users.map((u) => ({
      ...u,
      rol: u.rol.toLowerCase(),
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}

import { capitalizeWords } from "@/lib/utils";

// ──────────── POST ────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let { nombre, apellidos, documento, email, password, rol, programaId, territorioId } =
      body;

    nombre = capitalizeWords(nombre);
    apellidos = capitalizeWords(apellidos);

    const upperRol = typeof rol === 'string' ? rol.toUpperCase() : "AUXILIAR";
    const validRolesWithPrograma = ["PROFESIONAL"];
    const validRolesWithTerritorio = ["AUXILIAR", "PROFESIONAL"];

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { documento }],
      },
    });

    if (existingUser) {
      if (!(existingUser as any).activo) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            activo: true,
            nombre,
            apellidos,
            rol: upperRol,
            programaId: validRolesWithPrograma.includes(upperRol) ? programaId || null : null,
            territorioId: validRolesWithTerritorio.includes(upperRol) ? territorioId || null : null,
            lastLogin: new Date(),
          } as any,
        });
        return NextResponse.json({
          ...updatedUser,
          rol: updatedUser.rol.toLowerCase(),
        });
      }
      return NextResponse.json(
        { error: "Ya existe un usuario con este documento o correo." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        nombre,
        apellidos,
        documento,
        email,
        password: hashedPassword,
        rol: upperRol as any,
        programaId: validRolesWithPrograma.includes(upperRol) ? programaId || null : null,
        territorioId: validRolesWithTerritorio.includes(upperRol) ? territorioId || null : null,
      },
    });

    return NextResponse.json({
      ...newUser,
      rol: newUser.rol.toLowerCase(),
    });
  } catch (error: any) {
    console.error("DEBUG CREAR USUARIO", error);
    return NextResponse.json(
      {
        error: "Error al crear usuario",
        details: error?.message,
        stack: error?.stack,
      },
      { status: 500 },
    );
  }
}
